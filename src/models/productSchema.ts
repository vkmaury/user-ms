import mongoose, { Document, Schema, Types } from 'mongoose';

interface IProduct extends Document {
    _id: Types.ObjectId;
    name: string;
    description: string;
    MRP: number;

    stock: number;
    categoryId: Schema.Types.ObjectId; 
    finalePrice: number;
    userId: mongoose.Types.ObjectId;
    isUnavailable?: boolean; // Add this field
    productName: string;
    price: number;
    createdAt: Date;
    updatedAt: Date;
    sellerDiscountApplied?: number; 
    sellerDiscounted?: number; // New field
    adminDiscountApplied?: number;
    adminDiscountedPrice?: number;
    
    isActive: boolean;
    isBlocked: boolean;
    reviews: {
        _id: Schema.Types.ObjectId;
        userId: Schema.Types.ObjectId;
        rating: number;
        reviewText: string;
        images: string[];
        userName: string
      }[];
    
}

const productSchema: Schema = new Schema<IProduct>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    MRP: { type: Number, required: true },
    productName: { type: String},
    price: { type: Number },
    isUnavailable: { type: Boolean, default: false }, // Add this field
    stock: { type: Number, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'Auth-ms'},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    sellerDiscountApplied: { type: Number },
    sellerDiscounted: { type: Number }, // New field
    adminDiscountApplied: { type: Number},
    adminDiscountedPrice: { type: Number}, 
    finalePrice :{ type :Number},
    
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    reviews: [
        {
          _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
          userId: { type: Schema.Types.ObjectId, ref: 'User' },
          rating: { type: Number},
          reviewText: { type: String, default: '' },
          images: [String],
          userName: { type: String},
        },
      ],
});

export default mongoose.model<IProduct>('product', productSchema);
