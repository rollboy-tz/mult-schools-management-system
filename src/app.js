// Add error handling for startup
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error.message);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});



// app.js or server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import responseTime from 'response-time';
import logger from './utils/logger.js';

// Import routes
import schoolRoutes from './routes/schoolRoutes.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

// ============================================
// 1. SECURITY MIDDLEWARE
// ============================================

// 1.1 CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:5173'],
  
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// 1.2 Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" }
}));

// 1.3 Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per window
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  }
});

// Apply to all routes
app.use('/api/', apiLimiter);

// Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 minutes
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.'
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================
// 2. BODY PARSING & COOKIE CONFIGURATION
// ============================================

// 2.1 Body parsing with size limits
app.use(express.json({
  limit: '10kb', // Prevent large payload attacks
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10kb'
}));

// 2.2 Cookie Parser with security
app.use(cookieParser(process.env.COOKIE_SECRET));

// ============================================
// 3. DATA SANITIZATION
// ============================================

// 3.1 NoSQL injection protection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized NoSQL injection attempt`, {
      ip: req.ip,
      key,
      path: req.path
    });
  }
}));

// 3.2 Prevent parameter pollution
app.use(hpp());

// ============================================
// 4. PERFORMANCE & MONITORING
// ============================================

// 4.1 Response time header
app.use(responseTime((req, res, time) => {
  if (time > 1000) { // Log slow requests (>1s)
    logger.warn(`Slow request detected`, {
      method: req.method,
      path: req.path,
      duration: `${time.toFixed(2)}ms`,
      ip: req.ip
    });
  }
}));

// 4.2 Compression
app.use(compression({
  level: 6,
  threshold: 1024 // Compress responses > 1KB
}));

// ============================================
// 5. REQUEST LOGGING
// ============================================

// Custom request logger
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log after response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, 'HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...(req.user && { userId: req.user.userId })
    });
  });
  
  next();
});

// ============================================
// 6. ROUTES
// ============================================

// Health check (no auth required)
app.use('/api/health', healthRoutes);

// Public API routes
app.use('/api/schools', schoolRoutes);
app.use('/api/auth', authRoutes);

// ============================================
// 7. ERROR HANDLING
// ============================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId
  });
  
  // Security: Don't expose error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    status: 'error',
    message: isProduction ? 'Internal server error' : err.message,
    ...(!isProduction && { stack: err.stack })
  });
});

// ============================================
// 8. SECURITY HEADERS MIDDLEWARE
// ============================================

// Add additional security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Cache control for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }
  
  next();
});


// Debug startup
console.log('=== SERVER STARTUP INFO ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Database connected:', !!process.env.DATABASE_URL);
console.log('Allowed origins:', process.env.ALLOWED_ORIGINS);

// Start server
const PORT = process.env.PORT || 3000;

try {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV}`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error(error.stack);
  process.exit(1);
}


export default app;