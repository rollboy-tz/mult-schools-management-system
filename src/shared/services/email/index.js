// shared/services/email/index.js - MAIN EMAIL SERVICES EXPORT
// ============================================================

// 1. BASE SERVICES
export { default as emailService } from './EmailService.js';
export { BaseEmail } from './BaseEmail.js';

// 2. SYSTEM EMAILS (Authentication & Verification)
export { FounderVerificationEmail } from './system/FounderVerificationEmail.js';
export { SchoolVerificationEmail } from './system/SchoolVerificationEmail.js';
export { TeacherVerificationEmail } from './system/TeacherVerificationEmail.js';
export { ParentVerificationEmail } from './system/ParentVerificationEmail.js';
export { PasswordResetEmail } from './system/PasswordResetEmail.js';
export { WelcomeEmail } from './system/WelcomeEmail.js';
export { AccountUpdateEmail } from './system/AccountUpdateEmail.js';

// 3. BULK EMAILS (Mass Communication)
export { ReportEmail } from './bulk/ReportEmail.js';
export { MeetingEmail } from './bulk/MeetingEmail.js';
export { AnnouncementEmail } from './bulk/AnnouncementEmail.js';
export { NewsletterEmail } from './bulk/NewsletterEmail.js';
export { EventNotificationEmail } from './bulk/EventNotificationEmail.js';
export { HolidayNoticeEmail } from './bulk/HolidayNoticeEmail.js';

// 4. ACADEMIC EMAILS (Student & Academic)
export { ResultEmail } from './academic/ResultEmail.js';
export { AttendanceEmail } from './academic/AttendanceEmail.js';
export { ReportCardEmail } from './academic/ReportCardEmail.js';
export { ExamScheduleEmail } from './academic/ExamScheduleEmail.js';
export { FeeReminderEmail } from './academic/FeeReminderEmail.js';
export { AssignmentNotificationEmail } from './academic/AssignmentNotificationEmail.js';

// 5. NOTIFICATION EMAILS (Financial & System)
export { PaymentNotificationEmail } from './notification/PaymentNotificationEmail.js';
export { InvoiceNotificationEmail } from './notification/InvoiceNotificationEmail.js';
export { ReceiptNotificationEmail } from './notification/ReceiptNotificationEmail.js';
export { SubscriptionRenewalEmail } from './notification/SubscriptionRenewalEmail.js';
export { SystemAlertEmail } from './notification/SystemAlertEmail.js';
export { MaintenanceNoticeEmail } from './notification/MaintenanceNoticeEmail.js';

// 6. UTILITY FUNCTIONS
import { FounderVerificationEmail } from './system/FounderVerificationEmail.js';
import { ReportEmail } from './bulk/ReportEmail.js';
import { MeetingEmail } from './bulk/MeetingEmail.js';
import { ResultEmail } from './academic/ResultEmail.js';
import { PasswordResetEmail } from './system/PasswordResetEmail.js';
import { WelcomeEmail } from './system/WelcomeEmail.js';

/**
 * Get email class by type name
 * @param {string} type - Email type (founder_verification, report, meeting, etc.)
 * @returns {Class|null} - Email class or null if not found
 */
export const getEmailClass = (type) => {
  const emailClassMap = {
    // System emails
    'founder_verification': FounderVerificationEmail,
    'school_verification': SchoolVerificationEmail,
    'teacher_verification': TeacherVerificationEmail,
    'parent_verification': ParentVerificationEmail,
    'password_reset': PasswordResetEmail,
    'welcome': WelcomeEmail,
    'account_update': AccountUpdateEmail,
    
    // Bulk emails
    'report': ReportEmail,
    'meeting': MeetingEmail,
    'announcement': AnnouncementEmail,
    'newsletter': NewsletterEmail,
    'event': EventNotificationEmail,
    'holiday': HolidayNoticeEmail,
    
    // Academic emails
    'result': ResultEmail,
    'attendance': AttendanceEmail,
    'report_card': ReportCardEmail,
    'exam_schedule': ExamScheduleEmail,
    'fee_reminder': FeeReminderEmail,
    'assignment': AssignmentNotificationEmail,
    
    // Notification emails
    'payment': PaymentNotificationEmail,
    'invoice': InvoiceNotificationEmail,
    'receipt': ReceiptNotificationEmail,
    'subscription': SubscriptionRenewalEmail,
    'system_alert': SystemAlertEmail,
    'maintenance': MaintenanceNoticeEmail
  };
  
  return emailClassMap[type] || null;
};

