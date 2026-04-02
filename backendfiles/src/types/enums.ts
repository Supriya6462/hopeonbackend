export enum Role {
  DONOR = "donor",
  ORGANIZER = "organizer",
  ADMIN = "admin",
}

export enum PaymentProvider {
  PAYPAL = "paypal",
  CRYPTO = "crypto",
  ESEWA = "esewa",
  KHALTI = "khalti",
}

export enum DonationStatus {
  CREATED = "CREATED",
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  EXPIRED = "EXPIRED",
}

export enum CryptoNetwork {
  ETHEREUM = "ethereum",
  POLYGON = "polygon",
  BSC = "bsc",
}

export enum ApplicationStatus {
  DRAFT = "draft",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  REVOKED = "revoked",
}

export enum OtpPurpose {
  REGISTER = "register",
  FORGOT_PASSWORD = "forgot-password",
  FORGET_PASSWORD = "forget-password",
}

export enum WithdrawalStatus {
  REQUESTED = "pending",
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  PROCESSING = "under_review",
  PAID = "completed",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum OrganizationType {
  NONPROFIT = "nonprofit",
  CHARITY = "charity",
  INDIVIDUAL = "individual",
  BUSINESS = "business",
  OTHER = "other",
}

export enum PayoutMethod {
  BANK = "bank",
  PAYPAL = "paypal",
  CRYPTO = "crypto",
  ESEWA = "esewa",
  KHALTI = "khalti",
}

export enum FundingType {
  FLEXIBLE = "flexible",
  ALL_OR_NOTHING = "all_or_nothing",
}
