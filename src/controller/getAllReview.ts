import { Request, Response } from 'express';
import Review from '../models/reviewSchema';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

// Helper function to extract user ID from JWT
const extractUserId = (req: Request): string | null => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, 'mysecretkey'); // Replace with your JWT secret
    return decoded.id;
  } catch {
    return null;
  }
};

// Controller to get all active and visible reviews
const getAllReviews = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the user to check if they are active
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User is not active' });
    }

    // Find all active and visible reviews
    const reviews = await Review.find({ isVisible: true, isActive: true });

    return res.status(200).json({ reviews });

  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};

export default getAllReviews;
