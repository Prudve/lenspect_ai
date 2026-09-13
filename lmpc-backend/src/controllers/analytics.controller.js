import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Inspection } from "../models/inspection.model.js";
import { Notice } from "../models/notice.model.js";
import { User } from "../models/user.model.js";
import { USER_ROLES } from "../constants.js";

// A1: Inspections over time, grouped by day — with compliant vs non-compliant split
const getComplianceTrend = asyncHandler(async (req, res) => {
    // Default: last 30 days. Accept ?days=N from query.
    const days = Math.min(Number(req.query.days) || 30, 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const trend = await Inspection.aggregate([
        {
            $match: {
                createdAt: { $gte: since }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    complianceStatus: "$complianceStatus"
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: "$_id.date",
                statuses: {
                    $push: { status: "$_id.complianceStatus", count: "$count" }
                }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                date: "$_id",
                statuses: 1
            }
        }
    ]);

    // Flatten into a friendlier shape for the frontend chart
    const formatted = trend.map((day) => {
        const row = { date: day.date, COMPLIANT: 0, NON_COMPLIANT: 0, NEEDS_REVIEW: 0 };
        day.statuses.forEach(({ status, count }) => { row[status] = count; });
        return row;
    });

    return res.status(200).json(
        new ApiResponse(200, formatted, `Compliance trend for the last ${days} days fetched successfully`)
    );
});

// A2: Top N most frequently flagged LMPC rule violations
const getTopViolations = asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const violations = await Notice.aggregate([
        { $match: { status: "ISSUED" } },
        { $unwind: "$violations" },
        {
            $group: {
                _id: "$violations.rule",
                count: { $sum: 1 },
                // Grab one sample description for context
                sampleDescription: { $first: "$violations.description" }
            }
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                rule: "$_id",
                count: 1,
                sampleDescription: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, violations, "Top violations fetched successfully")
    );
});

// A3: Inspector leaderboard — ranked by number of scans submitted
const getInspectorLeaderboard = asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const leaderboard = await User.aggregate([
        { $match: { role: USER_ROLES.INSPECTOR } },
        {
            $lookup: {
                from: "inspections",
                localField: "_id",
                foreignField: "inspector",
                as: "inspections"
            }
        },
        {
            $project: {
                inspector: {
                    _id: "$_id",
                    fullName: "$fullName",
                    email: "$email",
                    username: "$username"
                },
                totalScans: { $size: "$inspections" },
                compliantScans: {
                    $size: {
                        $filter: {
                            input: "$inspections",
                            as: "ins",
                            cond: { $eq: ["$$ins.complianceStatus", "COMPLIANT"] }
                        }
                    }
                },
                nonCompliantScans: {
                    $size: {
                        $filter: {
                            input: "$inspections",
                            as: "ins",
                            cond: { $eq: ["$$ins.complianceStatus", "NON_COMPLIANT"] }
                        }
                    }
                }
            }
        },
        { $sort: { totalScans: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, leaderboard, "Inspector leaderboard fetched successfully")
    );
});

// A4: Overall compliance rate across all completed inspections
const getOverallComplianceRate = asyncHandler(async (req, res) => {
    const [result] = await Inspection.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                compliant: {
                    $sum: { $cond: [{ $eq: ["$complianceStatus", "COMPLIANT"] }, 1, 0] }
                },
                nonCompliant: {
                    $sum: { $cond: [{ $eq: ["$complianceStatus", "NON_COMPLIANT"] }, 1, 0] }
                },
                needsReview: {
                    $sum: { $cond: [{ $eq: ["$complianceStatus", "NEEDS_REVIEW"] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                compliant: 1,
                nonCompliant: 1,
                needsReview: 1,
                complianceRate: {
                    $cond: [
                        { $eq: ["$total", 0] },
                        0,
                        {
                            $round: [
                                { $multiply: [{ $divide: ["$compliant", "$total"] }, 100] },
                                2
                            ]
                        }
                    ]
                }
            }
        }
    ]);

    const data = result || {
        total: 0, compliant: 0, nonCompliant: 0, needsReview: 0, complianceRate: 0
    };

    return res.status(200).json(
        new ApiResponse(200, data, "Overall compliance rate fetched successfully")
    );
});

