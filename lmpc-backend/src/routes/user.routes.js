import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    getAllUsers,
    getUserById,
    deleteUser,
    updateUserRole,
    getMyInspections
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRoles } from "../middlewares/rbac.middleware.js";
import { USER_ROLES } from "../constants.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────
router.route("/login").post(authLimiter, loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// ─── Protected Routes (any authenticated user) ────────────────────────────────
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);

// U5: Get all inspections submitted by the currently logged-in inspector
router.route("/me/inspections").get(verifyJWT, getMyInspections);

// ─── Admin-Only Routes ────────────────────────────────────────────────────────

// Register new users (only admins can create accounts)
router.route("/register").post(
    verifyJWT,
    verifyRoles(USER_ROLES.ADMIN),
    authLimiter,
    registerUser
);

// U1: List all users with optional role filter & pagination
router.route("/").get(
    verifyJWT,
    verifyRoles(USER_ROLES.ADMIN),
    getAllUsers
);

// U2: Get any user's profile | U3: Delete a user | U4: Update a user's role
router.route("/:userId")
    .get(verifyJWT, verifyRoles(USER_ROLES.ADMIN), getUserById)
    .delete(verifyJWT, verifyRoles(USER_ROLES.ADMIN), deleteUser);

router.route("/:userId/role").patch(
    verifyJWT,
    verifyRoles(USER_ROLES.ADMIN),
    updateUserRole
);

export default router;