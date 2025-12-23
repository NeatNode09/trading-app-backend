import { Request, Response } from "express";
import { pool } from "../../config/db"; // your pg pool

export const getAllSubscriptionsHandler = async (
    req: Request,
    res: Response
) => {
    try {
        // -------------------------
        // 1. Query params
        // -------------------------
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const email = req.query.email as string | undefined;
        const planType = req.query.plan_type as string | undefined;

        // -------------------------
        // 2. Dynamic filters
        // -------------------------
        const conditions: string[] = [];
        const values: any[] = [];

        if (email) {
            values.push(`%${email}%`);
            conditions.push(`u.email ILIKE $${values.length}`);
        }

        if (planType) {
            values.push(planType);
            conditions.push(`s.plan_type = $${values.length}`);
        }

        const whereClause =
            conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // -------------------------
        // 3. Data query
        // -------------------------
        const dataQuery = `
      SELECT
        s.subscription_id,
        s.plan_type,
        s.status,
        s.start_date,
        s.end_date,
        s.created_at,
        u.user_id,
        u.email,
        u.full_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.user_id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

        const dataValues = [...values, limit, offset];

        // -------------------------
        // 4. Count query
        // -------------------------
        const countQuery = `
      SELECT COUNT(*) AS total
      FROM subscriptions s
      JOIN users u ON s.user_id = u.user_id
      ${whereClause}
    `;

        const [dataResult, countResult] = await Promise.all([
            pool.query(dataQuery, dataValues),
            pool.query(countQuery, values),
        ]);

        const total = parseInt(countResult.rows[0].total);

        // -------------------------
        // 5. Response
        // -------------------------
        return res.status(200).json({
            success: true,
            data: dataResult.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get subscriptions error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions",
        });
    }
};


export const updateSubscriptionHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { subscriptionId } = req.params;
    const { status, start_date, end_date, plan_type } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId is required",
      });
    }

    // -------------------------
    // 1. Build dynamic update
    // -------------------------
    const fields: string[] = [];
    const values: any[] = [];

    if (status) {
      values.push(status);
      fields.push(`status = $${values.length}`);
    }

    if (start_date) {
      values.push(start_date);
      fields.push(`start_date = $${values.length}`);
    }

    if (end_date) {
      values.push(end_date);
      fields.push(`end_date = $${values.length}`);
    }

    if (plan_type) {
      values.push(plan_type);
      fields.push(`plan_type = $${values.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    // always update updated_at
    fields.push(`updated_at = NOW()`);

    // -------------------------
    // 2. Execute update
    // -------------------------
    const query = `
      UPDATE subscriptions
      SET ${fields.join(", ")}
      WHERE subscription_id = $${values.length + 1}
      RETURNING *
    `;

    const result = await pool.query(query, [...values, subscriptionId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update subscription",
    });
  }
};
 

export const deleteSubscriptionHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId is required",
      });
    }

    const result = await pool.query(
      `DELETE FROM subscriptions WHERE subscription_id = $1 RETURNING subscription_id`,
      [subscriptionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    console.error("Delete subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete subscription",
    });
  }
};