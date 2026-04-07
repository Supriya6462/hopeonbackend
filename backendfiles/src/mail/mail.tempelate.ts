const baseStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
  .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; padding: 20px; }
  .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
  .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; }
  .error-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px; }
  .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
  .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
`;

const emailWrapper = (content: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 Hopeon</h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Fundraising Platform</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} Hopeon. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
`;

export const otpTemplate = (
  name: string,
  otp: string,
  purpose: "register" | "reset",
) => {
  const content = `
    <h2>Hello ${name}! 👋</h2>
    <p>${
      purpose === "register"
        ? "Thank you for registering with Hopeon! To complete your registration, please verify your email address."
        : "We received a request to reset your password. Use the OTP below to proceed."
    }</p>
    
    <div class="otp-box">
      <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code:</p>
      <div class="otp-code">${otp}</div>
    </div>

    <div class="warning-box">
      <strong>⚠️ Important:</strong>
      <ul style="margin: 10px 0;">
        <li>This OTP is valid for <strong>10 minutes</strong></li>
        <li>Do not share this code with anyone</li>
        <li>If you didn't request this, please ignore this email</li>
      </ul>
    </div>
    
    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>Hopeon Team</strong>
    </p>
  `;
  return emailWrapper(content);
};

export const organizerApplicationSubmittedTemplate = (
  name: string,
  organizationName: string,
) => {
  const content = `
    <h2>Hello ${name}! 👋</h2>
    <p>Thank you for submitting your organizer application for <strong>${organizationName}</strong>.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">📋 Application Status: Under Review</h3>
      <p>Your application is currently being reviewed by our team. This process typically takes 2-3 business days.</p>
    </div>

    <p><strong>What happens next?</strong></p>
    <ul>
      <li>Our team will carefully review your submitted documents and information</li>
      <li>We'll verify your identity and organization details</li>
      <li>You'll receive an email notification once the review is complete</li>
    </ul>

    <div class="warning-box">
      <strong>⏳ Please be patient</strong><br>
      We review each application thoroughly to ensure the safety and integrity of our platform.
    </div>
    
    <p style="margin-top: 30px;">
      If you have any questions, feel free to contact our support team.<br><br>
      Best regards,<br>
      <strong>Hopeon Team</strong>
    </p>
  `;
  return emailWrapper(content);
};

export const organizerApplicationApprovedTemplate = (
  name: string,
  organizationName: string,
) => {
  const content = `
    <h2>Congratulations ${name}! 🎉</h2>
    <p>We're excited to inform you that your organizer application for <strong>${organizationName}</strong> has been approved!</p>
    
    <div class="success-box">
      <h3 style="margin-top: 0;">✅ Application Approved</h3>
      <p>You can now create and manage fundraising campaigns on Hopeon.</p>
    </div>

    <p><strong>What you can do now:</strong></p>
    <ul>
      <li>Create fundraising campaigns for your organization</li>
      <li>Manage donations and track progress</li>
      <li>Withdraw funds to your registered account</li>
      <li>Access organizer dashboard and analytics</li>
    </ul>

    <div class="info-box">
      <strong>🚀 Ready to get started?</strong><br>
      Log in to your account and navigate to the organizer dashboard to create your first campaign.
    </div>
    
    <p style="margin-top: 30px;">
      Thank you for choosing Hopeon to make a difference!<br><br>
      Best regards,<br>
      <strong>Hopeon Team</strong>
    </p>
  `;
  return emailWrapper(content);
};

export const organizerApplicationRejectedTemplate = (
  name: string,
  organizationName: string,
  rejectionReason: string,
) => {
  const content = `
    <h2>Hello ${name},</h2>
    <p>Thank you for your interest in becoming an organizer on Hopeon. After careful review, we regret to inform you that your application for <strong>${organizationName}</strong> has not been approved at this time.</p>
    
    <div class="error-box">
      <h3 style="margin-top: 0;">❌ Application Not Approved</h3>
      <p><strong>Reason:</strong></p>
      <p>${rejectionReason}</p>
    </div>

    <div class="info-box">
      <h3 style="margin-top: 0;">🔄 You Can Reapply</h3>
      <p>Your application has been removed from our system, which means you can submit a new application after addressing the issues mentioned above.</p>
      
      <p><strong>Before reapplying, please ensure:</strong></p>
      <ul>
        <li>All required documents are clear and valid</li>
        <li>Information provided is accurate and complete</li>
        <li>Documents meet our verification standards</li>
        <li>Organization details are properly documented</li>
      </ul>
    </div>

    <p>If you have any questions about the rejection or need clarification, please don't hesitate to contact our support team.</p>
    
    <p style="margin-top: 30px;">
      We appreciate your understanding.<br><br>
      Best regards,<br>
      <strong>Hopeon Team</strong>
    </p>
  `;
  return emailWrapper(content);
};

