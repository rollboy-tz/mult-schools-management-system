// routes/versions/v1.js - COMPLETE V1 API
import express from 'express';
import { schoolController } from '../../v1/controllers/schoolController.js';
import { authController } from '../../v1/controllers/authController.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = express.Router();

// V1 School Routes
router.post('/schools/register', schoolController.registerSchool);
router.post('/schools/verify', schoolController.verifyFounderEmail);
router.get('/schools/profile', authenticate, schoolController.getSchoolProfile);
router.put('/schools/profile', authenticate, schoolController.updateSchoolProfile);

// V1 Auth Routes
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authenticate, authController.logout);

// V1 Info
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    api: 'v1',
    status: 'active',
    endpoints: {
      schools: '/schools',
      auth: '/auth'
    },
    docs: `${process.env.API_DOCS_URL}/v1`
  });
});

export default router;