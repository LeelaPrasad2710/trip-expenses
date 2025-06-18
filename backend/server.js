import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import tripRoutes from "./routes/trips.js";
import expensesRouter from "./routes/expenses.js";
import { pool } from "./db.js";

const app = express();

// ✅ Apply middleware BEFORE routes
app.use(cors());
app.use(bodyParser.json());

// ✅ Then add routes
app.use("/trips", tripRoutes);
app.use("/expenses", expensesRouter);

app.listen(4000, () => console.log("🚀 Server running on http://localhost:4000"));

pool.query("SELECT NOW()")
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err);
    process.exit(1);
  });
