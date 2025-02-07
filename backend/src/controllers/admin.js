// @ts-nocheck
import { User } from "../models/index.js";
import { asyncHandler, HttpError, sendResetEmail } from "../utils.js";
import { signToken } from "./auth.js";

// Super Admin: Create new admin users
export const createAdmin = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  // Only allow creation of equal or lower roles
  const allowedRoles = ["admin", "editor"];
  if (req.user.role === "super_admin") allowedRoles.push("super_admin");

  if (!allowedRoles.includes(role)) {
    throw new HttpError(403, "You cannot create a user with this role");
  }

  const newUser = await User.create({
    email,
    password,
    role,
    createdBy: req.user.id,
  });

  const token = signToken(newUser._id);

  res.status(201).json({
    token,
    user: {
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      createdBy: newUser.createdBy,
    },
  });
});

// Get all admins (only visible to super_admin)
export const getAllAdmins = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $in: ["super_admin", "admin"] } });
  res.status(200).json({
    results: users.length,
    users,
  });
});

// Update Admin
export const updateAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Prevent role escalation
  if (updates.role && req.user.role !== "super_admin") {
    throw new HttpError(403, "Only super admins are allowed to change roles");
  }

  const updatedUser = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json(updatedUser);
});

// Delete Admin (Soft Delete)
export const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    throw new HttpError(403, "Oops! You cannot delete yourself");
  }

  await User.findByIdAndUpdate(id, { active: false });

  res.status(204).json(null);
});

// Password Reset Flow
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) throw new HttpError(404, "User not found");

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString("hex");
  const resetExpire = Date.now() + 3600000; // 1 hour

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = resetExpire;
  await user.save();

  sendResetEmailail(user.email, resetToken);

  res.status(200).json({ message: "Reset email sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) throw new HttpError(400, "Invalid token or token has expired");

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({ success: true, message: "Password updated" });
});
