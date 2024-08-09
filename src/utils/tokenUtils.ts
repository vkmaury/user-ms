import jwt from 'jsonwebtoken';
import { Request } from 'express';

// Define the type for the token payload
interface TokenPayload {
  username: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive: boolean; // Add isActive here
}

// Extract user information from token
const extractUserInfoFromToken = (req: Request) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    return {
      username: decoded.username,
      email: decoded.email,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role,
      isActive: decoded.isActive // Include isActive here
    };
  } catch {
    return null;
  }
};

export default extractUserInfoFromToken;
