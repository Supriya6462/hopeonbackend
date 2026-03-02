import { InitiatePaymentDTO } from "./dto/initiate-payment.dto";
import { VerifyPaymentDTO } from "./dto/verify-payment.dto";

export interface PaymentInitiateResponse {
    redirectUrl?: string;
    formData?: Record<string, any>;
}

export interface PaymentVerifyResponse {
  success: boolean;
  providerTransactionId: string;
  rawResponse: any;
}

export interface IPaymentProvider {
    initiate(
        payload: InitiatePaymentDTO
    ): Promise<PaymentInitiateResponse>;
    
    verify(
        payload: VerifyPaymentDTO
    ): Promise<PaymentVerifyResponse>;
}