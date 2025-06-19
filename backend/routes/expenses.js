import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// GET all expenses or by tripId
router.get("/", async (req, res) => {
  const { tripId } = req.query;
  const query = tripId
    ? "SELECT * FROM trip_expenses WHERE trip_id = $1 ORDER BY date DESC"
    : "SELECT * FROM trip_expenses ORDER BY date DESC";
  const values = tripId ? [tripId] : [];
  const { rows } = await pool.query(query, values);
  res.json(rows);
});

router.post("/", async (req, res) => {
  try {
    console.log("🔵 POST /expenses called");

    const {
      id, trip_id, trip_name, date,
      expense_type, expense_option, description,
      location, amount, member_amounts,
      created_at, created_by  // ⬅️ NEW FIELD
    } = req.body;

    console.log("📥 Payload received:", req.body);

    const query = `
      INSERT INTO trip_expenses (
        id, trip_id, trip_name, date,
        expense_type, expense_option, description,
        location, amount, member_amounts,
        created_at, created_by
      ) VALUES (
        $1, $2, $3, $4::date,
        $5, $6, $7, $8,
        $9::numeric, $10::jsonb,
        $11::timestamp, $12
      ) RETURNING *;
    `;

    const values = [
      id,
      trip_id,
      trip_name,
      date.split("T")[0], // ensure just YYYY-MM-DD
      expense_type,
      expense_option,
      description,
      location,
      amount,
      JSON.stringify(member_amounts),
      created_at,
      created_by // ⬅️ new value
    ];

    const result = await pool.query(query, values);

    console.log("✅ Inserted row:", result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error in POST /expenses:", err.stack || err.message);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM trip_expenses WHERE id = $1", [id]);
  res.json({ message: "Deleted" });
});

// ✅ UPDATE expense by ID
router.put("/:id", async (req, res) => {
  try {
    console.log("🟡 PUT /expenses/:id called");

    const {
      trip_id,
      trip_name,
      date,
      expense_type,
      expense_option,
      description,
      location,
      amount,
      member_amounts,
      created_at,
      created_by
    } = req.body;

    const query = `
      UPDATE trip_expenses SET
        trip_id = $1,
        trip_name = $2,
        date = $3::date,
        expense_type = $4,
        expense_option = $5,
        description = $6,
        location = $7,
        amount = $8::numeric,
        member_amounts = $9::jsonb,
        created_at = $10::timestamp,
        created_by = $11
      WHERE id = $12
      RETURNING *;
    `;

    const values = [
      trip_id,
      trip_name,
      date.split("T")[0],
      expense_type,
      expense_option,
      description,
      location,
      amount,
      JSON.stringify(member_amounts),
      created_at,
      created_by,
      req.params.id
    ];

    const result = await pool.query(query, values);

    console.log("✅ Updated expense:", result.rows[0]);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error in PUT /expenses/:id:", err.stack || err.message);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});


export default router;
