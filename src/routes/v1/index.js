import express from 'express';
import schoolRoutes from './school.js';
import authRoutes from './auth.js';

const router = express.Router();

// V1 API Routes
router.use('/schools', schoolRoutes);
router.use('/auth', authRoutes);

// V1 Metadata
router.get('/', (req, res) => {
  res.json({
    version: 'v1',
    status: 'active',
    sunset_date: '2024-12-31',
    endpoints: ['/schools', '/auth'],
    docs: `${process.env.API_DOCS_URL}/v1`
  });
});

export default router;