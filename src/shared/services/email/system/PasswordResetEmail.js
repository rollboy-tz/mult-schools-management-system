// PasswordResetEmail.js - For password reset
import { BaseEmail } from '../BaseEmail.js';

export class PasswordResetEmail extends BaseEmail {
  constructor(data) {
    super(data);
    this.userName = data.userName;
    this.resetCode = data.resetCode;
    this.expiryMinutes = data.expiryMinutes || 15;
    this.ipAddress = data.ipAddress || 'Unknown';
    this.userAgent = data.userAgent || 'Unknown device';
  }

  getRecipients() {
    return [this.data.userEmail];
  }

  getSubject() {
    return 'Password Reset Request - School Management System';
  }

  getHtml() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Password Reset Request</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 25px; text-align: center; }
          .reset-box { background: #fef2f2; border: 2px solid #fca5a5; padding: 25px; text-align: center; margin: 25px 0; border-radius: 10px; }
          .reset-code { font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #dc2626; margin: 15px 0; }
          .security-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { background: #f1f5f9; padding: 20px; margin-top: 30px; text-align: center; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
            <p>School Management System Security</p>
          </div>
          
          <h2>Hello ${this.userName},</h2>
          
          <p>We received a request to reset your password for your School Management System account.</p>
          
          <div class="reset-box">
            <p>Use this code to reset your password:</p>
            <div class="reset-code">${this.resetCode}</div>
            <p style="color: #dc2626; font-size: 14px;">
              ⚠️ Expires in ${this.expiryMinutes} minutes
            </p>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL}/reset-password?code=${this.resetCode}" class="button">
              Reset Password Now
            </a>
          </div>
          
          <div class="security-info">
            <p><strong>🔍 Request Details:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Time: ${new Date().toLocaleString()}</li>
              <li>IP Address: ${this.ipAddress}</li>
              <li>Device: ${this.userAgent.substring(0, 50)}...</li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>⚠️ SECURITY ALERT:</strong> If you didn't request this password reset, 
              please ignore this email and secure your account immediately.
            </p>
          </div>
          
          <p><strong>Need help?</strong></p>
          <ul>
            <li>Contact support: <a href="mailto:support@schoolsystem.com">support@schoolsystem.com</a></li>
            <li>Visit our security center: ${process.env.FRONTEND_URL}/security</li>
            <li>Enable two-factor authentication for extra security</li>
          </ul>
          
          <div class="footer">
            <p>This is an automated security email from School Management System.</p>
            <p style="font-size: 12px; margin-top: 10px;">
              ${this.version} • Request ID: ${Date.now().toString(36).toUpperCase()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getText() {
    return `
PASSWORD RESET REQUEST

Hello ${this.userName},

We received a request to reset your password for your School Management System account.

RESET CODE: ${this.resetCode}
Expires in: ${this.expiryMinutes} minutes

To reset your password:
1. Go to ${process.env.FRONTEND_URL}/reset-password
2. Enter the code above
3. Create a new strong password

REQUEST DETAILS:
• Time: ${new Date().toLocaleString()}
• IP Address: ${this.ipAddress}
• Device: ${this.userAgent}

⚠️ SECURITY ALERT: If you didn't request this password reset, please ignore this email and secure your account immediately.

FOR YOUR SECURITY:
• Never share your verification codes
• Use strong, unique passwords
• Enable two-factor authentication
• Regularly update your password

Need help?
• Contact: support@schoolsystem.com
• Security Center: ${process.env.FRONTEND_URL}/security

This is an automated security email.

${new Date().toLocaleDateString()} • ${this.version} • ID: ${Date.now().toString(36).toUpperCase()}
    `.trim();
  }

  getTags() {
    return [
      ...super.getTags(),
      { name: 'email_type', value: 'password_reset' },
      { name: 'security_level', value: 'high' }
    ];
  }
}