import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notice } from "../models/notice.model.js";
import { Inspection } from "../models/inspection.model.js";
import { generateNoticePDF } from "../services/pdfGenerator.service.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import path from "path";
import fs from "fs";

const generateNotice = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;
    const { violations } = req.body;

    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) {
        throw new ApiError(404, "Target inspection record not found");
    }

    if (inspection.complianceStatus === "COMPLIANT") {
        throw new ApiError(400, "Cannot issue a violation notice for a compliant inspection");
    }

    const existingNotice = await Notice.findOne({ inspection: inspectionId });
    if (existingNotice) {
        throw new ApiError(409, "A notice has already been issued for this inspection");
    }

    const noticeNumber = `LMPC-NOTICE-${Date.now()}`;
    const tempPdfPath = path.join("./public/temp", `${noticeNumber}.pdf`);

    const noticePayload = {
        noticeNumber,
        inspectionId: inspection._id,
        inspectorId: req.user._id,
        createdAt: new Date(),
        extractedData: inspection.extractedData,
        violations: violations || [{ rule: "LMPC Act Section 6", description: "Mandatory declaration non-compliance" }]
    };

    //Render PDF using PDFKit
    await generateNoticePDF(noticePayload, tempPdfPath);

    // Upload generated PDF to Cloudinary
    const cloudinaryResponse = await uploadOnCloudinary(tempPdfPath);

    if (!cloudinaryResponse) {
        throw new ApiError(500, "Failed to upload generated notice PDF to Cloudinary");
    }
    
    // Save Notice document in MongoDB
    const notice = await Notice.create({
        noticeNumber,
        inspection: inspection._id,
        issuedBy: req.user._id,
        pdfUrl: cloudinaryResponse?.secure_url || null,
        cloudinaryPublicId: cloudinaryResponse?.public_id || null,
        violations: noticePayload.violations,
        status: "ISSUED"
    });

    return res
        .status(201)
        .json(new ApiResponse(201, notice, "Legal violation notice generated successfully"));
});

const getAllNotices = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const notices = await Notice.find()
        .populate("issuedBy", "fullName email username")
        .populate("inspection")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await Notice.countDocuments();

    return res.status(200).json(
        new ApiResponse(
            200,
            { notices, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
            "Notices retrieved successfully"
        )
    );
});

const getNoticeById = asyncHandler(async (req, res) => {
    const { noticeId } = req.params;

    const notice = await Notice.findById(noticeId)
        .populate("issuedBy", "fullName email username")
        .populate("inspection");

    if (!notice) {
        throw new ApiError(404, "Notice not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, notice, "Notice details retrieved successfully"));
});

const downloadNoticePDF = asyncHandler(async (req, res) => {
    const { noticeId } = req.params;

    const notice = await Notice.findById(noticeId);
    if (!notice || !notice.pdfUrl) {
        throw new ApiError(404, "Notice PDF record not found");
    }

    return res.redirect(notice.pdfUrl);
});

const cancelNotice = asyncHandler(async (req, res) => {
    const { noticeId } = req.params;

    const notice = await Notice.findById(noticeId);
    if (!notice) {
        throw new ApiError(404, "Notice not found");
    }

    if (notice.status === "CANCELLED") {
        throw new ApiError(400, "This notice is already cancelled");
    }

    notice.status = "CANCELLED";
    await notice.save();

    return res.status(200).json(
        new ApiResponse(200, notice, "Notice cancelled successfully")
    );
});

const getNoticeByInspection = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;

    // Verify the inspection exists first
    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) {
        throw new ApiError(404, "Inspection record not found");
    }

    const notice = await Notice.findOne({ inspection: inspectionId })
        .populate("issuedBy", "fullName email username")
        .populate("inspection");

    if (!notice) {
        throw new ApiError(404, "No notice found for this inspection");
    }

    return res.status(200).json(
        new ApiResponse(200, notice, "Notice for inspection fetched successfully")
    );
});

const getNoticeStats = asyncHandler(async (req, res) => {
    const [stats] = await Notice.aggregate([
        {
            $facet: {
                byStatus: [
                    { $group: { _id: "$status", count: { $sum: 1 } } }
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

    const statusMap = {};
    stats.byStatus.forEach(({ _id, count }) => { statusMap[_id] = count; });

    const summary = {
        total: stats.total[0]?.count || 0,
        ISSUED: statusMap.ISSUED || 0,
        CANCELLED: statusMap.CANCELLED || 0,
        DRAFT: statusMap.DRAFT || 0
    };

    return res.status(200).json(
        new ApiResponse(200, summary, "Notice statistics fetched successfully")
    );
});

const getMyNotices = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    const query = { issuedBy: req.user._id };
    if (status) query.status = status;

    const notices = await Notice.find(query)
        .populate("inspection")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await Notice.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            { notices, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
            "Your notices fetched successfully"
        )
    );
});

export {
    generateNotice,
    getAllNotices,
    getNoticeById,
    downloadNoticePDF,
    cancelNotice,
    getNoticeByInspection,
    getNoticeStats,
    getMyNotices
};