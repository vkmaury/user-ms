import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vkm9559666733@gmail.com', 
    pass: 'plwk jyts yvyx vipy', 
  },
});

export const cancelOrderConfirmationEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: '"E-commerce app" <vkm9559666733@gmail.com>',
      to,
      subject,
      html,
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};