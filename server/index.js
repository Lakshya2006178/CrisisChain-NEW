import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import alertRoutes from './routes/alerts.js';
import resourceRoutes from './routes/resources.js';
import analyticsRoutes from './routes/analytics.js';
import pool, { testConnection } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/alerts',    alertRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/', (req, res) => res.json({ status: 'CrisisChain API running' }));

// TEMPORARY – will be removed later once full DB integration is wired up
app.get('/api/health/db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', ...rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Verify MySQL is reachable before accepting traffic
try {
  await testConnection();
  console.log(`✅ MySQL connected to ${process.env.DB_NAME}`);
} catch (err) {
  console.error(`MySQL connection failed: ${err.message}`);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
});
