# Organizer Revocation System

## Overview
A comprehensive system for managing organizer account revocations in the fundraising platform. This implements a **soft revocation** approach that maintains data integrity while preventing misuse.

## Features Implemented

### 1. **Revocation Mechanism**
- Admin can revoke organizer privileges with a mandatory reason
- Revocation is tracked with timestamp and admin who performed the action
- Revoked organizers cannot create new campaigns or withdrawal requests
- Existing data is preserved for audit and donor transparency

### 2. **Automatic Actions on Revocation**
When an organizer is revoked, the system automatically:
- ✅ Closes all active campaigns by the organizer
- ✅ Rejects all pending withdrawal requests
- ✅ Adds "Organizer account revoked" reason to closed campaigns
- ✅ Uses database transactions to ensure data consistency

### 3. **Reinstatement Capability**
- Admin can reinstate revoked organizers
- Previously closed campaigns remain closed (for audit trail)
- Reinstated organizers can create new campaigns
- Revocation history is cleared upon reinstatement

### 4. **Middleware Protection**
- `requireApprovedOrganizer` middleware now checks for revocation
- Revoked organizers receive clear error messages with reason
- Prevents revoked organizers from accessing protected routes

### 5. **Admin Management**
- Get all organizers with filtering (active, revoked, pending)
- Pagination support for large datasets
- View revocation details including who revoked and when

## API Endpoints

### Revoke Organizer
```
PATCH /api/organizers/:id/revoke
Authorization: Admin only
Body: {
  "revocationReason": "Reason for revocation (min 10 characters)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Organizer privileges revoked successfully",
  "user": { ... },
  "actionsPerformed": {
    "campaignsClosed": true,
    "pendingWithdrawalsRejected": true
  }
}
```

### Reinstate Organizer
```
PATCH /api/organizers/:id/reinstate
Authorization: Admin only
```

**Response:**
```json
{
  "success": true,
  "message": "Organizer privileges reinstated successfully",
  "user": { ... },
  "note": "Previously closed campaigns remain closed. Organizer can create new campaigns."
}
```

### Get All Organizers
```
GET /api/organizers?status=active&page=1&limit=20
Authorization: Admin only
Query Parameters:
  - status: "active" | "revoked" | "pending"
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organizers": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

## Database Schema Changes

### User Model
Added fields:
```typescript
isOrganizerRevoked: boolean          // Default: false
revokedAt?: Date                     // When revoked
revokedBy?: ObjectId                 // Admin who revoked
revocationReason?: string            // Reason (max 500 chars)
```

### Campaign Model
Added field:
```typescript
closedReason?: string                // Reason for closure (max 200 chars)
```

## Security Considerations

### 1. **Authorization**
- Only admins can revoke/reinstate organizers
- Revocation reason is mandatory (min 10 characters)
- All actions are logged with admin ID and timestamp

### 2. **Data Integrity**
- Uses MongoDB transactions for atomic operations
- Prevents partial updates if any operation fails
- Maintains referential integrity across collections

### 3. **Audit Trail**
- Complete history of who revoked, when, and why
- Revocation details visible to admins
- Cannot be modified by organizers

### 4. **Financial Safety**
- Pending withdrawals are automatically rejected
- Approved withdrawals remain processable (already approved)
- Campaign funds remain visible to donors

## Use Cases

### When to Revoke an Organizer:
1. **Fraud Detection** - Fake campaigns or misuse of funds
2. **Terms Violation** - Breaking platform rules
3. **Suspicious Activity** - Multiple complaints from donors
4. **Legal Issues** - Court orders or regulatory requirements
5. **Duplicate Accounts** - Multiple accounts by same person

### When to Reinstate:
1. **False Positive** - Revocation was a mistake
2. **Issue Resolved** - Organizer fixed the problem
3. **Appeal Approved** - After review process
4. **Temporary Suspension** - Time-based restrictions lifted

## Best Practices

### For Admins:
1. **Always provide detailed reasons** - Helps with appeals and legal issues
2. **Review before revoking** - Ensure evidence is solid
3. **Communicate with organizer** - Send email notification (implement separately)
4. **Document the decision** - Keep records outside the system too
5. **Monitor reinstated organizers** - Watch for repeat issues

### For Developers:
1. **Test transactions thoroughly** - Ensure rollback works
2. **Log all revocation actions** - Use application logging
3. **Monitor performance** - Bulk updates can be slow
4. **Handle edge cases** - What if organizer has 1000 campaigns?
5. **Add email notifications** - Inform organizers and donors

## Error Handling

The system handles various error scenarios:
- Invalid organizer ID
- User not found
- User is not an organizer
- Already revoked/not revoked
- Missing or invalid revocation reason
- Transaction failures (automatic rollback)

## Future Enhancements

### Recommended Additions:
1. **Email Notifications**
   - Notify organizer when revoked
   - Notify donors of affected campaigns
   - Send reinstatement confirmation

2. **Appeal System**
   - Allow organizers to appeal revocations
   - Admin review workflow
   - Evidence submission

3. **Temporary Suspensions**
   - Time-based restrictions (e.g., 30 days)
   - Auto-reinstatement after period
   - Warning system before revocation

4. **Revocation Levels**
   - Warning (no action)
   - Suspension (temporary)
   - Revocation (permanent)
   - Ban (cannot reapply)

5. **Analytics Dashboard**
   - Track revocation rates
   - Common reasons
   - Reinstatement success rates
   - Impact on platform trust

6. **Donor Refunds**
   - Option to refund donors of revoked campaigns
   - Partial refunds for active campaigns
   - Automated refund processing

## Testing Checklist

- [ ] Revoke organizer with valid reason
- [ ] Try to revoke with short reason (should fail)
- [ ] Try to revoke non-organizer (should fail)
- [ ] Try to revoke already revoked (should fail)
- [ ] Verify campaigns are closed
- [ ] Verify withdrawals are rejected
- [ ] Try to create campaign as revoked organizer (should fail)
- [ ] Reinstate organizer
- [ ] Try to reinstate non-revoked (should fail)
- [ ] Verify reinstated organizer can create campaigns
- [ ] Test transaction rollback on failure
- [ ] Test pagination and filtering
- [ ] Test with organizer having many campaigns

## Conclusion

This revocation system provides a robust, secure, and auditable way to manage organizer accounts while maintaining platform integrity and donor trust. The soft revocation approach ensures data preservation for legal and transparency requirements while effectively preventing misuse.
