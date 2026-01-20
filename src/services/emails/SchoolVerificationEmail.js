// services/emails/SchoolVerificationEmail.js
import { BaseEmailService } from './BaseEmailService.js';

export class SchoolVerificationEmail extends BaseEmailService {
  constructor(data) {
    super();
    this.schoolEmail = data.schoolEmail;
    this.schoolName = data.schoolName;
    this.founderName = data.founderName;
    this.verificationCode = data.verificationCode;
    this.expiryHours = data.expiryHours || 24;
  }

  getCategory() {
    return 'school_verification';
  }

  getSubject() {
    return `Verify School Email - ${this.schoolName}`;
  }

  getHtmlContent() {
    const content = `
      <div class="greeting">Hello ${this.founderName},</div>
      
      <div class="main-content">
        <p>You are verifying the official email address for <strong>${this.schoolName}</strong>.</p>
        
        <div class="info-box">
          <p><strong>Email being verified:</strong> ${this.schoolEmail}</p>
          <p><strong>Requested by:</strong> ${this.founderName} (Super Administrator)</p>
          <p><strong>Verification expires in:</strong> ${this.expiryHours} hours</p>
        </div>
        
        <p>This email address will be used for:</p>
        <ul style="margin: 16px 0; padding-left: 20px;">
          <li>Official communications with parents and guardians</li>
          <li>System notifications and alerts</li>
          <li>Sending receipts and invoices</li>
          <li>Password recovery requests</li>
          <li>Emergency notifications</li>
        </ul>
        
        <p>Verification code:</p>
        
        <div class="verification-code">
          <div class="code">${this.verificationCode}</div>
          <p style="color: var(--gray-600); font-size: 14px; margin: 8px 0 0 0;">
            Expires in ${this.expiryHours} hours
          </p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL}/school/settings/verify-email" class="action-button">
            Verify School Email
          </a>
        </div>
        
        <div class="warning-box">
          <p><strong>⚠️ IMPORTANT:</strong> Only verify this email if it is the correct official email for ${this.schoolName}.</p>
          <p>If this is not your school's official email, please ignore this message.</p>
        </div>
        
        <p>Once verified, parents and teachers will see this email as the official contact for your school.</p>
      </div>
    `;

    return this.getBaseTemplate(content);
  }

  getTextContent() {
    return `
Hello ${this.founderName},

You are verifying the official email for ${this.schoolName}.

Email: ${this.schoolEmail}
Verification Code: ${this.verificationCode}

This email will be used for:
- Official communications with parents
- System notifications
- Receipts and invoices
- Password recovery

To verify, go to: ${process.env.FRONTEND_URL}/school/settings/verify-email
Enter the verification code above.

This code expires in ${this.expiryHours} hours.

If this is not your school's official email, please ignore this message.

Best regards,
School Management System Team
    `.trim();
  }
}