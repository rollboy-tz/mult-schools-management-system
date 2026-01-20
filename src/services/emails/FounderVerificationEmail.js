// services/emails/FounderVerificationEmail.js
import { BaseEmailService } from './BaseEmailService.js';

export class FounderVerificationEmail extends BaseEmailService {
  constructor(data) {
    super();
    this.founderName = data.founderName;
    this.founderEmail = data.founderEmail;
    this.schoolName = data.schoolName;
    this.schoolCode = data.schoolCode;
    this.verificationCode = data.verificationCode;
    this.expiryMinutes = data.expiryMinutes || 30;
  }

  getCategory() {
    return 'founder_verification';
  }

  getSubject() {
    return `Verify Your Account - ${this.schoolName}`;
  }

  getHtmlContent() {
    const content = `
      <div class="greeting">Hello ${this.founderName},</div>
      
      <div class="main-content">
        <p>Welcome to <strong>School Management System</strong>! You are registering as the <strong>Super Administrator</strong> for:</p>
        
        <div class="info-box">
          <p><strong>School:</strong> ${this.schoolName}</p>
          <p><strong>School Code:</strong> ${this.schoolCode}</p>
          <p><strong>Your Role:</strong> Super Administrator (Full Access)</p>
        </div>
        
        <div class="warning-box">
          <p><strong>⚠️ IMPORTANT:</strong> You must verify your email to activate your account and access the system.</p>
        </div>
        
        <p>Use the verification code below:</p>
        
        <div class="verification-code">
          <div class="code">${this.verificationCode}</div>
          <p style="color: var(--gray-600); font-size: 14px; margin: 8px 0 0 0;">
            Expires in ${this.expiryMinutes} minutes
          </p>
        </div>
        
        <p>Enter this code on the verification page to complete your registration.</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL}/verify/founder" class="action-button">
            Go to Verification Page
          </a>
        </div>
        
        <div class="info-box">
          <p><strong>What happens next?</strong></p>
          <ol style="margin: 8px 0; padding-left: 20px;">
            <li>Verify your email using the code above</li>
            <li>Complete school setup wizard</li>
            <li>Add teachers and staff members</li>
            <li>Start managing your school!</li>
          </ol>
        </div>
        
        <p>If you encounter any issues, please contact our support team at <a href="mailto:support@schoolsystem.com">support@schoolsystem.com</a>.</p>
      </div>
    `;

    return this.getBaseTemplate(content);
  }

  getTextContent() {
    return `
Hello ${this.founderName},

Welcome to School Management System! You are registering as the Super Administrator for ${this.schoolName}.

School Code: ${this.schoolCode}
Verification Code: ${this.verificationCode}

To activate your account, please:
1. Go to ${process.env.FRONTEND_URL}/verify/founder
2. Enter the verification code above
3. Complete your registration

This code expires in ${this.expiryMinutes} minutes.

If you didn't register this school, please ignore this email.

Best regards,
School Management System Team
    `.trim();
  }
}