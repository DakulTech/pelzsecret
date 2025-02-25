import { asyncHandler as expressAsyncHandler, HttpError } from "../utils.js";
import mongoose from "mongoose";
import models from "../models/index.js";

/**
 * @typedef {Object} CategoryQuery
 * @property {string} [sort] - The sort type.
 * @property {number} [page] - The page number.
 * @property {number} [limit] - Number of categories number.
 * @property {"asc" | "desc"} [order] - Order type
 */

/**
 * Get all categories with pagination and sorting
 */
export const getCategoriesController = expressAsyncHandler(async (req, res) => {
  /** @type {CategoryQuery} */
  const { page = 1, limit = 10, sort = "name", order = "asc" } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const categories = await models.Category.find()
    .sort({ [sort]: order })
    .skip(skip)
    .limit(Number(limit))
    .populate("parent", "name");

  const total = await models.Category.countDocuments();

  res.status(200).json({
    categories,
    currentPage: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    total,
  });
});

/**
 * Get a single category by ID
 */
export const getCategoryByIdController = expressAsyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, "Invalid category ID");
    }

    const category = await models.Category.findById(id).populate(
      "parent",
      "name"
    );

    if (!category) {
      throw new HttpError(404, "Category not found");
    }

    res.status(200).json(category);
  }
);

/**
 * Create a new category
 */
export const createCategoryController = expressAsyncHandler(
  async (req, res) => {
    const body = Array.isArray(req.body) ? req.body : [req.body];
    const categories = [];
    for (const { name, description, parent, image } of body) {
      if (!name) {
        throw new HttpError(400, "Name is required");
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      // Check if slug already exists
      const existingCategory = await models.Category.findOne({ slug });
      if (existingCategory) {
        throw new HttpError(400, "Category with this name already exists");
      }

      // Validate parent category if provided
      if (parent && !mongoose.Types.ObjectId.isValid(parent)) {
        throw new HttpError(400, "Invalid parent category ID");
      }

      const category = await models.Category.create({
        name,
        slug,
        description,
        parent,
        image,
        isActive: true,
      });

      categories.push(category);
    }
    res.status(201).json(categories);
  }
);

/**
 * Update an existing category
 */
export const updateCategoryController = expressAsyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { name, description, parent, image, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, "Invalid category ID");
    }

    const category = await models.Category.findById(id);

    if (!category) {
      throw new HttpError(404, "Category not found");
    }

    // If name is being updated, update slug and check for duplicates
    if (name && name !== models.category.name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const existingCategory = await models.Category.findOne({
        slug,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new HttpError(400, "Category with this name already exists");
      }

      models.category.slug = slug;
    }

    // Validate parent category if provided
    if (parent) {
      if (!mongoose.Types.ObjectId.isValid(parent)) {
        throw new HttpError(400, "Invalid parent category ID");
      }

      // Prevent category from being its own parent
      if (parent === id) {
        throw new HttpError(400, "Category cannot be its own parent");
      }

      // Check if parent exists
      const parentCategory = await models.Category.findById(parent);
      if (!parentCategory) {
        throw new HttpError(404, "Parent category not found");
      }
    }

    models.category.name = name || models.category.name;
    models.category.description = description || models.category.description;
    models.category.parent = parent || models.category.parent;
    models.category.image = image || models.category.image;
    models.category.isActive =
      isActive !== undefined ? isActive : models.category.isActive;

    const updatedCategory = await models.category.save();

    res.status(200).json(updatedCategory);
  }
);

/**
 * Delete a category
 */
export const deleteCategoryController = expressAsyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, "Invalid category ID");
    }

    // Check if category exists
    const category = await models.Category.findById(id);

    if (!category) {
      throw new HttpError(404, "Category not found");
    }

    // Check if category has child categories
    const childCategories = await models.Category.findOne({ parent: id });

    if (childCategories) {
      throw new HttpError(400, "Cannot delete category with child categories");
    }

    // Check if category is being used in products
    const products = await mongoose
      .model("Product")
      .findOne({ categories: id });

    if (products) {
      throw new HttpError(
        400,
        "Cannot delete category with associated products"
      );
    }

    await models.category.deleteOne();

    res.status(200).json({ message: "Category deleted successfully" });
  }
);
