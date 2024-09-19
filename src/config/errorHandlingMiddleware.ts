import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    return res.status(400).json({ message: `Multer error: ${err.message}` });
  } else if (err) {
    // Handle other errors
    return res.status(500).json({ message: `Server error: ${err.message}` });
  }
  next();
};
