import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

// Queue name constant
export const INSPECTION_QUEUE_NAME = "inspection-cv-queue";

// Create BullMQ Queue instance
export const inspectionQueue = new Queue(INSPECTION_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, // Retry up to 3 times if AI service or network fails
        backoff: {
            type: "exponential",
            delay: 5000 // Retry after 5s, 10s, 20s...
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs in Redis for 24 hours
            count: 1000
        },
        removeOnFail: {
            age: 7 * 24 * 3600 // Keep failed jobs for 7 days for debugging
        }
    }
});

/**
 * Adds an inspection scan image processing job to the queue
 * @param {string} inspectionId - MongoDB inspection document ID
 * @param {string} imageUrl - Cloudinary public image URL
 */
export const addInspectionJob = async (inspectionId, imageUrl) => {
    return await inspectionQueue.add("process-inspection-cv", {
        inspectionId,
        imageUrl
    });
};