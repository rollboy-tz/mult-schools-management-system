import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Hujaingia. Tafadhali ingia kwanza.'
      });
    }

    // Verify token (MARA MOJA)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists and active
    const userResult = await pool.query(
      `SELECT id, email, full_name, user_type, is_active, phone_number, last_login
       FROM platform_users
       WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Mtumiaji huyu hayupo au amezimwa. Tafadhali ingia tena.'
      });
    }

    req.user = userResult.rows[0];
    next();

  } catch (error) {
    console.error('Authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token sio sahihi. Tafadhali ingia tena.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token imekwisha muda wake. Tafadhali ingia tena.'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Hitilafu ya ndani ya seva wakati wa uthibitishaji.'
    });
  }
};


// Middleware ya kuangalia roles
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Hauna ruhusa ya kupata rasilimali hii.'
      });
    }
    
    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        status: 'error',
        message: 'Hauna ruhusa ya kufanya hatua hii.'
      });
    }
    
    next();
  };
};