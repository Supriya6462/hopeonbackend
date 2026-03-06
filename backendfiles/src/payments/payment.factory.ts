import { PaymentProvider } from "../types/enums";
import { IPaymentProvider } from "./payment.interface";
import { EsewaProvider } from "./providers/esewa.provider";
import { KhaltiProvider } from "./providers/khalti.provider";
import { PayPalProvider } from "./providers/paypal.provider";
import { CryptoProvider } from "./providers/crypto.provider";
import { ApiError } from "../utils/ApiError";

export class PaymentFactory {
  static create(provider: PaymentProvider): IPaymentProvider {
    switch (provider) {
      case PaymentProvider.ESEWA:
        return new EsewaProvider();

      case PaymentProvider.KHALTI:
        return new KhaltiProvider();

      case PaymentProvider.PAYPAL:
        return new PayPalProvider();

      case PaymentProvider.CRYPTO:
        return new CryptoProvider();

      default:
        throw new ApiError(
          `Unsupported payment provider: ${provider}`,
          400,
          "UNSUPPORTED_PAYMENT_PROVIDER",
        );
    }
  }
}
