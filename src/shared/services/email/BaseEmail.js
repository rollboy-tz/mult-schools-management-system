// shared/services/email/BaseEmail.js - BASE CLASS FOR ALL EMAILS
export class BaseEmail {
  constructor(data = {}) {
    this.data = data;
    this.version = data.version || 'v1';
  }

  // MUST BE IMPLEMENTED BY SUBCLASSES
  getRecipients() {
    throw new Error('getRecipients() must be implemented');
  }

  getSubject() {
    throw new Error('getSubject() must be implemented');
  }

  getHtml() {
    throw new Error('getHtml() must be implemented');
  }

  getText() {
    throw new Error('getText() must be implemented');
  }

  getCategory() {
    return this.constructor.name;
  }

  getTags() {
    return [
      { name: 'category', value: this.getCategory() },
      { name: 'version', value: this.version },
      { name: 'service', value: 'school-system' }
    ];
  }

  // TEMPLATE HELPERS
  getTemplate(templateName, version = this.version) {
    // Load template based on version
    const templates = {
      'v1': this.getV1Template(templateName),
      'v2': this.getV2Template(templateName)
    };
    
    return templates[version] || templates.v1;
  }

  bindData(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return result;
  }
}