import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { asyncHandler, HttpError } from "../utils.js";

/**
 * Cookie configuration options
 * @type {import("express").CookieOptions}
 */
const cookieOptions = {
  httpOnly: true, // Prevents JavaScript access to the cookie
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict',
  maxAge: Number(process.env.JWT_EXPIRES_IN) || 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

// Generate JWT Token
export const signToken = (/** @type {any} */ id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: Number(process.env.JWT_EXPIRES_IN) || "7d",
  });
};

// Register User
export const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.create({ email, password });
  
  // Generate JWT and set cookie
  const token = signToken(user._id);
  res.cookie('jwt', token, cookieOptions);
  
  // Send response without including token in body
  res.status(201).json({
    success: true,
    user
  });
});

// Login User
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // 1. Check if user exists
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new HttpError(401, "Invalid email or password");
  
  // 2. Verify password
  // @ts-ignore
  const isCorrect = await user.comparePassword(password);
  if (!isCorrect) throw new HttpError(401, "Invalid email or password");
  
  // 3. Generate JWT and set cookie
  const token = signToken(user._id);
  res.cookie('jwt', token, cookieOptions);
  
  // Send response without including token in body
  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      email: user.email,
      active: user.active,
      createdAt: user.createdAt,
    },
  });
});

// Logout User
export const logout = asyncHandler(async (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Cookie expires in 10 seconds
    httpOnly: true
  });
  
  res.status(200).json({ success: true });
});