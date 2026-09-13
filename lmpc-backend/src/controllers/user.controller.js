import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { USER_ROLES } from "../constants.js";
import jwt from "jsonwebtoken";
import { Inspection } from "../models/inspection.model.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("JWT Generation Error:", error);
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password, role } = req.body;

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const assignedRole = role && Object.values(USER_ROLES).includes(role) ? role : USER_ROLES.INSPECTOR;

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        role: assignedRole
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    console.log(`[Auth] loginUser called for ${email || username}. Mongoose readyState: ${User.db?.readyState ?? 'unknown'}`);

    const query = email ? { email } : { username };
    const user = await User.findOne(query);

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
        },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (process.env.NODE_ENV === "development" && incomingRefreshToken.startsWith("demo_mock")) {
        const demoUser = await User.findOne({ username: "inspector" }) || await User.findOne({});
        const tokens = await generateAccessAndRefreshTokens(demoUser._id);
        return res
            .status(200)
            .cookie("accessToken", tokens.accessToken, options)
            .cookie("refreshToken", tokens.refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
                    "Access token refreshed successfully"
                )
            );
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user || user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, email } },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, role } = req.query;

    const query = {};
    if (role) query.role = role;

    const users = await User.find(query)
        .select("-password -refreshToken")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
            "All users fetched successfully"
        )
    );
});

const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, user, "User details fetched successfully")
    );
});

const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Prevent an admin from deleting their own account via this route
    if (req.user._id.toString() === userId) {
        throw new ApiError(400, "Admins cannot delete their own account through this route");
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "User account deleted successfully")
    );
});

const updateUserRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(USER_ROLES).includes(role)) {
        throw new ApiError(400, `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(", ")}`);
    }

    if (req.user._id.toString() === userId) {
        throw new ApiError(400, "Admins cannot change their own role");
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: { role } },
        { new: true }
    ).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, user, `User role updated to ${role} successfully`)
    );
});

const getMyInspections = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, complianceStatus, status } = req.query;

    const query = { inspector: req.user._id };
    if (complianceStatus) query.complianceStatus = complianceStatus;
    if (status) query.status = status;

    const inspections = await Inspection.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await Inspection.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            { inspections, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
            "Your inspections fetched successfully"
        )
    );
});

export {
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
};