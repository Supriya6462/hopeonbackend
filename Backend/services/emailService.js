import nodemailer from "nodemailer";

/**
 * Email Service for Organizer Application Notifications
 * Handles all email communications related to organizer applications
 */

let transporter;

function isEmailAuthFailure(error) {
  return (
    error?.message?.includes("Invalid login") ||
    error?.responseCode === 535
  );
}

function getTransporter() {
  if (!transporter) {
    // Create transporter on first use so runtime env values are available.
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return transporter;
}

/**
 * Send email notification when application is submitted
 * @param {Object} user - User object with email and name
 * @param {Object} application - Application object with details
 */
export const sendApplicationSubmittedEmail = async (user, application) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "✅ Organizer Application Received - Under Review",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .timeline { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .timeline-item { display: flex; align-items: center; margin: 10px 0; }
          .timeline-icon { width: 30px; height: 30px; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎉 Application Received!</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
            
            <p>Thank you for submitting your organizer application! We're excited about your interest in creating positive change through our platform.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #667eea;">📋 Application Details</h3>
              <p><strong>Organization:</strong> ${application.organizationName}</p>
              <p><strong>Type:</strong> ${application.organizationType}</p>
              <p><strong>Submitted:</strong> ${new Date(
                application.createdAt,
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</p>
              <p><strong>Application ID:</strong> ${application._id}</p>
            </div>

            <div class="timeline">
              <h3 style="margin-top: 0; color: #667eea;">⏱️ What Happens Next?</h3>
              <div class="timeline-item">
                <div class="timeline-icon">1</div>
                <div>
                  <strong>Document Review</strong><br>
                  <span style="color: #6b7280;">Our team will verify your submitted documents</span>
                </div>
              </div>
              <div class="timeline-item">
                <div class="timeline-icon">2</div>
                <div>
                  <strong>Background Check</strong><br>
                  <span style="color: #6b7280;">We'll review your organization details and mission</span>
                </div>
              </div>
              <div class="timeline-item">
                <div class="timeline-icon">3</div>
                <div>
                  <strong>Decision</strong><br>
                  <span style="color: #6b7280;">You'll receive an email with our decision within 2-3 business days</span>
                </div>
              </div>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>⚡ Expected Review Time:</strong> 2-3 business days</p>
            </div>

            <p style="margin-top: 30px;">If you have any questions or need to provide additional information, please don't hesitate to contact our support team.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}" class="button">Visit Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Fundraising Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`✅ Application submitted email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Error sending application submitted email:", error);
    throw error;
  }
};

/**
 * Send email notification when application is approved
 * @param {Object} user - User object with email and name
 * @param {Object} application - Application object with details
 */
export const sendApplicationApprovedEmail = async (user, application) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "🎉 Congratulations! Your Organizer Application Has Been Approved",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .feature-item { background: white; padding: 15px; border-radius: 5px; text-align: center; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">🎉 Welcome Aboard!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Your Application Has Been Approved</p>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
            
            <div class="success-box">
              <h2 style="margin-top: 0; color: #059669;">✅ Congratulations!</h2>
              <p style="margin: 0; font-size: 16px;">We're thrilled to inform you that your organizer application for <strong>${application.organizationName}</strong> has been approved! You can now start creating campaigns and making a difference.</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #10b981;">🚀 What You Can Do Now</h3>
              <div class="feature-grid">
                <div class="feature-item">
                  <div style="font-size: 32px; margin-bottom: 10px;">📝</div>
                  <strong>Create Campaigns</strong>
                  <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">Launch fundraising campaigns for your cause</p>
                </div>
                <div class="feature-item">
                  <div style="font-size: 32px; margin-bottom: 10px;">💰</div>
                  <strong>Receive Donations</strong>
                  <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">Accept contributions from supporters</p>
                </div>
                <div class="feature-item">
                  <div style="font-size: 32px; margin-bottom: 10px;">📊</div>
                  <strong>Track Progress</strong>
                  <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">Monitor your campaign performance</p>
                </div>
                <div class="feature-item">
                  <div style="font-size: 32px; margin-bottom: 10px;">🤝</div>
                  <strong>Engage Donors</strong>
                  <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">Build relationships with your community</p>
                </div>
              </div>
            </div>

            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #1e40af;">📚 Getting Started Tips</h4>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Create a compelling campaign story with clear goals</li>
                <li>Add high-quality images and videos to your campaigns</li>
                <li>Share your campaigns on social media to reach more supporters</li>
                <li>Keep your donors updated with regular progress reports</li>
                <li>Respond promptly to donor questions and comments</li>
              </ul>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #10b981;">📋 Application Details</h3>
              <p><strong>Organization:</strong> ${application.organizationName}</p>
              <p><strong>Type:</strong> ${application.organizationType}</p>
              <p><strong>Approved On:</strong> ${new Date(
                application.reviewedAt,
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/create-campaign" class="button">Create Your First Campaign</a>
            </div>

            <p style="margin-top: 30px; text-align: center; color: #6b7280;">We're excited to see the positive impact you'll create! If you need any assistance, our support team is here to help.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Fundraising Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`✅ Application approved email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Error sending application approved email:", error);
    throw error;
  }
};

/**
 * Send email notification when application is rejected
 * @param {Object} user - User object with email and name
 * @param {Object} application - Application object with details
 * @param {String} rejectionReason - Reason for rejection
 */
export const sendApplicationRejectedEmail = async (
  user,
  application,
  rejectionReason,
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Application Update - Additional Information Required",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Application Status Update</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
            
            <p>Thank you for your interest in becoming an organizer on our platform. After careful review of your application for <strong>${application.organizationName}</strong>, we regret to inform you that we are unable to approve it at this time.</p>

            <div class="warning-box">
              <h3 style="margin-top: 0; color: #dc2626;">📋 Reason for Decision</h3>
              <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${rejectionReason || "Your application did not meet our current requirements."}</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #3b82f6;">🔄 What You Can Do</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Review the feedback:</strong> Carefully read the reason provided above</li>
                <li><strong>Address the concerns:</strong> Take time to improve your application based on our feedback</li>
                <li><strong>Reapply:</strong> You're welcome to submit a new application once you've addressed the issues</li>
                <li><strong>Contact support:</strong> If you have questions, reach out to our team for clarification</li>
              </ul>
            </div>

            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>💡 Tip:</strong> Many successful organizers were initially rejected but improved their applications and were later approved. Don't give up on your mission!</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #6b7280;">📋 Application Details</h3>
              <p><strong>Organization:</strong> ${application.organizationName}</p>
              <p><strong>Type:</strong> ${application.organizationType}</p>
              <p><strong>Reviewed On:</strong> ${new Date(
                application.reviewedAt,
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/apply-organizer" class="button">Submit New Application</a>
            </div>

            <p style="margin-top: 30px; text-align: center; color: #6b7280;">We appreciate your understanding and encourage you to reapply when you're ready. Our support team is available if you need guidance.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Fundraising Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`✅ Application rejected email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Error sending application rejected email:", error);
    throw error;
  }
};

/**
 * Send email notification when organizer role is revoked
 * @param {Object} user - User object with email and name
 * @param {Object} application - Application object with details
 * @param {String} revokeReason - Reason for revocation
 */
export const sendOrganizerRevokedEmail = async (
  user,
  application,
  revokeReason,
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "⚠️ Important: Your Organizer Status Has Been Revoked",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">⚠️ Account Status Update</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
            
            <p>We are writing to inform you that your organizer privileges for <strong>${application.organizationName}</strong> have been revoked, and your account has been reverted to donor status.</p>

            <div class="alert-box">
              <h3 style="margin-top: 0; color: #d97706;">📋 Reason for Revocation</h3>
              <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${revokeReason || "Your organizer status was revoked due to policy violations or account review."}</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #ef4444;">🚫 What This Means</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>You can no longer create new fundraising campaigns</li>
                <li>Your existing campaigns may be affected or removed</li>
                <li>You cannot receive donations as an organizer</li>
                <li>Your account remains active as a donor</li>
              </ul>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #3b82f6;">🔄 Next Steps</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Review the reason:</strong> Understand why your status was revoked</li>
                <li><strong>Contact support:</strong> If you believe this was a mistake, reach out to our team</li>
                <li><strong>Appeal process:</strong> You may be able to appeal this decision</li>
                <li><strong>Continue as donor:</strong> You can still support campaigns as a donor</li>
              </ul>
            </div>

            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>⚠️ Important:</strong> If you have any pending campaigns or donations, please contact our support team immediately to discuss the next steps.</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #6b7280;">📋 Revocation Details</h3>
              <p><strong>Organization:</strong> ${application.organizationName}</p>
              <p><strong>Revoked On:</strong> ${new Date(
                application.reviewedAt,
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/contact-support" class="button">Contact Support</a>
            </div>

            <p style="margin-top: 30px; text-align: center; color: #6b7280;">We take these decisions seriously and only revoke organizer status when necessary. If you have questions or concerns, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Fundraising Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`✅ Organizer revoked email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Error sending organizer revoked email:", error);
    throw error;
  }
};

/**
 * Send email notification for withdrawal request status updates
 * @param {String} email - Organizer email
 * @param {String} name - Organizer name
 * @param {Object} withdrawalInfo - Withdrawal details
 */
export const sendWithdrawalStatusEmail = async (
  email,
  name,
  withdrawalInfo,
) => {
  const {
    status,
    amount,
    campaignTitle,
    reviewNotes,
    rejectionReason,
    transactionReference,
  } = withdrawalInfo;

  let subject, headerColor, headerText, statusIcon, contentHtml;

  switch (status) {
    case "under_review":
      subject = "📋 Withdrawal Request Under Review";
      headerColor = "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
      headerText = "Under Review";
      statusIcon = "🔍";
      contentHtml = `
        <p>Your withdrawal request is currently being reviewed by our team.</p>
        <div class="info-box">
          <h3 style="margin-top: 0; color: #3b82f6;">📋 Request Details</h3>
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Campaign:</strong> ${campaignTitle}</p>
          <p><strong>Status:</strong> Under Review</p>
        </div>
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>⏱️ Expected Review Time:</strong> 2-5 business days</p>
        </div>
        <p>We're verifying your documents and bank details. You'll receive another email once the review is complete.</p>
      `;
      break;

    case "approved":
      subject = "✅ Withdrawal Request Approved";
      headerColor = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
      headerText = "Approved!";
      statusIcon = "✅";
      contentHtml = `
        <div class="success-box">
          <h2 style="margin-top: 0; color: #059669;">✅ Great News!</h2>
          <p style="margin: 0; font-size: 16px;">Your withdrawal request has been approved and will be processed shortly.</p>
        </div>
        <div class="info-box">
          <h3 style="margin-top: 0; color: #10b981;">💰 Withdrawal Details</h3>
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Campaign:</strong> ${campaignTitle}</p>
          <p><strong>Status:</strong> Approved</p>
          ${reviewNotes ? `<p><strong>Admin Notes:</strong> ${reviewNotes}</p>` : ""}
        </div>
        <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>⏱️ Processing Time:</strong> Funds will be transferred to your bank account within 3-7 business days.</p>
        </div>
        <p>You'll receive a confirmation email with transaction reference once the transfer is completed.</p>
      `;
      break;

    case "rejected":
      subject = "❌ Withdrawal Request Rejected";
      headerColor = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
      headerText = "Request Rejected";
      statusIcon = "❌";
      contentHtml = `
        <p>We regret to inform you that your withdrawal request could not be approved at this time.</p>
        <div class="warning-box">
          <h3 style="margin-top: 0; color: #dc2626;">📋 Reason for Rejection</h3>
          <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${rejectionReason || "Your request did not meet our verification requirements."}</p>
        </div>
        <div class="info-box">
          <h3 style="margin-top: 0; color: #ef4444;">📋 Request Details</h3>
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Campaign:</strong> ${campaignTitle}</p>
          <p><strong>Status:</strong> Rejected</p>
          ${reviewNotes ? `<p><strong>Admin Notes:</strong> ${reviewNotes}</p>` : ""}
        </div>
        <div class="info-box">
          <h3 style="margin-top: 0; color: #3b82f6;">🔄 What You Can Do</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Review the rejection reason carefully</li>
            <li>Update your documents or bank information if needed</li>
            <li>Submit a new withdrawal request once issues are resolved</li>
            <li>Contact support if you need clarification</li>
          </ul>
        </div>
      `;
      break;

    case "completed":
      subject = "🎉 Withdrawal Completed - Funds Transferred";
      headerColor = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
      headerText = "Transfer Completed!";
      statusIcon = "🎉";
      contentHtml = `
        <div class="success-box">
          <h2 style="margin-top: 0; color: #059669;">🎉 Success!</h2>
          <p style="margin: 0; font-size: 16px;">Your withdrawal has been completed and funds have been transferred to your bank account.</p>
        </div>
        
        <!-- Receipt Card -->
        <div style="background: white; border: 2px solid #10b981; padding: 25px; border-radius: 10px; margin: 25px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; color: #059669; text-align: center; border-bottom: 2px solid #d1fae5; padding-bottom: 15px;">📄 Payment Receipt</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">Transaction Reference</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold; color: #1f2937;">${transactionReference || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">Amount Transferred</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold; color: #10b981; font-size: 18px;">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">Campaign</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #1f2937;">${campaignTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">Status</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #10b981; font-weight: bold;">✓ Completed</td>
            </tr>
          </table>
          
          ${reviewNotes ? `<div style="background: #f9fafb; padding: 12px; border-radius: 5px; margin-top: 15px;"><p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>Admin Notes:</strong> ${reviewNotes}</p></div>` : ""}
        </div>
        
        <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>💡 Note:</strong> It may take 1-2 business days for the funds to appear in your bank account depending on your bank's processing time.</p>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>⚠️ Important:</strong> Please save this email as your payment receipt. Keep the transaction reference for your records.</p>
        </div>
        
        <p style="text-align: center; margin-top: 25px; color: #6b7280; font-size: 14px;">Thank you for using our platform to make a positive impact!</p>
      `;
      break;

    default:
      return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .warning-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">${statusIcon} ${headerText}</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
            ${contentHtml}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/my-campaigns" class="button">View My Campaigns</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Fundraising Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`✅ Withdrawal status email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending withdrawal status email:", error);
    throw error;
  }
};

export const sendDonorCampaignPayoutUpdateEmail = async (
  email,
  name,
  payoutInfo,
) => {
  const { campaignTitle, status, amount, eventDate, transferReferenceMasked } =
    payoutInfo;

  if (!email || !campaignTitle || !status) {
    return;
  }

  const isCompleted = status === "completed";
  const subject = isCompleted
    ? "Campaign Update: Funds Paid Out"
    : "Campaign Update: Fund Transfer Scheduled";

  const statusLabel = isCompleted ? "Paid Out" : "Scheduled";
  const headerColor = isCompleted
    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
    : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Campaign Fund Update</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${name || "Supporter"}</strong>,</p>
            <p>Thank you for supporting <strong>${campaignTitle}</strong>. Here is your latest transparency update:</p>
            <div class="info-box">
              <p><strong>Status:</strong> ${statusLabel}</p>
              <p><strong>Amount:</strong> $${Number(amount || 0).toFixed(2)}</p>
              <p><strong>Date:</strong> ${new Date(
                eventDate || Date.now(),
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
              ${transferReferenceMasked ? `<p><strong>Transfer Reference:</strong> ${transferReferenceMasked}</p>` : ""}
            </div>
            <p>For privacy and security, sensitive bank account details are never shared publicly.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/my-donations" class="button">View My Donations</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Fundraising Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`✅ Donor payout update email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending donor payout update email:", error);
    throw error;
  }
};

// Test email configuration
export const testEmailConnection = async () => {
  try {
    await getTransporter().verify();
    console.log("✅ Email service is ready to send messages");
    return true;
  } catch (error) {
    console.error("❌ Email service configuration error:", error);
    return false;
  }
};

export const sendOtpEmail = async ({ to, subject, html }) => {
  try {
    const info = await getTransporter().sendMail({
      to,
      from: process.env.EMAIL_USER,
      subject,
      html,
    });

    return { ok: true, info };
  } catch (error) {
    if (isEmailAuthFailure(error)) {
      return {
        ok: false,
        code: "EMAIL_AUTH_FAILED",
        message:
          "Email delivery is temporarily unavailable. SMTP credentials are invalid. Please contact support.",
        error,
      };
    }

    return {
      ok: false,
      code: "EMAIL_SERVICE_UNAVAILABLE",
      message: "Email delivery is temporarily unavailable. Please try again later.",
      error,
    };
  }
};

/**
 * Send email notification when withdrawal request is submitted
 * @param {Object} organizer - Organizer user object
 * @param {Object} campaign - Campaign object
 * @param {Object} withdrawalRequest - Withdrawal request object
 */
export const sendWithdrawalRequestEmail = async (
  organizer,
  campaign,
  withdrawalRequest,
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: organizer.email,
    subject: "✅ Withdrawal Request Submitted - Under Review",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">💰 Withdrawal Request Received</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${organizer.name}</strong>,</p>
            
            <p>Your withdrawal request has been successfully submitted and is now under review by our admin team.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #10b981;">📋 Request Details</h3>
              <p><strong>Campaign:</strong> ${campaign.title}</p>
              <p><strong>Request ID:</strong> ${withdrawalRequest._id}</p>
              <p><strong>Status:</strong> <span style="color: #f59e0b;">Pending Review</span></p>
              <p><strong>Submitted:</strong> ${new Date(withdrawalRequest.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div class="amount">
              $${withdrawalRequest.amount.toFixed(2)}
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #10b981;">⏱️ What Happens Next?</h3>
              <p><strong>1. Document Verification (1-2 business days)</strong><br/>
              Our team will verify your submitted documents including bank details and KYC information.</p>
              
              <p><strong>2. Admin Review (2-3 business days)</strong><br/>
              The admin team will review your withdrawal request and ensure all requirements are met.</p>
              
              <p><strong>3. Payment Processing (3-5 business days)</strong><br/>
              Once approved, the funds will be transferred to your provided bank account.</p>
            </div>
            
            <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
              <h3 style="margin-top: 0; color: #d97706;">⚠️ Important Notes</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Ensure your bank details are accurate to avoid delays</li>
                <li>Processing time may vary based on your bank and location</li>
                <li>You'll receive email updates on your request status</li>
                <li>Contact support if you have any questions</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px;">We'll notify you via email once your request has been reviewed.</p>
            
            <p>Thank you for using our platform!</p>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} Fundraising Platform. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    console.log(`✅ Withdrawal request email sent to ${organizer.email}`);
  } catch (error) {
    console.error("❌ Error sending withdrawal request email:", error);
    throw error;
  }
};
