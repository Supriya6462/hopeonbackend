export interface IMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export enum EmailType {
  OTP_REGISTER = "OTP_REGISTER",
  OTP_RESET = "OTP_RESET",
  ORGANIZER_APPLICATION_SUBMITTED = "ORGANIZER_APPLICATION_SUBMITTED",
  ORGANIZER_APPLICATION_APPROVED = "ORGANIZER_APPLICATION_APPROVED",
  ORGANIZER_APPLICATION_REJECTED = "ORGANIZER_APPLICATION_REJECTED",
  WITHDRAWAL_REQUEST_SUBMITTED = "WITHDRAWAL_REQUEST_SUBMITTED",
  WITHDRAWAL_STATUS_UPDATED = "WITHDRAWAL_STATUS_UPDATED",
  DONOR_CAMPAIGN_PAYOUT_UPDATE = "DONOR_CAMPAIGN_PAYOUT_UPDATE",
}

export interface SendOTPEmailParams {
  to: string;
  name: string;
  otp: string;
  purpose: "register" | "reset";
}

export interface SendOrganizerEmailParams {
  to: string;
  name: string;
  organizationName: string;
  rejectionReason?: string;
}

export interface SendWithdrawalRequestEmailParams {
  to: string;
  name: string;
  campaignTitle: string;
  withdrawalRequestId: string;
  amount: number;
  submittedAt?: Date;
}

export interface SendWithdrawalStatusEmailParams {
  to: string;
  name: string;
  campaignTitle: string;
  status: "under_review" | "approved" | "rejected" | "completed";
  amount: number;
  reviewNotes?: string;
  rejectionReason?: string;
  transactionReference?: string;
}

export interface SendDonorCampaignPayoutUpdateEmailParams {
  to: string;
  name: string;
  campaignTitle: string;
  status: "scheduled" | "completed";
  amount: number;
  eventDate?: Date;
  transferReferenceMasked?: string;
}
