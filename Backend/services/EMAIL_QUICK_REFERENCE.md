# 📧 Email Service Quick Reference

## Import Statement

```javascript
import {
  sendApplicationSubmittedEmail,
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendOrganizerRevokedEmail,
  testEmailConnection
} from '../services/emailService.js';
```

## Function Signatures

### 1. Application Submitted
```javascript
await sendApplicationSubmittedEmail(user, application);
```
**Parameters:**
- `user` - Object with `{ email, name }`
- `application` - OrganizerApplication document

**When to use:** After documents uploaded and status changed to "pending"

---

### 2. Application Approved
```javascript
await sendApplicationApprovedEmail(user, application);
```
**Parameters:**
- `user` - Object with `{ email, name }`
- `application` - OrganizerApplication document

**When to use:** After admin approves application

---

### 3. Application Rejected
```javascript
await sendApplicationRejectedEmail(user, application, rejectionReason);
```
**Parameters:**
- `user` - Object with `{ email, name }`
- `application` - OrganizerApplication document
- `rejectionReason` - String explaining rejection

**When to use:** After admin rejects application

---

### 4. Organizer Revoked
```javascript
await sendOrganizerRevokedEmail(user, application, revokeReason);
```
**Parameters:**
- `user` - Object with `{ email, name }`
- `application` - OrganizerApplication document
- `revokeReason` - String explaining revocation

**When to use:** After admin revokes organizer privileges

---

### 5. Test Connection
```javascript
const isReady = await testEmailConnection();
```
**Returns:** `boolean` - true if email service is configured correctly

**When to use:** On server startup or for debugging

## Usage Examples

### Example 1: Send Submission Email
```javascript
// After uploading documents
const updatedApplication = await OrganizerApplication.findByIdAndUpdate(
  applicationId,
  { $set: { status: "pending" } },
  { new: true }
).populate("user", "name email");

try {
  await sendApplicationSubmittedEmail(
    updatedApplication.user,
    updatedApplication
  );
} catch (emailError) {
  console.error("Failed to send email:", emailError);
  // Continue - don't fail the request
}
```

### Example 2: Send Approval Email
```javascript
// After approving application
application.status = "approved";
await application.save();

const user = await User.findById(application.user);
user.role = "organizer";
await user.save();

try {
  await sendApplicationApprovedEmail(user, application);
} catch (emailError) {
  console.error("Failed to send email:", emailError);
}
```

### Example 3: Send Rejection Email
```javascript
// After rejecting application
application.status = "rejected";
application.rejectionReason = req.body.rejectionReason;
await application.save();

const user = await User.findById(application.user);

try {
  await sendApplicationRejectedEmail(
    user,
    application,
    application.rejectionReason
  );
} catch (emailError) {
  console.error("Failed to send email:", emailError);
}
```

### Example 4: Test on Server Startup
```javascript
// In server.js
import { testEmailConnection } from './services/emailService.js';

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  const emailReady = await testEmailConnection();
  if (emailReady) {
    console.log('✅ Email service ready');
  } else {
    console.log('⚠️  Email service not configured');
  }
});
```

## Error Handling Pattern

**Always wrap email calls in try-catch:**

```javascript
try {
  await sendApplicationApprovedEmail(user, application);
} catch (emailError) {
  console.error("Failed to send approval email:", emailError);
  // Don't throw - let the request succeed even if email fails
}
```

**Why?** Email failures shouldn't break core functionality.

## Environment Variables Required

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:5173
```

## Email Themes

| Email Type | Color | Icon | Purpose |
|------------|-------|------|---------|
| Submitted | 🟣 Purple | 🎉 | Confirmation |
| Approved | 🟢 Green | ✅ | Celebration |
| Rejected | 🔴 Red | ❌ | Explanation |
| Revoked | 🟠 Orange | ⚠️ | Warning |

## Common Patterns

### Pattern 1: Update Status + Send Email
```javascript
// 1. Update database
application.status = "approved";
await application.save();

// 2. Get user data
const user = await User.findById(application.user);

// 3. Send email (with error handling)
try {
  await sendApplicationApprovedEmail(user, application);
} catch (error) {
  console.error("Email failed:", error);
}

// 4. Return response
return res.json({ message: "Application approved" });
```

### Pattern 2: Populate User Before Email
```javascript
// Populate user in query
const application = await OrganizerApplication
  .findById(id)
  .populate("user", "name email");

// Send email directly
await sendApplicationSubmittedEmail(
  application.user,
  application
);
```

### Pattern 3: Fetch User Separately
```javascript
// Get application
const application = await OrganizerApplication.findById(id);

// Get user separately
const user = await User.findById(application.user);

// Send email
await sendApplicationRejectedEmail(
  user,
  application,
  rejectionReason
);
```

## Debugging Checklist

**Email not sending?**

1. ✅ Check `EMAIL_USER` is set in `.env`
2. ✅ Check `EMAIL_PASS` is set in `.env`
3. ✅ Verify user object has `email` and `name`
4. ✅ Check console for error messages
5. ✅ Run `testEmailConnection()`
6. ✅ Verify Gmail app password is correct

**Email going to spam?**

1. ✅ Use professional email service in production
2. ✅ Add SPF/DKIM records
3. ✅ Include unsubscribe link
4. ✅ Avoid spam trigger words

## Console Log Messages

**Success:**
```
✅ Application submitted email sent to user@example.com
✅ Application approved email sent to user@example.com
✅ Application rejected email sent to user@example.com
✅ Organizer revoked email sent to user@example.com
✅ Email service is ready to send messages
```

**Failure:**
```
❌ Error sending application submitted email: [details]
❌ Email service configuration error: [details]
```

## Testing Commands

```bash
# Test email configuration
cd Backend
node test-email.js

# Start server and watch logs
npm run dev

# Check for email success/failure messages in console
```

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid login" | Check Gmail app password |
| "Connection timeout" | Check internet/firewall |
| "User undefined" | Populate user before sending |
| "Email undefined" | Ensure user has email field |
| Email to spam | Use production email service |

## Production Checklist

Before deploying to production:

- [ ] Switch to professional email service (SendGrid/AWS SES)
- [ ] Add email queue system (Bull/RabbitMQ)
- [ ] Implement retry logic
- [ ] Add email tracking/analytics
- [ ] Set up bounce handling
- [ ] Add unsubscribe functionality
- [ ] Configure SPF/DKIM records
- [ ] Test all email types
- [ ] Monitor delivery rates
- [ ] Set up alerts for failures

## File Locations

```
Backend/
├── services/
│   ├── emailService.js                    # Main service
│   ├── EMAIL_NOTIFICATIONS_README.md      # Full docs
│   └── EMAIL_QUICK_REFERENCE.md          # This file
├── Routes/
│   └── organizer.js                       # Integration
└── test-email.js                          # Test script
```

## Support

**Documentation:**
- Full docs: `Backend/services/EMAIL_NOTIFICATIONS_README.md`
- Setup guide: `ORGANIZER_EMAIL_SETUP_GUIDE.md`
- Flow diagram: `EMAIL_NOTIFICATION_FLOW.md`

**Code:**
- Service: `Backend/services/emailService.js`
- Routes: `Backend/Routes/organizer.js`
- Test: `Backend/test-email.js`

---

**Last Updated:** January 2026  
**Version:** 1.0.0
