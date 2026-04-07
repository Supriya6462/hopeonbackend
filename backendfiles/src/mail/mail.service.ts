import { mailTransporter } from "../config/mail.config";
import {
  IMailOptions,
  SendOTPEmailParams,
  SendOrganizerEmailParams,
  SendWithdrawalRequestEmailParams,
  SendWithdrawalStatusEmailParams,
  SendDonorCampaignPayoutUpdateEmailParams,
} from "./mail.interface";
import {
  otpTemplate,
  organizerApplicationSubmittedTemplate,
  organizerApplicationApprovedTemplate,
  organizerApplicationRejectedTemplate,
  withdrawalRequestSubmittedTemplate,
  withdrawalStatusTemplate,
  donorCampaignPayoutUpdateTemplate,
} from "./mail.tempelate";
import { ApiError } from "../utils/ApiError";

export class MailService {
  private async sendMail(options: IMailOptions): Promise<void> {
    try {
      const info = await mailTransporter.sendMail({
        from: `"Hopeon" <${process.env.EMAIL_USER || process.env.EMAIL_FROM}>`,
        ...options,
      });
      console.log(
        `✅ Email sent to ${options.to} - Message ID: ${info.messageId}`,
      );
    } catch (error: any) {
      console.error("❌ Mail sending failed:", error);
      throw new ApiError(
        "Email could not be sent. Please check your email configuration.",
        500,
        "EMAIL_SEND_FAILED",
        { error: error.message, code: error.code },
      );
    }
  }

  async sendOTPEmail(params: SendOTPEmailParams): Promise<void> {
    const { to, name, otp, purpose } = params;

    const subject =
      purpose === "register"
        ? "Verify Your Email - Hopeon"
        : "Reset Your Password - Hopeon";

    const html = otpTemplate(name, otp, purpose);

    await this.sendMail({ to, subject, html });
  }

  async sendOrganizerApplicationSubmitted(
    params: SendOrganizerEmailParams,
  ): Promise<void> {
    const { to, name, organizationName } = params;

    const subject = "Organizer Application Received - Under Review";
    const html = organizerApplicationSubmittedTemplate(name, organizationName);

    await this.sendMail({ to, subject, html });
  }

  async sendOrganizerApplicationApproved(
    params: SendOrganizerEmailParams,
  ): Promise<void> {
    const { to, name, organizationName } = params;

    const subject = "🎉 Organizer Application Approved - Welcome to Hopeon!";
    const html = organizerApplicationApprovedTemplate(name, organizationName);

    await this.sendMail({ to, subject, html });
  }

  async sendOrganizerApplicationRejected(
    params: SendOrganizerEmailParams,
  ): Promise<void> {
    const { to, name, organizationName, rejectionReason } = params;

    if (!rejectionReason) {
      throw new ApiError(
        "Rejection reason is required",
        400,
        "REJECTION_REASON_REQUIRED",
      );
    }

    const subject = "Organizer Application Update - Hopeon";
    const html = organizerApplicationRejectedTemplate(
      name,
      organizationName,
      rejectionReason,
    );

    await this.sendMail({ to, subject, html });
  }

  async sendWithdrawalRequestEmail(
    params: SendWithdrawalRequestEmailParams,
  ): Promise<void> {
    const {
      to,
      name,
      campaignTitle,
      withdrawalRequestId,
      amount,
      submittedAt,
    } = params;

    const subject = "Withdrawal Request Submitted - Under Review";
    const html = withdrawalRequestSubmittedTemplate(
      name,
      campaignTitle,
      withdrawalRequestId,
      amount,
      submittedAt,
    );

    await this.sendMail({ to, subject, html });
  }

  async sendWithdrawalStatusEmail(
    params: SendWithdrawalStatusEmailParams,
  ): Promise<void> {
    const {
      to,
      name,
      campaignTitle,
      status,
      amount,
      reviewNotes,
      rejectionReason,
      transactionReference,
    } = params;

    const subjectByStatus: Record<string, string> = {
      under_review: "Withdrawal Request Under Review",
      approved: "Withdrawal Request Approved",
      rejected: "Withdrawal Request Rejected",
      completed: "Withdrawal Completed",
    };

    const subject = subjectByStatus[status] || "Withdrawal Status Update";
    const html = withdrawalStatusTemplate({
      name,
      campaignTitle,
      status,
      amount,
      reviewNotes,
      rejectionReason,
      transactionReference,
    });

    await this.sendMail({ to, subject, html });
  }

  async sendDonorCampaignPayoutUpdateEmail(
    params: SendDonorCampaignPayoutUpdateEmailParams,
  ): Promise<void> {
    const {
      to,
      name,
      campaignTitle,
      status,
      amount,
      eventDate,
      transferReferenceMasked,
    } = params;

    const subject =
      status === "completed"
        ? "Campaign Update: Funds Paid Out"
        : "Campaign Update: Fund Transfer Scheduled";

    const html = donorCampaignPayoutUpdateTemplate({
      name,
      campaignTitle,
      status,
      amount,
      eventDate,
      transferReferenceMasked,
    });

    await this.sendMail({ to, subject, html });
  }
}

export const mailService = new MailService();
