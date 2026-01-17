// =============================================
// FILE: src/app.js (ES6 Modules)
// DESCRIPTION: Main application entry point
// USES: ES6 Modules (type: "module" in package.json)
// =============================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';

// Database connection
import { connectDB } from './config/database.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import testRoutes from './routes/test.routes.js';
//import schoolRoutes from './routes/school.routes.js';

// Initialize Express app
const app = express();

// =============================================
// 1. BASIC CONFIGURATIONS
// =============================================

// Security: Helmet for HTTP headers
app.use(helmet());

// CORS Configuration for Render
app.use(cors({
    origin: [
        'https://edusaas-api.onrender.com',
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    credentials: true
}));

// Rate Limiting: Adjust for Render
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
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
});

const PYTHON_API = 'https://eduasas-python.onrender.com'
// =============================================
// 3. ROUTES
// =============================================

// Health Check Route
app.get('/api/health', async (req, res) => {
    try {
        // 1. Mama binafsi anajicheki
        const mamaHealth = {
            status: 'healthy',
            service: 'Express Server (Mama)',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };

        // 2. Mama anamuuliza mtoto wake (Python API)
        let mtotoHealth = null;
        try {
            const response = await axios.get(`${PYTHON_API}/health`, {
                timeout: 5000 // 5 seconds timeout
            });
            mtotoHealth = response.data;
        } catch (mtotoError) {
            mtotoHealth = {
                status: 'unreachable',
                error: mtotoError.message,
                python_api: PYTHON_API
            };
        }

        // 3. Mama anarudisha majibu yote kwa pamoja
        res.json({
            success: true,
            mama: mamaHealth,
            mtoto: mtotoHealth,
            family_status: mtotoHealth.status === 'healthy' ? 'all_healthy' : 'child_unhealthy',
            message: 'Family health check completed'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Family health check failed',
            details: error.message
        });
    }
});


// Root endpoint for Render health checks
app.get('/', (req, res) => {
    res.redirect('/api/health');
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Test Routes (Protected endpoints)
app.use('/api/test', testRoutes);

// School Routes
//app.use('/api/schools', schoolRoutes);

// =============================================
// 4. ERROR HANDLING
// =============================================

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'GET /',
            'GET /api/health',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/me',
            'PUT /api/auth/profile',
            'PUT /api/auth/change-password',
            'POST /api/schools/register',      // NEW
            'GET /api/schools/my-schools',     // NEW
            'GET /api/schools/:schoolId',      // NEW
            'POST /api/schools/:schoolId/members', // NEW
            'GET /api/test/protected',
            'GET /api/test/admin-only',
            'GET /api/test/teacher-only'
        ]
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

// =============================================
// 5. SERVER STARTUP
// =============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║         EDU-SAAS API - RENDER DEPLOYMENT            ║
╠══════════════════════════════════════════════════════╣
║ 📡 Server: https://edusaas-api.onrender.com         ║
║ 🗄️  Database: PostgreSQL (Neon)                    ║
║ 🔐 Security: Enabled                                ║
║ 📍 Focus: User Management (Phase 1)                 ║
╚══════════════════════════════════════════════════════╝

📋 AVAILABLE ENDPOINTS:
├── PUBLIC:
│   ├── GET  /                 -> Health check
│   ├── GET  /api/health       - Server status
│   ├── POST /api/auth/register - Register user
│   └── POST /api/auth/login    - Login user
│
├── PROTECTED (Require Auth):
│   ├── GET  /api/auth/me      - Get current user
│   ├── PUT  /api/auth/profile - Update profile
│   ├── PUT  /api/auth/change-password - Change password
│   ├── GET  /api/test/protected - Test protected route
│   ├── GET  /api/test/admin-only - Admin only route
│   └── GET  /api/test/teacher-only - Teacher only route
│
└── NEXT PHASE:
    ├── School registration
    ├── School management
    └── Multi-tenancy setup
`);
});

export default app;