const crypto = require('crypto');

// Replace these values with your actual Razorpay secret key and order/payment IDs
const secret = 'xoGAG6ypVrCrLkRljRadGa35'; // Replace with your Razorpay secret key
const orderId = 'order_OqMOmeYUpcQHif'; // Replace with actual order ID
const paymentId = 'pay_OqMtxn7Wx6gyoz'; // Replace with actual payment ID

// Generate the signature
const signature = crypto.createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

console.log('Generated Signature:', signature);
