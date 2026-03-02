import axios from "axios";
import { InitiatePaymentDTO } from "../dto/initiate-payment.dto";
import { IPaymentProvider, PaymentInitiateResponse, PaymentVerifyResponse } from "../payment.interface";
import { VerifyPaymentDTO } from "../dto/verify-payment.dto";

export class KhaltiProvider implements IPaymentProvider {

  async initiate(
    payload: InitiatePaymentDTO
  ): Promise<PaymentInitiateResponse> {

    const response = await axios.post(
      "https://a.khalti.com/api/v2/epayment/initiate/",
      {
        amount: payload.amount * 100,
        return_url: payload.returnUrl,
        purchase_order_id: payload.donationId,
      },
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        },
        timeout: 10000,
      }
    );

    return {
      redirectUrl: response.data.payment_url,
    };
  }

  async verify(
    payload: VerifyPaymentDTO
  ): Promise<PaymentVerifyResponse> {

    const response = await axios.post(
      "https://a.khalti.com/api/v2/epayment/lookup/",
      {
        pidx: payload.providerTransactionId,
      },
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        },
      }
    );

    const success = response.data.status === "Completed";

    return {
      success,
      providerTransactionId: payload.providerTransactionId,
      rawResponse: response.data,
    };
  }
}