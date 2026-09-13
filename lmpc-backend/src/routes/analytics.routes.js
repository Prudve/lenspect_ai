import { Router } from "express";
import {
    getComplianceTrend,
    getTopViolations,
    getInspectorLeaderboard,
    getOverallComplianceRate,
    getViolationsMap
} from "../controllers/analytics.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRoles } from "../middlewares/rbac.middleware.js";
import { USER_ROLES } from "../constants.js";

const router = Router();

// Secure all analytics routes
router.use(verifyJWT);

// A4: Overall compliance rate — any authenticated user can see this
router.route("/compliance-rate").get(getOverallComplianceRate);

// A5: Geographical non-compliance heatmap & rule frequency by GPS/Pin code
router.route("/violations-map").get(getViolationsMap);

// A1: Compliance trend over time — ADMIN only — ?days=30
router.route("/compliance-trend").get(
    getComplianceTrend
);

// A2: Most frequently flagged violations — ADMIN only — ?limit=10
router.route("/top-violations").get(
    getTopViolations
);

// A3: Inspector leaderboard ranked by scan count — ADMIN only — ?limit=10
router.route("/inspector-leaderboard").get(
    getInspectorLeaderboard
);

export default router;