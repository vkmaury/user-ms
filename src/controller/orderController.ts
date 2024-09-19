import { Request, Response } from 'express';
import Order from '../models/orderSchema';
import Product from '../models/productSchema';
import Bundle from '../models/bundleSchema'; // Import the Product model
import { IOrder } from '../models/orderSchema';
import jwt from 'jsonwebtoken';
import {User} from '../models/User'; // Import the User model
import { STRIPE_SECRET_KEY } from '../config/stripe'; 
import Stripe  from 'stripe';
import { privateDecrypt } from 'crypto';

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

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});

export const orderProduct = async (req: Request, res: Response) => {
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

        let { items, shippingInfo } = req.body;

        // If shippingInfo is not provided, use user's address
        if (!shippingInfo) {
            const address = user.address; 
            if (!address || !address.houseNumber || !address.locality || !address.city || !address.state || !address.postalCode || !address.country) {
                return res.status(400).json({ message: 'Shipping information or user address is required' });
            }
            shippingInfo = {
                houseNumber: address.houseNumber,
                locality: address.locality,
                nearBy: address.nearBy,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
            };
        }

        // Fetch product or bundle details for each item and validate
        const populatedItems = await Promise.all(items.map(async (item: { productId?: string; bundleId?: string; quantity?: number; }) => {
            if (item.productId) {
                // Handle individual product
                const product = await Product.findById(item.productId);
                if (!product) {
                    throw new Error(`Product with ID ${item.productId} not found`);
                }

                if (!product.isActive) {
                    throw new Error(`Product with ID ${item.productId} is not active`);
                }

                if (product.isBlocked) {
                    throw new Error(`Product with ID ${item.productId} is blocked`);
                }

                const quantity = item.quantity || 1;
                if (product.stock < quantity) {
                    throw new Error(`Not enough stock for product ID ${item.productId}`);
                }

                let total = product.MRP * quantity;
                let discount = 0;

                if (product.finalePrice) {
                    total = product.finalePrice * quantity;
                    discount = product.MRP - product.finalePrice;
                } else if (product.adminDiscountedPrice) {
                    total = product.adminDiscountedPrice * quantity;
                    discount = product.MRP - product.adminDiscountedPrice;
                } else if (product.sellerDiscounted) {
                    total = product.sellerDiscounted * quantity;
                    discount = product.MRP - product.sellerDiscounted;
                }

                return {
                    productId: item.productId,
                    productName: product.name,
                    quantity,
                    price: product.MRP,
                    discount,
                    total,
                };

            } else if (item.bundleId) {
                // Handle bundle
                const bundle = await Bundle.findById(item.bundleId);
                if (!bundle) {
                    throw new Error(`Product with ID ${item.bundleId} not found`);
                }

                if (!bundle.isActive) {
                    throw new Error(`Product with ID ${item.bundleId} is not active`);
                }

                if (bundle.isBlocked) {
                    throw new Error(`Product with ID ${item.bundleId} is blocked`);
                }

                const quantity = item.quantity || 1;
                if (bundle.stock < quantity) {
                    throw new Error(`Not enough stock for product ID ${item.bundleId}`);
                }

                let total = bundle.MRP * quantity;
                let discount = 0;

                if (bundle.adminDiscountedPrice) {
                    total = bundle.adminDiscountedPrice * quantity;
                    discount = bundle.MRP - bundle.adminDiscountedPrice;
                } else if (bundle.sellerDiscounted) {
                    total = bundle.sellerDiscounted * quantity;
                    discount = bundle.MRP - bundle.sellerDiscounted;
                }

                return {
                    bundleId: item.bundleId,
                    bundleName: bundle.name,
                    quantity,
                    price: bundle.MRP,
                    discount,
                    total,
                };

            } else {
                throw new Error('Either productId or bundleId must be provided');
            }
        }));

        // Calculate total amount based on item totals
        const totalAmount = populatedItems.reduce((acc: number, item: any) => acc + item.total, 0);

        // Create the order document with initial status
        const newOrder = new Order({
            userId,
            items: populatedItems,
            shippingInfo,
            totalAmount,
            orderStatus: 'Pending', // Default status
        });

        // Save the order to the database
        const savedOrder = await newOrder.save();

        return res.status(201).json({ message: 'Order created successfully', order: savedOrder });
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            return res.status(500).json({ message: 'Server error', error: error.message });
        } else {
            console.error('Unexpected error', error);
            return res.status(500).json({ message: 'Unexpected server error' });
        }
    }
};


export const getOrderById = async (req: Request, res: Response) => {
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

        const { id } = req.query;

        if (typeof id !== 'string') {
            return res.status(400).json({ message: 'Invalid order ID' });
        }

        const order = await Order.findById(id) // Populate product details if needed

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        return res.status(200).json({ order });
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Unexpected error');
        return res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unexpected server error' });
    }
};

