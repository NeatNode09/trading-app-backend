import { Request, Response } from 'express';
import { pool } from '../../config/db'; // Your database connection

export const addPartnerHandler = async (req: Request, res: Response) => {
  try {
    const { partner_name, partner_code, partner_link } = req.body;

    // 1. Basic Validation
    if (!partner_name || !partner_code || !partner_link) {
      return res.status(400).json({
        success: false,
        message: "partner_name, partner_code, and partner_link are required",
      });
    }

    // 2. Insert into Database
    const query = `
      INSERT INTO partners (partner_name, partner_code, partner_link)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const values = [partner_name, partner_code, partner_link];
    const { rows } = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: "Partner created successfully",
      data: rows[0],
    });

  } catch (error: any) {
    // 3. Handle Unique Constraint for partner_code (PostgreSQL error 23505)
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Partner code already exists",
      });
    }

    console.error("❌ addPartnerHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Optional: Get all partners (used for the UserForm dropdown)
export const getAllPartnersHandler = async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM partners ORDER BY partner_name ASC");
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("❌ getAllPartnersHandler error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const updatePartnerHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { partner_name, partner_code, partner_link } = req.body;

    // 1. Check if partner exists
    const checkQuery = "SELECT * FROM partners WHERE partner_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    // 2. Update record
    const updateQuery = `
      UPDATE partners 
      SET 
        partner_name = COALESCE($1, partner_name), 
        partner_code = COALESCE($2, partner_code), 
        partner_link = COALESCE($3, partner_link),
        updated_at = NOW()
      WHERE partner_id = $4
      RETURNING *;
    `;

    const { rows } = await pool.query(updateQuery, [
      partner_name,
      partner_code,
      partner_link,
      id
    ]);

    return res.status(200).json({
      success: true,
      message: "Partner updated successfully",
      data: rows[0],
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "Partner code already exists" });
    }
    console.error("❌ updatePartnerHandler error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE PARTNER
export const deletePartnerHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Note: Due to foreign key constraints, this will fail if users are linked to this partner.
    // You might want to handle that specifically.
    const deleteQuery = "DELETE FROM partners WHERE partner_id = $1 RETURNING *";
    const { rowCount } = await pool.query(deleteQuery, [id]);

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Partner deleted successfully",
    });
  } catch (error: any) {
    // Handle foreign key violation (error code 23503)
    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete partner: Users are currently assigned to this partner.",
      });
    }
    console.error("❌ deletePartnerHandler error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};