import pool from '../db.js';

export const getIncidentDistribution = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT it.type_name AS _id, COUNT(*) AS count
       FROM incident i
       JOIN incident_type it ON i.type_id = it.type_id
       GROUP BY it.type_name
       ORDER BY count DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

export const getResponseTrends = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // SQLite version of TIMESTAMPDIFF and DATE
    const [rows] = await conn.execute(
      `SELECT date(created_at) AS _id,
              ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 1440), 1) AS avgResponse
       FROM incident
       WHERE resolved_at IS NOT NULL
       GROUP BY date(created_at)
       ORDER BY _id ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

export const getIncidentTrends = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // SQLite version of DATE_FORMAT
    const [rows] = await conn.execute(
      `SELECT strftime('%H:00', created_at) AS _id, COUNT(*) AS count
       FROM incident
       GROUP BY strftime('%H:00', created_at)
       ORDER BY _id ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};
