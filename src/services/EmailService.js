// services/EmailService.js
import { Resend } from 'resend';

export class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.sender = {
      name: process.env.EMAIL_SENDER_NAME || 'School System',
      email: process.env.EMAIL_SENDER || process.env.RESEND_SENDER_EMAIL
    };
    
    if (!this.resend) {
      console.warn('Resend API key not configured. Emails will not be sent.');
    }
  }

  // Send any email that extends BaseEmailService
  async send(emailInstance, to) {
    if (!this.resend) {
      console.warn('Email not sent (Resend not configured):', emailInstance.getSubject());
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailData = emailInstance.prepareEmail(to);
      
      const { data, error } = await this.resend.emails.send({
        from: `${this.sender.name} <${this.sender.email}>`,
        to: Array.isArray(to) ? to : [to],
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        tags: emailData.tags
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw new Error(`Email sending failed: ${error.message}`);
      }

      console.log(`Email sent successfully: ${emailInstance.getSubject()} -> ${to}`);
      
      return {
        success: true,
        messageId: data?.id,
        to: to,
        subject: emailData.subject,
        category: emailInstance.getCategory()
      };
    } catch (error) {
      console.error('EmailService.send() Error:', error);
      throw error;
    }
  }

  // Send multiple emails
  async sendBulk(emailInstance, recipients) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.send(emailInstance, recipient);
        results.push({ recipient, ...result });
      } catch (error) {
        results.push({ 
          recipient, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  // Health check
  async healthCheck() {
    try {
      // Try to get API key info (Resend doesn't have direct health check)
      return { 
        status: 'healthy', 
        service: 'Resend',
        sender: this.sender.email
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        service: 'Resend' 
      };
    }
  }
}

// Export singleton instance
export default new EmailService();