// / Function to get all orders
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        // Fetch all orders from the database
        const orders = await Order.find({ isPaid: false });

        // Check if there are any orders
        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found' });
        }

        // Return the orders in the response
        return res.status(200).json({ orders });
    } catch (error) {
        // Type guard to ensure error is an instance of Error
        if (error instanceof Error) {
            console.error(error.message);
            return res.status(500).json({ message: 'Server error', error: error.message });
        } else {
            console.error('Unexpected error', error);
            return res.status(500).json({ message: 'Unexpected server error' });
        }
    }
};


interface ShippingInfo {
    houseNumber: string;
    locality: string;
    nearBy?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface Item {
    productId?: string;
    bundleId?: string;
    quantity?: number;
}

export const buyNowController = async (req: Request, res: Response) => {
    try {
        const userId = extractUserId(req); // Adjust the implementation of extractUserId
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

        const { productId, bundleId, quantity = 1, shippingInfo } = req.body;

        if (!productId && !bundleId) {
            return res.status(400).json({ message: 'Product ID or Bundle ID is required' });
        }

        // Use user address if no shippingInfo provided
        let shipping: ShippingInfo;
        if (shippingInfo) {
            shipping = shippingInfo;
        } else {
            const { address } = user;
            if (!address || !address.houseNumber || !address.locality || !address.city || !address.state || !address.postalCode || !address.country) {
                return res.status(400).json({ message: 'Shipping information or user address is required' });
            }
            shipping = {
                houseNumber: address.houseNumber,
                locality: address.locality,
                nearBy: address.nearBy,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
            };
        }

        // Validate the shippingInfo object
        if (!shipping || typeof shipping !== 'object' || !shipping.houseNumber || !shipping.locality || !shipping.city || !shipping.state || !shipping.postalCode || !shipping.country) {
            return res.status(400).json({ message: 'Invalid or incomplete shipping address' });
        }

        const items: Item[] = [];
        if (productId) {
            items.push({ productId, quantity });
        } else if (bundleId) {
            items.push({ bundleId, quantity });
        }

        // Fetch product or bundle details for each item and validate
        const populatedItems = await Promise.all(items.map(async (item: Item) => {
            if (item.productId) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    throw new Error(`Product with ID ${item.productId} not found`);
                }

                if (!product.isActive) {
                    throw new Error(`Product with ID ${item.productId} is not active`);
                }

                if (product.isBlocked) {
                    throw new Error(`Product with ID ${item.productId} is blocked`);
                }

                const itemQuantity = item.quantity || 1;
                if (product.stock < itemQuantity) {
                    throw new Error(`Not enough stock for product ID ${item.productId}`);
                }

                let total = product.MRP * itemQuantity;
                let discount = 0;

                if (product.finalePrice) {
                    total = product.finalePrice * itemQuantity;
                    discount = product.MRP - product.finalePrice;
                } else if (product.adminDiscountedPrice) {
                    total = product.adminDiscountedPrice * itemQuantity;
                    discount = product.MRP - product.adminDiscountedPrice;
                } else if (product.sellerDiscounted) {
                    total = product.sellerDiscounted * itemQuantity;
                    discount = product.MRP - product.sellerDiscounted;
                }

                return {
                    productId: item.productId,
                    productName: product.name,
                    quantity: itemQuantity,
                    price: product.MRP,
                    discount,
                    total,
                };
            } else if (item.bundleId) {
                const bundle = await Bundle.findById(item.bundleId);
                if (!bundle) {
                    throw new Error(`Bundle with ID ${item.bundleId} not found`);
                }

                if (!bundle.isActive) {
                    throw new Error(`Bundle with ID ${item.bundleId} is not active`);
                }

                if (bundle.isBlocked) {
                    throw new Error(`Bundle with ID ${item.bundleId} is blocked`);
                }

                const itemQuantity = item.quantity || 1;
                if (bundle.stock < itemQuantity) {
                    throw new Error(`Not enough stock for bundle ID ${item.bundleId}`);
                }

                let total = bundle.MRP * itemQuantity;
                let discount = 0;

                if (bundle.adminDiscountedPrice) {
                    total = bundle.adminDiscountedPrice * itemQuantity;
                    discount = bundle.MRP - bundle.adminDiscountedPrice;
                } else if (bundle.sellerDiscounted) {
                    total = bundle.sellerDiscounted * itemQuantity;
                    discount = bundle.MRP - bundle.sellerDiscounted;
                }

                return {
                    bundleId: item.bundleId,
                    bundleName: bundle.name,
                    quantity: itemQuantity,
                    price: bundle.MRP,
                    discount,
                    total,
                };
            } else {
                throw new Error('Either productId or bundleId must be provided');
            }
        }));

        // Calculate total amount based on item totals
        const totalAmount = populatedItems.reduce((acc, item) => acc + item.total, 0);

        // Create the order document with initial status
        const newOrder = new Order({
            userId,
            items: populatedItems,
            shippingInfo: shipping,
            totalAmount,
            orderStatus: 'Pending', // Default status
        });

        // Save the order to the database
        const savedOrder = await newOrder.save();

        return res.status(201).json({ message: 'Order created successfully', order: savedOrder });
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            return res.status(500).json({ message: 'Server error', error: error.message });
        } else {
            console.error('Unexpected error', error);
            return res.status(500).json({ message: 'Unexpected server error' });
        }
    }
};
