import { Request, Response } from "express";
import { pool } from "../config/db";

export const getResultsHandler = async (req: Request, res: Response) => {

    try{

        const page = parseInt(req.query.page as string) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const selectSQL = `SELECT * FROM results ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        const values = [limit, offset];

        const { rows } = await pool.query(selectSQL, values);

        return res.status(200).json({ status: 200, page, limit, results: rows });
    }catch(error){
        console.error("❌ getResultsHandler error:", error);
        return res.status(500).json({ status: 500, message: "Internal Server Error" });
    }

}