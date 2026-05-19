# Email Notification System for Organizer Applications

## Overview

This email notification system provides automated email communications for organizer application lifecycle events. It's built with scalability, maintainability, and professional user experience in mind.

## Features

### 📧 Email Types

1. **Application Submitted** - Sent when organizer uploads documents and submits application
2. **Application Approved** - Sent when admin approves the application
3. **Application Rejected** - Sent when admin rejects the application with reason
4. **Organizer Revoked** - Sent when admin revokes organizer privileges

### ✨ Key Features

- **Professional HTML Templates** - Beautiful, responsive email designs
- **Detailed Information** - Includes application details, timelines, and next steps
- **Error Handling** - Graceful fallback if email sending fails
- **Logging** - Console logs for debugging and monitoring
- **Customizable** - Easy to modify templates and add new email types

## Architecture

### File Structure

```
Backend/
├── services/
│   ├── emailService.js          # Main email service with all functions
│   └── EMAIL_NOTIFICATIONS_README.md  # This documentation
└── Routes/
    └── organizer.js             # Integrated email notifications
```

### Email Service Functions

#### `sendApplicationSubmittedEmail(user, application)`
Sends confirmation email when user submits their application with documents.

**Parameters:**
- `user` - User object with `email` and `name`
- `application` - Application object with organization details

**Email Content:**
- Confirmation of submission
- Application details
- Timeline of review process
- Expected review time (2-3 business days)

---

#### `sendApplicationApprovedEmail(user, application)`
Sends congratulatory email when admin approves the application.

**Parameters:**
- `user` - User object with `email` and `name`
- `application` - Application object with organization details

**Email Content:**
- Congratulations message
- New capabilities as organizer
- Getting started tips
- Call-to-action to create first campaign

---

#### `sendApplicationRejectedEmail(user, application, rejectionReason)`
Sends notification email when admin rejects the application.

**Parameters:**
- `user` - User object with `email` and `name`
- `application` - Application object with organization details
- `rejectionReason` - String explaining why application was rejected

**Email Content:**
- Rejection notification
- Detailed reason for rejection
- Steps to improve and reapply
- Encouragement to try again

---

#### `sendOrganizerRevokedEmail(user, application, revokeReason)`
Sends notification email when admin revokes organizer privileges.

**Parameters:**
- `user` - User object with `email` and `name`
- `application` - Application object with organization details
- `revokeReason` - String explaining why privileges were revoked

**Email Content:**
- Revocation notification
- Reason for revocation
- Impact on account and campaigns
- Contact support information

---

#### `testEmailConnection()`
Tests the email service configuration.

**Returns:** `Promise<boolean>` - True if connection successful

## Configuration

### Environment Variables

Required in `.env` file:

```env
# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL for links in emails
FRONTEND_URL=http://localhost:5173
```

### Gmail Setup

1. Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
2. Generate an App Password for "Mail"
3. Use the 16-character password in `EMAIL_PASS`

## Integration Points

### 1. Document Upload (Application Submission)
**File:** `Backend/Routes/organizer.js`
**Endpoint:** `POST /api/organizer/upload-documents/:applicationId`

```javascript
// After documents are uploaded and status changed to "pending"
const updatedApplication = await OrganizerApplication.findByIdAndUpdate(
  applicationId,
  { $set: documents },
  { new: true }
).populate("user", "name email");

// Send email notification
await sendApplicationSubmittedEmail(updatedApplication.user, updatedApplication);
```

### 2. Application Approval
**File:** `Backend/Routes/organizer.js`
**Endpoint:** `PATCH /api/admin/applications/:id/approve`

```javascript
// After application is approved and user role updated
await sendApplicationApprovedEmail(userToApprove, application);
```

### 3. Application Rejection
**File:** `Backend/Routes/organizer.js`
**Endpoint:** `PATCH /api/admin/applications/:id/reject`

```javascript
// After application is rejected
const userToNotify = await User.findById(application.user);
await sendApplicationRejectedEmail(
  userToNotify,
  application,
  application.rejectionReason
);
```

### 4. Organizer Revocation
**File:** `Backend/Routes/organizer.js`
**Endpoint:** `PATCH /api/admin/applications/:id/revoke`

```javascript
// After organizer privileges are revoked
await sendOrganizerRevokedEmail(
  userToRevoke,
  application,
  application.rejectionReason
);
```

## Error Handling

All email functions are wrapped in try-catch blocks to prevent email failures from breaking the application flow:

