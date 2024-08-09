import { Schema, model, Document } from 'mongoose';
// import { IProduct } from './productSchema'; // Adjust the path to where your Product model is defined

// Interface for the Cart item
interface ICartItem {
  productId: Schema.Types.ObjectId; // Reference to the Product model
  bundleId: Schema.Types.ObjectId;
  quantity: number; // Quantity of the product in the cart
  price: number; // Price of the product at the time of adding to the cart
}

// Interface for the Cart model
export interface ICart extends Document {
  userId: Schema.Types.ObjectId; // Reference to the User model
  items: ICartItem[]; // Array of cart items
  totalPrice: number; // Total price of all items in the cart
  createdAt: Date; // Date when the cart was created
  updatedAt: Date; // Date when the cart was last updated
}

// Cart item schema definition
const cartItemSchema = new Schema<ICartItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product'},
  bundleId: { type: Schema.Types.ObjectId, ref: 'Bundle'},
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
});

// Cart schema definition
const cartSchema = new Schema<ICart>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: { type: [cartItemSchema], default: [] },
  totalPrice: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the `updatedAt` field before saving
cartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default model<ICart>('Cart', cartSchema);
