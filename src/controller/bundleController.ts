import { Request, Response } from 'express';
import Bundle from '../models/bundleSchema'; // Adjust path as needed
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

// Get bundle by ID
export const getBundleById = async (req: Request, res: Response) => {
    const { bundleId } = req.query;

    try {
        // Extract userId from token
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check if the user is active and unblocked
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'User is not active' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'User is blocked' });
        }

        // Find the bundle by ID
        const bundle = await Bundle.findById(bundleId);
        if (!bundle) {
            return res.status(404).json({ message: 'Bundle not found' });
        }

        // Check if the bundle is active and not blocked
        if (!bundle.isActive ) {
            return res.status(403).json({ message: 'Bundle is Inactive' });
        }

         // Check if the bundle is active and not blocked
         if (bundle.isBlocked ) {
            return res.status(403).json({ message: 'Bundle is Blocked' });
        }

        res.status(200).json({
            message: 'Bundle details retrieved successfully',
            bundle: {
                _id: bundle._id,
                name: bundle.name,
                description: bundle.description,
                MRP: bundle.MRP,
                stock: bundle.stock,
                items: bundle.products,
                createdAt: bundle.createdAt,
                updatedAt: bundle.updatedAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// Get all bundles with search, sorting, and pagination
export const getAllBundles = async (req: Request, res: Response) => {
    try {
        // Extract userId from token
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check if the user is active and unblocked
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'User is not active' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'User is blocked' });
        }

        // Extract query parameters for searching, sorting, and pagination
        const search = req.query.search ? (req.query.search as string).toLowerCase() : '';
        const sort = req.query.sort === 'asc' ? 1 : -1;
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;

        // Create a filter based on search criteria
        const filter = search
            ? { name: { $regex: search, $options: 'i' }, isActive: true, isBlocked: false }
            : { isActive: true, isBlocked: false };

        // Fetch bundles with search, sorting, and pagination
        const bundles = await Bundle.find(filter)
            .sort({ name: sort }) // Sort bundles by name in ascending order
            .skip((page - 1) * limit) // Skip the number of items for pagination
            .limit(limit); // Limit the number of items per page

        const totalBundles = await Bundle.countDocuments(filter); // Total count of bundles for pagination

        if (bundles.length === 0) {
            return res.status(404).json({ message: 'No bundles found' });
        }

        res.status(200).json({
            message: 'Bundles retrieved successfully',
            bundles: bundles.map(bundle => ({
                _id: bundle._id,
                name: bundle.name,
                description: bundle.description,
                MRP: bundle.MRP,
                adminDiscountedPrice:bundle.adminDiscountedPrice,
                sellerDiscountedPrice:bundle.finalPrice,
                stock: bundle.stock,
                items: bundle.products,
                isActive: bundle.isActive,
                isBlocked: bundle.isBlocked,
                createdAt: bundle.createdAt,
                updatedAt: bundle.updatedAt
            })),
            pagination: {
                totalItems: totalBundles,
                currentPage: page,
                totalPages: Math.ceil(totalBundles / limit),
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};