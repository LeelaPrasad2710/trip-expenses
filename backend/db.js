import dotenv from "dotenv";
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

console.log("🔧 Connecting with DB URL:", process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});
