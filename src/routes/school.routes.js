import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  registerSchool,
  getSchool,
  getUserSchools,
  addSchoolMember
} from '../controllers/school.controller.js';
import { body } from 'express-validator';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   POST /api/schools/register
// @desc    Register a new school
// @access  Private
router.post('/register', 
  [
    body('school_name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Jina la shule liwe baina ya herufi 2 na 255'),
    
    body('school_email')
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage('Tafadhali weka barua pepe sahihi ya shule'),
    
    body('school_phone')
      .optional()
      .trim()
      .matches(/^\+?[0-9\s\-\(\)]{10,}$/)
      .withMessage('Tafadhali weka namba ya simu sahihi'),
    
    body('school_type')
      .optional()
      .isIn(['primary', 'secondary', 'mixed', 'college', 'university'])
      .withMessage('Aina ya shule sio sahihi'),
    
    body('registration_number')
      .optional()
      .trim()
  ],
  registerSchool
);

// @route   GET /api/schools/my-schools
// @desc    Get user's schools
// @access  Private
router.get('/my-schools', getUserSchools);

// @route   GET /api/schools/:schoolId
// @desc    Get school details
// @access  Private (School members only)
router.get('/:schoolId', getSchool);

// @route   POST /api/schools/:schoolId/members
// @desc    Add member to school
// @access  Private (School admin/owner only)
router.post('/:schoolId/members',
  [
    body('user_email')
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage('Tafadhali weka barua pepe sahihi'),
    
    body('role')
      .isIn(['teacher', 'accountant', 'principal', 'assistant', 'viewer'])
      .withMessage('Cheo kisicho sahihi')
  ],
  addSchoolMember
);

export default router;