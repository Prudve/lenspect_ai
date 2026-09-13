import { Router } from "express";
import {
    generateNotice,
    getAllNotices,
    getNoticeById,
    downloadNoticePDF,
    cancelNotice,
    getNoticeByInspection,
    getNoticeStats,
    getMyNotices
} from "../controllers/notice.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRoles } from "../middlewares/rbac.middleware.js";
import { USER_ROLES } from "../constants.js";

const router = Router();

// Secure all notice routes
router.use(verifyJWT);

// ─── Stat & Aggregate Routes ──────────────────────────────────────────────────

// N3: Count notices by status
router.route("/stats/summary").get(
    verifyRoles(USER_ROLES.ADMIN),
    getNoticeStats
);

// N4: Get notices issued by the currently logged-in officer
router.route("/me").get(getMyNotices);

// ─── Notice Generation ────────────────────────────────────────────────────────

// Trigger PDF generation for a non-compliant inspection
router.route("/generate/:inspectionId").post(
    verifyRoles(USER_ROLES.ADMIN, USER_ROLES.INSPECTOR),
    generateNotice
);

// ─── Inspection-Linked Lookup ─────────────────────────────────────────────────

// N2: Get the notice tied to a specific inspection (reverse lookup)
router.route("/inspection/:inspectionId").get(getNoticeByInspection);

// ─── List & Per-Notice Routes ─────────────────────────────────────────────────

// Fetch all issued legal notices
router.route("/").get(getAllNotices);

// Fetch notice metadata
router.route("/:noticeId").get(getNoticeById);

// N1: Cancel a notice
router.route("/:noticeId/cancel").patch(
    verifyRoles(USER_ROLES.ADMIN),
    cancelNotice
);

// Stream / download PDF document
router.route("/:noticeId/download").get(downloadNoticePDF);

export default router;