import { Request, Response } from "express";
import { pool } from "../../config/db";
import bcrypt from "bcrypt";



export const postAdminHandler = async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, role_id } = req.body;

    // 1. Input Validation
    if (!full_name || !email || !password || !role_id) {
      return res.status(400).json({
        success: false,
        message: "full_name, email, password, and role_id are required",
      });
    }

    // 2. Check for existing email
    const existingUser = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rowCount! > 0) {
      return res.status(409).json({ // 409 Conflict
        success: false,
        message: "Email already exists in the database",
      });
    }

    // 3. Validate Role ID (Crucial for Admin Endpoint)
    const roleCheck = await pool.query(
      "SELECT role_name FROM roles WHERE role_id = $1",
      [role_id]
    );

    if (roleCheck.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid role_id: ${role_id}. Role does not exist.`,
      });
    }

    const role_name = roleCheck.rows[0].role_name;

    // 4. Hash Password (SECURITY!)
    const password_hash = await bcrypt.hash(password, 10);

    // 5. Insert User into DB
    const insertQuery = `
            INSERT INTO users 
            (full_name, email, password_hash, role_id, created_at) 
            VALUES ($1, $2, $3, $4, NOW()) 
            RETURNING user_id, full_name, email, role_id, created_at;
        `;

    const { rows } = await pool.query(insertQuery, [
      full_name,
      email,
      password_hash, // Use the hash
      role_id
    ]);

    const newUser = rows[0];

    // 6. Final Success Response
    return res.status(201).json({ // 201 Created
      success: true,
      message: `User created successfully with role: ${role_name}`,
      user: {
        id: newUser.user_id,
        full_name: newUser.full_name,
        email: newUser.email,
        role_id: newUser.role_id,
        role_name: role_name, // Include for clarity
        created_at: newUser.created_at,
      },
    });

  } catch (error: any) {
    console.error("❌ postAdminHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during user creation",
    });
  }
};


export const getAdminUsersHandler = async (req: Request, res: Response) => {
  try {
    const query = `SELECT
         u.user_id, 
         u.full_name, 
         u.email, 
         u.avatar_url, 
         u.partner_id, 
         u.serial_number, 
         u.created_at, 
         u.last_login_at, 
         r.role_name 
         FROM users u 
         JOIN roles r 
         ON u.role_id = r.role_id 
         WHERE r.role_name 
         IN ('admin', 'super_admin') 
         ORDER BY u.created_at DESC`;

    const { rows } = await pool.query(query);

    return res.status(200).json({
      success: true,
      count: rows.length,
      admins: rows,
    });

  } catch (error: any) {
    console.error("❌ getAdminUsersHandler error:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



export const updateAdminHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { full_name, email, password, role_id } = req.body;

    // 1. Check admin exists
    const existingUser = await pool.query(
      "SELECT user_id, email FROM users WHERE user_id = $1",
      [userId]
    );

    if (existingUser.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    // 2. Email uniqueness check (if changed)
    if (email) {
      const emailCheck = await pool.query(
        "SELECT 1 FROM users WHERE email = $1 AND user_id != $2",
        [email, userId]
      );

      if (emailCheck.rowCount! > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another user",
        });
      }
    }

    // 3. Role validation (if provided)
    let role_name: string | null = null;
    if (role_id) {
      const roleCheck = await pool.query(
        "SELECT role_name FROM roles WHERE role_id = $1",
        [role_id]
      );

      if (roleCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid role_id",
        });
      }

      role_name = roleCheck.rows[0].role_name;
    }

    // 4. Build dynamic update query
    const fields = [];
    const values: any[] = [];
    let index = 1;

    if (full_name) {
      fields.push(`full_name = $${index++}`);
      values.push(full_name);
    }

    if (email) {
      fields.push(`email = $${index++}`);
      values.push(email);
    }

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${index++}`);
      values.push(password_hash);
    }

    if (role_id) {
      fields.push(`role_id = $${index++}`);
      values.push(role_id);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    values.push(userId);

    const updateQuery = `
      UPDATE users
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE user_id = $${index}
      RETURNING user_id, full_name, email, role_id, updated_at;
    `;

    const { rows } = await pool.query(updateQuery, values);

    // 5. Success response
    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      user: {
        ...rows[0],
        role_name,
      },
    });

  } catch (error) {
    console.error("❌ updateAdminHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating admin",
    });
  }
};


export const deleteAdminHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    console.log("User: ", req.user);
    


    // 1. Check user exists
    const userCheck = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [userId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }



    // 2. Delete user
    await pool.query(
      "DELETE FROM users WHERE user_id = $1",
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });

  } catch (error) {
    console.error("❌ deleteAdminHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting admin",
    });
  }
};
