import { rateLimit } from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

// Global rate limiter for standard API routes
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        throw new ApiError(
            options.statusCode,
            "Too many requests from this IP, please try again after 15 minutes"
        );
    }
});

// Stricter rate limiter for authentication endpoints (login, register)
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    limit: 1000, // Limit each IP to 1000 login/register attempts per windowMs
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        throw new ApiError(
            options.statusCode,
            "Too many authentication attempts. Please try again after 15 minutes."
        );
    }
});

// Rate limiter for file upload endpoints
export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20, // Limit each IP to 20 uploads per 15 minutes
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        throw new ApiError(
            options.statusCode,
            "Upload rate limit exceeded. Please try again later."
        );
    }
});