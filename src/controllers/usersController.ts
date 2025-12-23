import { Request, Response } from "express";
import  { pool } from "../config/db";


export const getUsersHandler = async (req: Request, res: Response) => {

    try {
        const user = req.user
        console.log("User in getUsersHandler:", user);
        
        if(!user) {
            return res.status(401).json({ status: 401, message: "Unauthorized" });
        }

        if(user.role !== 'admin') {
            return res.status(403).json({ status: 403, message: "Forbidden: Admins only" });
        }
        const result =  await pool.query("SELECT * FROM users ORDER BY created_at DESC");
        return  res.status(200).json({ status: 200, users: result.rows });
    } catch (error: any) {
        console.error("getUsersHandler Server error:", error);
        return res.status(500).json({ status: 500, message: "Server error", error: error.message });
    }
};