const formatMoney = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

export const withdrawalRequestSubmittedTemplate = (
  name: string,
  campaignTitle: string,
  withdrawalRequestId: string,
  amount: number,
  submittedAt?: Date,
) => {
  const content = `
    <h2>Hello ${name}! </h2>
    <p>Your withdrawal request has been received and is pending review.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Request Details</h3>
      <p><strong>Campaign:</strong> ${campaignTitle}</p>
      <p><strong>Request ID:</strong> ${withdrawalRequestId}</p>
      <p><strong>Amount:</strong> ${formatMoney(amount)}</p>
      <p><strong>Status:</strong> Pending Review</p>
      <p><strong>Submitted:</strong> ${new Date(submittedAt || Date.now()).toLocaleString()}</p>
    </div>

    <div class="warning-box">
      <strong>Expected timeline</strong><br>
      Review usually completes within 2-5 business days.
    </div>

    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>Hopeon Team</strong>
    </p>
  `;

  return emailWrapper(content);
};

export const withdrawalStatusTemplate = ({
  name,
  campaignTitle,
  status,
  amount,
  reviewNotes,
  rejectionReason,
  transactionReference,
}: {
  name: string;
  campaignTitle: string;
  status: "under_review" | "approved" | "rejected" | "completed";
  amount: number;
  reviewNotes?: string;
  rejectionReason?: string;
  transactionReference?: string;
}) => {
  let statusTitle = "Withdrawal Status Update";
  let statusBox = "info-box";
  let details = "";

  if (status === "under_review") {
    statusTitle = "Withdrawal Under Review";
    details = `<p>Your request is currently under review by our admin team.</p>`;
  }

  if (status === "approved") {
    statusTitle = "Withdrawal Approved";
    statusBox = "success-box";
    details = `<p>Your withdrawal request was approved and is now scheduled for payout.</p>`;
  }

  if (status === "rejected") {
    statusTitle = "Withdrawal Rejected";
    statusBox = "error-box";
    details = `<p>Your withdrawal request was rejected.</p>
      ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ""}`;
  }

  if (status === "completed") {
    statusTitle = "Withdrawal Completed";
    statusBox = "success-box";
    details = `<p>Your withdrawal has been processed successfully.</p>
      ${transactionReference ? `<p><strong>Transaction Reference:</strong> ${transactionReference}</p>` : ""}`;
  }

  const content = `
    <h2>Hello ${name}!</h2>

    <div class="${statusBox}">
      <h3 style="margin-top: 0;">${statusTitle}</h3>
      ${details}
    </div>

    <div class="info-box">
      <p><strong>Campaign:</strong> ${campaignTitle}</p>
      <p><strong>Amount:</strong> ${formatMoney(amount)}</p>
      <p><strong>Status:</strong> ${status.replace("_", " ")}</p>
      ${reviewNotes ? `<p><strong>Admin Notes:</strong> ${reviewNotes}</p>` : ""}
    </div>

    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>Hopeon Team</strong>
    </p>
  `;

  return emailWrapper(content);
};

export const donorCampaignPayoutUpdateTemplate = ({
  name,
  campaignTitle,
  status,
  amount,
  eventDate,
  transferReferenceMasked,
}: {
  name: string;
  campaignTitle: string;
  status: "scheduled" | "completed";
  amount: number;
  eventDate?: Date;
  transferReferenceMasked?: string;
}) => {
  const isCompleted = status === "completed";

  const content = `
    <h2>Hello ${name || "Supporter"}!</h2>
    <p>Thank you for supporting <strong>${campaignTitle}</strong>. Here is your latest transparency update.</p>

    <div class="${isCompleted ? "success-box" : "info-box"}">
      <h3 style="margin-top: 0;">Campaign Fund Update</h3>
      <p><strong>Status:</strong> ${isCompleted ? "Paid Out" : "Scheduled"}</p>
      <p><strong>Amount:</strong> ${formatMoney(amount)}</p>
      <p><strong>Date:</strong> ${new Date(eventDate || Date.now()).toLocaleDateString()}</p>
      ${transferReferenceMasked ? `<p><strong>Transfer Reference:</strong> ${transferReferenceMasked}</p>` : ""}
    </div>

    <p>Sensitive bank details are never shared publicly for privacy and security.</p>

    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>Hopeon Team</strong>
    </p>
  `;

  return emailWrapper(content);
};
