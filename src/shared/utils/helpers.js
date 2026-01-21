// utils/helpers.js
import { pool } from '../config/database.js';

// Generate unique school code
export const generateSchoolCode = async () => {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // Generate SCH-XXXX format
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    code = `SCH-${randomNum}`;

    // Check if code exists
    const result = await pool.query(
      'SELECT id FROM schools WHERE code = $1',
      [code]
    );

    if (result.rows.length === 0) {
      isUnique = true;
    }

    attempts++;
  }

  if (!isUnique) {
    // Fallback: timestamp-based code
    const timestamp = Date.now().toString().slice(-8);
    code = `SCH-T${timestamp}`;
  }

  return code;
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('255')) {
    return `+${digits}`;
  } else if (digits.startsWith('0')) {
    return `+255${digits.substring(1)}`;
  } else if (digits.length === 9) {
    return `+255${digits}`;
  }
  
  return phone;
};

// Validate email
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Response formatter
export const formatResponse = (status, message, data = null) => {
  return {
    status,
    message,
    ...(data && { data })
  };
};