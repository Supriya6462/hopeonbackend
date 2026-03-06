import nodemailer from "nodemailer";
import { ApiError } from "./ApiError";
import { OtpPurpose } from "../types/enums";

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;

      if (!user || !pass) {
        throw new ApiError(
          "Email service is not configured",
          500,
          "EMAIL_SERVICE_NOT_CONFIGURED",
        );
      }

      this.transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user,
          pass,
        },
      });
    }
    return this.transporter;
  }

  async sendOTP(email: string, otpCode: string, purpose: OtpPurpose) {
    const transporter = this.getTransporter();

    const subject =
      purpose === OtpPurpose.REGISTER
        ? "Verify Your Email - Hopeon"
        : "Reset Your Password - Hopeon";

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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Hopeon</h1>
            </div>
            <div class="content">
              <h2>Hello! 👋</h2>
              <p>${
                purpose === OtpPurpose.REGISTER
                  ? "Thank you for registering! Please verify your email address."
                  : "We received a request to reset your password."
              }</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code:</p>
                <div class="otp-code">${otpCode}</div>
              </div>

              <p style="color: #666; font-size: 14px;">
                ⚠️ This OTP is valid for 10 minutes. Do not share it with anyone.
              </p>
              
              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>Hopeon Team</strong>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Hopeon. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"Hopeon" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      console.log(
        `✅ OTP email sent to ${email} - Message ID: ${info.messageId}`,
      );
    } catch (err: any) {
      console.error("❌ Failed to send email:", err);
      throw new ApiError(
        "Failed to send OTP email. Please check your email configuration.",
        500,
        "EMAIL_SEND_FAILED",
        { error: err.message, code: err.code },
      );
    }
  }
}

export const emailService = new EmailService();
