import { pool } from '../config/database.js';

// @desc    Register a new school
// @route   POST /api/schools/register
// @access  Private (User must be logged in)
export const registerSchool = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      school_name,
      school_email,
      school_phone,
      school_type,
      region,
      district,
      registration_number
    } = req.body;

    // Check if school email already exists
    const existingSchool = await pool.query(
      'SELECT id FROM schools WHERE school_email = $1',
      [school_email]
    );

    if (existingSchool.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Shule na barua pepe hii tayari imesajiliwa'
      });
    }

    // Check registration number if provided
    if (registration_number) {
      const existingReg = await pool.query(
        'SELECT id FROM schools WHERE registration_number = $1',
        [registration_number]
      );

      if (existingReg.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Namba ya usajili tayari imetumika'
        });
      }
    }

    // Create school
    const schoolResult = await pool.query(
      `INSERT INTO schools 
       (school_name, school_email, school_phone, school_type, region, district, registration_number) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [school_name, school_email, school_phone, school_type, region, district, registration_number]
    );

    const school = schoolResult.rows[0];

    // Link user to school as owner
    await pool.query(
      `INSERT INTO school_members 
       (school_id, user_id, role, is_primary_contact, added_by) 
       VALUES ($1, $2, $3, $4, $5)`,
      [school.id, userId, 'owner', true, userId]
    );

    res.status(201).json({
      status: 'success',
      message: 'Shule imesajiliwa kikamilifu',
      data: {
        school: {
          id: school.id,
          school_name: school.school_name,
          school_email: school.school_email,
          school_type: school.school_type,
          region: school.region,
          district: school.district,
          registration_number: school.registration_number,
          created_at: school.created_at
        },
        user_role: 'owner'
      }
    });

  } catch (error) {
    console.error('School registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Hitilafu ya ndani ya seva'
    });
  }
};

// @desc    Get school details
// @route   GET /api/schools/:schoolId
// @access  Private (School members only)
export const getSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of this school
    const membership = await pool.query(
      `SELECT sm.role, sm.is_primary_contact
       FROM school_members sm
       WHERE sm.school_id = $1 
         AND sm.user_id = $2 
         AND sm.removed_at IS NULL`,
      [schoolId, userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Hauna ruhusa ya kuona taarifa za shule hii'
      });
    }

    // Get school details
    const schoolResult = await pool.query(
      'SELECT * FROM schools WHERE id = $1 AND is_active = true',
      [schoolId]
    );

    if (schoolResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Shule haipatikani'
      });
    }

    // Get school members
    const membersResult = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.phone_number, sm.role, sm.is_primary_contact
       FROM school_members sm
       JOIN platform_users u ON sm.user_id = u.id
       WHERE sm.school_id = $1 AND sm.removed_at IS NULL
       ORDER BY sm.is_primary_contact DESC, sm.role`,
      [schoolId]
    );

    res.status(200).json({
      status: 'success',
      message: 'Taarifa za shule zilipatikana',
      data: {
        school: schoolResult.rows[0],
        members: membersResult.rows,
        user_role: membership.rows[0].role
      }
    });

  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Hitilafu ya ndani ya seva'
    });
  }
};

// @desc    Get user's schools
// @route   GET /api/schools/my-schools
// @access  Private
export const getUserSchools = async (req, res) => {
  try {
    const userId = req.user.id;

    const schoolsResult = await pool.query(
      `SELECT s.*, sm.role, sm.is_primary_contact
       FROM schools s
       JOIN school_members sm ON s.id = sm.school_id
       WHERE sm.user_id = $1 
         AND sm.removed_at IS NULL 
         AND s.is_active = true
       ORDER BY sm.is_primary_contact DESC, s.created_at DESC`,
      [userId]
    );

    res.status(200).json({
      status: 'success',
      message: 'Shule zako zilipatikana',
      data: {
        schools: schoolsResult.rows
      }
    });

  } catch (error) {
    console.error('Get user schools error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Hitilafu ya ndani ya seva'
    });
  }
};

// @desc    Add member to school
// @route   POST /api/schools/:schoolId/members
// @access  Private (School admin/owner only)
export const addSchoolMember = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userId = req.user.id;
    const { user_email, role } = req.body;

    // Check if requester is school admin/owner
    const requesterMembership = await pool.query(
      `SELECT role FROM school_members 
       WHERE school_id = $1 AND user_id = $2 AND removed_at IS NULL`,
      [schoolId, userId]
    );

    if (requesterMembership.rows.length === 0 || 
        !['owner', 'principal'].includes(requesterMembership.rows[0].role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Hauna ruhusa ya kuongeza wanachama'
      });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM platform_users WHERE email = $1 AND is_active = true',
      [user_email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Mtumiaji huyu hayupo'
      });
    }

    const targetUserId = userResult.rows[0].id;

    // Check if user is already a member
    const existingMember = await pool.query(
      `SELECT id FROM school_members 
       WHERE school_id = $1 AND user_id = $2 AND removed_at IS NULL`,
      [schoolId, targetUserId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Mtumiaji huyu tayari ni mwanachama wa shule hii'
      });
    }

    // Add as member
    await pool.query(
      `INSERT INTO school_members 
       (school_id, user_id, role, added_by) 
       VALUES ($1, $2, $3, $4)`,
      [schoolId, targetUserId, role, userId]
    );

    res.status(201).json({
      status: 'success',
      message: 'Mtumiaji ameongezwa kwenye shule'
    });

  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Hitilafu ya ndani ya seva'
    });
  }
};