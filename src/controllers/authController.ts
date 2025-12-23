import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/db";
import { transporter } from "../config/nodemailer";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { setRefreshCookie } from "../utils/refreshCookieUtility";
import { JwtUser } from "../types/types";


export const registerUser = async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, partner_code } = req.body;

    if (!full_name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    // Check existing email
    const existing = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );

    if (existing.rowCount! > 0)
      return res.status(400).json({ message: "Email already registered" });

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Get default role_id for "user"
    const roleRow = await pool.query(
      "SELECT role_id FROM roles WHERE role_name = 'user'"
    );

    if (roleRow.rowCount === 0)
      return res.status(500).json({ message: "Default user role missing" });

    const role_id = roleRow.rows[0].role_id;

    // Handle partner referral (optional)
    let partner_id: string | null = null;

    if (partner_code) {
      const partnerRow = await pool.query(
        "SELECT partner_id FROM partners WHERE partner_code = $1",
        [partner_code]
      );

      if (partnerRow.rowCount! > 0) {
        partner_id = partnerRow.rows[0].partner_id;
      }
    }

    // Insert user into DB
    await pool.query(
      `
      INSERT INTO users 
      (full_name, email, password_hash, partner_id, role_id, created_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NULL)
      `,
      [full_name, email, password_hash, partner_id, role_id]
    );

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    // Insert OTP
    await pool.query(
      `
      INSERT INTO otps 
      (email, otp, purpose, expires_at, created_at, resend_count, last_sent, attempts, block_until)
      VALUES ($1, $2, 'register', $3, NOW(), 0, NOW(), 0, NULL)
      `,
      [email, otp, expires_at]
    );

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>Welcome, ${full_name}</h2>
        <p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>
      `,
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error: any) {
    console.error("Register error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // -------------------------
    // 1. Validate input
    // -------------------------
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // -------------------------
    // 2. Fetch user + role + latest subscription
    // -------------------------
    const query = `
      SELECT 
        u.user_id,
        u.email,
        u.full_name,
        u.password_hash,
        u.avatar_url,
        u.serial_number,
        u.last_login_at,
        u.is_verified,
        
        r.role_name,

        -- subscription
        s.plan_type AS subscription_plan,
        s.status AS subscription_status,
        s.end_date AS subscription_expiry

      FROM users u
      JOIN roles r ON u.role_id = r.role_id

      LEFT JOIN LATERAL (
        SELECT *
        FROM subscriptions
        WHERE user_id = u.user_id
        ORDER BY created_at DESC
        LIMIT 1
      ) s ON true

      WHERE u.email = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // -------------------------
    // 3. Check verification
    // -------------------------
    if (!user.is_verified) {
      return res.status(403).json({
        message: "Account not verified. Please verify your email first.",
        needVerification: true,
        email: user.email,
      });
    }

    // -------------------------
    // 4. Validate password
    // -------------------------
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // -------------------------
    // 5. Update last login timestamp
    // -------------------------
    await pool.query(
      `UPDATE users SET last_login_at = NOW() WHERE user_id = $1`,
      [user.user_id]
    );

    // -------------------------
    // 6. Generate Tokens
    // -------------------------
    const accessToken = createAccessToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role_name, // stable & minimal payload
    });

    const refreshToken = createRefreshToken({
      userId: user.user_id,
    });

    // -------------------------
    // 7. Final Response
    // -------------------------
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        serial_number: user.serial_number,

        subscription: {
          plan: user.subscription_plan,
          status: user.subscription_status,
          expiry: user.subscription_expiry,
        },

        role: user.role_name,
      },
      accessToken,
      refreshToken,
    });

  } catch (error: any) {
    console.error("❌ loginUser error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const secureToken = async (req: Request, res: Response) => {

    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ status: 400, message: "Refresh token is required" });
        }

        // Verify the refresh token
        const payload = verifyRefreshToken(refreshToken) as JwtUser;
        if (!payload) {
            return res.status(401).json({ status: 401, message: "Invalid refresh token" });
        }

        setRefreshCookie(res, refreshToken, REFRESH_TOKEN_EXPIRY_MS);

        return res.status(200).json({
            status: 200,
            message: "Refresh token successfully secured in HttpOnly cookie.",
            // The client must discard the token from JS memory after this call.
        });

    } catch (error) {
        console.error("Error in secureToken:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }

}

export const refreshToken = async (req: Request, res: Response) => {
    try {
        let refreshToken: string | undefined;

        // -------------------------
        // 1. Determine Source of Refresh Token
        // -------------------------
        
        // A. Check HTTP-Only Cookie (Primary method for Web client)
        // Ensure you have a cookie parser middleware (like 'cookie-parser') active on your Express app.
        refreshToken = req.cookies?.refreshToken;
        let isFromCookie = !!refreshToken;

        if (!refreshToken) {
            // B. Check JSON Request Body (Primary method for Mobile client)
            refreshToken = req.body?.refreshToken;
            isFromCookie = false; // Reset flag
        }
        
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token not found in cookie or body." });
        }
        
        // -------------------------
        // 2. Validate Token (Signature, Expiry, Blacklist)
        // -------------------------
        
        // In a production system, you should check if this token is currently blacklisted 
        // (if you implement token revocation).
        // if (isTokenBlacklisted(refreshToken)) { ... } 

        const payload: any = verifyRefreshToken(refreshToken); // Assumes this validates and decodes the token
        const userId = payload.userId; // Get the user ID from the token payload

        // -------------------------
        // 3. Optional: Database Lookup for Role/User Status
        // -------------------------
        
        // While the token is valid, you might want a quick check on the user's status/role in the DB.
        const userQuery = `SELECT role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1`;
        const userResult = await pool.query(userQuery, [userId]);
        const userRole = userResult.rows[0]?.role_name;

        if (!userRole) {
             return res.status(401).json({ message: "User or role not found for refresh token." });
        }


        // -------------------------
        // 4. Generate NEW Tokens (Rotation)
        // -------------------------
        
        // Token rotation is best practice: always issue a new pair
        const newAccessToken = createAccessToken({
            user_id: userId,
            email: payload.email, // Include necessary claims
            role: userRole,
        });

        const newRefreshToken = createRefreshToken({
            userId: userId,
            // (Optional: add a unique ID to manage database revocation)
        });
        
        // -------------------------
        // 5. Final Response & Storage
        // -------------------------
        
        // For the Web Client (Cookie Source), set the new Refresh Token in a new cookie
        if (isFromCookie) {
            // 5a. Web: Overwrite the old refresh token with the new one in the cookie
            setRefreshCookie(res, newRefreshToken, REFRESH_TOKEN_EXPIRY_MS);
            
            // 5b. Web: Return ONLY the Access Token in the body (Refresh Token is in cookie)
            return res.status(200).json({
                message: "Tokens refreshed successfully (Web)",
                accessToken: newAccessToken,
            });
        } 
        
        // For the Mobile Client (Body Source), return both tokens in the JSON body
        else {
            // 5c. Mobile: Return both tokens in the body
            return res.status(200).json({
                message: "Tokens refreshed successfully (Mobile)",
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            });
        }
        
    } catch (error: any) {
        // Handle token expired/invalid errors specifically
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Invalid or expired refresh token. Please log in again." });
        }
        console.error("❌ refreshToken error:", error);
        return res.status(500).json({
            message: "Server error during token refresh.",
            error: error.message,
        });
    }
};