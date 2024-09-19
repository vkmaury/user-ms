import { Request, Response } from 'express';
import Review from '../models/reviewSchema';
import Order from '../models/orderSchema';
import {User} from '../models/User';
import jwt from 'jsonwebtoken';

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

const deleteReview = async (req:Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isActive) {
        return res.status(403).json({ message: 'User is not active' });
    }


    const { reviewId } = req.query;


    // Validate input
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!reviewId) {
      return res.status(400).json({ message: 'Review ID is required' });
    }

    // Find the review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the review belongs to the logged-in user
    if (review.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Forbidden: Not your review' });
    }

    // Find the associated order
    const order = await Order.findById(review.orderId);
    if (!order || order.userId.toString() !== userId) {
      return res.status(404).json({
        message: 'Order not found or unauthorized access to review',
      });
    }

    // Soft delete the review by setting isDeleted to true
    review.isActive = false;
    await review.save();

    res
      .status(200)
      .json({ message: 'Review deleted successfully (soft delete)' });
  } catch (error) {
    const err = error as Error;
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: err.message });
  }
};

export default deleteReview;