import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Resolve to server/.env regardless of where the process is started from
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = mysql.createPool({
  host:            process.env.DB_HOST,
  user:            process.env.DB_USER,
  password:        process.env.DB_PASSWORD,
  database:        process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
});

/**
 * Verify that the pool can reach MySQL.
 * Returns true on success; throws with a clear message on failure.
 */
export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    return true;
  } catch (err) {
    throw new Error(
      `Cannot reach MySQL at ${process.env.DB_HOST} (db: ${process.env.DB_NAME}): ${err.message}`
    );
  }
}

export default pool;
