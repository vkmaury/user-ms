import { Request, Response } from 'express';
import Cart from '../models/addToCartSchema'; // Adjust path as needed
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

// Clear all items from the cart
export const clearCart = async (req: Request, res: Response) => {
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

    // Find the user's cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Clear all items in the cart
    cart.items = [];
    cart.totalPrice = 0;

    // Save the cart
    await cart.save();

    // Return the response
    res.status(200).json({
      message: 'Cart cleared successfully',
      cart: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items, // This should be an empty array now
        totalPrice: cart.totalPrice, // This should be 0 now
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
