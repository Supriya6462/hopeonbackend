export enum Role {
  DONOR = "donor",
  ORGANIZER = "organizer",
  ADMIN = "admin",
}

export enum PaymentProvider {
  PAYPAL = "paypal",
  CRYPTO = "crypto",
  ESEWA="esewa",
  KHALTI="khalti"
}

export enum DonationStatus {
  CREATED = "created",
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  EXPIRED = "expired",
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
}

export enum OtpPurpose {
  REGISTER = "register",
  FORGOT_PASSWORD = "forgot-password",
}

export enum WithdrawalStatus {
  REQUESTED = "requested",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  PROCESSING = "processing",
  PAID = "paid",
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
  ESEWA="esewa",
  KHALTI="khalti"
}

export enum FundingType {
  FLEXIBLE = "flexible",
  ALL_OR_NOTHING = "all_or_nothing"
}