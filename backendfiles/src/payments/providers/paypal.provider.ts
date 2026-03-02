import axios from "axios";
import { InitiatePaymentDTO } from "../dto/initiate-payment.dto";
import { VerifyPaymentDTO } from "../dto/verify-payment.dto";
import { IPaymentProvider, PaymentInitiateResponse, PaymentVerifyResponse } from "../payment.interface";

export class PayPalProvider implements IPaymentProvider {
  private readonly clientId = process.env.PAYPAL_CLIENT_ID;
  private readonly secret = process.env.PAYPAL_SECRET;
  private readonly environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";
  private readonly baseUrl =
    this.environment === "sandbox"
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.secret}`).toString("base64");

    const response = await axios.post(
      `${this.baseUrl}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      }
    );

    return response.data.access_token;
  }

  async initiate(payload: InitiatePaymentDTO): Promise<PaymentInitiateResponse> {
    const accessToken = await this.getAccessToken();

    const response = await axios.post(
      `${this.baseUrl}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: payload.donationId,
            amount: {
              currency_code: (payload.currency || "USD").toUpperCase(),
              value: payload.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: payload.returnUrl,
          cancel_url: payload.returnUrl,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const approveLink = response.data.links.find(
      (link: any) => link.rel === "approve"
    );

    return {
      redirectUrl: approveLink?.href,
      formData: {
        orderId: response.data.id,
      },
    };
  }

  async verify(payload: VerifyPaymentDTO): Promise<PaymentVerifyResponse> {
    try {
      const accessToken = await this.getAccessToken();

      // Capture the payment
      const captureResponse = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${payload.providerTransactionId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const success = captureResponse.data.status === "COMPLETED";

      return {
        success,
        providerTransactionId: payload.providerTransactionId,
        rawResponse: captureResponse.data,
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
