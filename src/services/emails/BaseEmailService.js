// services/emails/BaseEmailService.js
export class BaseEmailService {
  constructor() {
    if (this.constructor === BaseEmailService) {
      throw new Error("BaseEmailService is an abstract class and cannot be instantiated directly.");
    }
  }

  // Abstract methods (must be implemented by child classes)
  getSubject() {
    throw new Error("Method 'getSubject()' must be implemented.");
  }

  getHtmlContent() {
    throw new Error("Method 'getHtmlContent()' must be implemented.");
  }

  getTextContent() {
    throw new Error("Method 'getTextContent()' must be implemented.");
  }

  getTags() {
    return [{ name: 'category', value: this.getCategory() }];
  }

  getCategory() {
    return 'general';
  }

  // Common template method
  getBaseTemplate(content) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${this.getSubject()}</title>
        <style>
          :root {
            --primary-color: #4f46e5;
            --secondary-color: #7e22ce;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --gray-50: #f9fafb;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-600: #4b5563;
            --gray-700: #374151;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--gray-700);
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #ffffff;
          }
          
          .email-container {
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          .email-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
          }
          
          .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          
          .email-header .subtitle {
            margin-top: 8px;
            opacity: 0.9;
            font-size: 14px;
          }
          
          .email-content {
            padding: 32px 24px;
            background-color: var(--gray-50);
          }
          
          .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--gray-700);
          }
          
          .main-content {
            margin: 24px 0;
          }
          
          .verification-code {
            background: white;
            border: 2px dashed var(--primary-color);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
          }
          
          .code {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 32px;
            font-weight: 700;
            color: var(--primary-color);
            letter-spacing: 8px;
            margin: 8px 0;
          }
          
          .action-button {
            display: inline-block;
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 16px 0;
            text-align: center;
          }
          
          .info-box {
            background-color: white;
            border-left: 4px solid var(--primary-color);
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          }
          
          .warning-box {
            background-color: #fef3c7;
            border: 1px solid var(--warning-color);
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
          }
          
          .footer {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid var(--gray-200);
            color: var(--gray-600);
            font-size: 12px;
            text-align: center;
          }
          
          .footer a {
            color: var(--primary-color);
            text-decoration: none;
          }
          
          @media (max-width: 480px) {
            .email-header {
              padding: 24px 16px;
            }
            
            .email-content {
              padding: 24px 16px;
            }
            
            .code {
              font-size: 24px;
              letter-spacing: 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>🏫 School Management System</h1>
            <div class="subtitle">${this.getCategory().toUpperCase()} NOTIFICATION</div>
          </div>
          
          <div class="email-content">
            ${content}
            
            <div class="footer">
              <p>This email was sent by School Management System.</p>
              <p>If you didn't request this, please ignore this email or <a href="mailto:support@schoolsystem.com">contact support</a>.</p>
              <p>&copy; ${new Date().getFullYear()} School Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Prepare email data
  prepareEmail(to, additionalData = {}) {
    return {
      to,
      subject: this.getSubject(),
      html: this.getHtmlContent(),
      text: this.getTextContent(),
      tags: this.getTags(),
      ...additionalData
    };
  }
}