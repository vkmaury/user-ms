import Product from "../models/productSchema"
import Bundle from "../models/bundleSchema"
import Stripe from 'stripe';
import {User} from '../models/User';
import Cart from '../models/addToCartSchema'
import CouponUsage from '../models/couponUsage';
import Coupon from '../models/couponSchema'
import jwt from 'jsonwebtoken';
  // Adjust the import as per your project structure
import { Request, Response } from 'express';
import Order from '../models/orderSchema'; // Import your Order model
import dotenv from 'dotenv';
// import nodemailer from 'nodemailer';
import { sendOrderConfirmationEmail } from '../core/mailService';
import { sendEmail } from '../core/paymentConfirmMail';
import moment from 'moment-timezone';
import nodeCron from 'node-cron';




dotenv.config();



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


// const transporter = nodemailer.createTransport({
//   service: 'gmail', // or your preferred email service
//   auth: {
//     user: "vkm9559666733@gmail.com", // Your email address
//     pass: "plwk jyts yvyx vipy", // Your email password
//   },
// });


const stripe = new Stripe('sk_test_51PtJOzISdBE9dlmkclAujupluETLYsez7rPKAtHG4g3oLjXmhDDIXoncOX9pIfW1prli3quhT9yDIy6Lq2w6SOgR00WovQTFqj', {
    apiVersion: '2024-06-20',
});
// const endpointSecret = 'we_1PtBKLSFHk0sfGzE57PCobeV';

// interface PaymentRequestBody {
//     orderId: string;
//     paymentMethodId: string;
// }

export const confirmPaymentIntent = async (paymentIntentId: string, paymentMethodId: string) => {
    try {
        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: paymentMethodId,
            return_url: 'https://www.youtub.com' 
        });
        return paymentIntent;
    } catch (error) {
        console.error('Error confirming payment intent:', error);
        throw new Error('Unable to confirm payment intent');
    }
};

export const retrievePaymentIntent = async (paymentIntentId: string) => {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent;
    } catch (error) {
        console.error('Error retrieving payment intent:', error);
        throw new Error('Unable to retrieve payment intent');
    }
};



