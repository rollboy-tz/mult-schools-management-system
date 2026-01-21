// shared/services/email/bulk/ReportEmail.js - FOR REPORTS
import { BaseEmail } from '../BaseEmail.js';

export class ReportEmail extends BaseEmail {
  constructor(data) {
    super(data);
    this.reportType = data.reportType; // 'monthly', 'term', 'annual'
    this.period = data.period; // 'January 2024'
    this.metrics = data.metrics || {};
  }

  getRecipients() {
    // Can be single or multiple recipients
    return Array.isArray(this.data.recipients) 
      ? this.data.recipients 
      : [this.data.recipientEmail];
  }

  getSubject() {
    const reportTitles = {
      'monthly': 'Monthly Performance Report',
      'term': 'Term Examination Report',
      'annual': 'Annual Academic Report'
    };
    
    return `${reportTitles[this.reportType]} - ${this.period}`;
  }

  getHtml() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.getSubject()}</title>
        <style>
          .report-container { max-width: 800px; margin: 0 auto; }
          .header { background: #1e40af; color: white; padding: 25px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
          .metric-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 32px; font-weight: bold; color: #1e40af; }
          .footer { background: #f1f5f9; padding: 20px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>📊 School Performance Report</h1>
            <p>${this.period} • ${this.reportType.toUpperCase()} REPORT</p>
          </div>
          
          <h2>Performance Summary</h2>
          
          <div class="metrics-grid">
            ${Object.entries(this.metrics).map(([key, value]) => `
              <div class="metric-card">
                <div class="metric-label">${this.formatMetricName(key)}</div>
                <div class="metric-value">${value}</div>
              </div>
            `).join('')}
          </div>
          
          <h3>Key Insights</h3>
          <ul>
            ${this.data.insights?.map(insight => `<li>${insight}</li>`).join('') || '<li>No additional insights</li>'}
          </ul>
          
          <div class="footer">
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><small>This is an automated ${this.version} report email</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getText() {
    return `
${this.getSubject()}

PERFORMANCE REPORT FOR ${this.period.toUpperCase()}

${Object.entries(this.metrics).map(([key, value]) => 
  `${this.formatMetricName(key)}: ${value}`
).join('\n')}

Key Insights:
${this.data.insights?.map(insight => `• ${insight}`).join('\n') || 'No additional insights'}

Generated: ${new Date().toLocaleDateString()}
    `.trim();
  }

  formatMetricName(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}