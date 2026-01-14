import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getCurrentUser,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js';
import { 
  validateUserRegistration, 
  validateLogin 
} from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { body } from 'express-validator';

const router = express.Router();

// ========= PUBLIC ROUTES =========
// @route   POST /api/auth/register
// @desc    Sajili mtumiaji mpya
// @access  Public
router.post('/register', validateUserRegistration, registerUser);

// @route   POST /api/auth/login
// @desc    Ingia kwenye mfumo
// @access  Public
router.post('/login', validateLogin, loginUser);

// ========= PROTECTED ROUTES =========
// @route   GET /api/auth/me
// @desc    Pata wasifu wa mtumiaji wa sasa
// @access  Private
router.get('/me', authenticate, getCurrentUser);

// @route   PUT /api/auth/profile
// @desc    Badilisha wasifu wa mtumiaji
// @access  Private
router.put('/profile', 
  authenticate,
  [
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Jina kamili liwe baina ya herufi 2 na 255'),
    
    body('phone_number')
      .optional()
      .trim()
      .matches(/^\+?[0-9\s\-\(\)]{10,}$/)
      .withMessage('Tafadhali weka namba ya simu sahihi')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Uhakiki wa taarifa umeshindikana',
        errors: errors.array()
      });
    }
    next();
  },
  updateProfile
);

// @route   PUT /api/auth/change-password
// @desc    Badilisha nenosiri
// @access  Private
router.put('/change-password',
  authenticate,
  [
    body('current_password')
      .notEmpty()
      .withMessage('Nenosiri la sasa linahitajika'),
    
    body('new_password')
      .isLength({ min: 6 })
      .withMessage('Nenosiri jipya lazima liwe na herufi angalau 6')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Nenosiri lazima liwe na herufi kubwa, ndogo na namba')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Uhakiki wa taarifa umeshindikana',
        errors: errors.array()
      });
    }
    next();
  },
  changePassword
);

export default router;