export const checkoutController = async (req: Request, res: Response) => {
  try {
      const userId = extractUserId(req);
      if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      if (!user.isActive) {
          return res.status(403).json({ message: 'User is not active' });
      }

      // Retrieve the cart for the user
      const cart = await Cart.findOne({ userId });
      if (!cart || cart.items.length === 0) {
          return res.status(400).json({ message: 'Cart is empty' });
      }

      // Ensure that the cart belongs to the user making the request
      if (cart.userId.toString() !== userId) {
          return res.status(403).json({ message: 'Cart does not belong to the user' });
      }

      // Filter out unavailable products or bundles
      const availableItems = [];
      for (const item of cart.items) {
          let isAvailable = true;
          
          if (item.productId) {
              const product = await Product.findById(item.productId);
              if (!product || product.isUnavailable) {
                  isAvailable = false;
              }
          }

          if (item.bundleId) {
              const bundle = await Bundle.findById(item.bundleId);
              if (!bundle || bundle.isUnavailable) {
                  isAvailable = false;
              }
          }

          if (isAvailable) {
              availableItems.push(item);
          }
      }

      if (availableItems.length === 0) {
          return res.status(400).json({ message: 'All items in the cart are unavailable' });
      }

      // Retrieve shipping address from the request body or use the user's address
      let { shippingInfo } = req.body;

      if (!shippingInfo) {
          const address = user.address;
          if (!address || !address.houseNumber || !address.locality || !address.city || !address.state || !address.postalCode || !address.country) {
              return res.status(400).json({ message: 'Shipping information or user address is required' });
          }
          shippingInfo = {
              houseNumber: address.houseNumber,
              locality: address.locality,
              nearBy: address.nearBy,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country,
          };
      }

      // Validate the shippingInfo object
      if (!shippingInfo || typeof shippingInfo !== 'object' || !shippingInfo.houseNumber || !shippingInfo.locality || !shippingInfo.city || !shippingInfo.state || !shippingInfo.postalCode || !shippingInfo.country) {
          return res.status(400).json({ message: 'Invalid or incomplete shipping address' });
      }

      // Create order items from available items
      const orderItems = availableItems.map((item) => ({
          productId: item.productId,
          bundleId: item.bundleId,
          quantity: item.quantity,
          price: item.price,
      }));

      // Create an order
      const newOrder = new Order({
          userId,
          items: orderItems,
          totalAmount: orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
          status: 'pending', // Initial status
          shippingInfo, // Add shipping address to the order
      });

      await newOrder.save();

      // Clear the cart
      await Cart.deleteOne({ userId });

      res.status(200).json({ message: 'Order placed successfully', order: newOrder });
  } catch (error) {
      console.error('Error during checkout:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};


export const placeOrderController = async (req: Request, res: Response) => {
  try {
    // Extract user ID from the request
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Fetch user details from the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { paymentMethod, paymentMethodToken, couponCode } = req.body;

    // Validate request body
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    // Retrieve the most recent pending order for the user
    const order = await Order.findOne({ userId, orderStatus: 'Pending' }).sort({ createdAt: -1 });
    if (!order) {
      return res.status(404).json({ message: 'No pending order found' });
    }

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      // console.log(coupon);
      if (!coupon) {
        return res.status(400).json({ message: 'Invalid coupon code' });
      }

      // Check coupon validity
      const now = new Date();
      if (coupon.validFrom > now) {
        return res.status(400).json({ message: 'Coupon not yet valid' });
      }
      if (coupon.validUntil && coupon.validUntil < now) {
        return res.status(400).json({ message: 'Coupon has expired' });
      }

      // Check if the coupon has a usage limit and verify usage count
      const couponUsage = await CouponUsage.findOne({ userId, couponCode });
      if (coupon.usageLimit && couponUsage && couponUsage.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Coupon usage limit exceeded' });
      }

      // Calculate the discount based on coupon type
      let discountAmount = 0;
      if (coupon.discountType === 'percentage') {
        discountAmount = (order.totalAmount * coupon.discountValue) / 100;
      } else if (coupon.discountType === 'flat') {
        discountAmount = coupon.discountValue;
      }

      // Ensure discount does not exceed total amount
      discountAmount = Math.min(discountAmount, order.totalAmount);

      // Update order total
      order.totalAmount -= discountAmount;
      order.couponCode = couponCode;
      // order.totalAmount = discountAmount;

      // Track coupon usage
      if (couponUsage) {
        couponUsage.usageCount += 1;
        await couponUsage.save();
      } else {
        await new CouponUsage({ userId, couponCode, usageCount: 1 }).save();
      }
    }

    if (paymentMethod === 'card') {
      if (!paymentMethodToken) {
        return res.status(400).json({
          message: 'Payment method token is required for card payments',
        });
      }

      try {
        // Create a PaymentMethod using the token and shippingInfo as billing details
        const paymentMethodResponse = await stripe.paymentMethods.create({
          type: 'card',
          card: { token: paymentMethodToken },
          billing_details: {
            name: user.name, // Use user's name from DB
            address: {
              line1: order.shippingInfo.houseNumber,
              line2: order.shippingInfo.locality,
              city: order.shippingInfo.city,
              state: order.shippingInfo.state,
              postal_code: order.shippingInfo.postalCode,
              country: order.shippingInfo.country,
            },
            email: user.email,
            phone: user.phoneNumber,
          },
        });

        const paymentMethodId = paymentMethodResponse.id;

        // Update the paymentInfo field with the payment method details
        order.paymentInfo = {
          method: 'card',
          status: 'Pending', // Update this according to your logic
          transactionId: paymentMethodId, // You might want to store the paymentMethodId or some related info
          amount: order.totalAmount,
        };
      } catch (error) {
        console.error('Error during payment processing:', error);
        return res.status(400).json({ message: 'Payment failed, please try again.' });
      }
    } else if (paymentMethod === 'COD') {
      // Handle Cash On Delivery
      order.paymentInfo = {
        method: 'COD',
        status: 'Unpaid',
        amount: order.totalAmount,
      };

      // Set order date and delivery date
      const orderDate = new Date();
      const deliveryDate = new Date(orderDate);
      deliveryDate.setDate(orderDate.getDate() + 7);

      order.orderStatus = 'Confirmed';
      order.orderDate = orderDate;
      order.deliveryDate = deliveryDate;

      // Decrease the stock of each product in the order
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock -= item.quantity;
          await product.save();
        }
      }

      // Save the order after updating stock
      await order.save();

      // Send confirmation email for COD orders using the mail service
      try {
        await sendOrderConfirmationEmail(user.email, user.name, order.id.toString(), orderDate, deliveryDate);
      } catch (error) {
        console.error('Error during sending confirmation email:', error);
      }
    } else {
      return res.status(400).json({ message: 'Unsupported payment method' });
    }

    const orderDate = moment.tz('Asia/Kolkata').toDate();
    order.orderStatus = 'Confirmed';
    order.orderDate = orderDate;

    await order.save();
    // Return a success response
    return res.status(200).json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Error during order placement:', error);

    if (error instanceof stripe.errors.StripeError) {
      return res.status(400).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
};




export const verifyPaymentController = async (req: Request, res: Response) => {
  try {
    const { orderId, currency, paymentMethodId, customerId } = req.body;

    // Validate input
    if (!currency) {
      return res.status(400).json({ message: 'Currency is required' });
    }
    if (!paymentMethodId) {
      return res.status(400).json({ message: 'Payment method ID is required' });
    }

    // Retrieve the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const amount = order.totalAmount * 100; // Convert amount to the smallest currency unit

    let customer;

    if (customerId) {
      // Check if the payment method is already attached to the customer
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.customer !== customerId) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      }
      customer = await stripe.customers.retrieve(customerId);
    } else {
      // Create a new customer
      const user = await User.findById(order.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      customer = await stripe.customers.create({
        email: user.email, // Use user's email from DB
        name: user.name, // Use user's name from DB
      });
      
      // Attach the PaymentMethod to the newly created Customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });
    }

    // Create and confirm a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method: paymentMethodId,
      customer: customer.id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: { orderId: order.id.toString() },
    });

    order.paymentInfo = {
      method: 'card',
      status: paymentIntent.status,  // Update this according to your logic
      transactionId: paymentMethodId, // You might want to store the paymentMethodId or some related info
      amount: order.totalAmount,
    };

    // Update the order with the PaymentIntent ID and status
    order.stripePaymentIntentId = paymentIntent.id;

    await order.save();

    switch (paymentIntent.status) {
      case 'succeeded':
        res.status(201).json({ message: 'Payment is verified and the payment status is updated', order });
        break;
      case 'requires_action':
        res.status(402).json({ 
          message: 'Payment requires additional action (e.g., authentication)', 
          nextAction: paymentIntent.next_action 
        });
        break;
      case 'requires_payment_method':
        res.status(402).json({ message: 'Payment failed: Payment method required' });
        break;
      default:
        res.status(400).json({ message: `Payment status is ${paymentIntent.status}` });
        break;
    }
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      res.status(400).json({ message: error.message, error });
    } else if (error instanceof Stripe.errors.StripeCardError) {
      res.status(402).json({ message: 'Payment error: ' + error.message, error });
    } else {
      res.status(500).json({ message: 'Internal Server Error', error });
    }
  }
};

 
export const webhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = "whsec_STZgGJFK9GY1Isy8o7Vn3DOBnFSYNx4M";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error(`Webhook Error: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    return res.status(400).json({ message: 'Order ID is missing from the payment intent metadata' });
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const userId = order.userId;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const email = user.email;

  switch (event.type) {
    case 'payment_intent.succeeded':
      order.isPaid = true;
      order.orderStatus = 'Processing';

      // Set the delivery date to 5 minutes after the order is confirmed
      const deliveryDate = moment().add(5, 'minutes').tz('Asia/Kolkata');
      order.deliveryDate = deliveryDate.toDate();

      // Update the quantity of each product or bundle in the order
      for (const item of order.items) {
        if (item.productId) {
          const product = await Product.findById(item.productId);
          if (!product) {
            console.error(`Product with ID ${item.productId} not found.`);
            continue;
          }

          if (product.stock < item.quantity) {
            console.error(`Insufficient quantity for product ${product.name}.`);
            continue;
          }

          product.stock -= item.quantity;
          await product.save();
        } else if (item.bundleId) {
          const bundle = await Bundle.findById(item.bundleId);
          if (!bundle) {
            console.error(`Bundle with ID ${item.bundleId} not found.`);
            continue;
          }

          if (bundle.stock < item.quantity) {
            console.error(`Insufficient quantity for bundle ${bundle.name}.`);
            continue;
          }

          bundle.stock -= item.quantity;
          await bundle.save();
        }
      }

      // Construct the items list for the email
      const itemsList = await Promise.all(order.items.map(async item => {
        let itemName = '';
        if (item.productId) {
          const product = await Product.findById(item.productId);
          itemName = product ? product.name : 'Unknown Product';
        } else if (item.bundleId) {
          const bundle = await Bundle.findById(item.bundleId);
          itemName = bundle ? bundle.name : 'Unknown Bundle';
        }

        return `
          <li>${itemName} - 
          Quantity: ${item.quantity}, 
          Price: Rs ${item.total},
          Discount: ${item.discount},
          MRP: ${item.price}
          </li>
        `;
      }));

      // Prepare the email content
      const emailSubject = 'Order Confirmation';
      const emailHtml = `
        <p>Dear ${user.name},</p>
        <p>Your order has been placed successfully. Here are the details:</p>
        <p><strong>Order ID:</strong> ${order._id}<br>
        <strong>Total Amount:</strong> Rs ${order.totalAmount}<br>
        <strong>Shipping Address:</strong> ${order.shippingInfo?.houseNumber}, ${order.shippingInfo?.locality}, ${order.shippingInfo?.nearBy}, ${order.shippingInfo?.city}, ${order.shippingInfo?.state}, ${order.shippingInfo?.postalCode}, ${order.shippingInfo?.country}</p>
        <p><strong>Items Purchased:</strong></p>
        <ul>${itemsList.join('')}</ul>
        <p>Your order will be delivered by <strong>${deliveryDate.format('YYYY-MM-DD HH:mm:ss')}</strong>.</p>
        <p>Thank you for shopping with us!</p>
        <p>Best regards,<br>E-Commerce Platform</p>
      `;

      // Send the confirmation email to the user
      try {
        await sendEmail(email, emailSubject, emailHtml);
      } catch (error) {
        console.error('Error sending confirmation email:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      order.isPaid = false;
      order.orderStatus = 'Failed';
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  await order.save();

  res.json({ received: true });
};

nodeCron.schedule('* * * * *', async () => {
  try {
    const currentTime = moment().startOf('minute'); // Use 'Asia/Kolkata' time zone
    console.log(currentTime);

    // Find orders that should be delivered now
    const orders = await Order.find({
      orderStatus: 'Processing',
      deliveryDate: { $lte: currentTime.toDate() }
    });

    for (const order of orders) {     
          order.orderStatus = 'Delivered';
          await order.save();
          console.log(`Order ${order._id} status updated to Delivered`);
      }
     
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

export const removeCouponCodeController = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.query;

    // Find the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Remove the coupon code
    order.couponCode = undefined; // Set couponCode to undefined to remove it
    // order.discount = 0; // Remove any discount applied by the coupon

    // Recalculate the totalAmount by summing up the price of all items
    const updatedTotalAmount = order.items.reduce((total, item) => {
      return total + item.total * item.quantity;
    }, 0);

        // Update the totalAmount and paymentInfo.amount
    order.totalAmount = updatedTotalAmount;

    // If paymentInfo exists, update the amount
    if (order.paymentInfo) {
      order.paymentInfo.amount = updatedTotalAmount;
    }
    
    await order.save();

    return res.status(200).json({ message: 'Coupon code removed and order total updated successfully', order });
  } catch (error) {
    console.error('Error removing coupon code and updating total amount:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
