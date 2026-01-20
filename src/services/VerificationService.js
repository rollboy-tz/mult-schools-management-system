// services/VerificationService.js
import EmailService from './EmailService.js';
import { FounderVerificationEmail } from './emails/FounderVerificationEmail.js';
import { SchoolVerificationEmail } from './emails/SchoolVerificationEmail.js';
import { PasswordResetEmail } from './emails/PasswordResetEmail.js';
import { EmailChangeEmail } from './emails/EmailChangeEmail.js';
import { pool } from '../config/database.js';

export class VerificationService {
  
  // Verification types
  static TYPES = {
    FOUNDER_REGISTRATION: 'founder_registration',
    SCHOOL_EMAIL: 'school_email',
    PASSWORD_RESET: 'password_reset',
    EMAIL_CHANGE: 'email_change',
    TEACHER_INVITATION: 'teacher_invitation',
    PARENT_INVITATION: 'parent_invitation'
  };

  // Generate code
  generateCode(type = 'numeric', length = 6) {
    if (type === 'numeric') {
      return Math.floor(
        Math.pow(10, length - 1) + 
        Math.random() * 9 * Math.pow(10, length - 1)
      ).toString();
    }
    
    // Alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Save verification code to database
  async saveVerificationCode(data) {
    const {
      email,
      code,
      type,
      userId = null,
      schoolId = null,
      metadata = {},
      expiresInMinutes = 15
    } = data;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    const result = await pool.query(
      `INSERT INTO verification_codes 
       (email, code, type, user_id, school_id, metadata, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [email, code, type, userId, schoolId, JSON.stringify(metadata), expiresAt]
    );

    return result.rows[0];
  }

  // Send founder verification email
  async sendFounderVerification(data) {
    const { founderEmail, founderName, schoolName, schoolCode } = data;
    
    const verificationCode = this.generateCode('numeric', 6);
    
    // Save to database
    await this.saveVerificationCode({
      email: founderEmail,
      code: verificationCode,
      type: this.constructor.TYPES.FOUNDER_REGISTRATION,
      metadata: { founderName, schoolName, schoolCode },
      expiresInMinutes: 30
    });

    // Create email instance
    const emailInstance = new FounderVerificationEmail({
      founderName,
      founderEmail,
      schoolName,
      schoolCode,
      verificationCode,
      expiryMinutes: 30
    });

    // Send email
    return await EmailService.send(emailInstance, founderEmail);
  }

  // Send school email verification
  async sendSchoolEmailVerification(data) {
    const { schoolEmail, schoolName, founderName } = data;
    
    const verificationCode = this.generateCode('alphanumeric', 8);
    
    await this.saveVerificationCode({
      email: schoolEmail,
      code: verificationCode,
      type: this.constructor.TYPES.SCHOOL_EMAIL,
      metadata: { schoolName, founderName },
      expiresInMinutes: 1440 // 24 hours
    });

    const emailInstance = new SchoolVerificationEmail({
      schoolEmail,
      schoolName,
      founderName,
      verificationCode,
      expiryHours: 24
    });

    return await EmailService.send(emailInstance, schoolEmail);
  }

  // Send password reset email
  async sendPasswordReset(data) {
    const { userEmail, userName } = data;
    
    const resetCode = this.generateCode('numeric', 6);
    
    await this.saveVerificationCode({
      email: userEmail,
      code: resetCode,
      type: this.constructor.TYPES.PASSWORD_RESET,
      metadata: { userName },
      expiresInMinutes: 15
    });

    const emailInstance = new PasswordResetEmail({
      userName,
      userEmail,
      resetCode,
      expiryMinutes: 15
    });

    return await EmailService.send(emailInstance, userEmail);
  }

  // Send email change verification
  async sendEmailChangeVerification(data) {
    const { oldEmail, newEmail, userName } = data;
    
    const verificationCode = this.generateCode('alphanumeric', 8);
    
    await this.saveVerificationCode({
      email: newEmail,
      code: verificationCode,
      type: this.constructor.TYPES.EMAIL_CHANGE,
      metadata: { oldEmail, userName },
      expiresInMinutes: 60
    });

    const emailInstance = new EmailChangeEmail({
      userName,
      oldEmail,
      newEmail,
      verificationCode,
      expiryMinutes: 60
    });

    return await EmailService.send(emailInstance, newEmail);
  }

  // Validate verification code
  async validateCode(email, code, type) {
    const result = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND code = $2 AND type = $3 
       AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [email, code, type]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid or expired code' };
    }

    const verification = result.rows[0];
    
    // Mark as used
    await pool.query(
      'UPDATE verification_codes SET used = TRUE, used_at = NOW() WHERE id = $1',
      [verification.id]
    );

    return { 
      valid: true, 
      verification,
      metadata: verification.metadata ? JSON.parse(verification.metadata) : {}
    };
  }

  // Resend verification code
  async resendVerificationCode(email, type) {
    // Rate limiting check
    const recentAttempts = await pool.query(
      `SELECT COUNT(*) as count FROM verification_codes 
       WHERE email = $1 AND type = $2 AND created_at > NOW() - INTERVAL '5 minutes'`,
      [email, type]
    );

    if (parseInt(recentAttempts.rows[0].count) >= 3) {
      throw new Error('Too many attempts. Please try again later.');
    }

    // Get original metadata
    const original = await pool.query(
      `SELECT metadata FROM verification_codes 
       WHERE email = $1 AND type = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [email, type]
    );

    const metadata = original.rows[0]?.metadata 
      ? JSON.parse(original.rows[0].metadata) 
      : {};

    // Resend based on type
    switch (type) {
      case this.constructor.TYPES.FOUNDER_REGISTRATION:
        return await this.sendFounderVerification({
          founderEmail: email,
          founderName: metadata.founderName,
          schoolName: metadata.schoolName,
          schoolCode: metadata.schoolCode
        });

      case this.constructor.TYPES.SCHOOL_EMAIL:
        return await this.sendSchoolEmailVerification({
          schoolEmail: email,
          schoolName: metadata.schoolName,
          founderName: metadata.founderName
        });

      case this.constructor.TYPES.PASSWORD_RESET:
        return await this.sendPasswordReset({
          userEmail: email,
          userName: metadata.userName
        });

      default:
        throw new Error(`Cannot resend verification for type: ${type}`);
    }
  }
}

// Export singleton
export default new VerificationService();