import { Request, Response } from 'express';
import Wishlist from '../models/wishlistSchema'; // Adjust path as needed
import Product from '../models/productSchema'; // Adjust path as needed
import Bundle from '../models/bundleSchema'; // Adjust path as needed
import Cart from '../models/addToCartSchema'; // Adjust path as needed

import jwt from 'jsonwebtoken';
import{ User } from '../models/User';

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

// Calculate the price based on available discounts
const getPriceOnproduct = (product: any) => {
    if (product.adminDiscountedPrice) return product.adminDiscountedPrice;
    if (product.sellerDiscounted) return product.sellerDiscounted;
    return product.MRP;
};

// Calculate the price based on available discounts
const getPriceOnBundle = (bundle: any) => {
    if (bundle.adminDiscountedPrice) return bundle.adminDiscountedPrice;
    if (bundle.finalPrice) return bundle.finalPrice;
    return bundle.MRP;
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


// Add item to wishlist
export const addItemToWishlist = async (req: Request, res: Response) => {
    const { productId, bundleId } = req.body; // Accept both productId and bundleId

    try {
        // Extract userId from token
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Find the user’s wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            // Create a new wishlist if it does not exist
            wishlist = new Wishlist({ userId, items: [] });
        }

        // Initialize variables for response
        const errors: string[] = [];
        let isModified = false;

        if (productId) {
            // Handle product logic
            const product = await Product.findById(productId);
            if (!product) {
                errors.push('Product not found');
            } else if (!product.isActive || product.isBlocked ||  product.isUnavailable) {
                errors.push('Product is not active or is blocked or is Unavailable');
            } else if (wishlist.items.some(item => item.productId?.toString() === productId.toString())) {
                errors.push('Product is already in wishlist');
            } else if (product.stock <= 0) {
                errors.push('Product is out of stock');
            }else {
                // Add product to wishlist
                wishlist.items.push({
                    productId,
                    name: product.name,
                    price: getPriceOnproduct(product)
                });
                isModified = true;
            }
        }

        if (bundleId) {
            // Handle bundle logic
            const bundle = await Bundle.findById(bundleId);
            if (!bundle) {
                errors.push('Bundle not found');
            } else if (!bundle.isActive || bundle.isBlocked ||  bundle.isUnavailable) {
                errors.push('Bundle is not active or is blocked or is Unavailable');
            } else if (wishlist.items.some(item => item.bundleId?.toString() === bundleId.toString())) {
                errors.push('Bundle is already in wishlist');
            }else if (bundle.stock <= 0) {
                errors.push('Product is out of stock');
            }else {
                // Add bundle to wishlist
                wishlist.items.push({
                    bundleId,
                    name: bundle.name,
                    price: getPriceOnBundle(bundle)
                });
                isModified = true;
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Error adding item to wishlist', errors });
        }

        if (isModified) {
            // Save the wishlist if it was modified
            await wishlist.save();
        }

        res.status(200).json({
            message: 'Item added to wishlist successfully',
            wishlist
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Clear all items from wishlist
export const clearWishlist = async (req: Request, res: Response) => {
    try {
        // Extract userId from token
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Find and clear the user’s wishlist
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        // Clear all items from the wishlist
        wishlist.items = [];
        await wishlist.save();

        res.status(200).json({
            message: 'Wishlist cleared successfully',
            wishlist
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Remove item from wishlist
export const removeItemFromWishlist = async (req: Request, res: Response) => {
    const { productId, bundleId } = req.body; // Accept both productId and bundleId

    try {
        // Extract userId from token
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Find the user’s wishlist
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        // Initialize variables for response
        const errors: string[] = [];
        let isModified = false;

        if (productId) {
            // Remove product from wishlist
            const itemIndex = wishlist.items.findIndex(item => item.productId?.toString() === productId.toString());
            if (itemIndex === -1) {
                errors.push('Product not found in wishlist');
            } else {
                wishlist.items.splice(itemIndex, 1);
                isModified = true;
            }
        }

        if (bundleId) {
            // Remove bundle from wishlist
            const itemIndex = wishlist.items.findIndex(item => item.bundleId?.toString() === bundleId.toString());
            if (itemIndex === -1) {
                errors.push('Bundle not found in wishlist');
            } else {
                wishlist.items.splice(itemIndex, 1);
                isModified = true;
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Error removing item from wishlist', errors });
        }

        if (isModified) {
            // Save the wishlist if it was modified
            await wishlist.save();
        }

        res.status(200).json({
            message: 'Item removed from wishlist successfully',
            wishlist
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



// Move items from wishlist to cart
export const moveToCart = async (req: Request, res: Response) => {
    const { itemIds, quantity = 1 } = req.body; // Accept array of item IDs and optional quantity

    try {
        // Extract userId from token
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Find the user’s wishlist
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        // Find or create the user’s cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Initialize variables for response
        const errors: string[] = [];
        const movedItems: any[] = [];

        // Process each item
        for (const itemId of itemIds) {
            const itemIndex = wishlist.items.findIndex(item => 
                item.productId?.toString() === itemId.toString() || 
                item.bundleId?.toString() === itemId.toString()
            );

            if (itemIndex === -1) {
                errors.push(`Item with ID ${itemId} not found in wishlist`);
                continue;
            }

            // Get item details
            const item = wishlist.items[itemIndex];
            let price: number = 0; // Default price

            if (item.productId) {
                // Find product to get price
                const product = await Product.findById(item.productId);
                if (product) {
                    price = item.price || 0;
                }
            } else if (item.bundleId) {
                // Find bundle to get price
                const bundle = await Bundle.findById(item.bundleId);
                if (bundle) {
                    price = item.price || 0;
                }
            }

            // Ensure price is a number
            const cartItem = {
                productId: item.productId,
                bundleId: item.bundleId,
                quantity,
                price // Ensure price is set
            };

            cart.items.push(cartItem);

            // Remove item from wishlist
            wishlist.items.splice(itemIndex, 1);
            movedItems.push(cartItem);
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Error moving items to cart', errors });
        }

        // Save updated wishlist and cart
        await wishlist.save();
        await cart.save();

        res.status(200).json({
            message: 'Items moved to cart successfully',
            movedItems,
            cart
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


export const viewWishlist = async (req: Request, res: Response) => {
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
        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Fetch product and bundle details
        const itemsWithDetails = await Promise.all(wishlist.items.map(async item => {
            if (item.productId) {
                const productId = item.productId.toString(); // Convert ObjectId to string
                try {
                    const { name, isUnavailable } = await getProductDetails(productId);
                    if (isUnavailable) {
                        return { 
                            productId:productId,
                            productName: name, 
                            productPrice: 'Product is unavailable', 
                        
                        };
                    }
                    return { 
                        productId:productId,
                        productName: name, 
                        productPrice: item.price,
                        
                    };
                } catch {
                    return { 
                        productId:productId,
                        productName: 'Error fetching product name', 
                        productPrice: 'Error fetching price', 
                       
                    };
                }
            } else if (item.bundleId) {
                const bundleId = item.bundleId.toString(); // Convert ObjectId to string
                try {
                    const { name, isUnavailable } = await getBundleDetails(bundleId);
                    if (isUnavailable) {
                        return { 
                            bundleId:bundleId,
                            bundleName: name, 
                            bundlePrice: 'Bundle is unavailable', 
                            
                        };
                    }
                    return { 
                        bundleId:bundleId,
                        bundleName: name, 
                        bundlePrice: item.price, 
                      
                    };
                } catch {
                    return { 
                        bundleId:bundleId,
                        bundleName: 'Error fetching bundle name', 
                        bundlePrice: 'Error fetching price', 
                        
                    };
                }
            } else {
                return { 
            
                    name: 'Item not found', 
                    price: 'N/A', 
                    
                };
            }
        }));

        res.status(200).json({
            message: 'Wishlist items retrieved successfully',
            items: itemsWithDetails,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
