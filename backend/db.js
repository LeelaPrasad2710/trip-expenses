import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Personal',
  password: 'Thar@22172088',
  port: 5432,
});