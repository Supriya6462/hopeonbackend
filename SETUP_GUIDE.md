# Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation Steps

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# AWS S3 Configuration
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name

# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET=your-paypal-secret
PAYPAL_ENVIRONMENT=sandbox

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 3. Create Admin User

```bash
npm run create-admin
```

Follow the prompts to create your first admin user.

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### 5. Verify Installation

Visit `http://localhost:3001/health` - you should see:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Production Deployment

### 1. Build the Project

```bash
npm run build
```

### 2. Set Production Environment Variables

Update `.env` with production values:
- Change `NODE_ENV` to `production`
- Use production MongoDB URL
- Use production PayPal credentials
- Update `FRONTEND_URL` to production domain
- Generate a strong `JWT_SECRET`

### 3. Start Production Server

```bash
npm start
```

## Common Issues

### MongoDB Connection Failed
- Verify `DATABASE_URL` is correct
- Check network access in MongoDB Atlas
- Ensure IP whitelist includes your server

### JWT Token Invalid
- Verify `JWT_SECRET` is set
- Check token expiration time
- Ensure consistent secret across restarts

### CORS Errors
- Update `FRONTEND_URL` in `.env`
- Check CORS configuration in `app.ts`

### Port Already in Use
- Change `PORT` in `.env`
- Kill process using the port: `lsof -ti:3001 | xargs kill`

## Testing the API

### Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Profile (with token)
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Indexes

The following indexes are automatically created:
- User: email, isOrganizerApproved
- Campaign: owner, isApproved, title (text)
- Donation: campaign, donor, transactionId, transactionHash
- OrganizerApplication: user, status
- WithdrawalRequest: organizer, campaign, status
- OTP: email, expiresAt (TTL)

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong passwords for admin accounts
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS in production
- [ ] Set up rate limiting
- [ ] Configure proper CORS origins
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB encryption at rest
- [ ] Set up monitoring and logging

## Next Steps

1. Set up email service for OTP delivery
2. Configure payment webhooks (PayPal, Stripe)
3. Implement file upload for campaign images
4. Add rate limiting middleware
5. Set up logging service (Winston, Morgan)
6. Configure CI/CD pipeline
7. Add API documentation (Swagger)
8. Implement caching (Redis)
9. Set up monitoring (PM2, New Relic)
10. Add automated tests
