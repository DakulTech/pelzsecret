import { asyncHandler as expressAsyncHandler, HttpError } from "../utils.js";
import { Cart, Product } from "../models/index.js";

// Constants
const CART_EXPIRATION_HOURS = 24;
const MAX_ITEMS_PER_CART = 50;
const MIN_QUANTITY_PER_ITEM = 1;
const MAX_QUANTITY_PER_ITEM = 10;

/**
 * Calculate cart totals including subtotal, tax, and total
 */
const calculateCartTotals = (items) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const taxRate = 0.1; // 10% tax rate
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
};

/**
 * Check if cart is expired
 */
const isCartExpired = (cart) => {
  const expirationTime = new Date(cart.updatedAt);
  expirationTime.setHours(expirationTime.getHours() + CART_EXPIRATION_HOURS);
  return new Date() > expirationTime;
};

/**
 * Create a new cart with session ID
 */
export const createCartController = expressAsyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    throw new HttpError(400, "Session ID is required");
  }

  // Check if cart already exists for this session
  let existingCart = await Cart.findOne({ sessionId });

  if (existingCart) {
    // If cart exists but is expired, create new one
    if (isCartExpired(existingCart)) {
      await Cart.findByIdAndUpdate(existingCart._id, {
        status: "expired",
        updatedAt: new Date(),
      });
      existingCart = null;
    } else {
      throw new HttpError(400, "Active cart already exists for this session");
    }
  }

  const cart = await Cart.create({
    sessionId,
    items: [],
    status: "active",
    totals: {
      subtotal: 0,
      tax: 0,
      total: 0,
    },
  });

  res.status(201).json(cart);
});

/**
 * Merge two carts (useful for guest checkout to logged-in transition)
 */
export const mergeCartsController = expressAsyncHandler(async (req, res) => {
  const { sourceSessionId, targetSessionId } = req.body;

  if (!sourceSessionId || !targetSessionId) {
    throw new HttpError(400, "Both source and target session IDs are required");
  }

  const sourceCart = await Cart.findOne({
    sessionId: sourceSessionId,
    status: "active",
  });
  const targetCart = await Cart.findOne({
    sessionId: targetSessionId,
    status: "active",
  });

  if (!sourceCart || !targetCart) {
    throw new HttpError(404, "Source or target cart not found");
  }

  // Merge items
  for (const sourceItem of sourceCart.items) {
    const existingItem = targetCart.items.find(
      (item) =>
        item.product.toString() === sourceItem.product.toString() &&
        (!sourceItem.variant ||
          item.variant?.toString() === sourceItem.variant?.toString())
    );

    if (existingItem) {
      // Update quantity within limits
      existingItem.quantity = Math.min(
        existingItem.quantity + sourceItem.quantity,
        MAX_QUANTITY_PER_ITEM
      );
    } else {
      // Check max items limit
      if (targetCart.items.length >= MAX_ITEMS_PER_CART) {
        continue; // Skip if cart is full
      }
      targetCart.items.push(sourceItem);
    }
  }

  // Recalculate totals
  const totals = calculateCartTotals(targetCart.items);
  targetCart.totals = totals;
  targetCart.updatedAt = new Date();

  // Save merged cart and mark source cart as merged
  const updatedCart = await targetCart.save();
  await Cart.findByIdAndUpdate(sourceCart._id, {
    status: "merged",
    updatedAt: new Date(),
  });

  await updatedCart.populate({
    path: "items.product",
    select: "name price images inventory",
  });

  res.status(200).json(updatedCart);
});

/**
 * Get cart by session ID
 */
export const getCartBySessionController = expressAsyncHandler(
  async (req, res) => {
    const { sessionId } = req.params;

    const cart = await Cart.findOne({ sessionId }).populate({
      path: "items.product",
      select: "name price images inventory",
    });

    if (!cart) {
      throw new HttpError(404, "Cart not found");
    }

    // Check expiration
    if (isCartExpired(cart)) {
      cart.status = "expired";
      await cart.save();
      throw new HttpError(400, "Cart has expired");
    }

    // Validate and update product availability
    let needsUpdate = false;
    // @ts-ignore
    cart.items = await Promise.all(
      cart.items.filter(async (item) => {
        const product = await Product.findById(item.product);
        if (
          !product ||
          !product.isActive ||
          product.inventory.quantity < item.quantity
        ) {
          needsUpdate = true;
          return false;
        }
        return true;
      })
    );

    if (needsUpdate) {
      cart.totals = calculateCartTotals(cart.items);
      cart.updatedAt = new Date();
      await cart.save();
    }

    res.status(200).json(cart);
  }
);

/**
 * Add item to cart
 */