```javascript
try {
  await sendApplicationApprovedEmail(userToApprove, application);
} catch (emailError) {
  console.error("Failed to send approval email:", emailError);
  // Application continues normally even if email fails
}
```

## Email Template Structure

All emails follow a consistent structure:

1. **Header** - Gradient background with title
2. **Greeting** - Personalized with user's name
3. **Main Content** - Key information and details
4. **Info Boxes** - Highlighted sections for important information
5. **Call-to-Action** - Button linking to relevant page
6. **Footer** - Standard disclaimer and copyright

### Styling Features

- Responsive design
- Gradient headers
- Color-coded by email type:
  - 🟣 Purple - Application Submitted
  - 🟢 Green - Approved
  - 🔴 Red - Rejected
  - 🟠 Orange - Revoked
- Professional typography
- Clear visual hierarchy

## Testing

### Test Email Configuration

```javascript
import { testEmailConnection } from './services/emailService.js';

// Test on server startup
testEmailConnection().then(success => {
  if (success) {
    console.log('✅ Email service ready');
  } else {
    console.log('❌ Email service not configured');
  }
});
```

### Manual Testing

1. Submit an organizer application
2. Check email inbox for submission confirmation
3. Approve/reject application from admin panel
4. Verify corresponding email is received

## Monitoring & Logging

All email functions log their status:

```
✅ Application submitted email sent to user@example.com
✅ Application approved email sent to user@example.com
❌ Error sending application rejected email: [error details]
```

Monitor these logs to track email delivery and troubleshoot issues.

## Customization

### Adding New Email Types

1. Create new function in `emailService.js`:

```javascript
export const sendNewEmailType = async (user, data) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Your Subject",
    html: `<!-- Your HTML template -->`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};
```

2. Import and use in routes:

```javascript
import { sendNewEmailType } from "../services/emailService.js";

// In your route handler
await sendNewEmailType(user, data);
```

### Modifying Email Templates

1. Locate the email function in `emailService.js`
2. Edit the HTML in the `html` property
3. Test with real email to verify rendering
4. Consider mobile responsiveness

### Changing Email Provider

To use a different email service (SendGrid, Mailgun, etc.):

1. Install the provider's SDK
2. Update the transporter configuration
3. Adjust authentication method
4. Update environment variables

## Best Practices

1. **Always populate user data** - Ensure user object has `name` and `email`
2. **Don't block requests** - Wrap email calls in try-catch
3. **Log everything** - Track successes and failures
4. **Test thoroughly** - Verify emails in different clients
5. **Keep templates updated** - Match current UI/UX
6. **Monitor delivery** - Check logs regularly
7. **Handle bounces** - Implement bounce handling for production

## Security Considerations

1. **Never expose credentials** - Use environment variables
2. **Validate email addresses** - Ensure valid format before sending
3. **Rate limiting** - Prevent email spam/abuse
4. **Sanitize content** - Escape user-generated content in emails
5. **Use app passwords** - Never use main account password

## Future Enhancements

### Potential Improvements

1. **Email Queue** - Use Bull or RabbitMQ for reliable delivery
2. **Email Templates Engine** - Use Handlebars or EJS for better template management
3. **Tracking** - Add open/click tracking
4. **Localization** - Support multiple languages
5. **Attachments** - Add PDF receipts or documents
6. **Scheduled Emails** - Reminder emails for pending applications
7. **Email Preferences** - Let users control notification settings
8. **Rich Analytics** - Track email performance metrics

### Scalability Considerations

For high-volume applications:

1. Use dedicated email service (SendGrid, AWS SES)
2. Implement email queue system
3. Add retry logic for failed sends
4. Monitor delivery rates and bounces
5. Implement email throttling

## Troubleshooting

### Common Issues

**Email not sending:**
- Check `EMAIL_USER` and `EMAIL_PASS` in `.env`
- Verify Gmail app password is correct
- Check if "Less secure app access" is enabled (if not using app password)
- Review console logs for error messages

**Email goes to spam:**
- Add SPF and DKIM records to domain
- Use professional email service for production
- Avoid spam trigger words
- Include unsubscribe link

**Template not rendering:**
- Test HTML in email testing tool
- Check for unclosed tags
- Verify CSS is inline (not external)
- Test in multiple email clients

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify environment variables are set
3. Test email configuration with `testEmailConnection()`
4. Review this documentation
5. Contact development team

## Changelog

### Version 1.0.0 (Current)
- Initial implementation
- Four email types (submitted, approved, rejected, revoked)
- Professional HTML templates
- Error handling and logging
- Integration with organizer routes

---

**Last Updated:** January 2026
**Maintained By:** Development Team
