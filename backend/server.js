import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import tripRoutes from "./routes/trips.js";
import expensesRouter from "./routes/expenses.js";
import { pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();
console.log("🔍 DATABASE_URL:", process.env.DATABASE_URL);

try {
  const url = new URL(process.env.DATABASE_URL);
  console.log("🔍 Host:", url.hostname);
  console.log("🔍 SSL Mode:", url.searchParams.get("sslmode"));
} catch (err) {
  console.error("❌ Invalid DATABASE_URL format:", err.message);
}


const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/trips", tripRoutes);
app.use("/expenses", expensesRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// DB test
pool.query("SELECT NOW()")
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err);
    process.exit(1);
  });
