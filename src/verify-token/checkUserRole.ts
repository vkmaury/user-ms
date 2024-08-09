import { Request, Response, NextFunction } from 'express';

export const checkUserRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'user') {
    return res.status(403).json({ message: 'Forbidden: Only Users can perform this action.' });
  }
  next();
};
