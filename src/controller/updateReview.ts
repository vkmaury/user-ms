import { Request, Response } from 'express';
import Review from '../models/reviewSchema';
import Product from '../models/productSchema';
import Bundle from '../models/bundleSchema';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import {User} from '../models/User'; // Import the User model to fetch the username

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

// Set up Multer for local image storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/reviewImages');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
}).array('images', 5);

export const updateReview = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: 'Image upload failed', error: err.message });
    }

    try {
      const userId = extractUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const reviewId = req.query.reviewId as string;
      const { rating, reviewText } = req.body;

      if (!reviewId) {
        return res.status(400).json({ message: 'Review ID is required' });
      }

      if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
      }

      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      if (review.userId.toString() !== userId) {
        return res.status(403).json({ message: 'You can only update your own reviews' });
      }

      // Fetch the user's username if needed
      const user = await User.findById(userId);
      const userName = user?.name || review.userName; // Use the updated username or fallback to the review's username

      // Handle new images
      const newImages = req.files ? (req.files as Express.Multer.File[]).map(file => file.path) : [];

      // If new images are uploaded, delete old ones
      if (newImages.length > 0) {
        if (review.images && review.images.length > 0) {
          review.images.forEach(imagePath => {
            fs.unlink(imagePath, err => {
              if (err) console.error(`Failed to delete image: ${imagePath}`);
            });
          });
        }
        review.images = newImages;
      }

      // Update review fields
      review.rating = rating;
      review.reviewText = reviewText || review.reviewText;

      const updatedReview = await review.save();

      // Update the associated product or bundle with the updated review
      const reviewData = {
        _id: updatedReview._id,
        userId,
        rating: updatedReview.rating,
        reviewText: updatedReview.reviewText,
        images: updatedReview.images,
        userName, // Use the potentially updated username
      };

      if (review.productId) {
        await Product.findByIdAndUpdate(review.productId, {
          $set: { 'reviews.$[elem]': reviewData },
        }, {
          arrayFilters: [{ 'elem._id': reviewId }]
        });
      } else if (review.bundleId) {
        await Bundle.findByIdAndUpdate(review.bundleId, {
          $set: { 'reviews.$[elem]': reviewData },
        }, {
          arrayFilters: [{ 'elem._id': reviewId }]
        });
      }

      res.status(200).json({ message: 'Review updated successfully', review: updatedReview });
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
  });
};

export default updateReview;
