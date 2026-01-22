// routes/index.js - SINGLE ENTRY POINT
import express from 'express';
import healthRoutes from './health.js';
import { validate404 } from '../middleware/validate404.js';
import v1Routes from './versions/v1.js';
// import v2Routes from './versions/v2.js'; This will be used for next API version

const router = express.Router();
const v404 = validate404();
// Trace ALL incoming requests
router.use((req, res, next) => {
  console.log(`📦 ROUTES INDEX: Received ${req.method} ${req.originalUrl}`);
  console.log(`   ↳ Looking for route match...`);
  next();
});

// ========== PUBLIC HEALTH ==========
v404.track('/health')
router.use('/health', healthRoutes);

// ========== API VERSIONS ==========

v404.track('/api/v1')
router.use('/api/v1', v1Routes);

// ========== VERSION REDIRECTS ==========
v404.track('/api')
router.get('/api', (req, res) => {
  res.redirect('/api/v1');
});

v404.track('/api/version')
router.get('/api/version', (req, res) => {
  res.json({
    current: 'v1 Beta',
    available: ['v1 Beta'],
    default: 'v1 Beta',
    v1_sunset: '2024-12-31',
    timestamp: new Date().toISOString()
  });
});

// ========== ROOT INFO ==========
v404.track('/')
router.get('/', (req, res) => {
  res.json({
    service: 'School Management API',
    description: 'Multi-tenant school management system',
    versions: {
      v1: '/api/v1',
      v2: '/api/v2'
    },
    health: '/health',
    docs: process.env.API_DOCS_URL,
    support: process.env.SUPPORT_EMAIL,
    timestamp: new Date().toISOString()
  });
});

router.use(v404.handler);
export default router;