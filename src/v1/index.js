// src/v1/index.js - V1 MAIN EXPORT
// =================================

// SCHOOL CONTROLLERS (from schools folder)
export { 
  schoolController,
  registerSchool,
  verifyFounderEmail,
  getSchoolProfile,
  updateSchoolProfile,
  updateSchoolSettings,
  updateSchoolTIN,
  checkTINAvailability,
  getSchoolFinancialInfo
} from './controllers/schools/index.js';

// AUTH CONTROLLERS (from auth folder)
export { 
  connectParent,
  verifyTeacherEmail,
  connectTeacher,
  verifyUserEmail,
  userRegister,
  verifyParentEmail
} from './controllers/auth/index.js';

// AUTH CONTROLLER
export { default as authController } from './controllers/auth/index.js';

// USER CONTROLLER  
//export { default as schoolController } from './controllers/school/index.js';

// V1 METADATA
export const VERSION = '1.0.2';
export const API_NAME = 'School Management API v1';
export const API_STATUS = 'active';

// Helper to get all controllers
export const getControllers = () => ({
  schoolController: import('./controllers/schools/index.js').then(m => m.default),
  authController: import('./controllers/auth/index.js').then(m => m.default)
});