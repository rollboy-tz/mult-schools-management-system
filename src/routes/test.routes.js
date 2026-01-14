import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Test protected route
router.get('/protected', authenticate, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Umeingia kwenye eneo linalolindwa',
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.full_name,
      role: req.user.user_type
    },
    timestamp: new Date().toISOString()
  });
});

// Admin only route
router.get('/admin-only', 
  authenticate, 
  requireRole('super_admin', 'school_admin'),
  (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Umeingia kwenye eneo la watawala tu',
      user: req.user,
      access: 'Full administrative access'
    });
  }
);

// Teacher only route
router.get('/teacher-only',
  authenticate,
  requireRole('teacher'),
  (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Umeingia kwenye eneo la walimu tu',
      user: req.user
    });
  }
);

export default router;