import mongoose from 'mongoose';

const CouponUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  couponCode: { type: String, required: true },
  usageCount: { type: Number, default: 0 },
});

export default mongoose.model('CouponUsage', CouponUsageSchema);