# Email System Guide

## Overview
This document describes the comprehensive email notification system for the Hopeon fundraising platform. The system follows DRY (Don't Repeat Yourself) principles with reusable templates and a centralized mail service.

## Architecture

### Components
1. **mail.config.ts** - Nodemailer transporter configuration
2. **mail.interface.ts** - TypeScript interfaces for email parameters
3. **mail.tempelate.ts** - Reusable HTML email templates
4. **mail.service.ts** - Centralized email sending service

## Email Types

### 1. OTP Emails
Sent when users register or reset their password.

**Triggers:**
- User registration (OTP verification)
- Password reset request

**Template:** `otpTemplate(name, otp, purpose)`

**Usage:**
```typescript
await mailService.sendOTPEmail({
  to: 'user@example.com',
  name: 'John Doe',
  otp: '123456',
  purpose: 'register' // or 'reset'
});
```

### 2. Organizer Application Submitted
Sent immediately after user submits organizer application with documents.

**Triggers:**
- User completes document upload and submits application

**Template:** `organizerApplicationSubmittedTemplate(name, organizationName)`

**Content:**
- Confirmation of application receipt
- Status: "Under Review"
- Expected review timeline (2-3 business days)
- What happens next

**Usage:**
```typescript
await mailService.sendOrganizerApplicationSubmitted({
  to: 'organizer@example.com',
  name: 'Jane Smith',
  organizationName: 'Hope Foundation'
});
```

### 3. Organizer Application Approved
Sent when admin approves an organizer application.

**Triggers:**
- Admin approves pending application
- User role updated to ORGANIZER

**Template:** `organizerApplicationApprovedTemplate(name, organizationName)`

**Content:**
- Congratulations message
- Confirmation of approval
- List of new capabilities (create campaigns, manage donations, etc.)
- Call to action to start creating campaigns

**Usage:**
```typescript
await mailService.sendOrganizerApplicationApproved({
  to: 'organizer@example.com',
  name: 'Jane Smith',
  organizationName: 'Hope Foundation'
});
```

### 4. Organizer Application Rejected
Sent when admin rejects an organizer application.

**Triggers:**
- Admin rejects pending application
- Application is DELETED from database

**Template:** `organizerApplicationRejectedTemplate(name, organizationName, rejectionReason)`

**Content:**
- Polite rejection notification
- Detailed rejection reason
- Information that application was removed from system
- Instructions for reapplying
- Checklist for successful reapplication

**Usage:**
```typescript
await mailService.sendOrganizerApplicationRejected({
  to: 'organizer@example.com',
  name: 'Jane Smith',
  organizationName: 'Hope Foundation',
  rejectionReason: 'Government ID document is not clear. Please provide a high-quality scan.'
});
```

## Email Flow for Organizer Applications

```
User Submits Application (with documents)
    ↓
Email: "Application Submitted - Under Review"
    ↓
Admin Reviews Application
    ↓
    ├─→ APPROVED
    │       ↓
    │   Email: "Application Approved - Welcome!"
    │       ↓
    │   User role → ORGANIZER
    │
    └─→ REJECTED
            ↓
        Email: "Application Rejected - Reason Provided"
            ↓
        Application DELETED from database
            ↓
        User can reapply (no "already exists" error)
```

## Key Features

### 1. DRY Principles
- **Reusable Templates**: All email templates use a shared base style and wrapper
- **Centralized Service**: Single `MailService` class handles all email types
- **Type Safety**: TypeScript interfaces ensure correct parameters

### 2. Error Handling
- Email failures don't block critical operations
- Errors are logged but don't cause transaction rollbacks
- Graceful degradation if email service is unavailable

### 3. Database Consistency
- Rejected applications are DELETED (not just marked as rejected)
- Prevents "already exists" errors on reapplication
- Email sent BEFORE deletion to ensure user notification

### 4. Professional Templates
- Responsive HTML design
- Consistent branding (Hopeon colors and logo)
- Clear call-to-actions
- Mobile-friendly layout

## Configuration

### Environment Variables
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### Gmail Setup
1. Enable 2-factor authentication
2. Generate App Password
3. Use App Password in EMAIL_PASS

## Testing

### Test OTP Email
```typescript
await mailService.sendOTPEmail({
  to: 'test@example.com',
  name: 'Test User',
  otp: '123456',
  purpose: 'register'
});
```

### Test Organizer Emails
```typescript
// Submitted
await mailService.sendOrganizerApplicationSubmitted({
  to: 'test@example.com',
  name: 'Test Organizer',
  organizationName: 'Test Org'
});

// Approved
await mailService.sendOrganizerApplicationApproved({
  to: 'test@example.com',
  name: 'Test Organizer',
  organizationName: 'Test Org'
});

// Rejected
await mailService.sendOrganizerApplicationRejected({
  to: 'test@example.com',
  name: 'Test Organizer',
  organizationName: 'Test Org',
  rejectionReason: 'Documents not clear enough'
});
```

## Best Practices

1. **Always provide rejection reasons**: Minimum 10 characters, be specific and helpful
2. **Handle email failures gracefully**: Log errors but don't block operations
3. **Test email templates**: Send test emails before deploying
4. **Keep templates updated**: Maintain consistent branding and messaging
5. **Monitor email delivery**: Check logs for failed deliveries

## Future Enhancements

- Email templates for campaign updates
- Donation receipt emails
- Withdrawal confirmation emails
- Newsletter functionality
- Email preferences management
