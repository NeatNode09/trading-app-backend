import { Request, Response } from 'express';
import { pool } from '../../config/db';

export const reviewSubscriptionHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { verification_id, action, subscription_type } = req.body;

    if (!verification_id || !action) {
      return res.status(400).json({
        message: "verification_id and action are required",
      });
    }

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        message: "Invalid action",
      });
    }

    // 1️⃣ Get verification
    const verificationResult = await pool.query(
      `
      SELECT * FROM subscription_verifications
      WHERE verification_id = $1 AND review_status = 'pending'
      `,
      [verification_id]
    );

    if (verificationResult.rowCount === 0) {
      return res.status(404).json({
        message: "Verification not found or already reviewed",
      });
    }

    const verification = verificationResult.rows[0];

    // 2️⃣ Update verification (APPROVED or REJECTED)
    await pool.query(
      `
      UPDATE subscription_verifications
      SET review_status = $1,
          reviewed_at = NOW()
      WHERE verification_id = $2
      `,
      [action, verification_id]
    );

    // 3️⃣ If rejected → STOP HERE
    if (action === 'rejected') {
      return res.status(200).json({
        message: "Subscription request rejected",
      });
    }

    // 4️⃣ BELOW THIS LINE = YOUR EXISTING LOGIC
    let end_date: Date | null = null;
    let final_plan_type = subscription_type;

    if (subscription_type === 'partner') {
      final_plan_type = 'lifetime_free';
    }

    if (subscription_type === 'monthly') {
      end_date = new Date();
      end_date.setMonth(end_date.getMonth() + 1);
    }

    if (subscription_type === 'yearly') {
      end_date = new Date();
      end_date.setFullYear(end_date.getFullYear() + 1);
    }

    const insertResult = await pool.query(
      `
      INSERT INTO subscriptions
      (user_id, subscription_type, status, start_date, end_date, created_at)
      VALUES ($1, $2, 'active', NOW(), $3, NOW())
      RETURNING *
      `,
      [verification.user_id, final_plan_type, end_date]
    );

    return res.status(201).json({
      message: "Subscription approved successfully",
      subscription: insertResult.rows[0],
    });

  } catch (error) {
    console.error("❌ reviewSubscriptionHandler error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
