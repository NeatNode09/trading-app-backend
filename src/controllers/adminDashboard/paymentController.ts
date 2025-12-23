import { Request, Response } from 'express';
import { pool } from '../../config/db';

export const getPaymentMethodsHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const query = `
      SELECT
        s.subscription_id, 
        s.user_id,
        
        method_name
      FROM payment_methods
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json({
      status: 200,
      payment_methods: rows,
    });
  } catch (error) {
    console.error("❌ getPaymentMethodsHandler error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};

