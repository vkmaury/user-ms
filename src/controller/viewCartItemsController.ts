import { Request, Response } from 'express';
import Cart from '../models/addToCartSchema'; // Adjust path as needed
import Product from '../models/productSchema'; // Adjust path as needed
import {User} from '../models/User'; // Adjust path as needed
import Bundle from '../models/bundleSchema'; // Adjust path as needed
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

// Function to get product details
const getProductDetails = async (productId: string) => {
    try {
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Product not found');
        }

        const name = product.name;
        const isUnavailable = product.isUnavailable || false; // Check if product is unavailable

        return { name, isUnavailable };
    } catch (error) {
        throw new Error('Error fetching product details');
    }
};

// Function to get bundle details
const getBundleDetails = async (bundleId: string) => {
    try {
        const bundle = await Bundle.findById(bundleId);

        if (!bundle) {
            throw new Error('Bundle not found');
        }

        const name = bundle.name;
        const isUnavailable = bundle.isUnavailable || false; // Check if bundle is unavailable

        return { name, isUnavailable };
    } catch (error) {
        throw new Error('Error fetching bundle details');
    }
};

// Get cart items
export const getCartItems = async (req: Request, res: Response) => {
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

        // Fetch the cart for the user
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Fetch product and bundle details
        const itemsWithDetails = await Promise.all(cart.items.map(async item => {
            if (item.productId) {
                const productId = item.productId.toString(); // Convert ObjectId to string
                try {
                    const { name, isUnavailable } = await getProductDetails(productId);
                    if (isUnavailable) {
                        return { 
                            productName: name, 
                            productPrice: 'Product is unavailable', 
                            quantity: item.quantity 
                        };
                    }
                    return { 
                        productName: name, 
                        productPrice: item.price,
                        quantity: item.quantity 
                    };
                } catch {
                    return { 
                        productName: 'Error fetching product details', 
                        productPrice: 'Error fetching price', 
                        quantity: item.quantity 
                    };
                }
            } else if (item.bundleId) {
                const bundleId = item.bundleId.toString(); // Convert ObjectId to string
                try {
                    const { name, isUnavailable } = await getBundleDetails(bundleId);
                    if (isUnavailable) {
                        return { 
                            bundleName: name, 
                            bundlePrice: 'Bundle is unavailable', 
                            quantity: item.quantity 
                        };
                    }
                    return { 
                        bundleName: name, 
                        bundlePrice: item.price, 
                        quantity: item.quantity 
                    };
                } catch {
                    return { 
                        bundleName: 'Error fetching bundle details', 
                        bundlePrice: 'Error fetching price', 
                        quantity: item.quantity 
                    };
                }
            } else {
                return { 
                    name: 'Item not found', 
                    price: 'N/A', 
                    quantity: item.quantity 
                };
            }
        }));

        // Calculate total price
        const totalPrice = itemsWithDetails.reduce((total, item) => {
            if (item.productPrice && typeof item.productPrice === 'number') {
                return total + (item.productPrice * item.quantity);
            } else if (item.bundlePrice && typeof item.bundlePrice === 'number') {
                return total + (item.bundlePrice * item.quantity);
            }
            return total;
        }, 0);

        res.status(200).json({
            message: 'Cart items retrieved successfully',
            items: itemsWithDetails,
            totalPrice: totalPrice.toFixed(2), // Format to 2 decimal places
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
