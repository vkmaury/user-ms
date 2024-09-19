import mongoose, { Schema, Document } from 'mongoose';

interface IBundle extends Document {
  name: string;
  description?: string; // Add description field
  products: {
    equals(productObjectId: mongoose.Types.ObjectId): unknown; productId: string; quantity: number 
}[];
  MRP: number;
  adminDiscount?: number; // Add this field
  finalPrice: number; // Add this field for the final price after discount
  sellerDiscount: number; // Add this field
  stock: number;
  sellerDiscounted: number; 
  isUnavailable?: boolean; // Add this field
  AdminId: string;
  isActive: boolean; // Add this field
  isBlocked: boolean; // Add this field
  adminDiscountApplied?: number; // New field for admin discount applied
  adminDiscountedPrice?: number; // New field for admin discounted price
  discountId: Schema.Types.ObjectId;
  status: 'active' | 'removed'; // or any other suitable value
  hasBeenProcessed: boolean;
  reviews: {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    rating: number;
    reviewText: string;
    images: string[];
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const BundleSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String }, 
    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true }
      }
    ],
    MRP: { type: Number},
    adminDiscount: { type: Number}, // Add this field with default value
    finalPrice: { type: Number }, // Add this field for final price
    AdminId: { type: Schema.Types.ObjectId, ref: 'Admin'},
    stock: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    sellerDiscount: { type: Number},
    sellerDiscounted: { type: Number },
    adminDiscountApplied: { type: Number }, // New field
    adminDiscountedPrice: { type: Number }, // New field
    discountId: { type: Schema.Types.ObjectId, ref: 'Discount'},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'removed'], default: 'active' },
    hasBeenProcessed: { type: Boolean, default: false },
    reviews: [
      {
        _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, required: true },
        reviewText: { type: String, default: '' },
        images: [String],
      },
    ],
    
    isUnavailable: { type: Boolean, default: false }, // Add this field
  },
  { timestamps: true }
);

export default mongoose.model<IBundle>('Bundle', BundleSchema);
