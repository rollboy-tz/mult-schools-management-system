// v1/controllers/schoolController.js - V1 SPECIFIC
import { SchoolServiceV1 } from '../services/SchoolServiceV1.js';

export const schoolController = {
  registerSchool: async (req, res) => {
    // V1 specific logic
    const result = await SchoolServiceV1.register(req.body);
    res.json(result);
  },
  
  verifyFounderEmail: async (req, res) => {
    // V1 verification logic
    const result = await SchoolServiceV1.verifyEmail(req.body);
    res.json(result);
  },
  
  getSchoolProfile: async (req, res) => {
    // V1 profile logic
    const profile = await SchoolServiceV1.getProfile(req.user.schoolId);
    res.json(profile);
  }
};