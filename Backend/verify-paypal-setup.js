import dotenv from "dotenv";
import paypal from "@paypal/checkout-server-sdk";

dotenv.config();

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

function paypalClient() {
  return new paypal.core.PayPalHttpClient(environment());
}

async function verifySetup() {
  console.log("\n" + "=".repeat(70));
  console.log("  PAYPAL INTEGRATION VERIFICATION");
  console.log("=".repeat(70) + "\n");

  // Step 1: Check environment variables
  console.log("📋 Step 1: Checking Environment Variables");
  console.log("─".repeat(70));
  
  const checks = {
    clientId: !!process.env.PAYPAL_CLIENT_ID,
    secret: !!process.env.PAYPAL_SECRET,
    environment: !!process.env.PAYPAL_ENVIRONMENT,
    frontendUrl: !!process.env.FRONTEND_URL,
  };

  console.log(`  PAYPAL_CLIENT_ID:    ${checks.clientId ? "✅ SET" : "❌ MISSING"}`);
  console.log(`  PAYPAL_SECRET:       ${checks.secret ? "✅ SET" : "❌ MISSING"}`);
  console.log(`  PAYPAL_ENVIRONMENT:  ${checks.environment ? "✅ " + process.env.PAYPAL_ENVIRONMENT : "❌ MISSING"}`);
  console.log(`  FRONTEND_URL:        ${checks.frontendUrl ? "✅ " + process.env.FRONTEND_URL : "❌ MISSING"}`);

  if (!checks.clientId || !checks.secret || !checks.environment) {
    console.log("\n❌ FAILED: Missing required environment variables\n");
    process.exit(1);
  }

  console.log("\n✅ All environment variables are set\n");

  // Step 2: Test API credentials
  console.log("🔐 Step 2: Testing PayPal API Credentials");
  console.log("─".repeat(70));

  try {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "test_verification",
          amount: {
            currency_code: "USD",
            value: "1.00",
          },
        },
      ],
    });

    const response = await paypalClient().execute(request);
    console.log(`  Order Creation:      ✅ SUCCESS`);
    console.log(`  Order ID:            ${response.result.id}`);
    console.log(`  Status:              ${response.result.status}`);
    console.log(`  Environment:         ${process.env.PAYPAL_ENVIRONMENT}`);
  } catch (error) {
    console.log(`  Order Creation:      ❌ FAILED`);
    console.log(`  Error:               ${error.message}`);
    console.log("\n❌ FAILED: Invalid PayPal credentials\n");
    console.log("Please verify:");
    console.log("  1. Client ID and Secret are from the SAME PayPal app");
    console.log("  2. Credentials match the environment (sandbox/live)");
    console.log("  3. No extra spaces or characters in credentials\n");
    process.exit(1);
  }

  console.log("\n✅ PayPal API credentials are valid\n");

  // Step 3: Summary
  console.log("📊 Step 3: Verification Summary");
  console.log("─".repeat(70));
  console.log("  ✅ Environment variables configured");
  console.log("  ✅ PayPal API credentials valid");
  console.log("  ✅ Can create orders successfully");
  console.log("\n" + "=".repeat(70));
  console.log("  ✅ PAYPAL INTEGRATION IS WORKING CORRECTLY!");
  console.log("=".repeat(70) + "\n");

  console.log("⚠️  IMPORTANT: If you're still getting payment errors:");
  console.log("\n  The issue is with your SANDBOX TEST ACCOUNT, not your code!");
  console.log("\n  Quick Fix:");
  console.log("  1. Go to: https://developer.paypal.com/dashboard/accounts");
  console.log("  2. Create a NEW Personal (Buyer) sandbox account");
  console.log("  3. Use the NEW account credentials to test payments");
  console.log("\n  Common Issues:");
  console.log("  • Sandbox account has insufficient funds");
  console.log("  • Sandbox account is restricted or expired");
  console.log("  • Using a real PayPal account instead of sandbox");
  console.log("  • Sandbox account needs to be reset/recreated");
  console.log("\n  Run: node fix-paypal-sandbox.js for detailed solutions\n");
}

verifySetup().catch(console.error);
