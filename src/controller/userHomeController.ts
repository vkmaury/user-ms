import { Request, Response } from 'express';
import Bundle from '../models/bundleSchema'; // Adjust path as needed
import Product from '../models/productSchema'; // Adjust path as needed
// import Category from '../models/productCategorySchema'; // Adjust path as needed
import{ User} from '../models/User'; // Adjust path as needed
import jwt from 'jsonwebtoken';

// Function to extract userId from token
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

// Function to calculate the effective discount and final price for a product
const calculateEffectiveDiscountAndPriceOnProduct = (product: any) => {
    const sellerDiscount = product.sellerDiscountApplied || 0;
    const adminDiscount = product.adminDiscountApplied || 0;
    const totalDiscount = sellerDiscount + adminDiscount;
    const discountAmount = (product.MRP * totalDiscount) / 100;
    const finalPrice = product.MRP - discountAmount;

    return {
        effectiveDiscount: totalDiscount,
        finalPrice: finalPrice > 0 ? finalPrice : 0 // Ensure finalPrice is not negative
    };
};

// Function to calculate the effective discount and final price for a bundle
const calculateEffectiveDiscountAndPriceOnBundle = (bundle: any) => {
    const sellerDiscount = bundle.sellerDiscount || 0;
    const adminDiscount = bundle.adminDiscountApplied || 0;
    const totalDiscount = sellerDiscount + adminDiscount;
    const discountAmount = (bundle.MRP * totalDiscount) / 100;
    const finalPrice = bundle.MRP - discountAmount;

    return {
        effectiveDiscount: totalDiscount,
        finalPrice: finalPrice > 0 ? finalPrice : 0 // Ensure finalPrice is not negative
    };
};

// Function to get home page data
export const getHomePageData = async (req: Request, res: Response) => {
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

        // Fetch all active and non-blocked bundles with discounts
        const bundles = await Bundle.find({
            isActive: true,
            isBlocked: false,
            sellerDiscount: { $gt: 0 },
            adminDiscountApplied: { $gt: 0 }
        });

        // Fetch all active and discounted products
        const products = await Product.find({
            isActive: true,
            isBlocked: false,
            sellerDiscountApplied: { $gt: 0 },
            adminDiscountApplied: { $gt: 0 }
        });

        // Calculate effective discount and final price for each product and bundle
        const bundleDetails = bundles.map(bundle => {
            const { sellerDiscount, adminDiscountApplied,adminDiscountedPrice, ...rest } = bundle.toObject();
            return {
                ...rest,
                ...calculateEffectiveDiscountAndPriceOnBundle(bundle)
            };
        }).sort((a, b) => b.effectiveDiscount - a.effectiveDiscount); // Sort by final price descending

        const productDetails = products.map(product => {
            const { sellerDiscountApplied, adminDiscountApplied,sellerDiscounted,adminDiscountedPrice, ...rest } = product.toObject();
            return {
                ...rest,
                ...calculateEffectiveDiscountAndPriceOnProduct(product)
            };
        }).sort((a, b) => b.effectiveDiscount - a.effectiveDiscount); // Sort by final price descending


        // // Fetch sales (for example, products on sale)
        // const sales = await Product.find({ isActive: true, isBlocked: false });

        // Fetch categories
        // const categories = await Category.find({ isActive: true });

        res.status(200).json({
            message: 'Home page data retrieved successfully',
            hotDeals: {
                bundles: bundleDetails.slice(0, 5), // Top 10 bundles with highest final price
                products: productDetails.slice(0, 5) // Top 5 products with highest final price
            },
            // sales: sales.map(product => ({
            //     _id: product._id,
            //     name: product.name,
            //     description: product.description,
            //     MRP: product.MRP,
            //     stock: product.stock,
            //     sellerDiscountApplied: product.sellerDiscountApplied,
            //     createdAt: product.createdAt,
            //     updatedAt: product.updatedAt
            // })),
            // categories: categories.map(category => ({
            //     _id: category._id,
            //     name: category.name,
            //     description: category.description,
            //     category: category.category
            // }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
