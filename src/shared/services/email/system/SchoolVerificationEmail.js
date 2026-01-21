// SchoolVerificationEmail.js - For school email verification
import { BaseEmail } from '../BaseEmail.js';

export class SchoolVerificationEmail extends BaseEmail {
  constructor(data) {
    super(data);
    this.schoolName = data.schoolName;
    this.schoolEmail = data.schoolEmail;
    this.verificationCode = data.verificationCode;
    this.expiryHours = data.expiryHours || 24;
    this.adminName = data.adminName;
  }

  getRecipients() {
    return [this.schoolEmail];
  }

  getSubject() {
    return `Verify School Email - ${this.schoolName}`;
  }

  getHtml() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verify School Email Address</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 25px; text-align: center; }
          .verification-box { background: #f0fdf4; border: 2px solid #86efac; padding: 25px; text-align: center; margin: 25px 0; border-radius: 10px; }
          .verification-code { font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #059669; margin: 15px 0; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .info-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .footer { background: #f1f5f9; padding: 20px; margin-top: 30px; text-align: center; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏫 School Email Verification</h1>
            <p>Official Communication Channel Setup</p>
          </div>
          
          <h2>School Email Verification</h2>
          
          <p>This email address (<strong>${this.schoolEmail}</strong>) has been registered as the official contact for:</p>
          
          <div class="info-box">
            <p><strong>🏫 School:</strong> ${this.schoolName}</p>
            <p><strong>👤 Requested by:</strong> ${this.adminName}</p>
            <p><strong>📧 Email:</strong> ${this.schoolEmail}</p>
          </div>
          
          <div class="verification-box">
            <p>Verification code for ${this.schoolEmail}:</p>
            <div class="verification-code">${this.verificationCode}</div>
            <p style="color: #64748b; font-size: 14px;">
              ⏰ Valid for ${this.expiryHours} hours
            </p>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL}/verify/school-email?code=${this.verificationCode}" class="button">
              Verify School Email
            </a>
          </div>
          
          <div class="info-box">
            <p><strong>Why verify your school email?</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Receive official school notifications</li>
              <li>Get invoices and payment receipts</li>
              <li>Receive student reports and alerts</li>
              <li>System announcements and updates</li>
              <li>Password reset and security alerts</li>
            </ul>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ol style="margin: 15px 0; padding-left: 25px;">
            <li>Verify this email address using the code above</li>
            <li>Configure notification preferences</li>
            <li>Add backup email addresses</li>
            <li>Set up SMS notifications (optional)</li>
          </ol>
          
          <div class="footer">
            <p>If you didn't request this verification, please contact ${this.adminName} or our support team.</p>
            <p style="font-size: 12px; margin-top: 10px;">
              ${this.version} • School Communication Setup
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getText() {
    return `
SCHOOL EMAIL VERIFICATION

This email address (${this.schoolEmail}) has been registered as the official contact for ${this.schoolName}.

SCHOOL DETAILS:
• School: ${this.schoolName}
• Requested by: ${this.adminName}
• Email: ${this.schoolEmail}

VERIFICATION CODE: ${this.verificationCode}
Valid for: ${this.expiryHours} hours

To verify:
1. Go to ${process.env.FRONTEND_URL}/verify/school-email
2. Enter the verification code above
3. Complete email verification

WHY VERIFY YOUR SCHOOL EMAIL?
✓ Receive official school notifications
✓ Get invoices and payment receipts  
✓ Receive student reports and alerts
✓ System announcements and updates
✓ Password reset and security alerts

NEXT STEPS:
1. Verify this email address
2. Configure notification preferences
3. Add backup email addresses
4. Set up SMS notifications (optional)

If you didn't request this verification, please contact ${this.adminName} or our support team.

${new Date().toLocaleDateString()} • ${this.version}
    `.trim();
  }

  getTags() {
    return [
      ...super.getTags(),
      { name: 'email_type', value: 'school_verification' },
      { name: 'school_name', value: this.schoolName }
    ];
  }
}