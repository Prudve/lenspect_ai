import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { INSPECTION_QUEUE_NAME } from "./inspection.queue.js";
import { Inspection } from "../models/inspection.model.js";
import { analyzeImageWithFastAPI } from "../services/aiMicroservice.service.js";

export const inspectionWorker = new Worker(
    INSPECTION_QUEUE_NAME,
    async (job) => {
        const { inspectionId, imageUrl } = job.data;

        console.log(`[Queue Worker] Processing job ${job.id} for inspection ${inspectionId}`);

        // Update status to PROCESSING in MongoDB
        const inspection = await Inspection.findById(inspectionId);
        if (!inspection) {
            throw new Error(`Inspection record not found for ID: ${inspectionId}`);
        }

        inspection.status = "PROCESSING";
        await inspection.save();

        try {
            // Call Python FastAPI AI/CV Microservice
            const cvResults = await analyzeImageWithFastAPI(imageUrl);

            // Save extracted OCR attributes, bounding boxes, and compliance evaluation
            inspection.status = "COMPLETED";
            inspection.extractedData = cvResults.extractedData;
            inspection.boundingBoxes = cvResults.boundingBoxes;
            inspection.complianceStatus = cvResults.isCompliant
                ? "COMPLIANT"
                : "NON_COMPLIANT";
            inspection.violations = cvResults.violations || [];
            
            await inspection.save();
            console.log(`[Queue Worker] Job ${job.id} completed successfully`);

            return { success: true, inspectionId };
        } catch (error) {
            // Mark status as FAILED if AI microservice throws an error
            inspection.status = "FAILED";
            inspection.failureReason = error.message || "AI Microservice processing failed";
            await inspection.save();

            console.error(`[Queue Worker] Job ${job.id} failed:`, error.message);
            throw error; // Re-throw to inform BullMQ of failure
        }
    },
    {
        connection: redisConnection,
        concurrency: 5 // Process up to 5 concurrent images simultaneously
    }
);

// Worker Event Listeners
inspectionWorker.on("completed", (job) => {
    console.log(`Job ${job.id} finished successfully`);
});

inspectionWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error: ${err.message}`);
});