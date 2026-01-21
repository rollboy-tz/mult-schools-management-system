// middleware/auth.js
import jwt from 'jsonwebtoken';
import { pool } from '.../config/database.js';
import { authLogger, errorLogger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.split(' ')[1];
    
    // Verify access token
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    
    // Check if user exists and is active
    const userResult = await pool.query(
      `SELECT u.*, s.id as school_id, s.code as school_code, s.status as school_status
       FROM platform_users u
       LEFT JOIN schools s ON u.id = s.founder_user_id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User account not found or inactive'
      });
    }

    const user = userResult.rows[0];

    // Check school status
    if (user.school_status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'School account is not active',
        school_status: user.school_status
      });
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      schoolId: user.school_id,
      schoolCode: user.school_code
    };

    next();

  } catch (error) {
    // Handle token errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid access token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Access token expired',
        requires_refresh: true
      });
    }

    errorLogger.error('Authentication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

// Middleware to check token expiry and refresh if needed
export const withAutoRefresh = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    // Try to decode without verification first
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return next();
    }

    // Check if token is about to expire (in next 2 minutes)
    const expiresIn = decoded.exp * 1000 - Date.now();
    
    if (expiresIn < 2 * 60 * 1000) {
      // Token is about to expire, set flag for client to refresh
      res.setHeader('X-Token-Expiring-Soon', 'true');
    }

    next();
  } catch (error) {
    next();
  }
};

// Add this function to your existing auth.js file

// Middleware to require school admin access
export const requireSchoolAdmin = async (req, res, next) => {
  try {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Check if user has admin privileges
    const allowedUserTypes = ['super_admin', 'admin', 'school_admin'];
    
    if (!allowedUserTypes.includes(req.user.userType)) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required',
        required_role: 'admin',
        current_role: req.user.userType
      });
    }

    // Verify school relationship
    if (!req.user.schoolId) {
      return res.status(403).json({
        status: 'error',
        message: 'No school associated with your account'
      });
    }

    next();
  } catch (error) {
    errorLogger.error('School admin check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify admin access'
    });
  }
};

// Optional: More specific role middleware
export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== 'super_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Super admin access required'
      });
    }
    next();
  } catch (error) {
    errorLogger.error('Super admin check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify super admin access'
    });
  }
};