export const addCartItemController = expressAsyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { productId, quantity = 1, variantId = null } = req.body;

  // Enhanced validation
  if (!productId) {
    throw new HttpError(400, "Product ID is required");
  }

  if (quantity < MIN_QUANTITY_PER_ITEM || quantity > MAX_QUANTITY_PER_ITEM) {
    throw new HttpError(
      400,
      `Quantity must be between ${MIN_QUANTITY_PER_ITEM} and ${MAX_QUANTITY_PER_ITEM}`
    );
  }

  const cart = await Cart.findOne({ sessionId });
  if (!cart) {
    throw new HttpError(404, "Cart not found");
  }

  // Check expiration
  if (isCartExpired(cart)) {
    cart.status = "expired";
    await cart.save();
    throw new HttpError(400, "Cart has expired");
  }

  // Check cart status
  if (cart.status !== "active") {
    throw new HttpError(400, "Cart is no longer active");
  }

  // Check cart items limit
  if (cart.items.length >= MAX_ITEMS_PER_CART) {
    throw new HttpError(
      400,
      `Cart cannot contain more than ${MAX_ITEMS_PER_CART} items`
    );
  }

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new HttpError(
      404,
      !product ? "Product not found" : "Product is inactive"
    );
  }

  // Inventory validation
  const availableQuantity =
    product.inventory.quantity - product.inventory.reserved;
  if (availableQuantity < quantity) {
    throw new HttpError(400, `Only ${availableQuantity} items available`);
  }

  // Check for existing item
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      (!variantId || item.variant?.toString() === variantId)
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (newQuantity > MAX_QUANTITY_PER_ITEM) {
      throw new HttpError(
        400,
        `Cannot add more than ${MAX_QUANTITY_PER_ITEM} units of an item`
      );
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    cart.items.push({
      product: productId,
      variant: variantId,
      quantity,
      price: product.price,
    });
  }

  // Update totals
  cart.totals = calculateCartTotals(cart.items);
  cart.updatedAt = new Date();

  const updatedCart = await cart.save();
  await updatedCart.populate({
    path: "items.product",
    select: "name price images inventory",
  });

  res.status(200).json(updatedCart);
});

/**
 * Update cart item quantity
 */
export const updateCartItemController = expressAsyncHandler(
  async (req, res) => {
    const { sessionId, itemId } = req.params;
    const { quantity } = req.body;

    // Validate quantity
    if (
      !quantity ||
      quantity < MIN_QUANTITY_PER_ITEM ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      throw new HttpError(
        400,
        `Quantity must be between ${MIN_QUANTITY_PER_ITEM} and ${MAX_QUANTITY_PER_ITEM}`
      );
    }

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      throw new HttpError(404, "Cart not found");
    }

    // Check expiration
    if (isCartExpired(cart)) {
      cart.status = "expired";
      await cart.save();
      throw new HttpError(400, "Cart has expired");
    }

    if (cart.status !== "active") {
      throw new HttpError(400, "Cart is no longer active");
    }

    const cartItem = cart.items.id(itemId);
    if (!cartItem) {
      throw new HttpError(404, "Item not found in cart");
    }

    const product = await Product.findById(cartItem.product);
    if (!product || !product.isActive) {
      throw new HttpError(404, "Product no longer available");
    }

    const availableQuantity =
      product.inventory.quantity - product.inventory.reserved;
    if (availableQuantity < quantity) {
      throw new HttpError(400, `Only ${availableQuantity} items available`);
    }

    cartItem.quantity = quantity;
    cart.totals = calculateCartTotals(cart.items);
    cart.updatedAt = new Date();

    const updatedCart = await cart.save();
    await updatedCart.populate({
      path: "items.product",
      select: "name price images inventory",
    });

    res.status(200).json(updatedCart);
  }
);

/**
 * Remove item from cart
 */
export const removeCartItemController = expressAsyncHandler(
  async (req, res) => {
    const { sessionId, itemId } = req.params;

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      throw new HttpError(404, "Cart not found");
    }

    // Check expiration
    if (isCartExpired(cart)) {
      cart.status = "expired";
      await cart.save();
      throw new HttpError(400, "Cart has expired");
    }

    if (cart.status !== "active") {
      throw new HttpError(400, "Cart is no longer active");
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      throw new HttpError(404, "Item not found in cart");
    }

    cart.items.splice(itemIndex, 1);
    cart.totals = calculateCartTotals(cart.items);
    cart.updatedAt = new Date();

    const updatedCart = await cart.save();
    await updatedCart.populate({
      path: "items.product",
      select: "name price images inventory",
    });

    res.status(200).json(updatedCart);
  }
);

/**
 * Clear cart
 */
export const clearCartController = expressAsyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const cart = await Cart.findOne({ sessionId });
  if (!cart) {
    throw new HttpError(404, "Cart not found");
  }

  // Check expiration
  if (isCartExpired(cart)) {
    cart.status = "expired";
    await cart.save();
    throw new HttpError(404, "Cart has expired");
  }

  if (cart.status !== "active") {
    throw new HttpError(404, "Cart is no longer active");
  }

  // @ts-ignore
  cart.items = [];
  cart.totals = {
    subtotal: 0,
    tax: 0,
    total: 0,
  };
  cart.updatedAt = new Date();
  await cart.save();

  res.status(200).json({ message: "Cart cleared successfully" });
});
