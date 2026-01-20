// services/emails/PasswordResetEmail.js
import { BaseEmailService } from './BaseEmailService.js';

export class PasswordResetEmail extends BaseEmailService {
  constructor(data) {
    super();
    this.userName = data.userName;
    this.userEmail = data.userEmail;
    this.resetCode = data.resetCode;
    this.expiryMinutes = data.expiryMinutes || 15;
  }

  getCategory() {
    return 'password_reset';
  }

  getSubject() {
    return 'Password Reset Request';
  }

  getHtmlContent() {
    const content = `
      <div class="greeting">Hello ${this.userName},</div>
      
      <div class="main-content">
        <p>We received a request to reset the password for your account.</p>
        
        <div class="warning-box">
          <p><strong>🔒 SECURITY ALERT:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
        </div>
        
        <p>Reset code:</p>
        
        <div class="verification-code">
          <div class="code">${this.resetCode}</div>
          <p style="color: var(--gray-600); font-size: 14px; margin: 8px 0 0 0;">
            Expires in ${this.expiryMinutes} minutes
          </p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL}/auth/reset-password" class="action-button">
            Reset Password
          </a>
        </div>
        
        <p><strong>Security tips:</strong></p>
        <ul style="margin: 16px 0; padding-left: 20px;">
          <li>Never share your verification code with anyone</li>
          <li>Create a strong, unique password</li>
          <li>Enable two-factor authentication if available</li>
          <li>Regularly update your password</li>
        </ul>
        
        <p>If you need assistance, contact our support team immediately.</p>
      </div>
    `;

    return this.getBaseTemplate(content);
  }

  getTextContent() {
    return `
Hello ${this.userName},

We received a password reset request for your account.

Reset Code: ${this.resetCode}

Go to ${process.env.FRONTEND_URL}/auth/reset-password and enter this code.

This code expires in ${this.expiryMinutes} minutes.

SECURITY NOTICE: If you didn't request this reset, please:
1. Ignore this email
2. Check your account security
3. Contact support if needed

Stay safe,
School Management System Security Team
    `.trim();
  }
}