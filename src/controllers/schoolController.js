// controllers/schoolController.js
import { pool } from '../config/database.js';
import VerificationService from '../services/VerificationService.js';
import { generateSchoolCode } from '../utils/helpers.js';
import { authLogger, errorLogger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ============================================
// REGISTER SCHOOL (Public) - TIN IS OPTIONAL
// ============================================
export const registerSchool = async (req, res) => {
  const transaction = await pool.connect();
  
  try {
    await transaction.query('BEGIN');
    
    const {
      // School Information (from your JSON example)
      school_name,
      school_email,
      school_phone,
      school_address,
      school_district,
      school_region,
      school_type = 'primary',
      
      // Founder Information (from your JSON example)
      founder_name,
      founder_email,
      founder_phone,
      founder_password,
      founder_position = 'principal',
      
      // Additional fields (TIN is now OPTIONAL)
      tin_number = null,
      registration_number = null,
      website = null,
      
      // Agreements (from your JSON example)
      agree_terms,
      agree_admin
    } = req.body;

    // ========== VALIDATION ==========
    
    // Required fields (TIN removed from required)
    const requiredFields = {
      school_name: 'School name is required',
      school_email: 'School email is required',
      school_phone: 'School phone is required',
      founder_name: 'Founder name is required',
      founder_email: 'Founder email is required',
      founder_password: 'Founder password is required',
      agree_terms: 'You must agree to terms and conditions',
      agree_admin: 'You must agree to admin responsibilities'
    };

    for (const [field, message] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        return res.status(400).json({
          status: 'error',
          message,
          field
        });
      }
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(school_email) || !emailRegex.test(founder_email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
        field: 'email'
      });
    }

    // Phone format (Tanzania)
    const phoneRegex = /^(\+255|0)[1-9]\d{8}$/;
    const cleanSchoolPhone = school_phone.replace(/\s/g, '');
    const cleanFounderPhone = founder_phone?.replace(/\s/g, '');
    
    if (!phoneRegex.test(cleanSchoolPhone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid school phone number. Use +255 or 0 followed by 9 digits',
        field: 'school_phone'
      });
    }

    if (founder_phone && !phoneRegex.test(cleanFounderPhone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid founder phone number',
        field: 'founder_phone'
      });
    }

    // Password strength
    if (founder_password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters',
        field: 'founder_password'
      });
    }

    // Check existing school by email or phone
    const existingSchool = await transaction.query(
      'SELECT id FROM schools WHERE email = $1 OR phone = $2',
      [school_email.toLowerCase(), cleanSchoolPhone]
    );

    if (existingSchool.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'A school with this email or phone already exists'
      });
    }

    // Check existing founder
    const existingFounder = await transaction.query(
      'SELECT id FROM platform_users WHERE email = $1',
      [founder_email.toLowerCase()]
    );

    if (existingFounder.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Founder email already registered'
      });
    }

    // ========== CREATE SCHOOL (Table 1) ==========
    
    const schoolCode = await generateSchoolCode();
    
    const schoolResult = await transaction.query(
      `INSERT INTO schools (
        name, code, email, phone, address,
        tin_number, registration_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, code, name, email, phone, status, created_at, tin_number`,
      [
        school_name.trim(),
        schoolCode,
        school_email.toLowerCase().trim(),
        cleanSchoolPhone,
        school_address?.trim() || null,
        tin_number?.trim() || null,  // NOW OPTIONAL
        registration_number?.trim() || null,
        'pending' // Awaiting verification
      ]
    );

    const school = schoolResult.rows[0];
    const schoolId = school.id;

    // ========== CREATE FOUNDER ACCOUNT ==========
    
    const hashedPassword = await bcrypt.hash(founder_password, 10);
    const founderUserId = crypto.randomUUID();
    
    const founderResult = await transaction.query(
      `INSERT INTO platform_users (
        id, email, phone, password_hash, full_name, user_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, full_name, user_type`,
      [
        founderUserId,
        founder_email.toLowerCase().trim(),
        cleanFounderPhone || null,
        hashedPassword,
        founder_name.trim(),
        'pending_admin' // Will become 'super_admin' after verification
      ]
    );

    const founder = founderResult.rows[0];
    const founderId = founder.id;

    // Link founder to school
    try {
      await transaction.query(
        'ALTER TABLE schools ADD COLUMN IF NOT EXISTS founder_user_id UUID REFERENCES platform_users(id)'
      );
      
      await transaction.query(
        'UPDATE schools SET founder_user_id = $1 WHERE id = $2',
        [founderId, schoolId]
      );
    } catch (alterError) {
      authLogger.warn('Could not link founder to school:', alterError.message);
    }

    // ========== CREATE SCHOOL ACADEMIC PROFILE (Table 4) ==========
    await transaction.query(
      `INSERT INTO school_academic_profiles (
        school_id, level, grading_system, exam_board,
        academic_year_structure, default_language, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        schoolId,
        school_type === 'primary' ? 'primary' : 
         school_type === 'secondary' ? 'secondary' : 
         school_type === 'college' ? 'college' : 'primary',
        'NECTA', // Default for Tanzania
        'NECTA',
        'terms',
        'sw',
        'TZS'
      ]
    );

    // ========== CREATE SCHOOL SUBSCRIPTION (Table 3) ==========
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30-day trial
    
    await transaction.query(
      `INSERT INTO school_subscriptions (
        school_id, plan_name, status, start_date, end_date,
        auto_renew
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        schoolId,
        'trial',
        'trial',
        new Date(),
        trialEndDate,
        true
      ]
    );

    // ========== CREATE DEFAULT SCHOOL SETTINGS (Table 2) ==========
    await createDefaultSchoolSettings(transaction, schoolId, {
      district: school_district,
      region: school_region,
      type: school_type,
      website: website,
      tin_number: tin_number // Save TIN in settings too
    });

    // ========== SEND VERIFICATION EMAIL ==========
    
    try {
      await VerificationService.sendFounderVerification({
        founderEmail: founder_email,
        founderName: founder_name,
        schoolName: school_name,
        schoolCode: schoolCode
      });
    } catch (emailError) {
      authLogger.warn('Failed to send verification email:', {
        schoolId,
        founderEmail: founder_email,
        error: emailError.message
      });
      // Continue - school is created
    }

    // ========== COMMIT TRANSACTION ==========
    await transaction.query('COMMIT');

    // Log successful registration
    authLogger.info('School registered successfully (TIN optional)', {
      schoolId,
      schoolCode,
      schoolName: school_name,
      founderEmail: founder_email,
      region: school_region,
      hasTin: !!tin_number
    });

    // ========== SUCCESS RESPONSE ==========
    res.status(202).json({
      status: 'pending_verification',
      message: 'School registered successfully. Please verify your email.',
      data: {
        school: {
          id: school.id,
          code: school.code,
          name: school.name,
          email: school.email,
          status: school.status,
          has_tin: !!school.tin_number, // Indicate if TIN exists
          tin_number: school.tin_number || null
        },
        subscription: {
          plan: 'trial',
          end_date: trialEndDate.toISOString().split('T')[0],
          days_remaining: 30
        },
        next_steps: [
          'Check your email for verification code',
          'Verify your account within 30 minutes',
          school.tin_number ? 
            'Your TIN is registered for receipts' : 
            'Add TIN number later for receipt generation'
        ]
      }
    });

  } catch (error) {
    // Rollback on error
    await transaction.query('ROLLBACK');
    
    errorLogger.error('School registration failed:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    // Handle specific errors
    if (error.code === '23505') { // Unique violation
      const field = error.constraint.includes('email') ? 'email' :
                   error.constraint.includes('phone') ? 'phone' :
                   error.constraint.includes('code') ? 'code' : 'field';
      
      return res.status(409).json({
        status: 'error',
        message: `School ${field} already exists`,
        field
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to register school. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { debug: error.message })
    });
  } finally {
    transaction.release();
  }
};


