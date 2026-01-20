// services/emails/EmailChangeEmail.js
import { BaseEmailService } from './BaseEmailService.js';

export class EmailChangeEmail extends BaseEmailService {
  constructor(data) {
    super();
    this.userName = data.userName;
    this.oldEmail = data.oldEmail;
    this.newEmail = data.newEmail;
    this.verificationCode = data.verificationCode;
    this.expiryMinutes = data.expiryMinutes || 60;
  }

  getCategory() {
    return 'email_change';
  }

  getSubject() {
    return 'Verify Your New Email Address';
  }

  getHtmlContent() {
    const content = `
      <div class="greeting">Hello ${this.userName},</div>
      
      <div class="main-content">
        <p>You requested to change your email address from:</p>
        
        <div class="info-box">
          <p><strong>Current Email:</strong> ${this.oldEmail}</p>
          <p><strong>New Email:</strong> ${this.newEmail}</p>
          <p><strong>Requested On:</strong> ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
        
        <div class="warning-box">
          <p><strong>⚠️ IMPORTANT:</strong> This change will affect how you login and receive notifications.</p>
        </div>
        
        <p>Verification code:</p>
        
        <div class="verification-code">
          <div class="code">${this.verificationCode}</div>
          <p style="color: var(--gray-600); font-size: 14px; margin: 8px 0 0 0;">
            Expires in ${this.expiryMinutes} minutes
          </p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL}/settings/email/verify-change" class="action-button">
            Verify Email Change
          </a>
        </div>
        
        <p><strong>What happens after verification?</strong></p>
        <ol style="margin: 16px 0; padding-left: 20px;">
          <li>Your login email will be updated to ${this.newEmail}</li>
          <li>All future communications will be sent to the new email</li>
          <li>A confirmation will be sent to ${this.oldEmail}</li>
          <li>You can login with the new email immediately</li>
        </ol>
        
        <p>If you didn't request this change, please:</p>
        <ol style="margin: 16px 0; padding-left: 20px;">
          <li>Ignore this email</li>
          <li>Secure your account</li>
          <li>Contact support immediately</li>
        </ol>
      </div>
    `;

    return this.getBaseTemplate(content);
  }

  getTextContent() {
    return `
Hello ${this.userName},

You requested to change your email address from ${this.oldEmail} to ${this.newEmail}.

Verification Code: ${this.verificationCode}

To confirm this change, go to: ${process.env.FRONTEND_URL}/settings/email/verify-change
Enter the verification code above.

This code expires in ${this.expiryMinutes} minutes.

After verification:
- Your login email will be updated
- All communications will go to the new email
- A confirmation will be sent to your old email

If you didn't request this change, please ignore this email and contact support immediately.

Best regards,
School Management System Team
    `.trim();
  }
}