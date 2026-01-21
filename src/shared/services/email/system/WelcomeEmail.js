// WelcomeEmail.js - After successful verification
import { BaseEmail } from '../BaseEmail.js';

export class WelcomeEmail extends BaseEmail {
  constructor(data) {
    super(data);
    this.userName = data.userName;
    this.schoolName = data.schoolName;
    this.userType = data.userType; // founder, teacher, parent
    this.loginUrl = data.loginUrl || `${process.env.FRONTEND_URL}/login`;
    this.dashboardUrl = data.dashboardUrl || `${process.env.FRONTEND_URL}/dashboard`;
  }

  getRecipients() {
    return [this.data.userEmail];
  }

  getSubject() {
    return `Welcome to School Management System, ${this.userName}!`;
  }

  getHtml() {
    const welcomeMessages = {
      'founder': `Congratulations on successfully registering <strong>${this.schoolName}</strong>!`,
      'teacher': `Welcome to the teaching staff at <strong>${this.schoolName}</strong>!`,
      'parent': `Welcome to the parent portal of <strong>${this.schoolName}</strong>!`,
      'student': `Welcome to your student portal at <strong>${this.schoolName}</strong>!`
    };

    const roleSpecificTips = {
      'founder': this.getFounderTips(),
      'teacher': this.getTeacherTips(),
      'parent': this.getParentTips(),
      'student': this.getStudentTips()
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Welcome to School Management System</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #8b5cf6, #a78bfa); color: white; padding: 30px; text-align: center; }
          .welcome-box { background: #faf5ff; border: 2px solid #c4b5fd; padding: 25px; margin: 25px 0; border-radius: 10px; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
          .tip-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .quick-link { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 8px 16px; margin: 5px; border-radius: 6px; text-decoration: none; }
          .footer { background: #f1f5f9; padding: 20px; margin-top: 30px; text-align: center; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Aboard!</h1>
            <p>School Management System</p>
          </div>
          
          <h2>Hello ${this.userName},</h2>
          
          <p>${welcomeMessages[this.userType] || 'Welcome to our school management platform!'}</p>
          
          <div class="welcome-box">
            <h3 style="margin-top: 0;">🚀 Get Started Now</h3>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${this.dashboardUrl}" class="button">
                Go to Dashboard
              </a>
              <a href="${this.loginUrl}" class="button" style="background: #10b981;">
                Login Now
              </a>
            </div>
          </div>
          
          <h3>📋 Quick Links</h3>
          <div style="margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL}/profile" class="quick-link">👤 Your Profile</a>
            <a href="${process.env.FRONTEND_URL}/settings" class="quick-link">⚙️ Settings</a>
            <a href="${process.env.FRONTEND_URL}/help" class="quick-link">❓ Help Center</a>
            <a href="${process.env.FRONTEND_URL}/tutorials" class="quick-link">🎬 Tutorials</a>
          </div>
          
          <h3>💡 Getting Started Tips</h3>
          ${roleSpecificTips[this.userType] || this.getGeneralTips()}
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>📞 Need Help?</strong> Our support team is available:
              <br>Email: <a href="mailto:support@schoolsystem.com">support@schoolsystem.com</a>
              <br>Phone: ${process.env.SUPPORT_PHONE || '+255 XXX XXX XXX'}
              <br>Hours: Monday-Friday, 8AM-6PM
            </p>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing School Management System!</p>
            <p style="font-size: 12px; margin-top: 10px;">
              ${this.version} • Welcome Package • ${new Date().getFullYear()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getFounderTips() {
    return `
      <div class="tip-box">
        <p><strong>For School Founders/Administrators:</strong></p>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li>Complete school profile setup</li>
          <li>Add teachers and staff members</li>
          <li>Set up academic terms and classes</li>
          <li>Configure payment settings</li>
          <li>Explore reporting and analytics</li>
        </ol>
      </div>
    `;
  }

  getTeacherTips() {
    return `
      <div class="tip-box">
        <p><strong>For Teachers:</strong></p>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li>Complete your teacher profile</li>
          <li>Check assigned classes and subjects</li>
          <li>Set up your teaching schedule</li>
          <li>Learn how to record attendance</li>
          <li>Explore gradebook features</li>
        </ol>
      </div>
    `;
  }

  getText() {
    return `
WELCOME TO SCHOOL MANAGEMENT SYSTEM!

Hello ${this.userName},

Welcome to School Management System! Your account has been successfully activated.

GET STARTED:
• Dashboard: ${this.dashboardUrl}
• Login: ${this.loginUrl}

QUICK LINKS:
• Your Profile: ${process.env.FRONTEND_URL}/profile
• Settings: ${process.env.FRONTEND_URL}/settings  
• Help Center: ${process.env.FRONTEND_URL}/help
• Tutorials: ${process.env.FRONTEND_URL}/tutorials

GETTING STARTED TIPS:
1. Complete your profile information
2. Explore the dashboard features
3. Watch introductory tutorials
4. Configure your notification preferences
5. Download the mobile app (if available)

NEED HELP?
Email: support@schoolsystem.com
Phone: ${process.env.SUPPORT_PHONE || '+255 XXX XXX XXX'}
Hours: Monday-Friday, 8AM-6PM

Thank you for choosing School Management System!

${new Date().toLocaleDateString()} • ${this.version}
    `.trim();
  }

  getTags() {
    return [
      ...super.getTags(),
      { name: 'email_type', value: 'welcome' },
      { name: 'user_type', value: this.userType }
    ];
  }
}