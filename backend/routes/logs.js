import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// POST /logs → Add activity log
router.post("/", async (req, res) => {
  try {
    const {
      id,
      trip_id,
      action,
      expense_id,
      message,
      created_by,
      split_details
    } = req.body;

    const query = `
      INSERT INTO trip_logs (
        id, trip_id, action, expense_id,
        message, created_by, split_details
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7
      )
    `;

    const values = [
      id,
      trip_id,
      action,
      expense_id || null,
      message,
      created_by,
      split_details ? JSON.stringify(split_details) : null
    ];

    await pool.query(query, values);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("❌ Error saving trip log:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Failed to save activity log" });
  }
});

// GET /logs?tripId=TRIP-001 → fetch logs by trip
router.get("/", async (req, res) => {
    const { tripId } = req.query;
  
    if (!tripId) {
      return res.status(400).json({ success: false, error: "tripId is required" });
    }
  
    try {
      const query = `
        SELECT id, action, message, created_by, timestamp, split_details
        FROM trip_logs
        WHERE trip_id = $1
        ORDER BY timestamp DESC
      `;
      const result = await pool.query(query, [tripId]);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error("❌ Error fetching trip logs:", err.message);
      res.status(500).json({ success: false, error: "Failed to fetch logs" });
    }
  });
  

export default router;
