// src/routes/versions/v1.js - V1 ROUTES WITH MULTIPLE CONTROLLERS
import express from 'express';
import { 
  registerSchool,
  verifyFounderEmail,
  getSchoolProfile,
  updateSchoolProfile,
  updateSchoolSettings,
  updateSchoolTIN,
  checkTINAvailability,
  getSchoolFinancialInfo
} from '../../v1/controllers/schools/index.js';

import { 
  userRegister,
  verifyUserEmail,

} from '../../v1/controllers/auth/index.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = express.Router();

// ========== SCHOOL REGISTRATION ROUTES ==========
router.post('/authController/register', userRegister);
router.post('/auth/verify', verifyUserEmail);

/*
// ========== SCHOOL PROFILE ROUTES ==========
router.get('/schools/profile', authenticate, getSchoolProfile);
router.put('/schools/profile', authenticate, updateSchoolProfile);
router.get('/schools/details', authenticate, (req, res) => {
  // Optional: if schoolDetails.js has more functions
  res.json({ status: 'success', message: 'School details endpoint' });
});


// ========== SCHOOL SETTINGS ROUTES ==========
router.get('/schools/settings', authenticate, (req, res) => {
  // Placeholder for getSchoolSettings
  res.json({ status: 'success', message: 'Get school settings' });
});

router.put('/schools/settings', authenticate, updateSchoolSettings);

// ========== SCHOOL FINANCIAL ROUTES ==========
router.put('/schools/tin', authenticate, updateSchoolTIN);
router.get('/schools/check-tin', authenticate, checkTINAvailability);
router.get('/schools/financial', authenticate, getSchoolFinancialInfo);

// ========== AUTH ROUTES (Placeholders) ==========
router.post('/auth/login', (req, res) => {
  res.json({ status: 'success', message: 'Login endpoint - to be implemented' });
});

router.post('/auth/refresh', (req, res) => {
  res.json({ status: 'success', message: 'Refresh token - to be implemented' });
});

router.post('/auth/logout', authenticate, (req, res) => {
  res.json({ status: 'success', message: 'Logout successful' });
});
*/
// ========== V1 INFO ENDPOINT ==========
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    api: 'v1',
    status: 'active',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      schools: {
        register: 'POST /schools/register',
        verify: 'POST /schools/verify',
        profile: 'GET /schools/profile',
        settings: 'PUT /schools/settings',
        tin: 'PUT /schools/tin',
        financial: 'GET /schools/financial'
      },
      auth: {
        login: 'POST /auth/login',
        refresh: 'POST /auth/refresh',
        logout: 'POST /auth/logout'
      }
    },
    controllers: {
      schoolRegister: 'schoolRegister.js',
      schoolSetting: 'schoolSetting.js', 
      schoolDetails: 'schoolDetails.js'
    },
    docs: process.env.API_DOCS_URL ? `${process.env.API_DOCS_URL}/v1` : null
  });
});

export default router;