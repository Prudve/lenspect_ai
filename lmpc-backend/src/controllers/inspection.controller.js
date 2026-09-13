import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Inspection } from "../models/inspection.model.js";
import { uploadOnCloudinary, deleteFileOnCloudinary } from "../utils/cloudinary.js";
import { addInspectionJob, inspectionQueue } from "../queues/inspection.queue.js";
import { analyzeMultipleImagesWithFastAPI } from "../services/aiMicroservice.service.js";

const uploadInspectionScan = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        throw new ApiError(400, "Latitude and longitude coordinates are required");
    }

    const localFilePath = req.file?.path;
    if (!localFilePath) {
        throw new ApiError(400, "Inspection image file is required");
    }

    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
    if (!cloudinaryResponse) {
        throw new ApiError(500, "Failed to upload image to Cloudinary");
    }

    const inspection = await Inspection.create({
        inspector: req.user._id,
        imageUrl: cloudinaryResponse.secure_url,
        cloudinaryPublicId: cloudinaryResponse.public_id,
        location: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        status: "PENDING"
    });

    await addInspectionJob(
        inspection._id.toString(),
        cloudinaryResponse.secure_url
    );

    return res.status(202).json(
        new ApiResponse(
            202,
            inspection,
            "Scan uploaded successfully and queued for AI analysis"
        )
    );
});

const getAllInspections = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, complianceStatus, status } = req.query;

    const query = {};
    if (complianceStatus) query.complianceStatus = complianceStatus;
    if (status) query.status = status;

    const inspections = await Inspection.find(query)
        .populate("inspector", "fullName email username")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await Inspection.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            { inspections, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
            "Inspections retrieved successfully"
        )
    );
});

const getInspectionById = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;

    const inspection = await Inspection.findById(inspectionId).populate(
        "inspector",
        "fullName email username"
    );

    if (!inspection) {
        throw new ApiError(404, "Inspection record not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, inspection, "Inspection details fetched successfully"));
});

const getGeospatialHeatmap = asyncHandler(async (req, res) => {
    // Return GeoJSON FeatureCollection format for Leaflet.js rendering
    const inspections = await Inspection.find(
        { complianceStatus: "NON_COMPLIANT" },
        "location complianceStatus status createdAt"
    );

    const geoJsonFeatures = inspections.map((item) => ({
        type: "Feature",
        geometry: item.location,
        properties: {
            id: item._id,
            complianceStatus: item.complianceStatus,
            createdAt: item.createdAt
        }
    }));

    return res.status(200).json(
        new ApiResponse(
            200,
            { type: "FeatureCollection", features: geoJsonFeatures },
            "Geospatial heatmap data fetched successfully"
        )
    );
});

const reviewInspection = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;
    const { extractedData, complianceStatus } = req.body;

    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) {
        throw new ApiError(404, "Inspection record not found");
    }

    if (extractedData) inspection.extractedData = { ...inspection.extractedData, ...extractedData };
    if (complianceStatus) inspection.complianceStatus = complianceStatus;

    await inspection.save();

    return res
        .status(200)
        .json(new ApiResponse(200, inspection, "Inspection record updated after manual review"));
});

const deleteInspection = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;

    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) {
        throw new ApiError(404, "Inspection record not found");
    }

    // Delete image from Cloudinary before removing the DB record
    if (inspection.cloudinaryPublicId) {
        await deleteFileOnCloudinary(inspection.cloudinaryPublicId, "image");
    }

    await Inspection.findByIdAndDelete(inspectionId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Inspection record and associated image deleted successfully")
    );
});

const retryInspection = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;

    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) {
        throw new ApiError(404, "Inspection record not found");
    }

    if (inspection.status !== "FAILED") {
        throw new ApiError(400, `Cannot retry an inspection with status: ${inspection.status}. Only FAILED inspections can be retried`);
    }

    if (!inspection.imageUrl) {
        throw new ApiError(500, "Cannot retry: inspection has no associated image URL");
    }

    // Reset state before re-queuing
    inspection.status = "PENDING";
    inspection.failureReason = null;
    inspection.complianceStatus = "NEEDS_REVIEW";
    await inspection.save();

    await addInspectionJob(inspection._id.toString(), inspection.imageUrl);

    return res.status(202).json(
        new ApiResponse(202, inspection, "Inspection re-queued for AI analysis successfully")
    );
});

