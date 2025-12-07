export enum Role {
  DONOR = "donor",
  ORGANIZER = "organizer",
  ADMIN = "admin",
}

export enum DonationMethod {
  PAYPAL = "paypal",
  CRYPTO = "crypto",
}

export enum DonationStatus {
  COMPLETED = "COMPLETED",
  PENDING = "PENDING",
  FAILED = "FAILED",
}

export enum CryptoNetwork {
  ETHEREUM = "ethereum",
  POLYGON = "polygon",
  BSC = "bsc",
}

export enum ApplicationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum OtpPurpose {
  REGISTER = "register",
  FORGOT_PASSWORD = "forget-password",
}

export enum WithdrawalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid",
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
}