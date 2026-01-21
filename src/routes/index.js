// routes/index.js - SINGLE ENTRY POINT
import express from 'express';
import healthRoutes from './health.js';
import v1Routes from './versions/v1.js';
// import v2Routes from './versions/v2.js'; This will be used for next API version

const router = express.Router();

// ========== PUBLIC HEALTH ==========
router.use('/health', healthRoutes);

// ========== API VERSIONS ==========
router.use('/api/v1', v1Routes);
// router.use('/api/v2', v2Routes); This will be used for next API version

// ========== VERSION REDIRECTS ==========
router.get('/api', (req, res) => {
  res.redirect('/api/v1');
});

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

// ========== NOT FOUND HANDLER ==========
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.originalUrl,
    available_routes: ['/health', '/api/v1', '/api/v2']
  });
});

export default router;