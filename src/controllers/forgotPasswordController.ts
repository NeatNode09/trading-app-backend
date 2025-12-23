// controllers/authController.ts

import { Request, Response } from "express";
import { pool } from "../config/db";
import { transporter } from "../config/nodemailer";
import bcrypt from "bcryptjs";


export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO otps 
      (email, otp, purpose, expires_at, created_at, resend_count, last_sent, attempts, block_until)
      VALUES ($1, $2, 'forgot', $3, NOW(), 0, NOW(), 0, NULL)
      `,
      [email, otp, expires_at]
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      html: `<p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`
    });

    res.status(200).json({ message: "OTP sent to email" });

  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const verifyForgotOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const otpRes = await pool.query(
      `
      SELECT * FROM otps
      WHERE email = $1 AND purpose = 'forgot'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [email]
    );

    if (otpRes.rows.length === 0)
      return res.status(400).json({ message: "OTP not found" });

    const record = otpRes.rows[0];
    const now = new Date();

    if (record.block_until && new Date(record.block_until) > now) {
      return res.status(429).json({
        message: "Too many attempts. Try again later."
      });
    }

    if (new Date(record.expires_at) < now) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp.toString()) {
      const newAttempts = record.attempts + 1;

      if (newAttempts >= 5) {
        await pool.query(
          `
          UPDATE otps
          SET attempts = $1, block_until = NOW() + INTERVAL '10 minutes'
          WHERE otp_id = $2
          `,
          [newAttempts, record.otp_id] // FIXED
        );

        return res.status(429).json({
          message: "Too many attempts. You are blocked for 10 minutes."
        });
      }

      await pool.query(
        `UPDATE otps SET attempts = attempts + 1 WHERE otp_id = $1`,
        [record.otp_id] // FIXED
      );

      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP valid — delete all
    await pool.query(
      "DELETE FROM otps WHERE email = $1 AND purpose = 'forgot'",
      [email]
    );

    // Return SUCCESS without resetting password yet
    res.status(200).json({
      message: "OTP verified",
      otpVerified: true
    });

  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({ message: "Email and new password required" });
    // optional: ensure user exists
    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = $2`,
      [hash, email]
    );

    res.status(200).json({ message: "Password reset successful" });

  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
