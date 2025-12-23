import { Request, Response } from "express";
import { pool } from "../../config/db";

export const postAnnouncementHandler = async (req: Request, res: Response) => {
  try {
    const { title, description, link, is_active } = req.body;

    if (!title || !description || !link) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Title, description and link are required",
      });
    }

    const query = `INSERT INTO announcements (title, description, link, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())`;

    await pool.query(query, [title, description, link, is_active ?? true]);

    return res.status(201).json({
      status: 201,
      success: true,
      message: "Announcement created successfully",
    });


  } catch (error: any) {
    console.error("❌ postAnnouncementHandler error:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
    });
  }
}

export const getActiveAnnouncementsHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    // 1️⃣ Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM announcements WHERE is_active = TRUE`
    );
    const total = Number(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    // 2️⃣ Fetch paginated data
    const dataQuery = `
      SELECT
        announcement_id,
        title,
        description,
        created_at
      FROM announcements
      WHERE is_active = TRUE
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const { rows } = await pool.query(dataQuery, [limit, offset]);

    return res.status(200).json({
      status: 200,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      announcements: rows,
    });
  } catch (error) {
    console.error("❌ getActiveAnnouncementsHandler error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};
