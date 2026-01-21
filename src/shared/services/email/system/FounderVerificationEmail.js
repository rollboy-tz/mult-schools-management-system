// FounderVerificationEmail.js - For school founder verification
import { BaseEmail } from '../BaseEmail.js';

export class FounderVerificationEmail extends BaseEmail {
  constructor(data) {
    super(data);
    this.founderName = data.founderName;
    this.schoolName = data.schoolName;
    this.schoolCode = data.schoolCode;
    this.verificationCode = data.verificationCode;
    this.expiryMinutes = data.expiryMinutes || 30;
    this.role = data.role || 'Super Administrator';
  }

  getRecipients() {
    return [this.data.founderEmail];
  }

  getSubject() {
    return `Verify Your Account - ${this.schoolName}`;
  }

  getHtml() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verify Your Founder Account</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; }
          .verification-box { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 25px; text-align: center; margin: 30px 0; border-radius: 10px; }
          .verification-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af; margin: 15px 0; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
          .footer { background: #f1f5f9; padding: 20px; margin-top: 30px; text-align: center; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 School Management System</h1>
            <p>Founder Account Verification</p>
          </div>
          
          <h2>Hello ${this.founderName},</h2>
          
          <p>You are registering as the <strong>${this.role}</strong> for:</p>
          
          <div class="info-box">
            <p><strong>🏫 School:</strong> ${this.schoolName}</p>
            <p><strong>🔢 School Code:</strong> ${this.schoolCode}</p>
            <p><strong>👑 Your Role:</strong> ${this.role} (Full System Access)</p>
          </div>
          
          <div class="verification-box">
            <p>Use this verification code to activate your account:</p>
            <div class="verification-code">${this.verificationCode}</div>
            <p style="color: #64748b; font-size: 14px;">
              ⏰ Expires in ${this.expiryMinutes} minutes
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/verify/founder?code=${this.verificationCode}" class="button">
              Verify Account Now
            </a>
          </div>
          
          <div class="info-box">
            <p><strong>What happens after verification?</strong></p>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Access full dashboard</li>
              <li>Setup school profile</li>
              <li>Add teachers and staff</li>
              <li>Manage students and parents</li>
              <li>Generate reports and analytics</li>
            </ol>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>⚠️ IMPORTANT:</strong> Keep this code confidential. 
              School Management System will never ask for this code via phone or other channels.
            </p>
          </div>
          
          <div class="footer">
            <p>If you didn't register this school, please ignore this email.</p>
            <p>Need help? Contact: <a href="mailto:support@schoolsystem.com">support@schoolsystem.com</a></p>
            <p style="font-size: 12px; margin-top: 10px;">
              This is ${this.version} verification email • ${new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getText() {
    return `
SCHOOL FOUNDER VERIFICATION

Hello ${this.founderName},

You are registering as the ${this.role} for ${this.schoolName}.

SCHOOL DETAILS:
• School: ${this.schoolName}
• School Code: ${this.schoolCode}
• Your Role: ${this.role}

VERIFICATION CODE: ${this.verificationCode}
Expires in: ${this.expiryMinutes} minutes

To verify your account:
1. Go to ${process.env.FRONTEND_URL}/verify/founder
2. Enter the verification code above
3. Complete your account setup

WHAT YOU CAN DO AFTER VERIFICATION:
✓ Access full dashboard
✓ Setup school profile  
✓ Add teachers and staff
✓ Manage students and parents
✓ Generate reports and analytics

⚠️ IMPORTANT: Keep this code confidential. School Management System will never ask for this code via phone or other channels.

If you didn't register this school, please ignore this email.

Need help? Contact: support@schoolsystem.com

${new Date().toLocaleDateString()} • ${this.version}
    `.trim();
  }

  getTags() {
    return [
      ...super.getTags(),
      { name: 'email_type', value: 'founder_verification' },
      { name: 'school_code', value: this.schoolCode }
    ];
  }
}