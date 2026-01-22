// app.js - STABLE CORE (NO BUSINESS LOGIC)
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import { securityMiddleware } from './config/security.js';

// Initialize app
const app = express();

app.use((req, res, next) => {
  console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log(`   ↳ Headers:`, req.headers['user-agent']);
  console.log(`   ↳ Query:`, req.query);
  console.log(' Body keys:', Object.keys(req.body || {}));
  next();
});

// ========== SECURITY MIDDLEWARE (STABLE) ==========
app.use(securityMiddleware); // All security in one place

// ========== PERFORMANCE MIDDLEWARE ==========
app.use(compression());

// ========== ERROR HANDLING SETUP ==========
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// ========== GLOBAL ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error('Global Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});



export default app; // CLEAN EXPORT