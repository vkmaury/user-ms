import { Request, Response } from 'express';
import Order from '../models/orderSchema';
import Product from '../models/productSchema';
import Bundle from '../models/bundleSchema';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { cancelOrderConfirmationEmail } from '../core/cancelOrderMail';

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

const stripe = new Stripe('sk_test_51PtJOzISdBE9dlmkclAujupluETLYsez7rPKAtHG4g3oLjXmhDDIXoncOX9pIfW1prli3quhT9yDIy6Lq2w6SOgR00WovQTFqj', {
  apiVersion: '2024-06-20',
});

export const cancelOrderController = async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: No token provided or invalid token' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User is not active' });
    }

    const { orderId } = req.query;
    const { refundReason } = req.body;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    if (!refundReason || typeof refundReason !== 'string' || refundReason.trim().length === 0) {
      return res.status(400).json({ message: 'Refund reason is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to cancel this order' });
    }

    if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Processing') {
      return res.status(400).json({ message: 'Order cannot be canceled' });
    }

    // Update order status and refund details
    order.orderStatus = 'Cancelled';
    order.refundStatus = 'requested';
    order.refundReason = refundReason;

    if (order.paymentInfo.status === 'succeeded' && order.paymentInfo.method === 'card') {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          amount: Math.round(order.totalAmount * 100), // amount in cents
        });

        if (refund.status !== 'succeeded') {
          return res.status(500).json({ message: 'Refund failed' });
        }

        order.refundStatus = 'completed';
        order.refundAmount = order.totalAmount;
        order.refundDate = new Date();
      } catch (error) {
        order.refundStatus = 'failed';
        return res.status(500).json({ message: 'Refund process failed', error: (error as Error).message });
      }
    }

    // Restock products
    for (const item of order.items) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    // Construct the items list for the email
    const itemsList = await Promise.all(order.items.map(async (item) => {
      let itemName = '';
      if (item.productId) {
        const product = await Product.findById(item.productId);
        itemName = product ? product.name : 'Unknown Product';
      } else if (item.bundleId) {
        const bundle = await Bundle.findById(item.bundleId);
        itemName = bundle ? bundle.name : 'Unknown Bundle';
      }
      return `<li>${itemName} -
          Quantity: ${item.quantity}, 
          Price: Rs ${item.total},
          Discount: ${item.discount},
          MRP: ${item.price}
        </li>`;
    }));

    const emailSubject = 'Order Cancellation';
    const emailHtml = `
      <p>Dear ${user.name},</p>
      <p>Your order <strong>#${order._id}</strong> has been successfully canceled.</p>
      <p>Order Details:</p>
      <ul>${itemsList.join('')}</ul>
      <p>Total Amount: Rs ${order.totalAmount}</p>
      <p>Refund Status: ${order.refundStatus}</p>
      <p>Refund Reason: ${order.refundReason}</p>
      <p>Thank you for shopping with us!</p>
      <p>Best regards,<br>E-Commerce Platform</p>
    `;

    await cancelOrderConfirmationEmail(user.email as string, emailSubject, emailHtml);

    await order.save();

    res.status(200).json({ message: 'Order canceled successfully' });

  } catch (error) {
    console.error('Error occurred during order cancellation:', error);
    res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
  }
};


export const refundWebhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = "whsec_NekAQvTznw2hwUsg5tp8kFNvcHDFtPjy";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    // console.log("Webhook event constructed:", event);
  } catch (err) {
    const error = err as Error;
    // console.error("Webhook Error:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === 'refund.created' || event.type === 'refund.updated') {
    const refund = event.data.object as Stripe.Refund;
    const orderId = refund.metadata?.orderId;

    // console.log("Refund event received:", refund);
    // console.log("Associated orderId:", orderId);

    // Fetch the order from the database
    try {
      const order = await Order.findById(orderId);
      // console.log("Fetched order:", order);

      if (order) {
        // Update the order based on the refund event
        if (event.type === 'refund.created') {
          order.refundStatus = 'requested';
          order.refundAmount = (refund.amount / 100) as number;
          order.refundDate = new Date(refund.created * 1000);
          // Optionally store refund reason if available
          if (refund.reason) {
            order.refundReason = refund.reason;
          }
          // console.log("Order updated for refund.created:", order);
        } else if (event.type === 'refund.updated') {
          if (refund.status === 'succeeded') {
            order.refundStatus = 'completed';
          } else if (refund.status === 'failed') {
            order.refundStatus = 'failed';
          }
          // Update refund amount and date if needed
          if (order.refundStatus !== 'failed') {
            order.refundAmount = (refund.amount / 100) as number;
            order.refundDate = new Date(refund.created * 1000);
          }
          // console.log("Order updated for refund.updated:", order);
        }

        await order.save();
        // console.log("Order saved to the database.");
      } else {
        // console.warn("Order not found for orderId:", orderId);
      }
    } catch (dbError) {
      // console.error("Database error:", dbError);
    }
  }

  res.json({ received: true });
};

