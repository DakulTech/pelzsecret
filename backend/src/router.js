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

const apiRouter = Router({
  caseSensitive: true,
});

const r1 = restrictTo("super_admin", "admin", "editor");
const r2 = restrictTo("super_admin", "admin");
const r3 = restrictTo("super_admin");

// Upload Routes
apiRouter.post('/upload', uploadImagesController);
apiRouter.delete('/images/:filename', deleteImageController);

// Category Routes
apiRouter.get("/categories", getCategoriesController);
apiRouter.get("/categories/:id", getCategoryByIdController);
apiRouter.post("/categories", protect, r1, createCategoryController);
apiRouter.put("/categories/:id", protect, r1, updateCategoryController);
apiRouter.delete("/categories/:id", protect, r2, deleteCategoryController);

// Product Routes
apiRouter.get("/products", getProductsController);
apiRouter.get("/products/:id", getProductByIdController);
apiRouter.get("/products/slug/:slug", getProductBySlugController);
apiRouter.get("/products/category/:categoryName", getProductsByCategoryController);
apiRouter.post("/products", protect, r1, createProductController);
apiRouter.put("/products/:id", protect, r1, updateProductController);
apiRouter.delete("/products/:id", protect, r2, deleteProductController);
apiRouter.put("/products/:id/inventory", protect, r1, updateProductInventoryController);

// Cart Routes
apiRouter.post("/cart", createCartController);
apiRouter.get("/cart/:sessionId", getCartBySessionController);
apiRouter.post("/cart/:sessionId/items", addCartItemController);
apiRouter.put("/cart/:sessionId/items/:itemId", updateCartItemController);
apiRouter.delete("/cart/:sessionId/items/:itemId", removeCartItemController);
apiRouter.delete("/cart/:sessionId", clearCartController);

// Order Routes
apiRouter.post("/orders", createOrderController);
apiRouter.get("/orders/:orderNumber", getOrderByNumberController);
apiRouter.put("/orders/:orderNumber/status", updateOrderStatusController);
apiRouter.put(
  "/orders/:orderNumber/payment-status",
  updatePaymentStatusController
);

// Review Routes
apiRouter.get('/products/:productId/reviews', getProductReviewsController);
apiRouter.post('/products/:productId/reviews', createReviewController);
apiRouter.put('/reviews/:id/status', updateReviewStatusController);
apiRouter.put('/reviews/:id/helpful', updateReviewHelpfulController);

// auth routes
apiRouter.post("/auth/register",protect, r3, register);
apiRouter.post("/auth/login", login);
apiRouter.get("/auth/logout", protect, logout);

// admin routes
apiRouter.use("/admins", protect, r3);
apiRouter.get("/admins", getAllAdmins);
apiRouter.post(
  "/admins",
  logActivity("CREATE", "User"),
  createAdmin
);
apiRouter.patch(
  "/admins/:id",
  logActivity("UPDATE", "User"),
  updateAdmin
);
apiRouter.delete(
  "/admins/:id",
  logActivity("DELETE", "User"),
  deleteAdmin
);

// Password reset routes
apiRouter.post("/auth/forgot-password", forgotPassword);
apiRouter.patch("/auth/reset-password/:token", resetPassword);

// Activity Log routes
apiRouter.get(
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

export default apiRouter;