const getInspectionStats = asyncHandler(async (req, res) => {
    const [stats] = await Inspection.aggregate([
        {
            $facet: {
                byStatus: [
                    { $group: { _id: "$status", count: { $sum: 1 } } }
                ],
                byCompliance: [
                    { $group: { _id: "$complianceStatus", count: { $sum: 1 } } }
                ],
                total: [
                    { $count: "count" }
                ]
            }
        }
    ]);

    if (!stats) {
        return res.status(200).json(
            new ApiResponse(200, { total: 0, ISSUED: 0, CANCELLED: 0, DRAFT: 0 }, "No notices found")
        );
    }

    // Flatten the aggregation output into a clean object
    const statusMap = {};
    stats.byStatus.forEach(({ _id, count }) => { statusMap[_id] = count; });

    const complianceMap = {};
    stats.byCompliance.forEach(({ _id, count }) => { complianceMap[_id] = count; });

    const summary = {
        total: stats.total[0]?.count || 0,
        byStatus: {
            PENDING: statusMap.PENDING || 0,
            PROCESSING: statusMap.PROCESSING || 0,
            COMPLETED: statusMap.COMPLETED || 0,
            FAILED: statusMap.FAILED || 0
        },
        byCompliance: {
            COMPLIANT: complianceMap.COMPLIANT || 0,
            NON_COMPLIANT: complianceMap.NON_COMPLIANT || 0,
            NEEDS_REVIEW: complianceMap.NEEDS_REVIEW || 0
        }
    };

    return res.status(200).json(
        new ApiResponse(200, summary, "Inspection statistics fetched successfully")
    );
});

const getNearbyInspections = asyncHandler(async (req, res) => {
    const { lat, lng, radius = 5000, complianceStatus } = req.query;

    if (!lat || !lng) {
        throw new ApiError(400, "Latitude (lat) and Longitude (lng) query parameters are required");
    }

    const geoQuery = {
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [parseFloat(lng), parseFloat(lat)]
                },
                $maxDistance: Number(radius) // radius in metres
            }
        }
    };

    if (complianceStatus) geoQuery.complianceStatus = complianceStatus;

    const inspections = await Inspection.find(geoQuery)
        .populate("inspector", "fullName email username")
        .limit(100); // safety cap

    return res.status(200).json(
        new ApiResponse(
            200,
            { count: inspections.length, inspections },
            "Nearby inspections fetched successfully"
        )
    );
});

const getMyInspections = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, complianceStatus, status } = req.query;

    const query = { inspector: req.user._id };
    if (complianceStatus) query.complianceStatus = complianceStatus;
    if (status) query.status = status;

    const inspections = await Inspection.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await Inspection.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            { inspections, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
            "Your inspections fetched successfully"
        )
    );
});

const getInspectionsByVendor = asyncHandler(async (req, res) => {
    const { vendorName } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!vendorName?.trim()) {
        throw new ApiError(400, "Vendor name parameter is required");
    }

    // Case-insensitive substring match on the country_origin field.
    // Swap the field to manufacturer name once your extractedData schema has it.
    const query = {
        "extractedData.country_origin": { $regex: vendorName.trim(), $options: "i" }
    };

    const inspections = await Inspection.find(query)
        .populate("inspector", "fullName email username")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await Inspection.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            { inspections, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
            `Inspections for vendor "${vendorName}" fetched successfully`
        )
    );
});

const batchUploadScans = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        throw new ApiError(400, "Latitude and longitude coordinates are required");
    }

    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "At least one inspection image file is required");
    }

    const results = [];
    const errors = [];

    for (const file of req.files) {
        try {
            const cloudinaryResponse = await uploadOnCloudinary(file.path);
            if (!cloudinaryResponse) {
                errors.push({ file: file.originalname, reason: "Cloudinary upload failed" });
                continue;
            }

            const inspection = await Inspection.create({
                inspector: req.user._id,
                imageUrl: cloudinaryResponse.secure_url,
                cloudinaryPublicId: cloudinaryResponse.public_id,
                location: {
                    type: "Point",
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                },
                status: "PENDING"
            });

            await addInspectionJob(inspection._id.toString(), cloudinaryResponse.secure_url);
            results.push({ inspectionId: inspection._id, file: file.originalname });
        } catch (err) {
            errors.push({ file: file.originalname, reason: err.message });
        }
    }

    const statusCode = results.length === 0 ? 400 : 202;
    return res.status(statusCode).json(
        new ApiResponse(
            statusCode,
            { queued: results, failed: errors },
            results.length === 0
                ? "All uploads failed. No scans were queued."
                : `${results.length} scan(s) uploaded and queued. ${errors.length} failed.`
        )
    );
});

