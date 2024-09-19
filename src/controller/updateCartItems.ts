import { Request, Response } from 'express';
import Cart from '../models/addToCartSchema'; // Adjust path as needed
import Product from '../models/productSchema'; // Adjust path as needed
import Bundle from '../models/bundleSchema'; // Import the Bundle model if you have it
import jwt from 'jsonwebtoken';
import {User} from '../models/User'; // Import the User model

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

// Update cart items
export const updateCart = async (req: Request, res: Response) => {
    const { items } = req.body; // items should be an array of objects with productId or bundleId and quantity

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
            return res.status(403).json({ message: 'User is not active' });
        }

        // Validate input
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Invalid input' });
        }

        // Find the user's cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const errors: string[] = [];
        const notifications: string[] = [];
        const updatedItems = [...cart.items];

        // Process each item in the request
        for (const item of items) {
            const { productId, quantity, bundleId } = item;

            if (!productId && !bundleId) {
                errors.push('Missing productId or bundleId');
                continue;
            }

            if (quantity <= 0) {
                errors.push(`Invalid quantity for item: ${JSON.stringify(item)}`);
                continue;
            }

            if (bundleId) {
                // Handle bundle logic
                const bundle = await Bundle.findById(bundleId);
                if (!bundle) {
                    errors.push(`Bundle not found: ${bundleId}`);
                    continue;
                }

                const existingBundle = updatedItems.find(cartItem => cartItem.bundleId?.toString() === bundleId.toString());
                if (!existingBundle) {
                    errors.push(`Bundle not found in cart: ${bundleId}`);
                    continue;
                }

                if (bundle.stock < quantity) {
                    // Notify user about out-of-stock and adjust quantity
                    notifications.push(`Bundle adjusted in cart due to insufficient stock: ${bundleId}`);
                    existingBundle.quantity = bundle.stock; // Set to available stock
                } else {
                    existingBundle.quantity = quantity;
                }

            } else {
                // Handle product logic
                const product = await Product.findById(productId);
                if (!product) {
                    errors.push(`Product not found: ${productId}`);
                    continue;
                }

                const existingItem = updatedItems.find(cartItem => cartItem.productId?.toString() === productId.toString());
                if (!existingItem) {
                    errors.push(`Product not found in cart: ${productId}`);
                    continue;
                }

                if (product.stock < quantity) {
                    // Notify user about out-of-stock and adjust quantity
                    notifications.push(`Product adjusted in cart due to insufficient stock: ${productId}`);
                    existingItem.quantity = product.stock; // Set to available stock
                } else {
                    existingItem.quantity = quantity;
                }
            }
        }

        // Update the cart with the new items
        cart.items = updatedItems.filter(item => item.quantity > 0); // Remove items with quantity 0 or less
        cart.totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

        // Save the cart
        await cart.save();

        // Send in-app notifications if there were any
        if (notifications.length > 0) {
            notifications.forEach(notification => sendInAppNotification(userId, notification));
        }

        res.status(200).json({
            message: 'Cart updated successfully',
            errors: errors.length > 0 ? errors : undefined,
            notifications: notifications.length > 0 ? notifications : undefined,
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
function sendInAppNotification(userId: string, notification: string): void {
    throw new Error('Function not implemented.');
}