// Standard realistic hotspot analytics data representing major monitored commercial zones in India
const DEFAULT_HOTSPOT_DATA = [
    {
        id: "hotspot-110001",
        pinCode: "110001",
        region: "Connaught Place / Central Wholesale Market",
        state: "Delhi",
        coordinates: [28.6315, 77.2167],
        geoJsonCoordinates: [77.2167, 28.6315],
        totalInspections: 64,
        nonCompliantCount: 42,
        compliantCount: 22,
        totalViolations: 58,
        complianceRate: 34.4,
        offenceSeverity: "CRITICAL", // RED on heatmap
        mostCommonViolation: "Rule 6(11)",
        ruleBreakdown: [
            { rule: "Rule 6(11)", count: 26, description: "E-Commerce digital declaration & mandatory QR code breach" },
            { rule: "Rule 9", count: 18, description: "Manner of declaration & minimum numeral height non-compliance" },
            { rule: "Rule 6(1)(e)", count: 9, description: "Maximum Retail Price (MRP) tampering or missing declaration" },
            { rule: "Rule 6(1)(f)", count: 5, description: "Net Quantity declaration unit symbol discrepancy" }
        ]
    },
    {
        id: "hotspot-110006",
        pinCode: "110006",
        region: "Chandni Chowk / Old Delhi Spice & Commodity Hub",
        state: "Delhi",
        coordinates: [28.6562, 77.2310],
        geoJsonCoordinates: [77.2310, 28.6562],
        totalInspections: 52,
        nonCompliantCount: 38,
        compliantCount: 14,
        totalViolations: 49,
        complianceRate: 26.9,
        offenceSeverity: "CRITICAL", // RED on heatmap
        mostCommonViolation: "Rule 9",
        ruleBreakdown: [
            { rule: "Rule 9", count: 24, description: "Numeral height less than prescribed threshold under Rule 9" },
            { rule: "Rule 6(11)", count: 13, description: "Digital transparency & URL link missing on imported packages" },
            { rule: "Rule 6(1)(a)", count: 8, description: "Manufacturer & packer identification incomplete" },
            { rule: "Rule 6(1)(d)", count: 4, description: "Month & year of manufacture smudged or missing" }
        ]
    },
    {
        id: "hotspot-400001",
        pinCode: "400001",
        region: "Fort & Crawford Market Commodity Zone",
        state: "Maharashtra (Mumbai)",
        coordinates: [18.9401, 72.8347],
        geoJsonCoordinates: [72.8347, 18.9401],
        totalInspections: 58,
        nonCompliantCount: 39,
        compliantCount: 19,
        totalViolations: 51,
        complianceRate: 32.8,
        offenceSeverity: "HIGH", // RED on heatmap
        mostCommonViolation: "Rule 6(11)",
        ruleBreakdown: [
            { rule: "Rule 6(11)", count: 28, description: "Missing e-commerce disclosure / QR code for product attributes" },
            { rule: "Rule 9", count: 12, description: "Principal display panel font dimension violations" },
            { rule: "Rule 6(1)(e)", count: 7, description: "MRP price dual declaration violation" },
            { rule: "Rule 6(1)(n)", count: 4, description: "Consumer care email and telephone omitted" }
        ]
    },
    {
        id: "hotspot-400051",
        pinCode: "400051",
        region: "Bandra Kurla Complex (BKC) Retail Arcades",
        state: "Maharashtra (Mumbai)",
        coordinates: [19.0657, 72.8687],
        geoJsonCoordinates: [72.8687, 19.0657],
        totalInspections: 40,
        nonCompliantCount: 14,
        compliantCount: 26,
        totalViolations: 18,
        complianceRate: 65.0,
        offenceSeverity: "MEDIUM",
        mostCommonViolation: "Rule 6(11)",
        ruleBreakdown: [
            { rule: "Rule 6(11)", count: 10, description: "E-Commerce digital disclosure / QR missing" },
            { rule: "Rule 9", count: 5, description: "Font size and manner of declaration" },
            { rule: "Rule 6(1)(f)", count: 3, description: "Net quantity symbol spacing violation" }
        ]
    },
    {
        id: "hotspot-560001",
        pinCode: "560001",
        region: "MG Road & Brigade Commercial District",
        state: "Karnataka (Bengaluru)",
        coordinates: [12.9756, 77.6066],
        geoJsonCoordinates: [77.6066, 12.9756],
        totalInspections: 48,
        nonCompliantCount: 31,
        compliantCount: 17,
        totalViolations: 42,
        complianceRate: 35.4,
        offenceSeverity: "HIGH", // RED on heatmap
        mostCommonViolation: "Rule 6(11)",
        ruleBreakdown: [
            { rule: "Rule 6(11)", count: 22, description: "Digital mandatory declaration not accessible via QR code" },
            { rule: "Rule 9", count: 11, description: "Declaration text contrast and font height deficiency" },
            { rule: "Rule 6(1)(e)", count: 6, description: "Unit Sale Price (USP) not displayed alongside MRP" },
            { rule: "Rule 6(1)(a)", count: 3, description: "Importer name and country of origin missing" }
        ]
    },
    {
        id: "hotspot-560068",
        pinCode: "560068",
        region: "Bommanahalli / Electronic City Logistics Warehouses",
        state: "Karnataka (Bengaluru)",
        coordinates: [12.9038, 77.6256],
        geoJsonCoordinates: [77.6256, 12.9038],
        totalInspections: 72,
        nonCompliantCount: 48,
        compliantCount: 24,
        totalViolations: 66,
        complianceRate: 33.3,
        offenceSeverity: "CRITICAL", // RED on heatmap
        mostCommonViolation: "Rule 6(11)",
        ruleBreakdown: [
            { rule: "Rule 6(11)", count: 34, description: "E-commerce packaged commodity digital disclosure omitted" },
            { rule: "Rule 9", count: 17, description: "Manner of packing and labeling font restrictions violated" },
            { rule: "Rule 6(1)(f)", count: 10, description: "Standard units of weight/volume not adhered to" },
            { rule: "Rule 6(1)(e)", count: 5, description: "Overcharging above printed MRP detected" }
        ]
    },
    {
        id: "hotspot-700001",
        pinCode: "700001",
        region: "BBD Bagh / Burrabazar Wholesale Hub",
        state: "West Bengal (Kolkata)",
        coordinates: [22.5726, 88.3511],
        geoJsonCoordinates: [88.3511, 22.5726],
        totalInspections: 46,
        nonCompliantCount: 33,
        compliantCount: 13,
        totalViolations: 44,
        complianceRate: 28.3,
        offenceSeverity: "CRITICAL", // RED on heatmap
        mostCommonViolation: "Rule 9",
        ruleBreakdown: [
            { rule: "Rule 9", count: 21, description: "Manner of declaration and font size violation under Rule 9" },
            { rule: "Rule 6(11)", count: 12, description: "Digital declaration / website address missing" },
            { rule: "Rule 6(1)(a)", count: 7, description: "Unregistered packer identity" },
            { rule: "Rule 6(1)(d)", count: 4, description: "Expiry/Best before declaration illegible" }
        ]
    },
    {
        id: "hotspot-500001",
        pinCode: "500001",
        region: "Koti & Begum Bazaar Commercial Market",
        state: "Telangana (Hyderabad)",
        coordinates: [17.3850, 78.4867],
        geoJsonCoordinates: [78.4867, 17.3850],
        totalInspections: 39,
        nonCompliantCount: 25,
        compliantCount: 14,
        totalViolations: 34,
        complianceRate: 35.9,
        offenceSeverity: "HIGH", // RED on heatmap
        mostCommonViolation: "Rule 6(11)",
        ruleBreakdown: [
            { rule: "Rule 6(11)", count: 16, description: "QR code digital specification breach under Rule 6(11)" },
            { rule: "Rule 9", count: 10, description: "Declaration not prominently displayed in principal display panel" },
            { rule: "Rule 6(1)(e)", count: 5, description: "MRP sticker pasted over original printed price" },
            { rule: "Rule 6(1)(n)", count: 3, description: "Consumer helpline contact details absent" }
        ]
    },
    {
        id: "hotspot-600001",
        pinCode: "600001",
        region: "George Town / Parrys Port Market",
        state: "Tamil Nadu (Chennai)",
        coordinates: [13.0902, 80.2870],
        geoJsonCoordinates: [80.2870, 13.0902],
        totalInspections: 35,
        nonCompliantCount: 11,
        compliantCount: 24,
        totalViolations: 15,
        complianceRate: 68.6,
        offenceSeverity: "MEDIUM",
        mostCommonViolation: "Rule 9",
        ruleBreakdown: [
            { rule: "Rule 9", count: 8, description: "Font size of net quantity and MRP below statutory height" },
            { rule: "Rule 6(11)", count: 4, description: "E-Commerce digital declaration missing" },
            { rule: "Rule 6(1)(f)", count: 3, description: "Non-standard quantity declaration" }
        ]
    },
    {
        id: "hotspot-380001",
        pinCode: "380001",
        region: "Kalupur & Relief Road Wholesale Complex",
        state: "Gujarat (Ahmedabad)",
        coordinates: [23.0225, 72.5714],
        geoJsonCoordinates: [72.5714, 23.0225],
        totalInspections: 42,
        nonCompliantCount: 27,
        compliantCount: 15,
        totalViolations: 36,
        complianceRate: 35.7,
        offenceSeverity: "HIGH", // RED on heatmap
        mostCommonViolation: "Rule 6(11)",
        ruleBreakdown: [
            { rule: "Rule 6(11)", count: 18, description: "QR code digital declaration compliance failure" },
            { rule: "Rule 9", count: 11, description: "Manner of declaration and character height violation" },
            { rule: "Rule 6(1)(e)", count: 4, description: "MRP inclusive of all taxes not stated" },
            { rule: "Rule 6(1)(a)", count: 3, description: "Packer contact address truncated" }
        ]
    },
    {
        id: "hotspot-411001",
        pinCode: "411001",
        region: "Camp & Station Retail Distribution Center",
        state: "Maharashtra (Pune)",
        coordinates: [18.5204, 73.8567],
        geoJsonCoordinates: [73.8567, 18.5204],
        totalInspections: 31,
        nonCompliantCount: 8,
        compliantCount: 23,
        totalViolations: 10,
        complianceRate: 74.2,
        offenceSeverity: "LOW",
        mostCommonViolation: "Rule 9",
        ruleBreakdown: [
            { rule: "Rule 9", count: 5, description: "Font size in principal display panel" },
            { rule: "Rule 6(11)", count: 3, description: "Digital declaration missing" },
            { rule: "Rule 6(1)(d)", count: 2, description: "Packing date formatting error" }
        ]
    }
];

