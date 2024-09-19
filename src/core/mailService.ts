import nodemailer from 'nodemailer';

// Configure the mail transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'vkm9559666733@gmail.com', // Your email address
    pass: 'plwk jyts yvyx vipy',     // Your email password
  },
});

// Function to send a confirmation email
export const sendOrderConfirmationEmail = async (
  recipientEmail: string,
  userName: string,
  orderId: string,
  orderDate: Date,
  deliveryDate: Date
): Promise<void> => {
  const mailOptions = {
    from: '"E-commerce app" <vkm9559666733@gmail.com>',
    to: recipientEmail,
    subject: 'Order Confirmation',
    text: `Dear ${userName},\n\nYour order has been placed successfully. Your order ID is ${orderId}. You have chosen to pay Cash On Delivery.\n\nOrder Date: ${orderDate.toDateString()}\nEstimated Delivery Date: ${deliveryDate.toDateString()}\n\nThank you for shopping with us!\n\nBest regards,\nYour Company Name`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent:', info.response);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw new Error('Email could not be sent');
  }
};
