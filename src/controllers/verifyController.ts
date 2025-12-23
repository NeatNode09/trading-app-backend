import { Request, Response } from "express";
import { pool } from "../config/db";
import { createAccessToken, createRefreshToken } from "../utils/jwt";

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    // 1. Get latest OTP
    const otpRes = await pool.query(
      `SELECT * FROM otps
       WHERE email = $1 AND purpose = 'register'
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (otpRes.rows.length === 0)
      return res.status(400).json({ message: "OTP not found" });

    const record = otpRes.rows[0];
    const now = new Date();

    if (record.block_until && new Date(record.block_until) > now) {
      return res.status(429).json({
        message: "Too many attempts. Try again later.",
      });
    }

    if (new Date(record.expires_at) < now) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp.toString()) {
      const newAttempts = record.attempts + 1;

      if (newAttempts >= 5) {
        await pool.query(
          `UPDATE otps
           SET attempts = $1, block_until = NOW() + INTERVAL '10 minutes'
           WHERE otp_id = $2`,
          [newAttempts, record.otp_id]
        );

        return res.status(429).json({
          message: "Too many attempts. You are blocked for 10 minutes.",
        });
      }

      await pool.query(
        `UPDATE otps SET attempts = attempts + 1 WHERE otp_id = $1`,
        [record.otp_id]
      );

      return res.status(400).json({ message: "Invalid OTP" });
    }

    // 2. Verify user
    await pool.query(
      `UPDATE users SET is_verified = true WHERE email = $1`,
      [email]
    );

    // 3. Fetch FULL user (important)
    const userRes = await pool.query(
      `
      SELECT 
        u.user_id,
        u.email,
        r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = $1
      LIMIT 1
      `,
      [email]
    );

    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found after verification" });
    }

    // 4. Delete OTPs
    await pool.query(
      `DELETE FROM otps WHERE email = $1 AND purpose = 'register'`,
      [email]
    );

    // 5. Generate tokens (SAME structure as login)
    const accessToken = createAccessToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role_name,
    });

    const refreshToken = createRefreshToken({
      userId: user.user_id,
    });

    return res.status(200).json({
      message: "Account verified successfully",
      accessToken,
      refreshToken,
    });

  } catch (error: any) {
    console.error("❌ verifyOtp error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