// ============================================
// VERIFY FOUNDER EMAIL (Public)
// ============================================
export const verifyFounderEmail = async (req, res) => {export const verifyFounderEmail = async (req, res) => {
  console.log('[DEBUG] verifyFounderEmail called:', req.body);
  
  // TEMPORARY: Always return success for development
  res.json({
    status: 'success',
    message: 'Email verification endpoint (in development)',
    data: {
      verified: true,
      token: 'dev_token_' + Date.now(),
      redirect: '/dashboard'
    }
  });
};


// ============================================
// UPDATE SCHOOL TIN NUMBER (Authenticated)
// ============================================
export const updateSchoolTIN = async (req, res) => {
  const transaction = await pool.connect();
  
  try {
    await transaction.query('BEGIN');
    
    const schoolId = req.user.schoolId;
    const { tin_number } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        status: 'error',
        message: 'School ID is required'
      });
    }

    if (!tin_number) {
      return res.status(400).json({
        status: 'error',
        message: 'TIN number is required'
      });
    }

    // Validate TIN format (basic validation)
    if (tin_number.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'TIN number is too short'
      });
    }

    // Check if TIN already used by another school
    const existingTIN = await transaction.query(
      'SELECT id, name FROM schools WHERE tin_number = $1 AND id != $2',
      [tin_number.trim(), schoolId]
    );

    if (existingTIN.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'TIN number already registered to another school',
        school: existingTIN.rows[0].name
      });
    }

    // Update TIN in schools table
    const result = await transaction.query(
      `UPDATE schools 
       SET tin_number = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, code, name, tin_number, updated_at`,
      [tin_number.trim(), schoolId]
    );

    if (result.rows.length === 0) {
      await transaction.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'School not found'
      });
    }

    // Also save in settings for backup
    await transaction.query(
      `INSERT INTO school_settings 
       (school_id, category, setting_key, setting_value, setting_type, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (school_id, setting_key) 
       DO UPDATE SET 
         setting_value = EXCLUDED.setting_value,
         updated_at = EXCLUDED.updated_at`,
      [
        schoolId,
        'financial',
        'tin_number',
        tin_number.trim(),
        'string'
      ]
    );

    await transaction.query('COMMIT');

    authLogger.info('School TIN updated', {
      schoolId,
      tin_number
    });

    res.json({
      status: 'success',
      message: 'TIN number updated successfully',
      data: {
        school: {
          id: result.rows[0].id,
          code: result.rows[0].code,
          name: result.rows[0].name,
          tin_number: result.rows[0].tin_number,
          updated_at: result.rows[0].updated_at
        }
      }
    });

  } catch (error) {
    await transaction.query('ROLLBACK');
    
    errorLogger.error('Update TIN failed:', {
      error: error.message,
      schoolId: req.user?.schoolId
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to update TIN number'
    });
  } finally {
    transaction.release();
  }
};

