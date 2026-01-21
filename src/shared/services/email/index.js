// shared/services/email/index.js - LOAD ALL EMAIL SERVICES
import EmailService from './EmailService.js';

// Verification emails
export { FounderVerificationEmail } from './verification/FounderVerificationEmail.js';
export { SchoolVerificationEmail } from './verification/SchoolVerificationEmail.js';
export { TeacherVerificationEmail } from './verification/TeacherVerificationEmail.js';

// Bulk emails
export { ReportEmail } from './bulk/ReportEmail.js';
export { MeetingEmail } from './bulk/MeetingEmail.js';
export { AnnouncementEmail } from './bulk/AnnouncementEmail.js';
export { NewsletterEmail } from './bulk/NewsletterEmail.js';

// Academic emails
export { ResultEmail } from './academic/ResultEmail.js';
export { AttendanceEmail } from './academic/AttendanceEmail.js';
export { ReportCardEmail } from './academic/ReportCardEmail.js';

// System emails
export { WelcomeEmail } from './system/WelcomeEmail.js';
export { PasswordResetEmail } from './system/PasswordResetEmail.js';
export { AccountUpdateEmail } from './system/AccountUpdateEmail.js';

// Main email service instance
export { default as emailService } from './EmailService.js';

// Helper to get email class by type
export const getEmailClass = (type) => {
  const emailClasses = {
    'founder_verification': FounderVerificationEmail,
    'report': ReportEmail,
    'meeting': MeetingEmail,
    'result': ResultEmail,
    'welcome': WelcomeEmail,
    'password_reset': PasswordResetEmail
  };
  
  return emailClasses[type] || null;
};