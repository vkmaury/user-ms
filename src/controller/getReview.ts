import { Request, Response } from 'express';
import Review from '../models/reviewSchema';
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
const getReview = async (req:Request, res: Response) => {
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

    // Find the review and ensure it belongs to the user and is not soft-deleted
    const review = await Review.findOne({
      _id: reviewId,
      userId: userId,
      isActive: true,
    });

    if (!review) {
      return res.status(404).json({
        message: 'Review not found or has been deleted',
      });
    }

    if(!review.isVisible){
        return res.status(404).json({
            message: 'Review is not visible',
        });
    }

    // Return the review details
    res.status(200).json({ review });
  } catch (error) {
    const err = error as Error;
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: err.message });
  }
};

export default getReview;