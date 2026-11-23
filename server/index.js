import './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { securityHeaders, corsOptions, apiLimiter } from './middleware/security.js';
import authRoutes from './routes/auth.js';
import alertRoutes from './routes/alerts.js';
import resourceRoutes from './routes/resources.js';
import analyticsRoutes from './routes/analytics.js';
import organizationRoutes from './routes/organizations.js';
import userRoutes from './routes/users.js';
import assignmentRoutes from './routes/assignments.js';
import allocationRoutes from './routes/allocations.js';
import notificationRoutes from './routes/notifications.js';
import hospitalRoutes from './routes/hospital.js';
import trackingRoutes from './routes/tracking.js';
import pool, { testConnection } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Defense-in-depth: Disable Express fingerprint
app.disable('x-powered-by');

// Security headers (nosniff, frameguard, etc.)
app.use(securityHeaders);

// Strict CORS policy
app.use(cors(corsOptions));

// Serve uploaded incident images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Explicit JSON body parsing limit to prevent memory exhaustion DoS
app.use(express.json({ limit: '1mb' }));

// General API Rate Limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/alerts',        alertRoutes);
app.use('/api/resources',     resourceRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/assignments',   assignmentRoutes);
app.use('/api/allocations',   allocationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/hospital',      hospitalRoutes);
app.use('/api/tracking',      trackingRoutes);

// Health check
app.get('/', (req, res) => res.json({ status: 'CrisisChain API running' }));

app.get('/api/health/db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', ...rows[0] });
  } catch (err) {
    console.error('Database health check failed:', err);
    res.status(500).json({ status: 'error', error: 'Database service unavailable' });
  }
});

// Centralized Error Handling Middleware (Catches JSON parse errors, CORS blocks, unhandled errors)
app.use((err, req, res, next) => {
  // Catch CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }

  // Catch invalid JSON payload errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }

  // Catch payload too large errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload exceeds maximum allowed limit (1MB).' });
  }

  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
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
