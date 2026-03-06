export interface IMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export enum EmailType {
  OTP_REGISTER = 'OTP_REGISTER',
  OTP_RESET = 'OTP_RESET',
  ORGANIZER_APPLICATION_SUBMITTED = 'ORGANIZER_APPLICATION_SUBMITTED',
  ORGANIZER_APPLICATION_APPROVED = 'ORGANIZER_APPLICATION_APPROVED',
  ORGANIZER_APPLICATION_REJECTED = 'ORGANIZER_APPLICATION_REJECTED',
}

export interface SendOTPEmailParams {
  to: string;
  name: string;
  otp: string;
  purpose: 'register' | 'reset';
}

export interface SendOrganizerEmailParams {
  to: string;
  name: string;
  organizationName: string;
  rejectionReason?: string;
}