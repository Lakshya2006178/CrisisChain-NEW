/**
 * CrisisChain Security Middleware
 * Zero-dependency security hardening: security headers, strict CORS, and in-memory rate limiting.
 */

// ── 1. SECURITY HEADERS ──
export const securityHeaders = (req, res, next) => {
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking / framing
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Disable legacy buggy XSS auditor
    res.setHeader('X-XSS-Protection', '0');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Cross-Origin Resource Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    // Permissions Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=()');

    next();
};

// ── 2. IN-MEMORY RATE LIMITER (Zero Dependencies) ──
/**
 * Creates an in-memory rate limiter middleware for a given window and limit.
 * Cleans up stale IPs periodically to prevent memory leaks.
 */
export const createRateLimiter = ({
    windowMs = 60 * 1000, // 1 minute default
    max = 100,            // max requests per window
    message = 'Too many requests, please try again later.'
}) => {
    const requests = new Map(); // ip -> { count, resetTime }

    // Periodically clean expired entries every 2 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [ip, record] of requests.entries()) {
            if (now > record.resetTime) {
                requests.delete(ip);
            }
        }
    }, 2 * 60 * 1000).unref(); // unref so it does not block Node process exit

    return (req, res, next) => {
        // Resolve client IP (supporting reverse proxies if configured)
        const clientIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
        const now = Date.now();

        let record = requests.get(clientIp);

        if (!record || now > record.resetTime) {
            record = {
                count: 1,
                resetTime: now + windowMs
            };
            requests.set(clientIp, record);
        } else {
            record.count += 1;
        }

        const remaining = Math.max(0, max - record.count);
        const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', remaining);
        res.setHeader('RateLimit-Reset', resetSeconds);

        if (record.count > max) {
            res.setHeader('Retry-After', resetSeconds);
            return res.status(429).json({
                error: message,
                retryAfterSeconds: resetSeconds
            });
        }

        next();
    };
};

// Standard rate limiters
export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 50 : 500, // Generous limit in dev to allow multi-user testing & demos
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
});

export const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    max: 300,                 // 300 requests per minute per IP for normal dashboard polling
    message: 'Too many requests. Please slow down.'
});

// ── 3. STRICT CORS CONFIGURATION ──
const ALLOWED_ORIGINS = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:3000',
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : [])
]);

export const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server tests)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1):(517\d|3000)$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Cross-Origin Request Blocked: Origin not authorized by CrisisChain CORS policy.'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // Cache preflight for 24 hours
};

