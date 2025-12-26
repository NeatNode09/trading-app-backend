import { Request, Response } from "express";
import { pool } from "../config/db";


export const getTopPairAnalysis = async (req: Request, res: Response) => {
  try {
    const { category } = req.params; // Crypto | Forex

    if (!category) {
      return res.status(400).json({
        status: 400,
        message: "category param is required",
      });
    }

    const query = `
      SELECT *
      FROM analysis_pairs
      WHERE category = $1
      ORDER BY created_at DESC
      LIMIT 4
    `;

    const { rows } = await pool.query(query, [category]);

    res.status(200).json({
      status: 200,
      data: rows,
    });

  } catch (error) {
    console.error("Error fetching top pair analysis:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};
