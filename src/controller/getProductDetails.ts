import { Request, Response } from 'express';
import Product from '../models/productSchema'; // Adjust the path based on your file structure

export const getProductByIdController = async (req: Request, res: Response) => {
  const { id } = req.query;

  // Validate the productId
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
     // Fetch the product by ID with filters
     const product = await Product.findOne({
        _id: id,
      });
  
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      if (!product.isActive) {
        return res.status(403).json({ message: 'Product is inactive' });
      }
  
      if (product.isBlocked) {
        return res.status(401).json({ message: 'Product is blocked' });
      }
  
    // Return the product details
    return res.status(200).json(product);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch product details', error });
  }
};
