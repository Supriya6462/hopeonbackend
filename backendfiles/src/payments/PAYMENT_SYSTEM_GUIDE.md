# 💳 Payment System - Complete Guide

## 📚 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Payment Flow](#payment-flow)
3. [File Structure](#file-structure)
4. [Provider Implementations](#provider-implementations)
5. [API Endpoints](#api-endpoints)
6. [Integration Guide](#integration-guide)
7. [Testing](#testing)

---

## 🏗️ Architecture Overview

Your payment system uses the **Strategy Pattern** (also called Factory Pattern) to handle multiple payment providers. This design allows you to:

- ✅ Add new payment providers easily
- ✅ Switch between providers without changing core logic
- ✅ Maintain consistent interface across all providers
- ✅ Test each provider independently

### Key Components:

```
┌─────────────────────────────────────────────────────────┐
│                    Payment Service                       │
│  (Orchestrates payment operations)                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Payment Factory                        │
│  (Creates appropriate provider instance)                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              IPaymentProvider Interface                  │
│  (Contract all providers must follow)                   │
└─────┬──────────┬──────────┬──────────┬─────────────────┘
      │          │          │          │
      ▼          ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ eSewa   │ │ Khalti │ │ PayPal │ │ Crypto │
│Provider │ │Provider│ │Provider│ │Provider│
└─────────┘ └────────┘ └────────┘ └────────┘
```

---

## 🔄 Payment Flow

### Complete Donation Flow:

```
1. USER INITIATES DONATION
   ↓
2. Frontend calls: POST /api/donations
   - Creates donation record with status: PENDING
   - Returns donationId
   ↓
3. Frontend calls: POST /api/payments/initiate
   - Sends: provider, amount, donationId, returnUrl
   - Returns: redirectUrl or formData
   ↓
4. USER COMPLETES PAYMENT
   - Redirected to payment provider
   - Completes payment on provider's site
   - Redirected back to returnUrl with transaction details
   ↓
5. Frontend calls: POST /api/payments/verify
   - Sends: provider, providerTransactionId, donationId
   - Verifies payment with provider
   - Returns: success status
   ↓
6. Frontend calls: PATCH /api/donations/:id/status
   - Updates donation status to COMPLETED
   - Updates campaign raised amount
```

### Sequence Diagram:

```
Frontend          Backend          Payment Provider
   │                 │                     │
   │─────(1)────────>│                     │
   │  Create Donation│                     │
   │<────────────────│                     │
   │  donationId     │                     │
   │                 │                     │
   │─────(2)────────>│                     │
   │ Initiate Payment│                     │
   │                 │─────(3)────────────>│
   │                 │  Create Order       │
   │                 │<────────────────────│
   │<────────────────│  Payment URL        │
   │  redirectUrl    │                     │
   │                 │                     │
   │─────────────────────────(4)─────────>│
   │              User Pays                │
   │<──────────────────────────────────────│
   │         Redirect with txId            │
   │                 │                     │
   │─────(5)────────>│                     │
   │ Verify Payment  │                     │
   │                 │─────(6)────────────>│
   │                 │  Verify Transaction │
   │                 │<────────────────────│
   │<────────────────│  Confirmation       │
   │  success: true  │                     │
   │                 │                     │
   │─────(7)────────>│                     │
   │ Update Status   │                     │
   │<────────────────│                     │
   │  Updated        │                     │
```

---

## 📁 File Structure

```
src/payments/
├── dto/
│   ├── initiate-payment.dto.ts    # Input for payment initiation
│   └── verify-payment.dto.ts      # Input for payment verification
├── providers/
│   ├── esewa.provider.ts          # eSewa implementation
│   ├── khalti.provider.ts         # Khalti implementation
│   ├── paypal.provider.ts         # PayPal implementation
│   └── crypto.provider.ts         # Cryptocurrency implementation
├── payment.interface.ts           # Contract for all providers
├── payment.factory.ts             # Creates provider instances
├── payment.service.ts             # Main payment orchestrator
└── payment.routes.ts              # API endpoints
```

### File Responsibilities:

#### 1. **payment.interface.ts**
Defines the contract that all payment providers must implement:
- `initiate()` - Start a payment
- `verify()` - Confirm a payment

#### 2. **payment.factory.ts**
Creates the appropriate provider instance based on the payment method:
```typescript
PaymentFactory.create(PaymentProvider.KHALTI) // Returns KhaltiProvider
```

#### 3. **payment.service.ts**
Orchestrates payment operations:
- Uses factory to get provider
- Calls provider methods
- Handles errors

#### 4. **payment.routes.ts**
Exposes HTTP endpoints:
- `POST /api/payments/initiate`
- `POST /api/payments/verify`

---

## 🔌 Provider Implementations

### 1. eSewa Provider

**How it works:**
- Uses form submission (not API redirect)
- Returns form data that frontend submits
- Verification via GET request

**Initiate:**
```typescript
{
  redirectUrl: "https://uat.esewa.com.np/epay/main",
  formData: {
    amount: 100,
    total_amount: 100,
    transaction_uuid: "donation_123",
    product_code: "EPAYTEST",
    success_url: "http://yoursite.com/success",
    failure_url: "http://yoursite.com/failure"
  }
}
```

**Frontend Integration:**
```javascript
// Create a form and submit it
const form = document.createElement('form');
form.method = 'POST';
form.action = response.redirectUrl;

Object.keys(response.formData).forEach(key => {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = key;
  input.value = response.formData[key];
  form.appendChild(input);
});

document.body.appendChild(form);
form.submit();
```

---

### 2. Khalti Provider

**How it works:**
- API-based payment initiation
- Returns payment URL
- Verification via POST request

**Initiate:**
```typescript
{
  redirectUrl: "https://pay.khalti.com/xyz123"
}
```

**Frontend Integration:**
```javascript
// Simply redirect
window.location.href = response.redirectUrl;
```

**Important:**
- Amount must be in paisa (multiply by 100)
- Uses `pidx` as transaction identifier

---

### 3. PayPal Provider

**How it works:**
- OAuth 2.0 authentication
- Creates order, then captures payment
- Two-step process: approve → capture

**Initiate:**
```typescript
{
  redirectUrl: "https://www.sandbox.paypal.com/checkoutnow?token=xyz",
  formData: {
    orderId: "ORDER_ID_123"
  }
}
```

**Verify:**
- Captures the approved order
- Returns capture details

**Important:**
- Requires client ID and secret
- Sandbox vs Production environment
- Amount must be formatted to 2 decimals

---

### 4. Crypto Provider

**How it works:**
- Returns wallet addresses
- User sends crypto manually
- Verification requires blockchain API integration

**Initiate:**
```typescript
{
  formData: {
    walletAddresses: {
      ethereum: "0x...",
      polygon: "0x...",
      bsc: "0x..."
    },
    amount: 100,
    instructions: "Send exact amount to wallet"
  }
}
```

**Verify:**
- Currently simplified
- TODO: Integrate with Etherscan/Polygonscan APIs
- Should verify transaction hash on blockchain

**Production Requirements:**
- Integrate Etherscan API for Ethereum
- Integrate Polygonscan API for Polygon
- Integrate BSCScan API for BSC
- Verify transaction amount and recipient

---

## 🌐 API Endpoints

### 1. Initiate Payment

**Endpoint:** `POST /api/payments/initiate`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider": "khalti",
  "amount": 1000,
  "currency": "NPR",
  "donationId": "donation_123",
  "returnUrl": "http://localhost:5173/payment-success"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "redirectUrl": "https://pay.khalti.com/xyz",
    "formData": {}
  }
}
```

---

### 2. Verify Payment

**Endpoint:** `POST /api/payments/verify`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider": "khalti",
  "providerTransactionId": "pidx_xyz123",
  "donationId": "donation_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "providerTransactionId": "pidx_xyz123",
    "rawResponse": {
      "status": "Completed",
      "amount": 100000
    }
  }
}
```

---

## 🔗 Integration Guide

### Step-by-Step Frontend Integration:

#### Step 1: Create Donation
```javascript
const createDonation = async (campaignId, amount, method) => {
  const response = await fetch('/api/donations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      campaign: campaignId,
      amount: amount,
      method: method,
      donorEmail: userEmail
    })
  });
  
  const data = await response.json();
  return data.data._id; // donationId
};
```

#### Step 2: Initiate Payment
```javascript
const initiatePayment = async (provider, amount, donationId) => {
  const response = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      provider: provider,
      amount: amount,
      currency: 'NPR',
      donationId: donationId,
      returnUrl: `${window.location.origin}/payment-callback`
    })
  });
  
  const data = await response.json();
  return data.data;
};
```

#### Step 3: Handle Redirect
```javascript
const handlePayment = async (paymentData) => {
  if (paymentData.formData && Object.keys(paymentData.formData).length > 0) {
    // eSewa: Submit form
    submitForm(paymentData.redirectUrl, paymentData.formData);
  } else {
    // Khalti/PayPal: Direct redirect
    window.location.href = paymentData.redirectUrl;
  }
};
```

#### Step 4: Handle Callback
```javascript
// On payment-callback page
const handleCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  
  // Extract transaction ID based on provider
  let txId;
  if (params.has('pidx')) {
    txId = params.get('pidx'); // Khalti
  } else if (params.has('token')) {
    txId = params.get('token'); // PayPal
  } else if (params.has('oid')) {
    txId = params.get('oid'); // eSewa
  }
  
  // Verify payment
  const verifyResponse = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      provider: provider,
      providerTransactionId: txId,
      donationId: donationId
    })
  });
  
  const verifyData = await verifyResponse.json();
  
  if (verifyData.data.success) {
    // Update donation status
    await updateDonationStatus(donationId, 'COMPLETED', {
      transactionId: txId
    });
    
    // Show success message
    showSuccess('Payment successful!');
  } else {
    showError('Payment verification failed');
  }
};
```

---

## 🧪 Testing

### Testing with Postman/Thunder Client:

#### 1. Test Khalti Initiation
```bash
POST http://localhost:3001/api/payments/initiate
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "provider": "khalti",
  "amount": 1000,
  "currency": "NPR",
  "donationId": "test_donation_123",
  "returnUrl": "http://localhost:5173/callback"
}
```

#### 2. Test eSewa Initiation
```bash
POST http://localhost:3001/api/payments/initiate
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "provider": "esewa",
  "amount": 100,
  "currency": "NPR",
  "donationId": "test_donation_456",
  "returnUrl": "http://localhost:5173/callback"
}
```

### Testing Credentials:

**Khalti Sandbox:**
- Test OTP: `987654`
- Test MPIN: `1111`

**eSewa UAT:**
- Test ID: `9806800001`
- Test Password: `Nepal@123`
- Test MPIN: `1234`

**PayPal Sandbox:**
- Create test accounts at: https://developer.paypal.com/dashboard/accounts

---

## 🚀 Adding New Payment Provider

To add a new provider (e.g., Stripe):

### 1. Create Provider File
```typescript
// providers/stripe.provider.ts
import { IPaymentProvider } from "../payment.interface";

export class StripeProvider implements IPaymentProvider {
  async initiate(payload: InitiatePaymentDTO) {
    // Implementation
  }
  
  async verify(payload: VerifyPaymentDTO) {
    // Implementation
  }
}
```

### 2. Add to Enum
```typescript
// types/enums.ts
export enum PaymentProvider {
  // ... existing
  STRIPE = "stripe"
}
```

### 3. Update Factory
```typescript
// payment.factory.ts
case PaymentProvider.STRIPE:
  return new StripeProvider();
```

### 4. Add Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

That's it! The new provider is now integrated.

---

## 🔒 Security Best Practices

1. **Never expose secrets in frontend**
   - Keep API keys in backend only
   - Use environment variables

2. **Validate all inputs**
   - Check amount > 0
   - Validate provider enum
   - Verify donationId exists

3. **Use HTTPS in production**
   - All payment redirects must use HTTPS
   - Secure callback URLs

4. **Implement webhook handlers**
   - Don't rely only on frontend callbacks
   - Verify webhook signatures

5. **Log all transactions**
   - Keep audit trail
   - Monitor for suspicious activity

---

## 📝 Common Issues & Solutions

### Issue 1: "Unsupported payment provider"
**Solution:** Check that provider value matches enum exactly (case-sensitive)

### Issue 2: Khalti "Invalid amount"
**Solution:** Amount must be in paisa (multiply by 100)

### Issue 3: eSewa form not submitting
**Solution:** Ensure all required fields are present in formData

### Issue 4: PayPal "Authentication failed"
**Solution:** Verify client ID and secret are correct for environment

### Issue 5: Crypto verification always fails
**Solution:** Implement blockchain API integration (currently TODO)

---

## 📞 Support

For payment provider specific issues:
- **Khalti:** https://docs.khalti.com
- **eSewa:** https://developer.esewa.com.np
- **PayPal:** https://developer.paypal.com

---

**Last Updated:** February 2026
**Version:** 1.0.0
