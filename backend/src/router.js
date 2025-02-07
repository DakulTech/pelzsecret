import { Router } from "express";
import {
  createCartController,
  getCartBySessionController,
  addCartItemController,
  updateCartItemController,
  removeCartItemController,
  clearCartController,
} from "./controllers/cart.js";
import {
  getCategoriesController,
  getCategoryByIdController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from "./controllers/categories.js";
import {
  getProductsController,
  getProductByIdController,
  getProductBySlugController,
  getProductsByCategoryController,
  createProductController,
  updateProductController,
  deleteProductController,
  updateProductInventoryController,
} from "./controllers/products.js";
import {
  createOrderController,
  getOrderByNumberController,
  updateOrderStatusController,
  updatePaymentStatusController,
} from "./controllers/orders.js";
import { register, login, logout } from "./controllers/auth.js";
import { logActivity, protect, restrictTo } from "./middleware.js";
import {
  createAdmin,
  deleteAdmin,
  forgotPassword,
  getAllAdmins,
  resetPassword,
  updateAdmin,
} from "./controllers/admin.js";
import { ActivityLog } from "./models/index.js";
import { getProductReviewsController, createReviewController, updateReviewStatusController, updateReviewHelpfulController } from "./controllers/reviews.js";
import { uploadImagesController, deleteImageController } from "./controllers/upload.js";

const router = Router({
  caseSensitive: true,
});

const r1 = restrictTo("super_admin", "admin", "editor");
const r2 = restrictTo("super_admin", "admin");
const r3 = restrictTo("super_admin");

// Upload Routes
router.post('/upload', uploadImagesController);
router.delete('/images/:filename', deleteImageController);

// Category Routes
router.get("/categories", getCategoriesController);
router.get("/categories/:id", getCategoryByIdController);
router.post("/categories", protect, r1, createCategoryController);
router.put("/categories/:id", protect, r1, updateCategoryController);
router.delete("/categories/:id", protect, r2, deleteCategoryController);

// Product Routes
router.get("/products", getProductsController);
router.get("/products/:id", getProductByIdController);
router.get("/products/slug/:slug", getProductBySlugController);
router.get("/products/category/:categoryId", getProductsByCategoryController);
router.post("/products", protect, r1, createProductController);
router.put("/products/:id", protect, r1, updateProductController);
router.delete("/products/:id", protect, r2, deleteProductController);
router.put("/products/:id/inventory", protect, r1, updateProductInventoryController);

// Cart Routes
router.post("/cart", createCartController);
router.get("/cart/:sessionId", getCartBySessionController);
router.post("/cart/:sessionId/items", addCartItemController);
router.put("/cart/:sessionId/items/:itemId", updateCartItemController);
router.delete("/cart/:sessionId/items/:itemId", removeCartItemController);
router.delete("/cart/:sessionId", clearCartController);

// Order Routes
router.post("/orders", createOrderController);
router.get("/orders/:orderNumber", getOrderByNumberController);
router.put("/orders/:orderNumber/status", updateOrderStatusController);
router.put(
  "/orders/:orderNumber/payment-status",
  updatePaymentStatusController
);

// Review Routes
router.get('/products/:productId/reviews', getProductReviewsController);
router.post('/products/:productId/reviews', createReviewController);
router.put('/reviews/:id/status', updateReviewStatusController);
router.put('/reviews/:id/helpful', updateReviewHelpfulController);

// auth routes
router.post("/auth/register",protect, r3, register);
router.post("/auth/login", login);
router.get("/auth/logout", protect, logout);

// admin routes
router.use("/admins", protect, r3);
router.get("/admins", getAllAdmins);
router.post(
  "/admins",
  logActivity("CREATE", "User"),
  createAdmin
);
router.patch(
  "/admins/:id",
  logActivity("UPDATE", "User"),
  updateAdmin
);
router.delete(
  "/admins/:id",
  logActivity("DELETE", "User"),
  deleteAdmin
);

// Password reset routes
router.post("/auth/forgot-password", forgotPassword);
router.patch("/auth/reset-password/:token", resetPassword);

// Activity Log routes
router.get(
  "/activity-logs",
  protect,
  r3,
  async (req, res) => {
    try {
      const logs = await ActivityLog.find()
        .populate("user", "email role")
        .sort("-timestamp");

      res.status(200).json({
        success: true,
        results: logs.length,
        data: logs,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
