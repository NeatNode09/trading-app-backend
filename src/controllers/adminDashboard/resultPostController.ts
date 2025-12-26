import { Request, Response } from "express";
import { pool } from "../../config/db";

export const postResultHandler = async (req: Request, res: Response) => {

    try{

        const {name, category, tp, sl, total_wins} = req.body;

        if ( !name || !category || !tp || !sl || total_wins === undefined ) {
            return res.status(400).json({ status: 400, message: "All fields are required: name, category, tp, sl, total_wins" });
        }

        const categoryOptions = ["Crypto", "Forex"];
        if (!categoryOptions.includes(category)) {
            return res.status(400).json({ status: 400, message: "category must be either 'Crypto' or 'Forex'" });
        }


        const insertSQL = `INSERT INTO results (name, category, tp, sl, total_wins) VALUES ($1, $2, $3, $4, $5)`;
        const values = [name, category, tp, sl, total_wins];

        await pool.query(insertSQL, values);

        return res.status(201).json({ status: 201, message: "Result posted successfully" });


    }catch(error){
        console.error("❌ postResultHandler error:", error);
        return res.status(500).json({ status: 500, message: "Internal Server Error" });
    }

}