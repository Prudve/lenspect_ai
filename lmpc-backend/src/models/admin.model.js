import mongoose from "mongoose";
import { User } from "./user.model.js";
import { USER_ROLES } from "../constants.js";

/**
 * Admin Model
 * Explicit Mongoose model for senior administrators and supervisory officers.
 * Backed by the core user schema with the role guaranteed to be USER_ROLES.ADMIN.
 */
export const Admin = mongoose.models.Admin || mongoose.model("Admin", User.schema);

export { User, USER_ROLES };
export default Admin;
