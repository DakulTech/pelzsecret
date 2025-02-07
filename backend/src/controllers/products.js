import { asyncHandler as expressAsyncHandler, formatZodErrorToString, HttpError } from "../utils.js";
import mongoose from "mongoose";
import { Product, Category } from "../models/index.js";
import { productSchema } from "../zodSchema.js";

/**
 * @typedef {Object} ProductQuery
 * @property {string} [search] - Search term for product name/description
 * @property {string} [sort] - Field to sort by
 * @property {number} [page] - Page number
 * @property {number} [limit] - Items per page
 * @property {"asc" | "desc"} [order] - Sort order
 * @property {number} [minPrice] - Minimum price filter
 * @property {number} [maxPrice] - Maximum price filter
 */

/**
 * Get all products with filtering, search, and pagination
 */
export const getProductsController = expressAsyncHandler(async (req, res) => {
  /** @type {ProductQuery} */
  const {
    search = "",
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
    minPrice,
    maxPrice,
  } = req.query;

  const query = { isActive: true };

  // Search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const products = await Product.find(query)
    .sort({ [sort]: order })
    .skip(skip)
    .limit(Number(limit))
    .populate("categories", "name");

  const total = await Product.countDocuments(query);

  res.status(200).json({
    products,
    currentPage: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    total,
  });
});

/**
 * Get a single product by ID
 */
export const getProductByIdController = expressAsyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, "Invalid product ID");
    }

    const product = await Product.findById(id).populate(
      "categories",
      "name slug"
    );

    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    res.status(200).json(product);
  }
);

/**
 * Get a single product by slug
 */
export const getProductBySlugController = expressAsyncHandler(
  async (req, res) => {
    const { slug } = req.params;

    const product = await Product.findOne({ slug }).populate(
      "categories",
      "name slug"
    );

    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    res.status(200).json(product);
  }
);

/**
 * Get products by category
 */
export const getProductsByCategoryController = expressAsyncHandler(
  async (req, res) => {
    const { categoryId } = req.params;
    /** @type {ProductQuery} */
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new HttpError(400, "Invalid category ID");
    }

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new HttpError(404, "Category not found");
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find({
      categories: categoryId,
      isActive: true,
    })
      .sort({ [sort]: order })
      .skip(skip)
      .limit(Number(limit))
      .populate("categories", "name slug");

    const total = await Product.countDocuments({
      categories: categoryId,
      isActive: true,
    });

    res.status(200).json({
      products,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
    });
  }
);

/**
 * Create a new product
 */
export const createProductController = expressAsyncHandler(async (req, res) => {
  const {
    success, data, error
  } = await productSchema.safeParseAsync(req.body);

  console.log(req.body)

  if (!success) {
    throw new HttpError(400, formatZodErrorToString(error));
  }


  const {
    name,
    description,
    price,
    compareAtPrice,
    categories,
    brand,
    sku,
    inventory,
    variants,
    images,
    specifications,
  } = data;

  // Generate slug
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Check for duplicate slug
  const existingProduct = await Product.findOne({ slug });
  if (existingProduct) {
    throw new HttpError(400, "Product with this name already exists");
  }

  // Validate categories
  if (categories) {
    for (const categoryId of categories) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new HttpError(400, `Invalid category ID: ${categoryId}`);
      }
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new HttpError(404, `Category not found: ${categoryId}`);
      }
    }
  }

  const product = await Product.create({
    name,
    slug,
    description,
    price,
    compareAtPrice,
    categories,
    brand,
    sku,
    inventory,
    variants,
    images,
    specifications,
    isActive: true,
  });

  res.status(201).json(product);
});

/**
 * Update a product
 */
export const updateProductController = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid product ID");
  }

  const product = await Product.findById(id);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  // If name is being updated, update slug and check for duplicates
  if (updates.name && updates.name !== product.name) {
    const slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existingProduct = await Product.findOne({
      slug,
      _id: { $ne: id },
    });

    if (existingProduct) {
      throw new HttpError(400, "Product with this name already exists");
    }

    updates.slug = slug;
  }

  // Validate categories if being updated
  if (updates.categories) {
    for (const categoryId of updates.categories) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new HttpError(400, `Invalid category ID: ${categoryId}`);
      }
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new HttpError(404, `Category not found: ${categoryId}`);
      }
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { ...updates, updatedAt: Date.now() },
    { new: true, runValidators: true }
  ).populate("categories", "name slug");

  res.status(200).json(updatedProduct);
});

/**
 * Delete a product
 */
export const deleteProductController = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid product ID");
  }

  const product = await Product.findById(id);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  // Check if product is in any active orders
  const orders = await mongoose.model("Order").findOne({
    "items.product": id,
    status: { $nin: ["delivered", "cancelled"] },
  });

  if (orders) {
    throw new HttpError(400, "Cannot delete product with active orders");
  }

  await product.deleteOne();

  res.status(200).json({ message: "Product deleted successfully" });
});

/**
 * Update product inventory
 */
export const updateProductInventoryController = expressAsyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { quantity, reserved, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, "Invalid product ID");
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    // Update inventory
    product.inventory = {
      quantity: quantity ?? product.inventory.quantity,
      reserved: reserved ?? product.inventory.reserved,
      status: status ?? product.inventory.status,
    };

    // Automatically update status based on quantity if not explicitly set
    if (!status) {
      if (product.inventory.quantity <= 0) {
        product.inventory.status = "out_of_stock";
      } else {
        product.inventory.status = "in_stock";
      }
    }

    const updatedProduct = await product.save();

    res.status(200).json(updatedProduct);
  }
);
