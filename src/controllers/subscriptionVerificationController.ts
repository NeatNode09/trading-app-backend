import { Request, Response } from "express";
import { pool } from "../config/db";

export const initSubscriptionVerificationsHandler = async (
    req: Request,
    res: Response
) => {
    try {
        /* 1️⃣ Auth guard */
        if (!req.user) {
            return res.status(401).json({
                status: 401,
                message: "Unauthorized",
            });
        }

        console.log("User: ", req.user);
        

        /* 2️⃣ File validation */
        if (!req.file) {
            return res.status(400).json({
                status: 400,
                message: "Verification image is required",
            });
        }

        const userId = req.user.user_id;
        const screenshotUrl = `/uploads/subscription-verifications/${req.file.filename}`;

        /* 3️⃣ Prevent multiple pending verifications */
        const pendingCheck = await pool.query(
            `
      SELECT 1
      FROM subscription_verifications
      WHERE user_id = $1 AND review_status = 'pending'
      `,
            [userId]
        );

        if ((pendingCheck.rowCount ?? 0) > 0) {
            return res.status(409).json({
                status: 409,
                message: "You already have a pending subscription verification",
            });
        }


        /* 4️⃣ Insert verification */
        const insertQuery = `
      INSERT INTO subscription_verifications (
        user_id,
        screenshot_url,
        review_status
      )
      VALUES ($1, $2, 'pending')
      RETURNING verification_id, review_status, created_at;
    `;

        const { rows } = await pool.query(insertQuery, [
            userId,
            screenshotUrl,
        ]);

        return res.status(201).json({
            status: 201,
            message: "Subscription verification submitted successfully",
            verification: rows[0],
        });
    } catch (error) {
        console.error("❌ initSubscriptionVerificationsHandler error:", error);

        return res.status(500).json({
            status: 500,
            message: "Internal server error",
        });
    }
};
