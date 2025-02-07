import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

// User Schema

/**
 * User Schema
 * 
 * @typedef {Object} UserSchema
 * @property {string} email - The user's email address. Must be unique and lowercase.
 * @property {string} password - The user's password. Must be at least 8 characters long and is not selected by default.
 * @property {string} role - The user's role. Can be one of "super_admin", "admin", or "editor". Defaults to "editor".
 * @property {string} [resetPasswordToken] - Token used for resetting the user's password.
 * @property {Date} [resetPasswordExpire] - Expiration date for the reset password token.
 * @property {boolean} [active=true] - Indicates whether the user is active. Defaults to true.
 * @property {Schema.Types.ObjectId} [createdBy] - Reference to the user who created this user.
 * @property {Date} [createdAt=Date.now] - The date when the user was created. Defaults to the current date.
 */
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ["super_admin", "admin", "editor"],
    default: "editor",
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  active: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function (
  /** @type {string} */ candidatePassword
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Guest Guest/Customer Schema (for order information only)
const customerSchema = new Schema({
  email: {
    type: String,
    required: true,
    trim: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  phoneNumber: String,
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  billingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Category Schema
const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  parent: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },
  image: String,
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Product Schema
const productSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  compareAtPrice: Number,
  categories: [
    {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
  ],
  brand: String,
  sku: {
    type: String,
    unique: true,
  },
  inventory: {
    quantity: {
      type: Number,
      default: 10,
    },
    reserved: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["in_stock", "out_of_stock", "discontinued"],
      default: "in_stock",
    },
  },
  variants: [
    {
      name: String,
      sku: String,
      price: Number,
      inventory: Number,
      attributes: [
        {
          name: String,
          value: String,
        },
      ],
    },
  ],
  images: [
    {
      url: String,
      alt: String,
      isDefault: Boolean,
    },
  ],
  specifications: [
    {
      name: String,
      value: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// Cart Schema
const cartSchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  items: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      variant: {
        type: Schema.Types.ObjectId,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  status: {
    type: String,
    enum: ["active", "converted", "abandoned", "expired"],
    default: "active",
  },
  totals: {
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// Order Schema
const orderSchema = new Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  sessionId: String,
  items: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      variant: {
        type: Schema.Types.ObjectId,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  subtotal: {
    type: Number,
    required: true,
  },
  tax: Number,
  shipping: {
    method: String,
    cost: Number,
  },
  discount: {
    code: String,
    amount: Number,
  },
  total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  paymentMethod: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// Review Schema
const reviewSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: String,
  comment: String,
  images: [
    {
      url: String,
    },
  ],
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
  helpfulVotes: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Activity Log Schema
const activityLogSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ["CREATE", "UPDATE", "DELETE", "PASSWORD_RESET", "LOGIN"],
  },
  targetModel: {
    type: String,
    enum: ["User", "Admin", "Content"],
  },
  targetId: Schema.Types.ObjectId,
  details: String,
  ipAddress: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Compile and export models
const User = model("User", userSchema);
const Customer = model("Customer", customerSchema);
const Category = model("Category", categorySchema);
const Product = model("Product", productSchema);
const Cart = model("Cart", cartSchema);
const Order = model("Order", orderSchema);
const Review = model("Review", reviewSchema);
const ActivityLog = model("ActivityLog", activityLogSchema);

export default {
  User,
  Customer,
  Category,
  Product,
  Cart,
  Order,
  Review,
  ActivityLog,
};

export { User, Customer, Category, Product, Cart, Order, Review, ActivityLog };
