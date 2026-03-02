export interface InitiatePaymentDTO {
  donationId: string;
  amount: number;
  currency?: string;
  returnUrl: string;
}