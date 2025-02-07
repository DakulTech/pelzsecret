import jwt from "jsonwebtoken";
import { ActivityLog, User } from "./models/index.js";
import { asyncHandler, HttpError } from "./utils.js";

// Authentication middleware
export const protect = asyncHandler(async (req, res, next) => {
  // Get token from cookie, but also check Bearer token for API compatibility
  let token = req.cookies.jwt;

  if (!token && req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new HttpError(401, "Not authorized to access this route");
  }

  // Verify token and check its structure
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (typeof decoded !== "string" && "id" in decoded) {
    // Find user and include role in selection
    const user = await User.findById(decoded.id).select("+role");
    if (!user) throw new HttpError(401, "User no longer exists");

    // @ts-ignore
    req.user = user;
    next();
  } else {
    throw new HttpError(401, "Invalid token");
  }
});

// Role-based access control
export const restrictTo = (
  /** @type {("super_admin" | "admin" | "editor")[]} */ ...roles
) => {
  return asyncHandler((req, res, next) => {
    // @ts-ignore
    if (!roles.includes(req.user.role)) {
      throw new HttpError(
        403,
        "You do not have permission to perform this action"
      );
    }
    next();
  });
};

/**
 * Middleware to log user activity.
 *
 * @param {"CREATE" | "UPDATE" | "DELETE" | "PASSWORD_RESET" | "LOGIN"} action - The action performed by the user.
 * @param {string} targetModel - The model on which the action is performed.
 * @returns {import("express").RequestHandler} Middleware function to log activity.
 */
export const logActivity = (action, targetModel) => async (req, res, next) => {
  const logData = {
    // @ts-ignore
    user: req.user.id,
    action,
    targetModel,
    targetId: req.params.id || null,
    ipAddress: req.ip,
    details: `${action} operation performed`,
  };

  // Don't wait for log to complete
  ActivityLog.create(logData).catch(console.error);

  next();
};
