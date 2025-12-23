// src/controllers/adminSignalController.ts
import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import { io } from "../../socket";

export const createAnalysisPairHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      category,
      symbol,
      description,
      scheduled_for,
      status = "active",
      visibility = "public"
    } = req.body;

    // Validation
    if (!category || typeof category !== "string") {
      return res.status(400).json({ status: 400, message: "category is required" });
    }

    if (!symbol || typeof symbol !== "string") {
      return res.status(400).json({ status: 400,message: "symbol is required" });
    }

    if (!description || typeof description !== "string") {
      return res.status(400).json({ status: 400, message: "description is required" });
    }

    // Auth
    const author_id = req.user?.user_id;
    if (!author_id) {
      return res.status(401).json({ success: 401, message: "Unauthorized" });
    }

    // Scheduling
    const is_scheduled = Boolean(scheduled_for);

    // Image URL
    const graph_image_url = req.file
      ? `/uploads/chat-images/${req.file.filename}`
      : null;

    // Insert
    const insertSQL = `
      INSERT INTO analysis_pairs (
        category,
        symbol,
        graph_image_url,
        description,
        is_scheduled,
        scheduled_for,
        status,
        author_id,
        visibility
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
    `;

    const values = [
      category.trim(),
      symbol.trim(),
      graph_image_url,
      description,
      is_scheduled,
      scheduled_for ?? null,
      status,
      author_id,
      visibility
    ];

    const result = await pool.query(insertSQL, values);
    const analysis = result.rows[0];

    // Emit only active and not scheduled
    if (!analysis.is_scheduled && analysis.status === "active") {
      io?.emit("premium_chat", {
        analysis_id: analysis.analysis_id,
        symbol: analysis.symbol,
        category: analysis.category,
        graph_image_url: analysis.graph_image_url,
        description: analysis.description,
        status: analysis.status,
        visibility: analysis.visibility,
        created_at: analysis.created_at
      });
    }

    return res.status(201).json({
      success: 201,
      message: "Analysis pair created successfully",
      data: analysis
    });

  } catch (err) {
    console.error("createAnalysisPairHandler error:", err);
    res.status(500).json({ success: 500, message: "Internal server error" });
  }
}

export const getAnalysisPairsByCategoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = req.params.category;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    if (!category || typeof category !== "string") {
      return res.status(400).json({ status: 400, message: "category is required" });
    }

    const query = `SELECT * FROM analysis_pairs
      WHERE category = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await pool.query(query, [category.trim() , limit, offset]);

    

    return res.status(200).json({
      success: 200,
      page,
      limit,
      analysis_pairs: rows,
    });


  } catch (err) {
    console.error("getAnalysisPairsByCategoryHandler error:", err);
    res.status(500).json({ success: 500, message: "Internal server error" });
  }


}

