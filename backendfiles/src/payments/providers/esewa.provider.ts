import axios from "axios";
import { InitiatePaymentDTO } from "../dto/initiate-payment.dto";
import { VerifyPaymentDTO } from "../dto/verify-payment.dto";
import { IPaymentProvider, PaymentInitiateResponse, PaymentVerifyResponse } from "../payment.interface";

export class EsewaProvider implements IPaymentProvider {
  private readonly merchantId = process.env.ESEWA_MERCHANT_ID || "EPAYTEST";
  private readonly paymentUrl = process.env.ESEWA_PAYMENT_URL || "https://uat.esewa.com.np/epay/main";
  private readonly verifyUrl = process.env.ESEWA_VERIFY_URL || "https://uat.esewa.com.np/epay/transrec";

  async initiate(payload: InitiatePaymentDTO): Promise<PaymentInitiateResponse> {
    // eSewa uses form submission, not redirect URL
    const formData = {
      amount: payload.amount,
      tax_amount: 0,
      total_amount: payload.amount,
      transaction_uuid: payload.donationId,
      product_code: this.merchantId,
      product_service_charge: 0,
      product_delivery_charge: 0,
      success_url: payload.returnUrl,
      failure_url: payload.returnUrl,
    };

    return {
      redirectUrl: this.paymentUrl,
      formData,
    };
  }

  async verify(payload: VerifyPaymentDTO): Promise<PaymentVerifyResponse> {
    try {
      const response = await axios.get(
        `${this.verifyUrl}?product_code=${this.merchantId}&transaction_uuid=${payload.providerTransactionId}`
      );

      const success = response.data.status === "COMPLETE";

      return {
        success,
        providerTransactionId: payload.providerTransactionId,
        rawResponse: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        providerTransactionId: payload.providerTransactionId,
        rawResponse: error.response?.data || error.message,
      };
    }
  }
}