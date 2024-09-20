import { Request, Response } from 'express';
import nodemailer from 'nodemailer'; // For sending email
import {User} from '../models/User';

export const inviteFriend = async (req: Request, res: Response): Promise<void> => {
  const { email, phoneNumber, referralCode } = req.body;

  try {
    // Validate that the user has provided either email or phone number
    if (!email && !phoneNumber) {
      res.status(400).json({ message: 'Please provide either email or phone number to invite a friend.' });
      return;
    }

    // Validate that the referral code exists
    const user = await User.findOne({ referralCode });
    if (!user) {
      res.status(400).json({ message: 'Invalid referral code.' });
      return;
    }

    // If email is provided, send an invitation email
    if (email) {
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user:"vkm9559666733@gmail.com",
          pass: 'plwk jyts yvyx vipy',
        },
      });

      const mailOptions = {
        from:'"E-commerce app" <vkm9559666733@gmail.com>',
        to: email,
        subject: 'You have been invited!',
        text: `Join us using this referral code: ${referralCode}`,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Invitation sent via email.' });
    }

    // If phone number is provided, you could integrate with an SMS service (e.g., Twilio)
    if (phoneNumber) {
      // Send SMS logic here
      // await sendSMS(phoneNumber, `Join us using this referral code: ${referralCode}`);
      res.status(200).json({ message: 'Invitation sent via phone.' });
    }
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
