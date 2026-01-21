// src/v1/controllers/schools/index.js - SCHOOL CONTROLLERS EXPORT
// ================================================================

// Import all school controllers
import * as schoolRegister from './schoolRegister.js';
import * as schoolSetting from './schoolSetting.js';
import * as schoolDetails from './schoolDetails.js';

// Combine all exports
export const schoolController = {
  // From schoolRegister.js
  ...schoolRegister,
  
  // From schoolSetting.js
  ...schoolSetting,
  
  // From schoolDetails.js
  ...schoolDetails
};

// Also export individually for direct imports
export { schoolRegister, schoolSetting, schoolDetails };

// Export specific functions
export const registerSchool = schoolRegister.registerSchool || schoolRegister.default?.registerSchool;
export const verifyFounderEmail = schoolRegister.verifyFounderEmail || schoolRegister.default?.verifyFounderEmail;
export const updateSchoolProfile = schoolDetails.updateSchoolProfile || schoolDetails.default?.updateSchoolProfile;
export const getSchoolProfile = schoolDetails.getSchoolProfile || schoolDetails.default?.getSchoolProfile;
export const updateSchoolSettings = schoolSetting.updateSchoolSettings || schoolSetting.default?.updateSchoolSettings;
export const updateSchoolTIN = schoolSetting.updateSchoolTIN || schoolSetting.default?.updateSchoolTIN;
export const checkTINAvailability = schoolSetting.checkTINAvailability || schoolSetting.default?.checkTINAvailability;
export const getSchoolFinancialInfo = schoolSetting.getSchoolFinancialInfo || schoolSetting.default?.getSchoolFinancialInfo;

// Default export
export default schoolController;