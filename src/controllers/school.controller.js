import { pool } from '../config/database.js';

// @desc    Register a new school
// @route   POST /api/schools/register
// @access  Private
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
      ward,
      registration_number
    } = req.body;

    // CHECK: User hana shule nyingine kama owner/principal
    const existingSchools = await pool.query(
      `SELECT s.id, s.school_name, sm.role
       FROM schools s
       JOIN school_members sm ON s.id = sm.school_id
       WHERE sm.user_id = $1 
         AND sm.removed_at IS NULL 
         AND sm.role IN ('owner', 'principal')
         AND s.is_active = true`,
      [userId]
    );

    if (existingSchools.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Tayari una shule (${existingSchools.rows[0].school_name}). User hawezi kuwa na shule zaidi ya moja.`
      });
    }

    // Check if school email exists
    const existingSchoolEmail = await pool.query(
      'SELECT id FROM schools WHERE school_email = $1',
      [school_email]
    );

    if (existingSchoolEmail.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Shule na barua pepe hii tayari imesajiliwa'
      });
    }

    // Create school
    const schoolResult = await pool.query(
      `INSERT INTO schools 
       (school_name, school_email, school_phone, school_type, region, district, ward, registration_number) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [school_name, school_email, school_phone, school_type, region, district, ward, registration_number]
    );

    const school = schoolResult.rows[0];

    // Link user to school as OWNER (mmiliki)
    await pool.query(
      `INSERT INTO school_members 
       (school_id, user_id, role, is_primary_contact, added_by) 
       VALUES ($1, $2, $3, $4, $5)`,
      [school.id, userId, 'owner', true, userId]
    );

    // CREATE DEFAULT STRUCTURE YA SHULE
    await createDefaultSchoolStructure(school.id);

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
          ward: school.ward,
          registration_number: school.registration_number,
          created_at: school.created_at
        },
        user_role: 'owner',
        note: 'Umekuwa mmiliki wa shule hii. Unaweza sasa kuongeza walimu, madarasa, na wanafunzi.'
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

// Helper function: Create default school structure
const createDefaultSchoolStructure = async (schoolId) => {
  try {
    // 1. Create school schema (kwa PostgreSQL multi-tenancy)
    await pool.query(`CREATE SCHEMA IF NOT EXISTS school_${schoolId}`);
    
    // 2. Switch to school schema na create tables
    await pool.query(`SET search_path TO school_${schoolId}`);
    
    // 3. Create school-specific tables
    await pool.query(`
      -- Classes table (Madarasa)
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(50) NOT NULL, -- 'Form 1A', 'Standard 3B'
        class_level VARCHAR(20), -- 'Form 1', 'Standard 3'
        academic_year VARCHAR(10), -- '2024/2025'
        capacity INTEGER DEFAULT 40,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);

    await pool.query(`
      -- Subjects table (Masomo)
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        subject_code VARCHAR(20) UNIQUE NOT NULL,
        subject_name VARCHAR(100) NOT NULL,
        subject_type VARCHAR(20) DEFAULT 'core', -- 'core', 'optional', 'elective'
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      -- Students table (Wanafunzi)
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        admission_number VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        birth_date DATE,
        gender VARCHAR(10),
        parent_name VARCHAR(255),
        parent_phone VARCHAR(20),
        parent_email VARCHAR(255),
        class_id INTEGER, -- Will reference classes(id)
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        CONSTRAINT fk_class FOREIGN KEY (class_id) REFERENCES classes(id)
      )
    `);

    await pool.query(`
      -- Teacher-Classes assignment
      CREATE TABLE IF NOT EXISTS teacher_classes (
        id SERIAL PRIMARY KEY,
        teacher_user_id INTEGER NOT NULL, -- References platform_users.id
        class_id INTEGER NOT NULL,
        subject_id INTEGER, -- References subjects.id
        is_class_teacher BOOLEAN DEFAULT FALSE,
        academic_year VARCHAR(10),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER, -- References platform_users.id
        UNIQUE(teacher_user_id, class_id, subject_id, academic_year)
      )
    `);

    await pool.query(`
      -- Exams table
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        exam_name VARCHAR(100) NOT NULL,
        exam_type VARCHAR(50), -- 'midterm', 'final', 'test'
        class_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        exam_date DATE,
        total_marks DECIMAL(5,2) DEFAULT 100.00,
        created_by INTEGER, -- References platform_users.id
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_class FOREIGN KEY (class_id) REFERENCES classes(id),
        CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
      )
    `);

    await pool.query(`
      -- Exam Results table
      CREATE TABLE IF NOT EXISTS exam_results (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        marks_obtained DECIMAL(5,2),
        grade VARCHAR(5), -- 'A', 'B+', 'C'
        remarks TEXT,
        entered_by INTEGER, -- References platform_users.id
        entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        CONSTRAINT fk_exam FOREIGN KEY (exam_id) REFERENCES exams(id),
        CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES students(id),
        UNIQUE(exam_id, student_id)
      )
    `);

    await pool.query(`
      -- Attendance table
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        attendance_date DATE NOT NULL,
        status VARCHAR(10) NOT NULL, -- 'present', 'absent', 'late'
        reason TEXT,
        marked_by INTEGER, -- References platform_users.id
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES students(id),
        CONSTRAINT fk_class FOREIGN KEY (class_id) REFERENCES classes(id),
        UNIQUE(student_id, attendance_date)
      )
    `);

    // 4. Return to public schema
    await pool.query('SET search_path TO public');
    
    console.log(`✅ Created default structure for school_${schoolId}`);
    
  } catch (error) {
    console.error('Error creating school structure:', error);
    // Don't fail the whole request, just log
  }
};

// ... REST OF THE FUNCTIONS (getSchool, getUserSchools, addSchoolMember) ...
// (Ziko kama zilivyo hapo awali, hakuna mabadiliko)