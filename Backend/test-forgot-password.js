/**
 * Test script to verify forgot password email functionality
 * Run with: node test-forgot-password.js
 */

import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

console.log("\n🔍 Testing Forgot Password Email Configuration\n");
console.log("=" .repeat(60));

// Check environment variables
console.log("\n1. Checking Environment Variables:");
console.log("   EMAIL_USER:", process.env.EMAIL_USER ? "✅ Set" : "❌ Not set");
console.log("   EMAIL_PASS:", process.env.EMAIL_PASS ? "✅ Set" : "❌ Not set");
console.log("   FRONTEND_URL:", process.env.FRONTEND_URL ? "✅ Set" : "❌ Not set");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log("\n❌ ERROR: Email credentials not configured!");
  console.log("\nTo fix:");
  console.log("1. Go to https://myaccount.google.com/apppasswords");
  console.log("2. Generate an App Password for 'Mail'");
  console.log("3. Add to .env file:");
  console.log("   EMAIL_USER=your_email@gmail.com");
  console.log("   EMAIL_PASS=your_16_character_app_password");
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test connection
console.log("\n2. Testing Email Server Connection:");
try {
  await transporter.verify();
  console.log("   ✅ Email server connection successful!");
} catch (error) {
  console.log("   ❌ Email server connection failed!");
  console.log("   Error:", error.message);
  console.log("\n   Common issues:");
  console.log("   - Wrong email or password");
  console.log("   - App Password not generated (use https://myaccount.google.com/apppasswords)");
  console.log("   - 2-Step Verification not enabled on Google account");
  process.exit(1);
}

// Test sending email
console.log("\n3. Sending Test Email:");
const testEmail = process.env.EMAIL_USER; // Send to self for testing

try {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=TEST_TOKEN_123`;
  
  const info = await transporter.sendMail({
    to: testEmail, // This should be the USER'S email in production
    from: process.env.EMAIL_USER,
    subject: "🧪 Test: Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #4F46E5; border-radius: 10px;">
        <h2 style="color: #4F46E5;">🧪 Test Email - Password Reset</h2>
        <p>This is a <strong>TEST EMAIL</strong> to verify your email configuration is working correctly.</p>
        
        <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li><strong>From:</strong> ${process.env.EMAIL_USER}</li>
            <li><strong>To:</strong> ${testEmail}</li>
            <li><strong>Frontend URL:</strong> ${process.env.FRONTEND_URL || "Not set"}</li>
          </ul>
        </div>
        
        <p>In production, this email would be sent to the <strong>registered user's email address</strong>, not the sender.</p>
        
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Test Reset Link</a>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          ✅ If you received this email, your configuration is working correctly!
        </p>
      </div>
    `,
  });

  console.log("   ✅ Test email sent successfully!");
  console.log("   Message ID:", info.messageId);
  console.log("   To:", testEmail);
  console.log("\n   📧 Check your inbox at:", testEmail);
  
} catch (error) {
  console.log("   ❌ Failed to send test email!");
  console.log("   Error:", error.message);
  process.exit(1);
}

console.log("\n" + "=".repeat(60));
console.log("\n✅ All tests passed! Email configuration is working.\n");
console.log("📝 Important Notes:");
console.log("   1. In production, emails are sent to the USER'S registered email");
console.log("   2. The 'from' field is always your EMAIL_USER (sender)");
console.log("   3. The 'to' field is the recipient (user's email from database)");
console.log("   4. Make sure FRONTEND_URL is set correctly for reset links");
console.log("\n");
