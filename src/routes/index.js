// routes/index.js - PUBLIC ENTRY POINT (Only this changes for new versions)
import express from 'express';
import healthRoutes from './health.js';
import v1Routes from './v1/index.js';
import v2Routes from './v2/index.js';

const router = express.Router();

// ========== PUBLIC ROUTES & INFO CHECK (No version) ==========
router.use('/health', healthRoutes);
router.use('/health', healthRoutes);

// ========== API VERSIONS ==========
router.use('/api/v1', v1Routes); // Version 1
//router.use('/api/v2', v2Routes); // Version 2

// ========== DEFAULT VERSION REDIRECT ==========
router.use('/api', (req, res) => {
  res.redirect(301, '/api/v1' + req.path); // Should upgraded;
});

// ========== ROOT REDIRECT ==========
router.get('/', (req, res) => {
  res.json({
    service: 'School Management API',
    versions: {
      v1: '/api/v1 (Beta)',
    },
    health: '/health',
    docs: process.env.API_DOCS_URL,
    timestamp: new Date().toISOString()
  });
});

export default router; // SINGLE EXPORT