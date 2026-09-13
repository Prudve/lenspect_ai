import mongoose, { Schema } from "mongoose";

const noticeSchema = new Schema(
    {
        noticeNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },
        inspection: {
            type: Schema.Types.ObjectId,
            ref: "Inspection",
            required: true,
            unique: true
        },
        issuedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        pdfUrl: {
            type: String,
            default: null
        },
        cloudinaryPublicId: {
            type: String,
            default: null
        },
        violations: [
            {
                rule: { type: String, required: true },
                description: { type: String, required: true }
            }
        ],
        status: {
            type: String,
            enum: ["DRAFT", "ISSUED", "CANCELLED"],
            default: "ISSUED"
        }
    },
    {
        timestamps: true
    }
);

export const Notice = mongoose.model("Notice", noticeSchema);