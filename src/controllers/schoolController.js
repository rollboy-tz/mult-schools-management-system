// controllers/schoolController.js
import { pool } from '../config/database.js';
import VerificationService from '../services/VerificationService.js';
import { generateSchoolCode } from '../utils/helpers.js';
import { authLogger, errorLogger } from '../utils/logger.js';

// ============================================
// REGISTER SCHOOL (Public)
// ============================================
export const registerSchool = async (req, res) => {
  const transaction = await pool.connect();
  
  try {
    await transaction.query('BEGIN');
    
    const {
      // School Information
      name,
      email,
      phone,
      address,
      district,
      region,
      country = 'Tanzania',
      
      // Founder Information
      founder_name,
      founder_email,
      founder_phone,
      founder_password,
      founder_position = 'director',
      
      // Agreements
      agree_terms,
      agree_admin
    } = req.body;

    // ========== VALIDATION ==========
    
    // Required fields
    const requiredFields = {
      name: 'School name is required',
      email: 'School email is required',
      phone: 'School phone is required',
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

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || !emailRegex.test(founder_email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
        field: 'email'
      });
    }

    // Phone format (Tanzania)
    const phoneRegex = /^(\+255|0)[1-9]\d{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    const cleanFounderPhone = founder_phone.replace(/\s/g, '');
    
    if (!phoneRegex.test(cleanPhone) || !phoneRegex.test(cleanFounderPhone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid phone number. Use +255 or 0 followed by 9 digits',
        field: 'phone'
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

    // Check existing school
    const existingSchool = await transaction.query(
      'SELECT id FROM schools WHERE email = $1 OR phone = $2',
      [email.toLowerCase(), cleanPhone]
    );

    if (existingSchool.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'A school with this email or phone already exists'
      });
    }

    // ========== CREATE SCHOOL ==========
    
    const schoolCode = await generateSchoolCode();
    
    const schoolResult = await transaction.query(
      `INSERT INTO schools (
        name, email, phone, address, district, region, country,
        code, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, code, name, email, phone, status, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        cleanPhone,
        address?.trim() || null,
        district?.trim() || null,
        region?.trim() || null,
        country.trim(),
        schoolCode,
        'pending' // Awaiting verification
      ]
    );

    const school = schoolResult.rows[0];
    const schoolId = school.id;

    // ========== CREATE FOUNDER ACCOUNT ==========
    
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(founder_password, 10);
    
    const founderResult = await transaction.query(
      `INSERT INTO platform_users (
        email, phone, password_hash, full_name, user_type
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name, user_type`,
      [
        founder_email.toLowerCase().trim(),
        cleanFounderPhone,
        hashedPassword,
        founder_name.trim(),
        'pending_admin' // Will become 'super_admin' after verification
      ]
    );

    const founder = founderResult.rows[0];
    const founderId = founder.id;

    // Link founder to school
    await transaction.query(
      'UPDATE schools SET founder_user_id = $1 WHERE id = $2',
      [founderId, schoolId]
    );

    // ========== SEND VERIFICATION EMAIL ==========
    
    try {
      await VerificationService.sendFounderVerification({
        founderEmail: founder_email,
        founderName: founder_name,
        schoolName: name,
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
    authLogger.info('School registered successfully', {
      schoolId,
      schoolCode,
      schoolName: name,
      founderEmail: founder_email,
      region
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
          status: school.status
        },
        next_steps: [
          'Check your email for verification code',
          'Verify your account within 30 minutes',
          'Complete school setup after verification'
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
      return res.status(409).json({
        status: 'error',
        message: 'A school with similar details already exists'
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
export const verifyFounderEmail = async (req, res) => {
  const transaction = await pool.connect();
  
  try {
    await transaction.query('BEGIN');
    
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and verification code are required'
      });
    }

    // Validate verification code
    const verificationResult = await VerificationService.validateCode(
      email,
      code,
      VerificationService.TYPES.FOUNDER_REGISTRATION
    );

    if (!verificationResult.valid) {
      return res.status(400).json({
        status: 'error',
        message: verificationResult.error || 'Invalid verification code'
      });
    }

    const metadata = verificationResult.metadata;
    
    // Find school by founder email
    const schoolResult = await transaction.query(
      `SELECT s.* FROM schools s
       JOIN platform_users u ON s.founder_user_id = u.id
       WHERE u.email = $1 AND s.status = 'pending'`,
      [email.toLowerCase()]
    );

    if (schoolResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'School not found or already verified'
      });
    }

    const school = schoolResult.rows[0];
    const schoolId = school.id;

    // Update school status
    await transaction.query(
      `UPDATE schools 
       SET status = 'active', 
           verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [schoolId]
    );

    // Update founder to super_admin
    await transaction.query(
      `UPDATE platform_users 
       SET user_type = 'super_admin',
           email_verified = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    // Create admin record
    await transaction.query(
      `INSERT INTO school_admins (
        user_id, school_id, role, permissions
      ) VALUES ($1, $2, $3, $4)`,
      [
        school.founder_user_id,
        schoolId,
        'super_admin',
        JSON.stringify([
          'manage_school',
          'manage_users',
          'manage_finance',
          'manage_academics',
          'manage_settings'
        ])
      ]
    );

    // Create default subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);
    
    await transaction.query(
      `INSERT INTO school_subscriptions (
        school_id, plan_name, status, start_date, end_date,
        trial_end_date, max_students, max_teachers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        schoolId,
        'trial',
        'trial',
        new Date(),
        trialEndDate,
        trialEndDate,
        100,
        20
      ]
    );

    // Create default settings
    await createDefaultSchoolSettings(transaction, schoolId);

    // Commit transaction
    await transaction.query('COMMIT');

    // Generate JWT token for immediate login
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      {
        userId: school.founder_user_id,
        email: email,
        userType: 'super_admin',
        schoolId: schoolId,
        schoolCode: school.code
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    authLogger.info('Founder email verified', {
      schoolId,
      schoolCode: school.code,
      founderEmail: email
    });

    res.json({
      status: 'success',
      message: 'Email verified successfully! Your account is now active.',
      data: {
        school: {
          id: school.id,
          code: school.code,
          name: school.name,
          status: 'active'
        },
        token,
        redirect: '/admin/setup'
      }
    });

  } catch (error) {
    await transaction.query('ROLLBACK');
    
    errorLogger.error('Email verification failed:', {
      error: error.message,
      email: req.body.email
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to verify email. Please try again.'
    });
  } finally {
    transaction.release();
  }
};

// ============================================
// GET SCHOOL PROFILE (Authenticated)
// ============================================
export const getSchoolProfile = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    if (!schoolId) {
      return res.status(400).json({
        status: 'error',
        message: 'School ID is required'
      });
    }

    // Get basic school info
    const schoolResult = await pool.query(
      `SELECT 
        id, code, name, email, phone, address,
        district, region, country, status,
        founder_user_id, verified_at, registration_date,
        created_at, updated_at
       FROM schools 
       WHERE id = $1 AND status = 'active'`,
      [schoolId]
    );

    if (schoolResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'School not found or inactive'
      });
    }

    const school = schoolResult.rows[0];

    // Get subscription info
    const subscriptionResult = await pool.query(
      `SELECT plan_name, status, end_date, max_students, max_teachers
       FROM school_subscriptions 
       WHERE school_id = $1 AND status IN ('active', 'trial')`,
      [schoolId]
    );

    // Get settings count
    const settingsResult = await pool.query(
      `SELECT COUNT(*) as count FROM school_settings WHERE school_id = $1`,
      [schoolId]
    );

    // Remove sensitive data
    delete school.founder_user_id;

    res.json({
      status: 'success',
      data: {
        school,
        subscription: subscriptionResult.rows[0] || null,
        stats: {
          settings: parseInt(settingsResult.rows[0].count) || 0
          // Other stats can be added from separate services
        }
      }
    });

  } catch (error) {
    errorLogger.error('Get school profile failed:', {
      error: error.message,
      userId: req.user?.userId,
      schoolId: req.user?.schoolId
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to get school profile'
    });
  }
};

