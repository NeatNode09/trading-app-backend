import { Request, Response } from "express";
import { pool } from "../config/db";
import { transporter } from "../config/nodemailer";

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    // Get LAST OTP
    const otpRes = await pool.query(
      `SELECT * FROM otps 
       WHERE email = $1 AND purpose = 'register'
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    const record = otpRes.rows[0];
    const now = new Date();

    // 1 minute resend cooldown
    if (
      record?.last_sent &&
      now.getTime() - new Date(record.last_sent).getTime() < 60000
    ) {
      return res.status(429).json({
        message: "OTP already sent. Please wait 1 minute before trying again."
      });
    }

    // Max 5 resend attempts per hour
    if (record?.resend_count >= 5) {
      return res.status(429).json({
        message: "Too many OTP requests. Try again in 1 hour."
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (record) {
      // Update existing OTP
      await pool.query(
        `UPDATE otps 
         SET otp = $1,
             expires_at = NOW() + INTERVAL '10 minutes',
             resend_count = resend_count + 1,
             last_sent = NOW()
         WHERE otp_id = $2`,
        [otp, record.otp_id] // FIXED
      );
    } else {
      // Create new OTP entry
      await pool.query(
        `INSERT INTO otps (email, otp, purpose, expires_at, resend_count, last_sent)
         VALUES ($1, $2, 'register', NOW() + INTERVAL '10 minutes', 1, NOW())`,
        [email, otp]
      );
    }

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your New OTP Code",
      html: `<p>Your OTP code is: <b>${otp}</b></p>`
    });

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