// ============================================
// UPDATE SCHOOL PROFILE (Authenticated)
// ============================================
export const updateSchoolProfile = async (req, res) => {
  const transaction = await pool.connect();
  
  try {
    await transaction.query('BEGIN');
    
    const schoolId = req.user.schoolId;
    const updates = req.body;

    if (!schoolId) {
      return res.status(400).json({
        status: 'error',
        message: 'School ID is required'
      });
    }

    // Allowed fields for update (TIN is NOT ALLOWED here - use separate endpoint)
    const allowedFields = [
      'name', 'phone', 'address', 'email',
      'registration_number', 'website'
    ];

    // Filter updates
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Prevent TIN update through this endpoint
    if (updates.tin_number) {
      return res.status(400).json({
        status: 'error',
        message: 'Please use /api/schools/tin endpoint to update TIN number'
      });
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }

    // Validate email if being updated
    if (filteredUpdates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(filteredUpdates.email)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid email format',
          field: 'email'
        });
      }
      filteredUpdates.email = filteredUpdates.email.toLowerCase().trim();
    }

    // Validate phone if being updated
    if (filteredUpdates.phone) {
      const phoneRegex = /^(\+255|0)[1-9]\d{8}$/;
      const cleanPhone = filteredUpdates.phone.replace(/\s/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid phone number format',
          field: 'phone'
        });
      }
      filteredUpdates.phone = cleanPhone;
    }

    // Check for duplicates (email or phone)
    if (filteredUpdates.email || filteredUpdates.phone) {
      const duplicateCheck = await transaction.query(
        `SELECT id, name FROM schools 
         WHERE (email = $1 OR phone = $2) 
         AND id != $3
         AND status != 'deleted'`,
        [
          filteredUpdates.email || '',
          filteredUpdates.phone || '',
          schoolId
        ]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Email or phone already registered to another school',
          school: duplicateCheck.rows[0].name
        });
      }
    }

    // Build update query
    const setClause = Object.keys(filteredUpdates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.values(filteredUpdates);
    values.push(schoolId);

    // Update school
    const result = await transaction.query(
      `UPDATE schools 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length} AND status = 'active'
       RETURNING id, code, name, email, phone, address, 
                 registration_number, website, tin_number,
                 updated_at`,
      values
    );

    if (result.rows.length === 0) {
      await transaction.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'School not found or inactive'
      });
    }

    // Update settings if district/region changed
    if (updates.district || updates.region) {
      if (updates.district) {
        await updateSchoolSetting(transaction, schoolId, 
          'general', 'school_district', updates.district);
      }
      if (updates.region) {
        await updateSchoolSetting(transaction, schoolId, 
          'general', 'school_region', updates.region);
      }
    }

    // Commit
    await transaction.query('COMMIT');

    authLogger.info('School profile updated', {
      schoolId,
      updatedFields: Object.keys(filteredUpdates)
    });

    res.json({
      status: 'success',
      message: 'School profile updated successfully',
      data: {
        school: result.rows[0],
        updated_at: result.rows[0].updated_at
      }
    });

  } catch (error) {
    await transaction.query('ROLLBACK');
    
    errorLogger.error('Update school profile failed:', {
      error: error.message,
      schoolId: req.user?.schoolId,
      updates: req.body
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to update school profile'
    });
  } finally {
    transaction.release();
  }
};

