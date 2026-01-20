// controllers/authController.js
import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authLogger, errorLogger } from '../utils/logger.js';
import crypto from 'crypto';

// ============================================
// LOGIN USER
// ============================================
export const loginUser = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    // Find user with school info
    const userResult = await pool.query(
      `SELECT 
        u.id, u.email, u.password_hash, u.full_name, 
        u.user_type, u.is_active, u.email_verified,
        s.id as school_id, s.code as school_code, s.name as school_name,
        s.status as school_status,
        sa.role as admin_role
       FROM platform_users u
       LEFT JOIN schools s ON u.id = s.founder_user_id
       LEFT JOIN school_admins sa ON u.id = sa.user_id AND s.id = sa.school_id
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Log failed attempt
      authLogger.warn('Login failed - user not found', { email });
      
      // Same error message for security
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      // Log failed attempt
      authLogger.warn('Login failed - invalid password', { 
        email,
        userId: user.id 
      });
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        status: 'error',
        message: 'Please verify your email before logging in',
        requires_verification: true
      });
    }

    // Check school status
    if (user.school_status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'School account is not active',
        school_status: user.school_status
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userType: user.user_type,
        schoolId: user.school_id,
        schoolCode: user.school_code
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' } // Short-lived access token
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tokenVersion: 1 // For token invalidation
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' } // Long-lived refresh token
    );

    // Store refresh token in database (hashed)
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await pool.query(
      `INSERT INTO refresh_tokens 
       (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        hashedRefreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        req.get('user-agent') || 'unknown',
        req.ip || 'unknown'
      ]
    );

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh'
    };

    // Different expiry for remember me
    if (rememberMe) {
      cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else {
      cookieOptions.maxAge = 24 * 60 * 60 * 1000; // 1 day
    }

    res.cookie('refresh_token', refreshToken, cookieOptions);

    // Update last login
    await pool.query(
      'UPDATE platform_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Log successful login
    authLogger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      schoolId: user.school_id
    });

    // Return response
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type
        },
        school: {
          id: user.school_id,
          code: user.school_code,
          name: user.school_name
        },
        access_token: accessToken,
        expires_in: 15 * 60 // 15 minutes in seconds
      }
    });

  } catch (error) {
    errorLogger.error('Login error:', {
      error: error.message,
      email: req.body.email
    });

    res.status(500).json({
      status: 'error',
      message: 'Login failed. Please try again.'
    });
  }
};

// ============================================
// REFRESH ACCESS TOKEN
// ============================================
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    
    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if token exists in database
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const tokenResult = await pool.query(
      `SELECT rt.*, u.id as user_id, u.email, u.user_type,
              s.id as school_id, s.code as school_code
       FROM refresh_tokens rt
       JOIN platform_users u ON rt.user_id = u.id
       LEFT JOIN schools s ON u.id = s.founder_user_id
       WHERE rt.token_hash = $1 
         AND rt.expires_at > NOW() 
         AND rt.revoked = false
         AND u.is_active = true`,
      [hashedToken]
    );

    if (tokenResult.rows.length === 0) {
      // Token doesn't exist or is revoked
      res.clearCookie('refresh_token');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    const tokenRecord = tokenResult.rows[0];

    // Check token version (for logout from all devices)
    if (decoded.tokenVersion !== 1) { // You can increment this on password change
      await pool.query(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
        [tokenRecord.user_id]
      );
      
      res.clearCookie('refresh_token');
      return res.status(401).json({
        status: 'error',
        message: 'Token version mismatch'
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: tokenRecord.user_id,
        email: tokenRecord.email,
        userType: tokenRecord.user_type,
        schoolId: tokenRecord.school_id,
        schoolCode: tokenRecord.school_code
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Update token last used
    await pool.query(
      'UPDATE refresh_tokens SET last_used_at = NOW() WHERE id = $1',
      [tokenRecord.id]
    );

    authLogger.debug('Token refreshed', {
      userId: tokenRecord.user_id
    });

    res.json({
      status: 'success',
      data: {
        access_token: newAccessToken,
        expires_in: 15 * 60
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.clearCookie('refresh_token');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token'
      });
    }

    errorLogger.error('Token refresh error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to refresh token'
    });
  }
};

// ============================================
// LOGOUT USER
// ============================================
export const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    
    if (refreshToken) {
      // Hash and revoke the refresh token
      const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      await pool.query(
        'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
        [hashedToken]
      );

      // Log logout
      authLogger.info('User logged out', {
        userId: req.user?.userId
      });
    }

    // Clear cookies
    res.clearCookie('refresh_token', {
      path: '/api/auth/refresh'
    });

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });

  } catch (error) {
    errorLogger.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed'
    });
  }
};

// ============================================
// LOGOUT FROM ALL DEVICES
// ============================================
export const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Revoke all refresh tokens for this user
    await pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [userId]
    );

    // Clear cookie
    res.clearCookie('refresh_token', {
      path: '/api/auth/refresh'
    });

    // Increment token version (optional - for invalidating all issued tokens)
    // await pool.query(
    //   'UPDATE platform_users SET token_version = token_version + 1 WHERE id = $1',
    //   [userId]
    // );

    authLogger.info('User logged out from all devices', { userId });

    res.json({
      status: 'success',
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    errorLogger.error('Logout all devices error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to logout from all devices'
    });
  }
};

// ============================================
// GET CURRENT USER
// ============================================
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userResult = await pool.query(
      `SELECT 
        u.id, u.email, u.full_name, u.user_type, u.phone,
        u.email_verified, u.phone_verified, u.last_login,
        s.id as school_id, s.code as school_code, s.name as school_name,
        sa.role as admin_role
       FROM platform_users u
       LEFT JOIN schools s ON u.id = s.founder_user_id
       LEFT JOIN school_admins sa ON u.id = sa.user_id AND s.id = sa.school_id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      status: 'success',
      data: { user }
    });

  } catch (error) {
    errorLogger.error('Get current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user profile'
    });
  }
};