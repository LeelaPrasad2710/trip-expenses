import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// GET all trips
router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM trip_templates ORDER BY trip_id ASC");
  res.json(rows);
});

// GET one trip
router.get("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM trip_templates WHERE trip_id = $1", [req.params.id]);
  res.json(rows[0]);
});

router.post("/", async (req, res) => {
  try {
    const {
      trip_id,
      trip_name,
      start_date,
      end_date,
      budget,
      money_handler,
      location,
      expense_types,
      expense_type_options,
      members,
      created_by
    } = req.body;

    console.log("🔵 Received trip payload:", req.body);

    if (!trip_id || !trip_name || !start_date || !end_date || !budget || !created_by) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    await pool.query(`
      INSERT INTO trip_templates 
      (trip_id, trip_name, start_date, end_date, budget, money_handler, location, expense_types, expense_type_options, members, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      trip_id,
      trip_name,
      start_date,
      end_date,
      budget,
      money_handler,
      location,
      JSON.stringify(expense_types || []),
      JSON.stringify(expense_type_options || {}),
      JSON.stringify(members || []),
      created_by
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Trip insert failed:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  const {
    trip_name, start_date, end_date, budget,
    money_handler, location, expense_types, expense_type_options, members
  } = req.body;

  await pool.query(`
    UPDATE trip_templates SET
      trip_name = $1, start_date = $2, end_date = $3, budget = $4,
      money_handler = $5, location = $6,
      expense_types = $7, expense_type_options = $8, members = $9
    WHERE trip_id = $10
  `, [
    trip_name, start_date, end_date, budget,
    money_handler, location,
    JSON.stringify(expense_types),
    JSON.stringify(expense_type_options),
    JSON.stringify(members),
    req.params.id
  ]);

  res.json({ success: true });
});

// router.delete("/:id", async (req, res) => {
//   await pool.query("DELETE FROM trip_templates WHERE trip_id = $1", [req.params.id]);
//   res.json({ success: true });
// });
router.delete("/:id", async (req, res) => {
  const tripId = req.params.id;

  try {
    // Delete associated expenses
    await pool.query("DELETE FROM trip_expenses WHERE trip_id = $1", [tripId]);

    // Delete associated logs
    await pool.query("DELETE FROM trip_logs WHERE trip_id = $1", [tripId]);

    // Delete the trip itself
    await pool.query("DELETE FROM trip_templates WHERE trip_id = $1", [tripId]);

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Failed to delete trip and related data:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete trip fully" });
  }
});


export default router;