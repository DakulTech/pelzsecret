import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { createLogger, format, transports } from "winston";
import { User } from "./src/models/index.js";

// Configure environment variables
dotenv.config();

// Configure logger with brand colors
const logger = createLogger({
  format: format.combine(
    format.colorize(),
    format.printf(({ level, message }) => {
      const purple = "\x1b[35m";
      const reset = "\x1b[0m";
      return `${purple}[Pelzsecret]${reset} ${level}: ${message}`;
    })
  ),
  transports: [new transports.Console()],
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Connected to database");
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Super Admin Seed Function
const seedSuperAdmin = async () => {
  try {
    // Check for existing super admin
    const existingSuperAdmin = await User.findOne({ role: "super_admin" });

    if (existingSuperAdmin) {
      logger.info(`Super admin already exists: ${existingSuperAdmin.email}`);
      return;
    }

    const superAdmin = await User.create({
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD,
      role: "super_admin",
    });

    logger.info(`
    🎉 Successfully created initial super admin:
    -------------------------------------------
    Email:    ${superAdmin.email}
    Password: ${process.env.SUPERADMIN_PASSWORD}
    -------------------------------------------
    ℹ️ Please change this password immediately after first login!
    `);
  } catch (error) {
    logger.error(`Super admin creation failed: ${error.message}`);
  } finally {
    mongoose.disconnect();
  }
};

// Execute the script
(async () => {
  try {
    await connectDB();
    await seedSuperAdmin();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
})();
