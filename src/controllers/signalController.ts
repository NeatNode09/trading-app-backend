// src/controllers/signalController.ts
import { Request, Response } from "express";
import { pool } from "../config/db";


export const getSignalHandler = async (req: Request, res: Response) => {

    try {
        const user = req.user;

        // 1. Authentication Check
        if (!user) {
            return res.status(401).json({ status: 401, message: "Unauthorized" });
        }

        // 2. Authorization Check
        if (user.subscription_plan !== 'premium' && user.role !== 'admin') {
            return res.status(403).json({
                status: 403,
                message: "Access denied. Premium plan required."
            });
        }


        // 3. Pagination setup
        const LIMIT = 20;
        // Parse the offset parameter, defaulting to 0 for the first page
        const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

        if (isNaN(offset) || offset < 0) {
            return res.status(400).json({ status: 400, message: "Invalid offset. Must be a non-negative integer." });
        }

        // 4. SQL Query Construction
        // We fetch LIMIT + 1 to easily determine if there is a 'next page' (has_more)
        const query = `
            SELECT 
                signal_id, title, body, asset_type, symbol, author_id, created_at, visibility, status, metadata
            FROM signals 
            WHERE status = 'active' 
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2;
        `;

        // The values are [LIMIT + 1, offset]
        const result = await pool.query(query, [LIMIT + 1, offset]);

        // Extract the actual signals (up to the limit)
        const signals = result.rows.slice(0, LIMIT);

        // Check if we received more than the limit, indicating a next page exists
        const hasMore = result.rows.length > LIMIT;

        // 5. Success Response
        return res.status(200).json({
            status: 200,
            signals: signals,
            offset: offset,
            limit: LIMIT,
            has_more: hasMore
        });

    } catch (error: any) {
        // 6. Error Handling
        console.error("getSignalHandler Server error:", error);
        return res.status(500).json({ status: 500, message: "Server error", error: error.message });
    }
}