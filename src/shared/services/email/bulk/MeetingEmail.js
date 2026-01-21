// shared/services/email/bulk/MeetingEmail.js - FOR MEETINGS
import { BaseEmail } from '../BaseEmail.js';

export class MeetingEmail extends BaseEmail {
  constructor(data) {
    super(data);
    this.meetingType = data.meetingType; // 'pta', 'staff', 'disciplinary'
    this.dateTime = data.dateTime;
    this.venue = data.venue;
    this.agenda = data.agenda || [];
  }

  getRecipients() {
    return this.data.recipients || [];
  }

  getSubject() {
    const meetingTitles = {
      'pta': 'Parent-Teacher Association Meeting',
      'staff': 'Staff Meeting',
      'disciplinary': 'Disciplinary Committee Meeting'
    };
    
    return `INVITATION: ${meetingTitles[this.meetingType]}`;
  }

  getHtml() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.getSubject()}</title>
        <style>
          .meeting-card { 
            border: 2px solid #3b82f6; 
            border-radius: 12px; 
            padding: 30px; 
            margin: 20px 0;
          }
          .agenda-item { 
            background: #eff6ff; 
            padding: 10px; 
            margin: 5px 0; 
            border-left: 4px solid #3b82f6;
          }
          .calendar-link { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto;">
          <h2>📅 Meeting Invitation</h2>
          
          <div class="meeting-card">
            <h3>${this.formatMeetingType()}</h3>
            
            <p><strong>📅 Date & Time:</strong> ${new Date(this.dateTime).toLocaleString()}</p>
            <p><strong>📍 Venue:</strong> ${this.venue}</p>
            <p><strong>👥 Called by:</strong> ${this.data.calledBy || 'School Administration'}</p>
            
            <a href="${this.getCalendarLink()}" class="calendar-link">
              Add to Calendar
            </a>
          </div>
          
          <h3>Meeting Agenda</h3>
          ${this.agenda.map((item, index) => `
            <div class="agenda-item">
              <strong>${index + 1}. ${item.title}</strong>
              ${item.description ? `<p>${item.description}</p>` : ''}
              ${item.duration ? `<small>Duration: ${item.duration} minutes</small>` : ''}
            </div>
          `).join('')}
          
          <div style="margin-top: 30px; padding: 20px; background: #f0f9ff;">
            <p><strong>Important Notes:</strong></p>
            <ul>
              <li>Please arrive 10 minutes early</li>
              <li>Bring any required documents</li>
              <li>RSVP by ${this.data.rsvpDate || '2 days before meeting'}</li>
            </ul>
          </div>
          
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
            ${this.version === 'v2' ? '🔔 You can manage meeting preferences in your account settings.' : ''}
          </p>
        </div>
      </body>
      </html>
    `;
  }

  getText() {
    return `
${this.getSubject()}

Meeting Details:
• Type: ${this.formatMeetingType()}
• Date & Time: ${new Date(this.dateTime).toLocaleString()}
• Venue: ${this.venue}
• Called by: ${this.data.calledBy || 'School Administration'}

Agenda:
${this.agenda.map((item, index) => 
  `${index + 1}. ${item.title}${item.description ? `\n   ${item.description}` : ''}`
).join('\n')}

Important Notes:
• Please arrive 10 minutes early
• Bring any required documents
• RSVP by ${this.data.rsvpDate || '2 days before meeting'}

Calendar Link: ${this.getCalendarLink()}
    `.trim();
  }

  formatMeetingType() {
    const types = {
      'pta': 'Parent-Teacher Association Meeting',
      'staff': 'Staff Meeting',
      'disciplinary': 'Disciplinary Committee Meeting',
      'academic': 'Academic Board Meeting'
    };
    return types[this.meetingType] || this.meetingType;
  }

  getCalendarLink() {
    const title = encodeURIComponent(this.getSubject());
    const details = encodeURIComponent(`Venue: ${this.venue}\nAgenda: ${this.agenda.map(a => a.title).join(', ')}`);
    const location = encodeURIComponent(this.venue);
    const start = new Date(this.dateTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(new Date(this.dateTime).getTime() + 2 * 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${start}/${end}`;
  }
}