export interface VerifyPaymentDTO {
  donationId: string;
  providerTransactionId: string;
  provider?: import("../../types/enums").PaymentProvider;
}
