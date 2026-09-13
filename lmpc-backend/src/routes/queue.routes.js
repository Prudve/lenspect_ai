import { Router } from "express";
import {
    getQueueStats,
    getFailedJobs,
    retryAllFailedJobs
} from "../controllers/queue.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRoles } from "../middlewares/rbac.middleware.js";
import { USER_ROLES } from "../constants.js";

const router = Router();

// All queue monitoring routes are ADMIN-only
router.use(verifyJWT, verifyRoles(USER_ROLES.ADMIN));

// Q1: Live waiting/active/completed/failed/delayed counts
router.route("/stats").get(getQueueStats);

// Q2: List recent failed jobs with reasons — ?limit=20
router.route("/failed-jobs").get(getFailedJobs);

// Q3: Bulk retry all failed jobs
router.route("/retry-all-failed").post(retryAllFailedJobs);

export default router;