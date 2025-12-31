import nodemailer from "nodemailer";

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASS;

    if (!emailUser || !emailPassword) {
      console.warn(
        "⚠️  Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env"
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    console.log("✅ Email service initialized");
  }

  async sendOTP(email: string, otpCode: string, purpose: string): Promise<void> {
    if (!this.transporter) {
      console.log(`📧 OTP for ${email}: ${otpCode} (Email service not configured)`);
      return;
    }

    const subject =
      purpose === "register"
        ? "Verify Your Email"
        : "Reset Your Password";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Hopeon (fundraising platform)</h1>
            </div>
            <div class="content">
              <h2>Hello! 👋</h2>
              <p>${
                purpose === "register"
                  ? "Thank you for registering with us! To complete your registration, please verify your email address."
                  : "We received a request to reset your password. Use the OTP below to proceed."
              }</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code:</p>
                <div class="otp-code">${otpCode}</div>
              </div>

              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 10px 0;">
                  <li>This OTP is valid for <strong>10 minutes</strong></li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>Hopoon team</strong>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} Crowdfunding Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Crowdfunding Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      console.log(`✅ OTP email sent to ${email}`);
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      throw new Error("Failed to send OTP email");
    }
  }
}

export const emailService = new EmailService();