const uploadMultiPanelScan = asyncHandler(async (req, res) => {
    const { latitude, longitude, panelLabels } = req.body;

    if (!latitude || !longitude) {
        throw new ApiError(400, "Latitude and longitude coordinates are required");
    }

    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "At least one image file is required");
    }

    if (req.files.length > 5) {
        throw new ApiError(400, "A maximum of 5 panel images per product scan are allowed");
    }

    // Parse optional panel label hints (["front", "back", "side"])
    let labels = [];
    if (panelLabels) {
        try {
            labels = JSON.parse(panelLabels);
        } catch {
            labels = [];
        }
    }

    // ── Step 1: Upload all images to Cloudinary ──────────────────────────────
    const uploadedPanels = [];
    const uploadErrors = [];

    for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        try {
            const cloudinaryResponse = await uploadOnCloudinary(file.path);
            if (!cloudinaryResponse) {
                uploadErrors.push({ file: file.originalname, reason: "Cloudinary upload failed" });
                continue;
            }
            uploadedPanels.push({
                imageUrl: cloudinaryResponse.secure_url,
                cloudinaryPublicId: cloudinaryResponse.public_id,
                panelLabel: labels[i] || null
            });
        } catch (err) {
            uploadErrors.push({ file: file.originalname, reason: err.message });
        }
    }

    if (uploadedPanels.length === 0) {
        throw new ApiError(500, "All image uploads to Cloudinary failed. No inspection was created.");
    }

    // ── Step 2: Create the Inspection record in PROCESSING state ─────────────
    // Use the first panel as the primary imageUrl for backward-compatibility
    // with existing dashboard queries that read `inspection.imageUrl`.
    const primaryPanel = uploadedPanels[0];

    const inspection = await Inspection.create({
        inspector: req.user._id,
        imageUrl: primaryPanel.imageUrl,
        cloudinaryPublicId: primaryPanel.cloudinaryPublicId,
        multiImages: uploadedPanels,
        location: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        status: "PROCESSING"
    });

    // ── Step 3: Call the AI microservice synchronously ───────────────────────
    try {
        const imageUrls = uploadedPanels.map((p) => p.imageUrl);
        const cvResult = await analyzeMultipleImagesWithFastAPI(imageUrls);

        inspection.status = "COMPLETED";
        inspection.extractedData = cvResult.extractedData;
        inspection.boundingBoxes = cvResult.boundingBoxes;
        inspection.complianceStatus = cvResult.isCompliant ? "COMPLIANT" : "NON_COMPLIANT";
        inspection.violations = cvResult.violations || [];

        await inspection.save();

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    inspection,
                    panelsUploaded: uploadedPanels.length,
                    panelsFailed: uploadErrors.length,
                    uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
                    complianceVerdict: {
                        isCompliant: cvResult.isCompliant,
                        violations: cvResult.violations,
                        tamperingDetected: cvResult.tamperingDetected,
                        tamperingNotes: cvResult.tamperingNotes
                    }
                },
                `Multi-panel scan complete. ${uploadedPanels.length} panel(s) evaluated. Compliance: ${inspection.complianceStatus}`
            )
        );
    } catch (aiError) {
        // AI call failed — mark the inspection as FAILED but still return the
        // inspection ID so the dashboard can display it and let admins retry.
        inspection.status = "FAILED";
        inspection.failureReason = aiError.message || "Multi-panel AI analysis failed";
        await inspection.save();

        throw new ApiError(
            aiError.statusCode || 502,
            `Images uploaded but AI analysis failed: ${aiError.message}`
        );
    }
});

export {
    uploadInspectionScan,
    getAllInspections,
    getInspectionById,
    getGeospatialHeatmap,
    reviewInspection,
    deleteInspection,
    retryInspection,
    getInspectionStats,
    getNearbyInspections,
    getMyInspections,
    getInspectionsByVendor,
    batchUploadScans,
    uploadMultiPanelScan
};