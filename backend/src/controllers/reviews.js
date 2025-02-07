import { Review, Product, Order } from "../models/index.js";
import { asyncHandler, HttpError } from "../utils.js";

/**
 * @typedef ReviewQuery
 * @property {string} [page=1] - Page number
 * @property {string} [limit=10] - Number of items per page
 * @property {string} [status=approved] - Review status
 * @property {string} [sort=-createdAt] - Sort order
 * @property {string} [search] - Search term
 * @property {string} [minRating] - Minimum rating
 * @property {string} [maxRating] - Maximum rating
 * @property {string} [verified] - Verified purchase status
 * @property {string} [helpful] - Helpful votes
 */

// Get all reviews for a product
const getProductReviewsController = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    /** @type {ReviewQuery} */
    const { page = '1', limit = '10', status = 'approved', sort = '-createdAt' } = req.query;

    // Convert page and limit to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skipDocs = (pageNum - 1) * limitNum;

    // Build query
    const query = { 
        product: productId,
        status: status
    };

    // Get reviews with pagination
    const reviews = await Review.find(query)
        .sort(sort)
        .skip(skipDocs)
        .limit(limitNum)
        .populate('product', 'name');

    // Get total count for pagination
    const total = await Review.countDocuments(query);

    res.status(200).json({
        reviews,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        total
    });
});

// Create a new review
const createReviewController = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { email, name, rating, title, comment, images } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
        throw new HttpError(404, 'Product not found');
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({ 
        product: productId, 
        email: email 
    });

    if (existingReview) {
        throw new HttpError(400, 'You have already reviewed this product');
    }

    // Check if this is a verified purchase
    const verifiedPurchase = await Order.exists({
        'customer.email': email,
        'items.product': productId,
        'status': 'delivered'
    });

    // Create review
    const review = await Review.create({
        email,
        name,
        product: productId,
        rating,
        title,
        comment,
        images,
        isVerifiedPurchase: !!verifiedPurchase,
        status: 'pending' // All reviews start as pending
    });

    res.status(201).json(review);
});

// Update review status (admin only)
const updateReviewStatusController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
        throw new HttpError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Find and update review
    const review = await Review.findById(id);
    if (!review) {
        throw new HttpError(404, 'Review not found');
    }

    review.status = status;
    await review.save();

    res.status(200).json(review);
});

// Update helpful votes for a review
const updateReviewHelpfulController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { increment = true } = req.body; // true to increment, false to decrement

    // Find review
    const review = await Review.findById(id);
    if (!review) {
        throw new HttpError(404, 'Review not found');
    }

    // Only allow voting on approved reviews
    if (review.status !== 'approved') {
        throw new HttpError(400, 'Can only vote on approved reviews');
    }

    // Update helpful votes
    if (increment) {
        review.helpfulVotes += 1;
    } else {
        // Prevent negative votes
        if (review.helpfulVotes > 0) {
            review.helpfulVotes -= 1;
        }
    }

    await review.save();

    res.status(200).json(review);
});

export {
    getProductReviewsController,
    createReviewController,
    updateReviewStatusController,
    updateReviewHelpfulController
};