// ============================================
// UPDATE SCHOOL BASIC INFO (Authenticated)
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

    // Allowed fields for update
    const allowedFields = [
      'name', 'phone', 'address', 'district', 'region',
      'country'
    ];

    // Filter updates
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
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
       RETURNING id, code, name, email, phone, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      await transaction.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'School not found or inactive'
      });
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

    const formattedCode = code.toUpperCase().trim();
    
    // Check if code exists
    const result = await pool.query(
      'SELECT id, name, status FROM schools WHERE code = $1',
      [formattedCode]
    );

    const exists = result.rows.length > 0;
    
    res.json({
      status: 'success',
      data: {
        available: !exists,
        exists: exists,
        ...(exists && {
          school: {
            name: result.rows[0].name,
            status: result.rows[0].status
          }
        })
      }
    });

  } catch (error) {
    errorLogger.error('Check school code failed:', {
      error: error.message,
      code: req.query.code
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to check school code'
    });
  }
};

// ============================================
// RESEND VERIFICATION EMAIL (Public)
// ============================================
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    // Check if school exists and is pending
    const schoolResult = await pool.query(
      `SELECT s.*, u.full_name as founder_name 
       FROM schools s
       JOIN platform_users u ON s.founder_user_id = u.id
       WHERE u.email = $1 AND s.status = 'pending'`,
      [email.toLowerCase()]
    );

    if (schoolResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No pending school registration found for this email'
      });
    }

    const school = schoolResult.rows[0];

    // Resend verification email
    await VerificationService.resendVerificationCode(
      email,
      VerificationService.TYPES.FOUNDER_REGISTRATION
    );

    authLogger.info('Verification email resent', {
      schoolId: school.id,
      email
    });

    res.json({
      status: 'success',
      message: 'Verification email resent successfully',
      data: {
        email: email,
        sent_at: new Date().toISOString()
      }
    });

  } catch (error) {
    errorLogger.error('Resend verification failed:', {
      error: error.message,
      email: req.body.email
    });

    // Handle rate limiting error
    if (error.message.includes('Too many attempts')) {
      return res.status(429).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to resend verification email'
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Create default school settings
async function createDefaultSchoolSettings(connection, schoolId) {
  const defaultSettings = [
    // Academic defaults
    ['academic', 'language', 'sw', 'string'],
    ['academic', 'grading_scale', 'A-F', 'string'],
    
    // Financial defaults
    ['financial', 'currency', 'TZS', 'string'],
    ['financial', 'payment_methods', '["mpesa", "bank", "cash"]', 'json'],
    
    // Communication defaults
    ['communication', 'sms_enabled', 'true', 'boolean'],
    ['communication', 'email_enabled', 'true', 'boolean'],
    
    // System defaults
    ['system', 'timezone', 'Africa/Dar_es_Salaam', 'string'],
    ['system', 'date_format', 'DD/MM/YYYY', 'string']
  ];

  for (const [category, key, value, type] of defaultSettings) {
    await connection.query(
      `INSERT INTO school_settings 
       (school_id, category, setting_key, setting_value, setting_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [schoolId, category, key, value, type]
    );
  }
}

// ============================================
// EXPORT CONTROLLERS
// ============================================
export default {
  registerSchool,
  verifyFounderEmail,
  getSchoolProfile,
  updateSchoolProfile,
  checkSchoolCode,
  resendVerificationEmail
};