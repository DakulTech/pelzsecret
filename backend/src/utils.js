import mongoose from "mongoose";
import nodemailer from "nodemailer";

/**
 * @param {import("dotenv").DotenvParseOutput} env
 */
export async function connectDB(env) {
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit process with failure
  }
}

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * Response wrapper format
 * @typedef {Object} ResponseWrapper
 * @property {boolean} status - Whether the request succeeded
 * @property {number} timestamp - Response timestamp
 * @property {string} path - Request path
 * @property {string} method - HTTP method
 * @property {any} [data] - Response data (success case)
 * @property {any} [error] - Error details (error case)
 */

/**
 * Wraps all responses in a standardized JSON format with metadata
 * @example
 * router.get('/data', asyncHandler(async (req, res) => {
 *   const result = await fetchData();
 *   return result; // Will be wrapped automatically
 * }));
 *
 * @param {RequestHandler} fn - Async route handler
 * @returns {RequestHandler} Wrapped handler with standardized responses
 */
export function asyncHandler(fn) {
  /** @type {RequestHandler & {(): Promise<void>}} */
  return async (req, res, next) => {
    // Preserve original JSON method
    const originalJson = res.json;
    try {
      // Response wrapper for success cases
      res.json = (data) => {
        /** @type {ResponseWrapper} */
        const wrapped = {
          status: true,
          timestamp: Date.now(),
          path: req.originalUrl,
          method: req.method,
          data,
        };
        originalJson.call(res, wrapped);
        return res;
      };

      await fn(req, res, (/** @type {any} */ arg) => {
        res.json = originalJson; // Restore original JSON method
        next(arg); // Forward to Express error handler
      });
    } catch (error) {
      // Restore original JSON method
      res.json = originalJson;
      // Only handle errors if response hasn't been sent
      if (!res.headersSent) {
        /** @type {ResponseWrapper} */
        const wrapped = {
          status: false,
          timestamp: Date.now(),
          path: req.originalUrl,
          method: req.method,
          error: {
            message: error.message,
            code: error.statusCode || 500,
            stack:
              process.env.NODE_ENV === "development" ? error.stack : undefined,
            details: error.details,
          },
        };

        // Set proper HTTP status code
        res.status(error.statusCode || 500).json(wrapped);

        process.env.NODE_ENV === "development" && console.error(error);
      } else {
        // Forward to Express error handler if headers already sent
        next(error);
      }
    }
  };
}

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendResetEmail = async (
  /** @type {string} */ email,
  /** @type {string} */ token
) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const mailOptions = {
    to: email,
    subject: "🔒 Pelzsecret Password Reset Request",
    html: /* html */`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(177, 156, 217, 0.15);">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px; background: #5A5AC9; border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">
                      <img src="https://pelzsecret.vercel.app/assets/img/logo/logo1.png" alt="Pelzsecret" width="32" height="32" style="vertical-align: middle; margin-right: 12px;">
                      Pelzsecret
                    </h1>
                  </td>
                </tr>
  
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="color: #2D2D2D; margin: 0 0 24px 0;">Password Reset Request</h2>
                    <p style="color: #666; line-height: 1.6; margin: 0 0 32px 0;">
                      We received a request to reset your Pelzsecret account password. 
                      Click the button below to securely update your credentials:
                    </p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${resetUrl}" 
                         style="background: #5A5AC9; color: white; padding: 16px 32px; 
                                text-decoration: none; font-weight: 600;
                                display: inline-block; transition: transform 0.2s ease;
                                box-shadow: 0 4px 12px rgba(177, 156, 217, 0.3);">
                        Reset Password
                      </a>
                    </div>
  
                    <p style="color: #999; font-size: 14px; margin: 24px 0 0 0;">
                      ⏳ This link expires in 1 hour<br>
                      🔐 Not your request? <a href="mailto:support@pelzsecret.com" 
                        style="color: #5A5AC9; text-decoration: none;">Contact us immediately</a>
                    </p>
                  </td>
                </tr>
  
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background: #F5F2FA; border-radius: 0 0 16px 16px;">
                    <p style="color: #888; font-size: 12px; line-height: 1.6; margin: 0;">
                      This email was sent to ${email}.<br>
                      © ${new Date().getFullYear()} Pelzsecret. All rights reserved.<br>
                      <a href="https://pelzsecret.com/privacy" style="color: #5A5AC9; text-decoration: none;">Privacy Policy</a> 
                      | 
                      <a href="#" style="color: #5A5AC9; text-decoration: none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
  await transporter.sendMail(mailOptions);
};

export class HttpError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Formats Zod error messages into a single string
 * @param {import('zod').ZodError} error - Zod error object
 * @returns {string} Formatted error message
 */
export function formatZodErrorToString(error) {
  return error.errors.map((err) => `${err.path} is ${err.message}\n`).join(", ");
}