/**
 * Create email instance by type with data
 * @param {string} type - Email type
 * @param {Object} data - Email data
 * @returns {BaseEmail} - Email instance
 * @throws {Error} - If type not found
 */
export const createEmail = (type, data) => {
  const EmailClass = getEmailClass(type);
  
  if (!EmailClass) {
    throw new Error(`Email type "${type}" not found. Available types: ${Object.keys(getEmailClass).join(', ')}`);
  }
  
  return new EmailClass(data);
};

/**
 * Send email by type
 * @param {string} type - Email type
 * @param {Object} data - Email data
 * @returns {Promise} - Send result
 */
export const sendEmailByType = async (type, data) => {
  try {
    const emailInstance = createEmail(type, data);
    return await emailService.send(emailInstance);
  } catch (error) {
    console.error(`Failed to send ${type} email:`, error);
    throw error;
  }
};

/**
 * Send bulk emails of same type
 * @param {string} type - Email type
 * @param {Array} recipientsData - Array of recipient data objects
 * @returns {Promise<Array>} - Array of send results
 */
export const sendBulkEmails = async (type, recipientsData) => {
  const results = [];
  const EmailClass = getEmailClass(type);
  
  if (!EmailClass) {
    throw new Error(`Email type "${type}" not found`);
  }
  
  for (const recipientData of recipientsData) {
    try {
      const emailInstance = new EmailClass(recipientData);
      const result = await emailService.send(emailInstance);
      results.push({
        recipient: recipientData.email || recipientData.recipientEmail,
        success: true,
        ...result
      });
    } catch (error) {
      results.push({
        recipient: recipientData.email || recipientData.recipientEmail,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Get all available email types
 * @returns {Array<string>} - Array of email type names
 */
export const getAvailableEmailTypes = () => {
  return [
    // System
    'founder_verification',
    'school_verification',
    'teacher_verification',
    'parent_verification',
    'password_reset',
    'welcome',
    'account_update',
    
    // Bulk
    'report',
    'meeting',
    'announcement',
    'newsletter',
    'event',
    'holiday',
    
    // Academic
    'result',
    'attendance',
    'report_card',
    'exam_schedule',
    'fee_reminder',
    'assignment',
    
    // Notification
    'payment',
    'invoice',
    'receipt',
    'subscription',
    'system_alert',
    'maintenance'
  ];
};

/**
 * Health check for email services
 * @returns {Promise<Object>} - Health status
 */
export const checkEmailServiceHealth = async () => {
  try {
    const status = await emailService.healthCheck();
    const availableTypes = getAvailableEmailTypes();
    
    return {
      service: 'EmailService',
      status: 'healthy',
      available_email_types: availableTypes.length,
      provider: 'Resend',
      timestamp: new Date().toISOString(),
      details: {
        available_types: availableTypes,
        base_service: status
      }
    };
  } catch (error) {
    return {
      service: 'EmailService',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Default export for convenience
export default {
  // Services
  emailService,
  
  // System emails
  FounderVerificationEmail,
  SchoolVerificationEmail,
  TeacherVerificationEmail,
  ParentVerificationEmail,
  PasswordResetEmail,
  WelcomeEmail,
  AccountUpdateEmail,
  
  // Bulk emails
  ReportEmail,
  MeetingEmail,
  AnnouncementEmail,
  NewsletterEmail,
  
  // Academic emails
  ResultEmail,
  AttendanceEmail,
  ReportCardEmail,
  
  // Notification emails
  PaymentNotificationEmail,
  InvoiceNotificationEmail,
  ReceiptNotificationEmail,
  
  // Utility functions
  getEmailClass,
  createEmail,
  sendEmailByType,
  sendBulkEmails,
  getAvailableEmailTypes,
  checkEmailServiceHealth
};