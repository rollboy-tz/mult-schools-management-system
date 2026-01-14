// src/controllers/auth.controller.js
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
      `SELECT id, email, password_hash, full_name, user_type, is_active 
       FROM platform_users 
       WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Barua pepe au nenosiri si sahihi'
      });
    }
    
    const user = result.rows[0];
    
    // Hakiki kama akaunti iko active
    if (!user.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'Akaunti imezimwa. Tafadhali wasiliana na msaada.'
      });
    }
    
    // Hakiki nenosiri
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Barua pepe au nenosiri si sahihi'
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
    
    res.status(200).json({
      status: 'success',
      message: 'Login imefanikiwa',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Kosa la login:', error);
    res.status(500).json({
      status: 'error',
      message: 'Kosa la ndani la seva wakati wa login'
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // Hii itafanyika baada ya kuweka middleware ya authentication
    res.status(200).json({
      status: 'success',
      message: 'Endpoint ya wasifu ya mtumiaji (itafanyiwa kazi baadaye)'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Kosa la ndani la seva'
    });
  }
};