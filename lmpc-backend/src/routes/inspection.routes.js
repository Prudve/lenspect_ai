import { Router } from "express";
import {
    uploadInspectionScan,
    getAllInspections,
    getInspectionById,
    getGeospatialHeatmap,
    reviewInspection,
    deleteInspection,
    retryInspection,
    getInspectionStats,
    getNearbyInspections,
    getMyInspections,
    getInspectionsByVendor,
    batchUploadScans,
    uploadMultiPanelScan
} from "../controllers/inspection.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRoles } from "../middlewares/rbac.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { USER_ROLES } from "../constants.js";
import { uploadLimiter } from "../middlewares/rateLimiter.middleware.js";
const router = Router();

// Secure all inspection routes with JWT verification
router.use(verifyJWT);

// ─── Stat & Aggregate Routes (no :id param — must come before /:inspectionId) ─

// I3: Aggregate compliance and status counts
router.route("/stats/summary").get(getInspectionStats);

// I5: Logged-in inspector's own inspections
router.route("/me").get(getMyInspections);

// ─── Geospatial Routes ────────────────────────────────────────────────────────

// Get GeoJSON FeatureCollection for Leaflet.js heatmap
router.route("/geospatial/heatmap").get(getGeospatialHeatmap);

// I4: Find inspections within a radius — ?lat=&lng=&radius=&complianceStatus=
router.route("/geospatial/nearby").get(getNearbyInspections);

// ─── Upload Routes ────────────────────────────────────────────────────────────

// Single scan upload
router.route("/upload-scan").post(
    uploadLimiter,
    verifyRoles(USER_ROLES.INSPECTOR, USER_ROLES.ADMIN),
    upload.single("image"),
    uploadInspectionScan
);

router.route("/upload-multi-panel").post(
    uploadLimiter,
    verifyRoles(USER_ROLES.INSPECTOR, USER_ROLES.ADMIN),
    upload.array("images", 5),
    uploadMultiPanelScan
);

// I7: Batch upload — accepts up to 10 images in one request
router.route("/batch-upload").post(
    uploadLimiter,
    verifyRoles(USER_ROLES.INSPECTOR, USER_ROLES.ADMIN),
    upload.array("images", 10),
    batchUploadScans
);

// ─── Vendor Filter Route ──────────────────────────────────────────────────────

// I6: Filter inspections by vendor/manufacturer name
router.route("/vendor/:vendorName").get(
    verifyRoles(USER_ROLES.ADMIN),
    getInspectionsByVendor
);

// ─── Paginated List ───────────────────────────────────────────────────────────

// Fetch all inspections with optional filters
router.route("/").get(getAllInspections);

// ─── Per-Inspection Routes ────────────────────────────────────────────────────

// Get details | Manual review update | Delete
router.route("/:inspectionId")
    .get(getInspectionById)
    .patch(verifyRoles(USER_ROLES.ADMIN, USER_ROLES.INSPECTOR), reviewInspection)
    .delete(verifyRoles(USER_ROLES.ADMIN), deleteInspection);

// I2: Re-queue a FAILED inspection
router.route("/:inspectionId/retry").post(
    verifyRoles(USER_ROLES.ADMIN, USER_ROLES.INSPECTOR),
    retryInspection
);

export default router;