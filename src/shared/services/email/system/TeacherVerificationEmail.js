// TeacherVerificationEmail.js - For teacher invitation/verification
import { BaseEmail } from '../BaseEmail.js';

export class TeacherVerificationEmail extends BaseEmail {
  constructor(data) {
    super(data);
    this.teacherName = data.teacherName;
    this.schoolName = data.schoolName;
    this.invitedBy = data.invitedBy;
    this.position = data.position || 'Teacher';
    this.verificationCode = data.verificationCode;
    this.expiryDays = data.expiryDays || 7;
    this.subjects = data.subjects || [];
  }

  getRecipients() {
    return [this.data.teacherEmail];
  }

  getSubject() {
    return `Teaching Invitation - ${this.schoolName}`;
  }

  getHtml() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Teacher Invitation - ${this.schoolName}</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #0ea5e9, #38bdf8); color: white; padding: 25px; text-align: center; }
          .invitation-box { background: #f0f9ff; border: 2px solid #7dd3fc; padding: 25px; text-align: center; margin: 25px 0; border-radius: 10px; }
          .verification-code { font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0369a1; margin: 15px 0; }
          .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .info-box { background: #ecfeff; border-left: 4px solid #22d3ee; padding: 15px; margin: 20px 0; }
          .subject-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 5px 12px; margin: 3px; border-radius: 20px; font-size: 14px; }
          .footer { background: #f1f5f9; padding: 20px; margin-top: 30px; text-align: center; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👨‍🏫 Teacher Invitation</h1>
            <p>Join ${this.schoolName} Teaching Staff</p>
          </div>
          
          <h2>Dear ${this.teacherName},</h2>
          
          <p>You have been invited to join the teaching staff at <strong>${this.schoolName}</strong>.</p>
          
          <div class="info-box">
            <p><strong>📋 Invitation Details:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Position:</strong> ${this.position}</li>
              <li><strong>Invited by:</strong> ${this.invitedBy}</li>
              <li><strong>School:</strong> ${this.schoolName}</li>
              <li><strong>Invitation expires:</strong> ${this.expiryDays} days</li>
            </ul>
          </div>
          
          ${this.subjects.length > 0 ? `
            <p><strong>📚 Assigned Subjects:</strong></p>
            <div style="margin: 15px 0;">
              ${this.subjects.map(subject => `<span class="subject-badge">${subject}</span>`).join('')}
            </div>
          ` : ''}
          
          <div class="invitation-box">
            <p>Use this code to accept the invitation:</p>
            <div class="verification-code">${this.verificationCode}</div>
            <p style="color: #64748b; font-size: 14px;">
              📅 Valid for ${this.expiryDays} days
            </p>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL}/accept-invitation/teacher?code=${this.verificationCode}" class="button">
              Accept Teaching Position
            </a>
          </div>
          
          <div class="info-box">
            <p><strong>🎯 What you can do as a teacher:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Manage your class schedule</li>
              <li>Record student attendance</li>
              <li>Enter examination marks</li>
              <li>Generate student reports</li>
              <li>Communicate with parents</li>
              <li>Access teaching resources</li>
            </ul>
          </div>
          
          <p><strong>Next Steps After Acceptance:</strong></p>
          <ol style="margin: 15px 0; padding-left: 25px;">
            <li>Complete your teacher profile</li>
            <li>Set your teaching schedule</li>
            <li>Review assigned subjects and classes</li>
            <li>Access teacher training materials</li>
            <li>Connect with other staff members</li>
          </ol>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>💼 Professional Note:</strong> This invitation is for the position of ${this.position} at ${this.schoolName}. 
              Please contact ${this.invitedBy} if you have any questions about the role.
            </p>
          </div>
          
          <div class="footer">
            <p>We look forward to having you on our teaching team!</p>
            <p style="font-size: 12px; margin-top: 10px;">
              ${this.version} • Teacher Portal • ${new Date().getFullYear()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getText() {
    return `
TEACHER INVITATION - ${this.schoolName.toUpperCase()}

Dear ${this.teacherName},

You have been invited to join the teaching staff at ${this.schoolName}.

INVITATION DETAILS:
• Position: ${this.position}
• Invited by: ${this.invitedBy}
• School: ${this.schoolName}
• Expires in: ${this.expiryDays} days

${this.subjects.length > 0 ? `Assigned Subjects: ${this.subjects.join(', ')}` : ''}

ACCEPTANCE CODE: ${this.verificationCode}
Valid for: ${this.expiryDays} days

To accept this teaching position:
1. Go to ${process.env.FRONTEND_URL}/accept-invitation/teacher
2. Enter the acceptance code above
3. Complete your teacher registration

TEACHER CAPABILITIES:
✓ Manage class schedule
✓ Record student attendance
✓ Enter examination marks
✓ Generate student reports
✓ Communicate with parents
✓ Access teaching resources

NEXT STEPS AFTER ACCEPTANCE:
1. Complete teacher profile
2. Set teaching schedule
3. Review assigned subjects
4. Access training materials
5. Connect with staff members

PROFESSIONAL NOTE: This invitation is for the position of ${this.position} at ${this.schoolName}. 
Please contact ${this.invitedBy} if you have any questions.

We look forward to having you on our teaching team!

${new Date().toLocaleDateString()} • ${this.version}
    `.trim();
  }

  getTags() {
    return [
      ...super.getTags(),
      { name: 'email_type', value: 'teacher_invitation' },
      { name: 'position', value: this.position },
      ...(this.subjects.map(subject => ({ name: 'subject', value: subject })))
    ];
  }
}