// routes/schoolRoutes.js
import express from 'express';
import schoolController from '../controllers/schoolController.js';
import { authenticate, requireSchoolAdmin } from '../middleware/auth.js';

const router = express.Router();

// ========== PUBLIC ROUTES ==========
router.post('/register', schoolController.registerSchool);
router.post('/verify', schoolController.verifyFounderEmail);
//router.post('/resend-verification', schoolController.resendVerificationEmail);
//router.get('/check-code', schoolController.checkSchoolCode);

// ========== PROTECTED ROUTES ==========
router.get('/profile', authenticate, requireSchoolAdmin, schoolController.getSchoolProfile);
router.put('/profile', authenticate, requireSchoolAdmin, schoolController.updateSchoolProfile);

// ========== FUTURE ROUTES (Separate Files) ==========
// These will be in separate controller files:
// - /schools/academic/*  → academicController.js
// - /schools/finance/*   → financeController.js  
// - /schools/settings/*  → settingsController.js
// - /schools/staff/*     → staffController.js

export default router;