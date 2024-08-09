import { Request, Response } from 'express';
import Cart from '../models/addToCartSchema'; // Adjust path as needed
import Product from '../models/productSchema'; // Adjust path as needed
import Bundle from '../models/bundleSchema'; // Import the Bundle model if you have it
import jwt from 'jsonwebtoken';
import User from '../models/User'; // Import the User model

// Middleware to extract userId from token
const extractUserId = (req: Request): string | null => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
  
    try {
      const decoded: any = jwt.verify(token, 'mysecretkey');
      return decoded.id;
    } catch {
      return null;
    }
};

// Add multiple products to the cart
export const addToCart = async (req: Request, res: Response) => {

  const { items } = req.body;

  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if the user is active in auth-ms
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ message: 'Seller is not active' });
    }

    // Validate input
    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    // Find or create the user's cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0 });
    }

    const errors: string[] = [];
    const updatedItems = [...cart.items];

    // Process each item in the request
    for (const item of items) {
      const { productId, quantity, bundleId } = item;

      if (!productId || quantity <= 0) {
        errors.push(`Invalid item data for productId: ${productId}`);
        continue;
      }

      // Check if the item is a product or a bundle
      if (bundleId) {
        // Handle bundle logic
        const bundle = await Bundle.findById(bundleId);
        if (!bundle) {
          errors.push(`Bundle not found: ${bundleId}`);
          continue;
        }

        // Calculate bundle price considering discounts
        let bundlePrice = bundle.MRP;
        if (bundle.adminDiscountedPrice) {
          bundlePrice = bundle.adminDiscountedPrice;
        }
        if (bundle.sellerDiscountedPrice) {
          bundlePrice = bundle.sellerDiscountedPrice;
        }

        // Update or add bundle to cart
        const existingBundle = updatedItems.find(cartItem => cartItem.bundleId?.toString() === bundleId.toString());
        if (existingBundle) {
          existingBundle.quantity += quantity;
          existingBundle.price = bundlePrice; // Update price in case it has changed
        } else {
          updatedItems.push({ bundleId, quantity, price: bundlePrice });
        }

      } else {
        // Handle product logic
        const product = await Product.findById(productId);
        if (!product) {
          errors.push(`Product not found: ${productId}`);
          continue;
        }

        // Calculate product price considering discounts
        let itemPrice = product.MRP;
        if (product.adminDiscountedPrice) {
          itemPrice = product.adminDiscountedPrice;
        }
        if (product.sellerDiscountedPrice) {
          itemPrice = product.sellerDiscountedPrice;
        }

        // Check if the product is already in the cart
        const productIdStr = productId.toString(); // Convert to string for comparison
        const existingItem = updatedItems.find(cartItem => cartItem.productId?.toString() === productIdStr);
        if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.price = itemPrice; // Update price in case it has changed
        } else {
          updatedItems.push({ productId, quantity, price: itemPrice });
        }
      }
    }

    // Update the cart with the new items
    cart.items = updatedItems;
    cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

    // Save the cart
    await cart.save();

    res.status(200).json({
      message: 'Products added to cart',
      errors: errors.length > 0 ? errors : undefined,
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        totalPrice: cart.totalPrice,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
