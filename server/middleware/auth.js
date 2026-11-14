import '../config/env.js';
import jwt from 'jsonwebtoken';

// Fail fast at startup if the secret is not configured.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables. Exiting.');
  process.exit(1);
}

const extractBearerToken = (req) => {
  const header = req.header('Authorization');
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

export const auth = (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize user identifier fields for consistency
    decoded.user_id = decoded.user_id || decoded.id;
    decoded.id = decoded.user_id;
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

export const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

export const optionalAuth = (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    decoded.user_id = decoded.user_id || decoded.id;
    decoded.id = decoded.user_id;
    req.user = decoded;
  } catch {
    // Token is invalid/expired; continue without failing so anonymous requests work
  }
  next();
};
