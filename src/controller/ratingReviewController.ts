import { Request, Response } from 'express';
import Review from '../models/reviewSchema';
import Order from '../models/orderSchema';
import { User } from '../models/User';
import Product from '../models/productSchema'; // Import the Product model
import Bundle from '../models/bundleSchema'; // Import the Bundle model
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

export const addReview = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: 'Image upload failed', error: err.message });
    }

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

      const { orderId, productId, bundleId, rating, reviewText } = req.body;

      // Validate inputs
      if (!orderId) {
        return res.status(400).json({ message: 'Order ID is required' });
      }
      if ((!productId && !bundleId) || (productId && bundleId)) {
        return res.status(400).json({ message: 'Provide either productId or bundleId, but not both.' });
      }
      if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
      }

      // Find the order and validate user ownership
      const order = await Order.findById(orderId);
      if (!order || order.userId.toString() !== userId) {
        return res.status(404).json({ message: 'Order not found or unauthorized' });
      }

      // Check if the order status is 'delivered'
      if (order.orderStatus !== 'Delivered') {
        return res.status(400).json({ message: 'Review can only be added for delivered orders' });
      }

      // Validate the productId or bundleId against the items in the order
      let isValidItem = false;
      if (productId) {
        isValidItem = order.items.some(item => item.productId?.toString() === productId);
        if (!isValidItem) {
          return res.status(400).json({ message: 'Product not found in order items' });
        }
      }

      if (bundleId) {
        isValidItem = order.items.some(item => item.bundleId?.toString() === bundleId);
        if (!isValidItem) {
          return res.status(400).json({ message: 'Bundle not found in order items' });
        }
      }

      // Save images to local system and get their paths
      const images = req.files ? (req.files as Express.Multer.File[]).map(file => file.path) : [];

      // Create a new review
      const review = new Review({
        userId,
        orderId,
        productId: productId || undefined,
        bundleId: bundleId || undefined,
        rating,
        reviewText: reviewText || '',
        images,
      });

      // Save the review to the database
      const savedReview = await review.save();

      // Update the product or bundle with the new review
      const reviewData = {
        _id: savedReview._id,
        userId,
        rating,
        reviewText: reviewText || '',
        images,
        userName: user.name, // Include the user's name in the product or bundle reviews
      };

      // console.log(reviewData);

      if (productId) {
        await Product.findByIdAndUpdate(productId, {
          $push: { reviews: reviewData },
        });
      } else if (bundleId) {
        await Bundle.findByIdAndUpdate(bundleId, {
          $push: { reviews: reviewData },
        });
      }

      res.status(201).json({ message: 'Review added successfully', review: savedReview });
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
  });
};

export default addReview;
