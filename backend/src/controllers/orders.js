import { asyncHandler, HttpError } from "../utils.js";
import { Cart, Order } from "../models/index.js";

// Create a new order
export const createOrderController = asyncHandler(async (req, res) => {
    try {
        const { sessionId, customer, paymentMethod, shipping } = req.body;

        // Validate required fields
        if (!sessionId || !customer || !paymentMethod || !shipping) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide sessionId, customer details, payment method, and shipping information'
            });
            return;
        }

        // Get cart data
        const cart = await Cart.findOne({ sessionId });
        if (!cart || cart.items.length === 0) {
             res.status(404).json({
                error: 'Cart not found or empty',
                message: 'Unable to create order from empty or non-existent cart'
            });

            return;
        }

        // Calculate totals
        const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.09; // Assuming 9% tax rate
        const total = subtotal + tax + shipping.cost;

        // Create order
        const order = await Order.create({
            orderNumber: `ORD-${Date.now()}`, // Simple order number generation
            customer,
            items: cart.items,
            subtotal,
            tax,
            shipping,
            total,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod
        });

        // Clear the cart after successful order creation
        await Cart.findOneAndDelete({ sessionId });

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to create order',
            message: error.message
        });
    }
})
// Get order by order number
export const getOrderByNumberController = asyncHandler(async (req, res) => {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber });
    if (!order) {
        throw new HttpError(404, `No order found with order number: ${orderNumber}`);
    }

    res.status(200).json(order);
});

// Update order status
export const updateOrderStatusController = asyncHandler(async (req, res) => {
    const { orderNumber } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        throw new HttpError(400, `Order status must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
        throw new HttpError(404, `No order found with order number: ${orderNumber}`);
    }

    // Update status
    order.status = status;
    if (status === 'cancelled' && order.paymentStatus === 'paid') {
        order.paymentStatus = 'pending';
    }

    await order.save();
    res.status(200).json(order);
});

// Update payment status
export const updatePaymentStatusController = asyncHandler(async (req, res) => {
    const { orderNumber } = req.params;
    const { paymentStatus } = req.body;

    // Validate payment status
    const validPaymentStatuses = ['pending', 'processing', 'paid', 'failed', 'refunded', 'refund_pending'];
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
        throw new HttpError(400, `Payment status must be one of: ${validPaymentStatuses.join(', ')}`);
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
        throw new HttpError(404, `No order found with order number: ${orderNumber}`);
    }

    // Update payment status
    order.paymentStatus = paymentStatus;
    if (paymentStatus === 'paid' && order.status === 'pending') {
        order.status = 'processing';
    }

    await order.save();
    res.status(200).json(order);
});