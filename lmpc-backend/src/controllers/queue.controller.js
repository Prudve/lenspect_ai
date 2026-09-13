import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { inspectionQueue } from "../queues/inspection.queue.js";

// Q1: Live BullMQ queue stats
const getQueueStats = asyncHandler(async (req, res) => {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        inspectionQueue.getWaitingCount(),
        inspectionQueue.getActiveCount(),
        inspectionQueue.getCompletedCount(),
        inspectionQueue.getFailedCount(),
        inspectionQueue.getDelayedCount()
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            { waiting, active, completed, failed, delayed },
            "Queue statistics fetched successfully"
        )
    );
});

// Q2: List recent failed jobs with failure reasons
const getFailedJobs = asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    // BullMQ getFailed returns jobs in descending order by failure time
    const failedJobs = await inspectionQueue.getFailed(0, limit - 1);

    const formatted = failedJobs.map((job) => ({
        jobId: job.id,
        inspectionId: job.data?.inspectionId || null,
        imageUrl: job.data?.imageUrl || null,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    }));

    return res.status(200).json(
        new ApiResponse(
            200,
            { count: formatted.length, jobs: formatted },
            "Failed jobs fetched successfully"
        )
    );
});

// Q3: Bulk retry all failed jobs
const retryAllFailedJobs = asyncHandler(async (req, res) => {
    const failedJobs = await inspectionQueue.getFailed(0, 999);

    if (failedJobs.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, { retried: 0 }, "No failed jobs found to retry")
        );
    }

    const results = await Promise.allSettled(
        failedJobs.map((job) => job.retry())
    );

    const retried = results.filter((r) => r.status === "fulfilled").length;
    const skipped = results.filter((r) => r.status === "rejected").length;

    return res.status(200).json(
        new ApiResponse(
            200,
            { retried, skipped, total: failedJobs.length },
            `${retried} failed job(s) retried successfully`
        )
    );
});

export { getQueueStats, getFailedJobs, retryAllFailedJobs };