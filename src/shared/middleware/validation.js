import { body, validationResult } from 'express-validator';

export const validateUserRegistration = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Tafadhali weka barua pepe sahihi')
    .isLength({ max: 255 })
    .withMessage('Barua pepe isizidi herufi 255'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Nenosiri lazima liwe na herufi angalau 6')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nenosiri lazima liwe na herufi kubwa, ndogo na namba'),
  
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Jina kamili liwe baina ya herufi 2 na 255'),
  
  body('phone_number')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-\(\)]{10,}$/)
    .withMessage('Tafadhali weka namba ya simu sahihi'),
  
  body('user_type')
    .optional()
    .isIn(['school_admin', 'teacher', 'parent', 'super_admin'])
    .withMessage('Aina ya mtumiaji sio sahihi'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Uhakiki wa taarifa umeshindikana',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];

export const validateLogin = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Tafadhali weka barua pepe sahihi'),
  
  body('password')
    .notEmpty()
    .withMessage('Nenosiri linahitajika'),
  
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
  }
];

// middleware/validate404.js - SHORT & CLEAN
export const validate404 = () => {
  const routes = [];
  
  return {
    // Track route when registered
    track: (path) => routes.push(path),
    
    // Enhanced 404 handler
    handler: (req, res) => {
      const path = req.originalUrl;
      
      // Check if similar route exists
      const similar = routes.filter(r => 
        path.includes(r.split('/')[2]) || // Match resource (schools, auth, etc)
        r.includes(path.split('/')[2])
      );
      
      res.status(404).json({
        error: 'Not Found',
        path,
        method: req.method,
        similar: similar.slice(0, 3),
        available: ['/health', '/api/v1', '/api/v1/schools', '/api/v1/auth'],
        hint: path.includes('school') ? 'Try /api/v1/schools/...' : 
              path.includes('auth') ? 'Try /api/v1/auth/...' : 'Check route prefix'
      });
    }
  };
};

export const notfoundPath = (req, res) => {

}