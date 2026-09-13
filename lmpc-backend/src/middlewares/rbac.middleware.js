import { ApiError } from "../utils/ApiError.js";

export const verifyRoles = (...allowedRoles) => {
    return (req, _, next) => {
        if (!req.user || !req.user.role) {
            throw new ApiError(401, "Unauthorized request");
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new ApiError(
                403,
                `Access denied: Role '${req.user.role}' is not authorized to perform this action`
            );
        }

        next();
    };
};