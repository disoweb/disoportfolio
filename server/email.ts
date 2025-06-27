import { auditLog } from "./security";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Simple email service implementation
// In production, you would integrate with services like SendGrid, Mailgun, or AWS SES
export class EmailService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For development/demo purposes, we'll log the email instead of sending
      // In production, replace this with actual email service integration
      console.log('📧 Email would be sent:');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`HTML Content: ${options.html}`);
      
      auditLog('email_sent', undefined, { 
        to: options.to.substring(0, 5) + '***',
        subject: options.subject 
      });
      
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      auditLog('email_failed', undefined, { 
        error: (error as Error).message,
        to: options.to.substring(0, 5) + '***'
      });
      return false;
    }
  }

  generatePasswordResetEmail(resetUrl: string, firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - DiSO Webs</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { background-color: #f1f5f9; padding: 20px 30px; text-align: center; color: #64748b; font-size: 14px; }
          .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DiSO Webs</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${firstName || 'there'},</p>
            <p>We received a request to reset your password for your DiSO Webs account. If you didn't make this request, you can safely ignore this email.</p>
            <p>To reset your password, click the button below:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
            <p>If you continue to have problems, please contact our support team.</p>
            <p>Best regards,<br>The DiSO Webs Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} DiSO Webs. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = EmailService.getInstance();