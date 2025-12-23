import { Request, Response } from "express";
import { pool } from "../../config/db";
import bcrypt from "bcrypt";
import { createLifetimeSubscription, createPaidSubscription } from "../../services/subscriptionServices";

export const getRecentUsersHandler = async (req: Request, res: Response) => {
    try {
        const query = `SELECT user_id, full_name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5
    `;

        const { rows } = await pool.query(query);

        return res.status(200).json({
            success: true,
            count: rows.length,
            users: rows,
        });

    } catch (error: any) {
        console.error("❌ getRecentUsersHandler error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getPaginatedUsersHandler = async (req: Request, res: Response) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = 10;
        const offset = (page - 1) * limit;


        const query = `SELECT user_id, full_name, email, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2
            `;

        const { rows } = await pool.query(query, [limit, offset]);

        // Get total users count
        const countResult = await pool.query("SELECT COUNT(*) FROM users");
        const total = Number(countResult.rows[0].count);

        return res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            users: rows,
        });

    } catch (error: any) {
        console.error("❌ getPaginatedUsersHandler error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const addUserHandler = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      full_name,
      email,
      password_hash, // Named to match the form submission
      partner_id,
      subscription_type, // 'free' | 'monthly' | 'yearly' | 'partner'
      lifetime_free,     // boolean from form
    } = req.body;

    // 1. Validation
    if (!full_name || !email || !password_hash) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required",
      });
    }

    // 2. Resolve default "user" role
    const roleResult = await client.query(
      `SELECT role_id FROM roles WHERE role_name = $1`,
      ["user"]
    );

    if (roleResult.rowCount === 0) {
      throw new Error("Default role 'user' not found in database");
    }
    const role_id = roleResult.rows[0].role_id;

    await client.query("BEGIN");

    // 3. Hash Password and Create User
    const hashedPassword = await bcrypt.hash(password_hash, 10);
    
    const userQuery = `
      INSERT INTO users
      (full_name, email, password_hash, role_id, partner_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, full_name, email, role_id, partner_id, created_at
    `;

    const { rows } = await client.query(userQuery, [
      full_name,
      email,
      hashedPassword,
      role_id,
      // If subscription_type is 'partner', we use the partner_id, otherwise null
      subscription_type === 'partner' ? partner_id : null,
    ]);

    const user = rows[0];

    // 4. Subscription Logic
    let subscription = null;

    // A: Partner logic (creates lifetime subscription)
    if (subscription_type === 'partner' && partner_id) {
      subscription = await createLifetimeSubscription(client, user.user_id);
    } 
    // B: Paid logic (Monthly/Yearly)
    else if (['monthly', 'yearly'].includes(subscription_type)) {
      subscription = await createPaidSubscription(client, {
        user_id: user.user_id,
        subscription_type: subscription_type,
        start_date: new Date(),        // Start now
      });
    }
    // C: Handle the "Lifetime Free" checkbox if checked manually (optional)
    else if (lifetime_free) {
       subscription = await createLifetimeSubscription(client, user.user_id);
    }
    // Note: If 'free' is selected and lifetime_free is false, no subscription record is created.

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "User and subscription created successfully",
      user,
      subscription,
    });

  } catch (error: any) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    console.error("❌ addUserHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

