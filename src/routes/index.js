// routes/index.js - SINGLE ENTRY POINT
import express from 'express';
import healthRoutes from './health.js';
import v1Routes from './versions/v1.js';
import v2Routes from './versions/v2.js';

const router = express.Router();

// ========== PUBLIC HEALTH ==========
router.use('/health', healthRoutes);

// ========== API VERSIONS ==========
router.use('/api/v1', v1Routes);
router.use('/api/v2', v2Routes);

// ========== VERSION REDIRECTS ==========
router.get('/api', (req, res) => {
  res.redirect('/api/v2');
});

router.get('/api/version', (req, res) => {
  res.json({
    current: 'v2',
    available: ['v1', 'v2'],
    default: 'v2',
    v1_sunset: '2024-12-31',
    timestamp: new Date().toISOString()
  });
});

// ========== ROOT INFO ==========
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

export default router;