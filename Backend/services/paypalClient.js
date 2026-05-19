import paypal from "@paypal/checkout-server-sdk";

function environment() {
  if (process.env.PAYPAL_ENVIRONMENT === "live") {
    return new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_SECRET
    );
  }

  return new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_SECRET
  );
}

export function paypalClient() {
  return new paypal.core.PayPalHttpClient(environment());
}
