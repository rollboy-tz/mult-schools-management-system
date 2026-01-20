import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

export const registerUser = async (req, res) => {
  try {
    const { email, password, full_name, phone_number, user_type = 'school_admin' } = req.body;
    
    // Hakiki kama mtumiaji yupo tayari
    const existingUser = await pool.query(
      'SELECT id FROM platform_users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Mtumiaji mwenye barua pepe hii tayari yupo'
      });
    }
    
    // Hash nenosiri
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Unda mtumiaji
    const result = await pool.query(
      `INSERT INTO platform_users 
       (email, password_hash, full_name, phone_number, user_type) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, full_name, user_type, created_at`,
      [email, hashedPassword, full_name, phone_number, user_type]
    );
    
    const user = result.rows[0];
    
    // Unda token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userType: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      status: 'success',
      message: 'Mtumiaji amesajiliwa kikamilifu',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type,
          created_at: user.created_at
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Kosa la usajili:', error);
    res.status(500).json({
      status: 'error',
      message: 'Kosa la ndani la seva wakati wa usajili'
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Tafuta mtumiaji
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, user_type, is_active, phone_number, last_login
       FROM platform_users 
       WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Wrong email or Password'
      });
    }
    
    const user = result.rows[0];
    
    // Hakiki kama akaunti iko active
    if (!user.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is In Active please contact system admin for more info.'
      });
    }
    
    // Hakiki nenosiri
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Wrong email or Password'
      });
    }
    
    // Sasisha login ya mwisho
    await pool.query(
      'UPDATE platform_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Unda token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userType: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: true,          // false local
      sameSite: 'none',      // strict kama same-domain
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      status: 'success',
      message: 'Loged in successfull',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type,
          phone_number: user.phone_number,
          last_login: user.last_login
        },
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Somethind went wrong please try Again or contact system admin'
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    const user = req.user;
    
    // Remove sensitive data
    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      user_type: user.user_type,
      phone_number: user.phone_number,
      last_login: user.last_login
    };
    
    res.status(200).json({
      status: 'success',
      message: 'Wasifu wa mtumiaji ulipatikana',
      data: { user: userData }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Hitilafu ya ndani ya seva'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone_number } = req.body;
    
    // Update user profile
    const result = await pool.query(
      `UPDATE platform_users 
       SET full_name = COALESCE($1, full_name), 
           phone_number = COALESCE($2, phone_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING id, email, full_name, phone_number, user_type, updated_at`,
      [full_name, phone_number, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Mtumiaji huyu hayupo'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Wasifu umehakikiwa',
      data: { user: result.rows[0] }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Hitilafu ya ndani ya seva'
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;
    
    // Get current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM platform_users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Mtumiaji huyu hayupo'
      });
    }
    
    const currentHashedPassword = userResult.rows[0].password_hash;
    
    // Verify current password
    const isValid = await bcrypt.compare(current_password, currentHashedPassword);
    
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Nenosiri la sasa si sahihi'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(new_password, salt);
    
    // Update password
    await pool.query(
      'UPDATE platform_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHashedPassword, userId]
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Nenosiri limebadilishwa kikamilifu'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Hitilafu ya ndani ya seva'
    });
  }
};