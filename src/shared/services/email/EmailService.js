// shared/services/email/EmailService.js - CORE EMAIL SENDING
import { Resend } from 'resend';

export class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.sender = {
      name: process.env.EMAIL_SENDER_NAME || 'School System',
      email: process.env.EMAIL_SENDER_EMAIL
    };
  }

  // CORE SEND METHOD
  async send(emailInstance) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.sender.name} <${this.sender.email}>`,
        to: emailInstance.getRecipients(),
        subject: emailInstance.getSubject(),
        html: emailInstance.getHtml(),
        text: emailInstance.getText(),
        tags: emailInstance.getTags()
      });

      if (error) throw new Error(`Email failed: ${error.message}`);

      console.log(`✅ ${emailInstance.constructor.name} sent to ${emailInstance.getRecipients()}`);
      return { success: true, messageId: data?.id };
      
    } catch (error) {
      console.error(`❌ ${emailInstance.constructor.name} failed:`, error.message);
      
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] ${emailInstance.constructor.name}:`, {
          to: emailInstance.getRecipients(),
          subject: emailInstance.getSubject(),
          html: emailInstance.getHtml().substring(0, 100) + '...'
        });
        return { success: true, messageId: 'dev-' + Date.now() };
      }
      
      throw error;
    }
  }

  // BULK SEND
  async sendBulk(emailInstances) {
    const results = [];
    
    for (const emailInstance of emailInstances) {
      try {
        const result = await this.send(emailInstance);
        results.push({ 
          emailType: emailInstance.constructor.name,
          ...result 
        });
      } catch (error) {
        results.push({
          emailType: emailInstance.constructor.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

export default new EmailService();