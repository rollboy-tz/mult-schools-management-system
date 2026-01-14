// src/routes/auth.routes.js
import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getCurrentUser 
} from '../controllers/auth.controller.js';
import { 
  validateUserRegistration, 
  validateLogin 
} from '../middleware/validation.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Sajili mtumiaji mpya
// @access  Public
router.post('/register', validateUserRegistration, registerUser);

// @route   POST /api/auth/login
// @desc    Ingia kwenye mfumo
// @access  Public
router.post('/login', validateLogin, loginUser);

// @route   GET /api/auth/me
// @desc    Pata wasifu wa mtumiaji wa sasa
// @access  Private (itafanyiwa kazi baadaye)
router.get('/me', getCurrentUser);

export default router;