// ============================================
// CHECK TIN AVAILABILITY (Public/Authenticated)
// ============================================
export const checkTINAvailability = async (req, res) => {
  try {
    const { tin } = req.query;
    const schoolId = req.user?.schoolId; // Optional for logged-in users
    
    if (!tin) {
      return res.status(400).json({
        status: 'error',
        message: 'TIN number is required'
      });
    }

    let query;
    let params;
    
    if (schoolId) {
      // For logged-in users, check if TIN belongs to another school
      query = 'SELECT id, name, code FROM schools WHERE tin_number = $1 AND id != $2';
      params = [tin.trim(), schoolId];
    } else {
      // Public check - just see if TIN exists
      query = 'SELECT id, name, code FROM schools WHERE tin_number = $1';
      params = [tin.trim()];
    }

    const result = await pool.query(query, params);

    const exists = result.rows.length > 0;
    
    res.json({
      status: 'success',
      data: {
        available: !exists,
        exists: exists,
        ...(exists && {
          school: {
            id: result.rows[0].id,
            name: result.rows[0].name,
            code: result.rows[0].code
          }
        })
      }
    });

  } catch (error) {
    errorLogger.error('Check TIN availability failed:', {
      error: error.message,
      tin: req.query.tin
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to check TIN availability'
    });
  }
};

