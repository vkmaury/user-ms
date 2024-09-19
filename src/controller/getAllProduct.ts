import { Request, Response } from 'express';
import Product from '../models/productSchema'; // Adjust the path based on your file structure
import Category from '../models/productCategorySchema'; // Import your category model
import {User} from '../models/User'; // Import the User model
import jwt from 'jsonwebtoken';

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
  

export const getAllProductsController = async (req: Request, res: Response) => {
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
    // Extract query parameters
    const { categoryId, sortBy = 'name', order = 'asc', page = 1, limit = 10, search = '' } = req.query;

    // Fetch all valid categories
    const validCategories = await Category.find({ isActive: true }).exec();
    const validCategoryIds = validCategories.map(category => category._id);

    // Build the filter object
    const filter: any = {
      isActive: true,
      isBlocked: false,
      categoryId: { $in: validCategoryIds } // Filter products based on valid category IDs
    };

    // If a categoryId is provided, filter by the specified category
    if (categoryId && validCategoryIds.includes(categoryId as any)) {
      filter.categoryId = categoryId;
    }

    // If a search term is provided, filter by product name
    if (search) {
      // Ensure `search` is treated as a string
      const searchTerm = Array.isArray(search) ? search[0] : search;
      filter.name = new RegExp(search as string, 'i');; // Case-insensitive search
    }

    // Determine sorting order
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOption: any = {};
    sortOption[sortBy as string] = sortOrder;

    // Pagination logic
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Fetch products with filtering, sorting, and pagination
    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .populate('categoryId')
        .sort(sortOption)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      Product.countDocuments(filter).exec() // Count total documents
    ]);

    // Return the list of products along with pagination info
    return res.status(200).json({
      totalCount,
      page: pageNumber,
      limit: pageSize,
      products
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch products', error });
  }
};
