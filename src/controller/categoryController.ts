import { Request, Response } from 'express';
import Category from '../models/productCategorySchema'; // Adjust path as needed

// Controller to get all categories with search, sorting, and pagination
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        // Extract query parameters
        const { search, sortBy = 'name', sortOrder = 'asc', page = 1, limit = 10 } = req.query;

        // Convert query parameters to appropriate types
        const sort: { [key: string]: 1 | -1 } = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);

        // Create a filter for searching by category name
        const filter: any = { isActive: true };
        if (search) {
            filter.name = { $regex: new RegExp(search as string, 'i') }; // Case-insensitive search
        }

        // Fetch categories with search, sorting, and pagination
        const categories = await Category.find(filter)
            .sort(sort)
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .exec();

        // Get the total count of categories for pagination metadata
        const totalCategories = await Category.countDocuments(filter).exec();

        // Send response with categories and pagination info
        res.status(200).json({
            message: 'Categories retrieved successfully',
            categories: categories.map(category => ({
                _id: category._id,
                name: category.name,
                description: category.description,
                category: category.category,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt
            })),
            pagination: {
                total: totalCategories,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalCategories / limitNumber)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



// Controller to get a category by ID
export const getCategoryById = async (req: Request, res: Response) => {
    try {
        // Extract the ID from query parameters
        const { id } = req.query;

        // Validate ID format (optional, but recommended)
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        // Fetch the category by ID
        const category = await Category.findById(id);

        // Check if the category exists and is active
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (!category.isActive) {
            return res.status(404).json({ message: 'This Category is inactive' });
        }

        // Send response with the category
        res.status(200).json({
            message: 'Category retrieved successfully',
            category: {
                _id: category._id,
                name: category.name,
                description: category.description,
                category: category.category,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};