// =============================================
// FILE: src/app.js (ES6 Modules)
// DESCRIPTION: Main application entry point
// USES: ES6 Modules (type: "module" in package.json)
// =============================================

import 'dotenv/config'; // ES6 version of dotenv
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// For ES6 __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
import { connectDB } from './config/database.js';

// Initialize Express app
const app = express();

// =============================================
// 1. BASIC CONFIGURATIONS
// =============================================

// Security: Helmet for HTTP headers
app.use(helmet());

// CORS Configuration
// app.use(cors({
//   origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
//   credentials: true
// }));

// Rate Limiting: Basic protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { 
    error: 'Too many requests from this IP, please try again after 15 minutes' 
  }
});
app.use('/api/', limiter);

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================
// 2. DATABASE CONNECTION
// =============================================
connectDB().catch(err => {
  console.error('❌ Database connection failed:', err);
  process.exit(1);
});

// =============================================
// 3. BASIC ROUTES (TUANZE NA HIZI TU)
// =============================================

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'EduSaaS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple Test Route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    nextStep: 'Start building user management features'
  });
});

// =============================================
// 4. TODO: USER MANAGEMENT ROUTES (PHASE 1)
// =============================================
import authRoutes from './routes/auth.routes.js';

// Temporary: Echo route for testing
app.post('/api/echo', (req, res) => {
  console.log('Received data:', req.body);
  res.json({
    received: req.body,
    message: 'Data received successfully'
  });
});




// =============================================
// 5. ERROR HANDLING
// =============================================

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message || 'Internal server error';
  
  res.status(statusCode).json({
    status: 'error',
    message: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});



app.use('/api/auth', authRoutes);


// =============================================
// 6. SERVER STARTUP
// =============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         EDU-SAAS API - DEVELOPMENT MODE             ║
╠══════════════════════════════════════════════════════╣
║ 📡 Server: http://localhost:${PORT}                 ║
║ 🗄️  Database: PostgreSQL                           ║
║ 🔐 Security: Basic (Rate limiting, Helmet, CORS)    ║
║ 📍 Focus: User Management (Phase 1)                 ║
╚══════════════════════════════════════════════════════╝

📋 AVAILABLE ENDPOINTS:
├── GET  /api/health    - Server status check
├── GET  /api/test      - Test endpoint
└── POST /api/echo      - Echo test (development only)

🚀 NEXT STEPS:
1. Create user registration endpoint
2. Create user login endpoint
3. Create user profile management
4. Add authentication middleware
`);
});

export default app;