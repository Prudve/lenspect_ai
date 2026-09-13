import mongoose, { Schema } from "mongoose";

const boundingBoxSchema = new Schema(
    {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        w: { type: Number, required: true },
        h: { type: Number, required: true },
        label: { type: String, required: true }
    },
    { _id: false }
);

// Sub-schema for each image in a multi-panel scan
const panelImageSchema = new Schema(
    {
        imageUrl: { type: String, required: true },
        cloudinaryPublicId: { type: String, required: true },
        panelLabel: { type: String, default: null } // e.g. "front", "back", "side"
    },
    { _id: false }
);

// Sub-schema for the Section 63 BSA evidence certificate
const bsaCertificateSchema = new Schema(
    {
        // The SHA-256 hex digest of the canonical evidence payload
        sha256Hash: {
            type: String,
            required: true,
            immutable: true
        },
        // Per-image SHA-256 hashes — binds the certificate to exact pixel data
        imageHashes: {
            type: [String],
            default: [],
            immutable: true
        },
        // NTP-sourced ISO-8601 timestamp used in the canonical payload
        networkTimestamp: {
            type: String,
            required: true,
            immutable: true
        },
        // GPS coordinates at time of capture
        gps: {
            latitude:  { type: Number, required: true, immutable: true },
            longitude: { type: Number, required: true, immutable: true }
        },
        // Snapshot of the AI result included in the hash (for re-verification)
        aiResultSnapshot: {
            type: Schema.Types.Mixed,
            required: true,
            immutable: true
        }
    },
    { _id: false }
);

const inspectionSchema = new Schema(
    {
        inspector: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        // Original single-image field
        imageUrl: {
            type: String,
            default: null
        },
        cloudinaryPublicId: {
            type: String,
            default: null
        },
        // array for multi-panel scans (1–5 images of the same product)
        multiImages: {
            type: [panelImageSchema],
            default: []
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
                required: true
            },
            coordinates: {
                type: [Number],
                required: true
            },
            pincode: {
                type: String,
                default: null,
                index: true
            },
            region: {
                type: String,
                default: null
            },
            city: {
                type: String,
                default: null
            }
        },
        status: {
            type: String,
            enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
            default: "PENDING",
            index: true
        },
        extractedData: {
            mrp_val: { type: Number, default: null },
            unit_symbol: { type: String, default: null },
            net_quantity: { type: String, default: null },
            mfg_date: { type: Schema.Types.Mixed, default: null },
            country_origin: { type: String, default: null },
            manufacturer_name: { type: String, default: null },
            commodity_name: { type: String, default: null }
        },
        complianceStatus: {
            type: String,
            enum: ["COMPLIANT", "NON_COMPLIANT", "NEEDS_REVIEW"],
            default: "NEEDS_REVIEW",
            index: true
        },
        violations: [
            {
                rule: { type: String, required: true },
                description: { type: String, default: "" }
            }
        ],
        boundingBoxes: [boundingBoxSchema],
        failureReason: {
            type: String,
            default: null
        },
        // ── Section 63 BSA Evidence Fields ───────────────────────────────────
        // immutable: once written, these fields cannot be overwritten via .save()
        // Storing the hash top-level enables fast indexed lookups for re-verification
        evidenceHash: {
            type: String,
            default: null,
            immutable: true,
            index: true
        },
        // Full structured BSA certificate — embedded for self-contained admissibility
        bsaCertificate: {
            type: bsaCertificateSchema,
            default: null
        }
    },
    {
        timestamps: true
    }
);

inspectionSchema.index({ location: "2dsphere" });

export const Inspection = mongoose.model("Inspection", inspectionSchema);