// ============================================
// GET SCHOOL FINANCIAL INFO (Authenticated)
// ============================================
export const getSchoolFinancialInfo = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    if (!schoolId) {
      return res.status(400).json({
        status: 'error',
        message: 'School ID is required'
      });
    }

    // Get TIN and financial settings
    const schoolResult = await pool.query(
      `SELECT tin_number, registration_number 
       FROM schools 
       WHERE id = $1 AND status = 'active'`,
      [schoolId]
    );

    if (schoolResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'School not found'
      });
    }

    // Get financial settings
    const settingsResult = await pool.query(
      `SELECT setting_key, setting_value 
       FROM school_settings 
       WHERE school_id = $1 AND category = 'financial'`,
      [schoolId]
    );

    const financialSettings = {};
    settingsResult.rows.forEach(setting => {
      financialSettings[setting.setting_key] = setting.setting_value;
    });

    res.json({
      status: 'success',
      data: {
        tin_number: schoolResult.rows[0].tin_number,
        registration_number: schoolResult.rows[0].registration_number,
        settings: financialSettings,
        can_generate_receipts: !!schoolResult.rows[0].tin_number,
        message: schoolResult.rows[0].tin_number ? 
          'Ready to generate official receipts' :
          'Add TIN number to enable receipt generation'
      }
    });

  } catch (error) {
    errorLogger.error('Get financial info failed:', {
      error: error.message,
      schoolId: req.user?.schoolId
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to get financial information'
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Create default school settings
async function createDefaultSchoolSettings(connection, schoolId, schoolData) {
  const defaultSettings = [
    // School details from registration
    ['general', 'school_district', schoolData.district || '', 'string'],
    ['general', 'school_region', schoolData.region || '', 'string'],
    ['general', 'school_type', schoolData.type || 'primary', 'string'],
    ['general', 'school_website', schoolData.website || '', 'string'],
    
    // Save TIN in settings too (if provided)
    ['financial', 'tin_number', schoolData.tin_number || '', 'string'],
    
    // Academic defaults
    ['academic', 'current_term', '1', 'number'],
    ['academic', 'current_year', new Date().getFullYear().toString(), 'string'],
    ['academic', 'max_classes', '12', 'number'],
    
    // Financial defaults
    ['financial', 'default_currency', 'TZS', 'string'],
    ['financial', 'receipt_prefix', 'SCH', 'string'],
    ['financial', 'receipt_counter', '1', 'number'],
    ['financial', 'payment_deadline_days', '30', 'number'],
    
    // Communication defaults
    ['communication', 'sms_notifications', 'true', 'boolean'],
    ['communication', 'email_notifications', 'true', 'boolean'],
    
    // System defaults
    ['system', 'timezone', 'Africa/Dar_es_Salaam', 'string'],
    ['system', 'date_format', 'DD/MM/YYYY', 'string'],
    ['system', 'language', 'sw', 'string']
  ];

  for (const [category, key, value, type] of defaultSettings) {
    await connection.query(
      `INSERT INTO school_settings 
       (school_id, category, setting_key, setting_value, setting_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (school_id, setting_key) DO NOTHING`,
      [schoolId, category, key, value, type]
    );
  }
}

// Update a single school setting
async function updateSchoolSetting(connection, schoolId, category, key, value) {
  const settingType = typeof value === 'boolean' ? 'boolean' :
                     typeof value === 'number' ? 'number' :
                     typeof value === 'object' ? 'json' : 'string';
  
  const settingValue = settingType === 'json' ? 
                      JSON.stringify(value) : String(value);

  await connection.query(
    `INSERT INTO school_settings 
     (school_id, category, setting_key, setting_value, setting_type, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (school_id, setting_key) 
     DO UPDATE SET 
       setting_value = EXCLUDED.setting_value,
       updated_at = EXCLUDED.updated_at`,
    [schoolId, category, key, settingValue, settingType]
  );
}

// ============================================
// VERIFY FOUNDER EMAIL (Public)
// ============================================

// ============================================
// CHECK SCHOOL CODE AVAILABILITY (Public)
// ============================================
export const checkSchoolCode = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'School code is required'
      });
    }

    const result = await pool.query(
      'SELECT id, name, status FROM schools WHERE code = $1',
      [code.toUpperCase().trim()]
    );

    res.json({
      status: 'success',
      data: {
        available: result.rows.length === 0,
        exists: result.rows.length > 0,
        school: result.rows[0] || null
      }
    });

  } catch (error) {
    errorLogger.error('Check school code failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check school code'
    });
  }
};

// ============================================
// PLACEHOLDER FUNCTIONS (for now)
// ============================================

export const getSchoolProfile = async (req, res) => {
  res.json({ status: 'success', message: 'To be implemented' });
};

export const updateSchoolSettings = async (req, res) => {
  res.json({ status: 'success', message: 'To be implemented' });
};

export const updateAcademicProfile = async (req, res) => {
  res.json({ status: 'success', message: 'To be implemented' });
};

export const getSchoolSubscription = async (req, res) => {
  res.json({ status: 'success', message: 'To be implemented' });
};

// ============================================
// EXPORT ALL CONTROLLERS
// ============================================
export default {
  // Registration & Verification
  registerSchool,
  verifyFounderEmail,
  checkSchoolCode,
  
  // Profile Management
  getSchoolProfile,
  updateSchoolProfile,
  updateSchoolSettings,
  updateAcademicProfile,
  
  // Financial/TIN Management
  updateSchoolTIN,
  checkTINAvailability,
  getSchoolFinancialInfo,
  
  // Subscription
  getSchoolSubscription
};