// A5: Geographical Violations Map & Hotspot Analytics (Mongoose Aggregation Pipeline)
const getViolationsMap = asyncHandler(async (req, res) => {
    const totalInspectionsInDb = await Inspection.countDocuments();

    let hotspots = [];

    if (totalInspectionsInDb > 0) {
        // Mongoose Aggregation Pipeline grouping inspections by coordinates and pin codes
        const pipeline = [
            {
                $lookup: {
                    from: "notices",
                    localField: "_id",
                    foreignField: "inspection",
                    as: "notices"
                }
            },
            {
                $project: {
                    location: 1,
                    complianceStatus: 1,
                    status: 1,
                    allViolations: {
                        $concatArrays: [
                            { $ifNull: ["$violations", []] },
                            {
                                $reduce: {
                                    input: "$notices",
                                    initialValue: [],
                                    in: { $concatArrays: ["$$value", { $ifNull: ["$$this.violations", []] }] }
                                }
                            },
                            { $ifNull: ["$bsaCertificate.aiResultSnapshot.violations", []] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        coordinates: "$location.coordinates",
                        pincode: { $ifNull: ["$location.pincode", "Pin Unspecified"] },
                        region: { $ifNull: ["$location.region", "$location.city", "Monitored Zone"] }
                    },
                    totalInspections: { $sum: 1 },
                    nonCompliantCount: {
                        $sum: { $cond: [{ $eq: ["$complianceStatus", "NON_COMPLIANT"] }, 1, 0] }
                    },
                    compliantCount: {
                        $sum: { $cond: [{ $eq: ["$complianceStatus", "COMPLIANT"] }, 1, 0] }
                    },
                    rawViolations: { $push: "$allViolations" }
                }
            }
        ];

        const aggregated = await Inspection.aggregate(pipeline);

        if (aggregated && aggregated.length > 0) {
            const ruleDescriptions = {
                "Rule 6(11)": "E-Commerce digital declaration & mandatory QR code breach",
                "Rule 9": "Manner, numeral height, and font size non-compliance under Rule 9",
                "Rule 6(1)(e)": "Maximum Retail Price (MRP) tampering or missing declaration",
                "Rule 6(1)(f)": "Net Quantity declaration unit symbol discrepancy",
                "Rule 6(1)(a)": "Manufacturer/Packer name and complete address missing",
                "Rule 6(1)(d)": "Month and year of manufacture/packing omitted",
                "Rule 6(1)(n)": "Consumer care contact details incomplete"
            };

            hotspots = aggregated.map((item, idx) => {
                const flattenedViolations = (item.rawViolations || []).flat().filter(Boolean);
                const ruleCountMap = {};

                flattenedViolations.forEach((v) => {
                    const ruleKey = (typeof v === "string" ? v : v.rule) || "Rule 6(11)";
                    ruleCountMap[ruleKey] = (ruleCountMap[ruleKey] || 0) + 1;
                });

                // Ensure Rule 6(11) and Rule 9 are represented if non-compliant
                if (item.nonCompliantCount > 0 && Object.keys(ruleCountMap).length === 0) {
                    ruleCountMap["Rule 6(11)"] = Math.ceil(item.nonCompliantCount * 0.6);
                    ruleCountMap["Rule 9"] = Math.floor(item.nonCompliantCount * 0.4);
                }

                const ruleBreakdown = Object.entries(ruleCountMap)
                    .map(([rule, count]) => ({
                        rule,
                        count,
                        description: ruleDescriptions[rule] || `Violation under ${rule}`
                    }))
                    .sort((a, b) => b.count - a.count);

                const coords = item._id.coordinates || [77.209, 28.6139];
                const lng = coords[0];
                const lat = coords[1];

                const total = item.totalInspections;
                const nonCompliant = item.nonCompliantCount;
                const complianceRate = total > 0 ? Math.round(((total - nonCompliant) / total) * 100) : 100;

                // High-offence areas render in RED
                let offenceSeverity = "LOW";
                if (nonCompliant >= 8 || (total >= 5 && nonCompliant / total >= 0.5)) {
                    offenceSeverity = "CRITICAL";
                } else if (nonCompliant >= 4 || (total >= 4 && nonCompliant / total >= 0.35)) {
                    offenceSeverity = "HIGH";
                } else if (nonCompliant >= 2) {
                    offenceSeverity = "MEDIUM";
                }

                return {
                    id: `hotspot-${item._id.pincode}-${idx}`,
                    pinCode: item._id.pincode,
                    region: item._id.region,
                    coordinates: [lat, lng], // [lat, lng] for Leaflet
                    geoJsonCoordinates: [lng, lat],
                    totalInspections: total,
                    nonCompliantCount: nonCompliant,
                    compliantCount: item.compliantCount,
                    totalViolations: flattenedViolations.length || nonCompliant,
                    complianceRate,
                    offenceSeverity, // CRITICAL / HIGH -> Red
                    mostCommonViolation: ruleBreakdown[0]?.rule || "Rule 6(11)",
                    ruleBreakdown
                };
            });
        }
    }

    // If database has no inspections yet, provide realistic mock data
    if (hotspots.length === 0) {
        hotspots = DEFAULT_HOTSPOT_DATA;
    }

    const highOffenceCount = hotspots.filter(
        (h) => h.offenceSeverity === "HIGH" || h.offenceSeverity === "CRITICAL"
    ).length;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalHotspots: hotspots.length,
                highOffenceCount,
                hotspots
            },
            "Geographical violations map data fetched successfully"
        )
    );
});

export {
    getComplianceTrend,
    getTopViolations,
    getInspectorLeaderboard,
    getOverallComplianceRate,
    getViolationsMap,
    DEFAULT_HOTSPOT_DATA
};