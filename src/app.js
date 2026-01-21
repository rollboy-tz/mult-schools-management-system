// app.js - STABLE CORE (NO BUSINESS LOGIC)
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { securityMiddleware } from './config/security.js';

// Initialize app
const app = express();

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

// ========== NOT FOUND HANDLER ==========
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.originalUrl,
    available_routes: ['/health', '/api/v1', '/api/v2']
  });
});

export default app; // CLEAN EXPORT