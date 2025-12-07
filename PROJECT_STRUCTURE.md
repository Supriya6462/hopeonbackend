# Project Structure

## Overview
This is a fundraising/crowdfunding platform backend built with Node.js, Express, TypeScript, and MongoDB.

## Directory Structure

```
backendfiles/
├── src/
│   ├── config/          # Configuration files (S3, etc.)
│   ├── controller/      # Request handlers
│   ├── middleware/      # Express middleware (auth, error handling)
│   ├── models/          # Mongoose models and schemas
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── scripts/         # Utility scripts (create admin, etc.)
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions (JWT, password hashing)
├── app.ts              # Express app configuration
├── server.ts           # Server entry point
└── dbconnection.ts     # MongoDB connection setup
```

## Key Features

### User Roles
- **Donor**: Default role, can donate to campaigns
- **Organizer**: Can create and manage campaigns (requires approval)
- **Admin**: Full system access, approves organizers and campaigns

### Core Functionality
1. **Authentication**: JWT-based auth with OTP verification
2. **Campaign Management**: Create, approve, and manage fundraising campaigns
3. **Donations**: Support for PayPal and crypto donations
4. **Organizer Applications**: Donors can apply to become organizers
5. **Withdrawal Requests**: Organizers can request funds from their campaigns
6. **Role-Based Access Control (RBAC)**: Granular permissions system

## Models

### User
- Basic user information
- Role and approval status
- Password hashing with bcrypt

### Campaign
- Campaign details (title, description, images)
- Target and raised amounts
- Approval and closure status

### Donation
- Links donors to campaigns
- Supports multiple payment methods
- Tracks transaction details

### OrganizerApplication
- Application for organizer status
- Document verification
- Admin review workflow

### WithdrawalRequest
- Withdrawal requests from organizers
- Multiple payout methods (bank, PayPal, crypto)
- Admin approval workflow

### OTP
- One-time passwords for verification
- TTL index for automatic expiration

## API Routes

### Authentication (`/api/auth`)
- POST `/register` - Register new user
- POST `/login` - User login
- POST `/request-otp` - Request OTP
- POST `/verify-otp` - Verify OTP
- GET `/profile` - Get user profile (protected)
- PUT `/profile` - Update profile (protected)

### Campaigns (`/api/campaigns`)
- GET `/` - List all approved campaigns (public)
- GET `/:id` - Get single campaign (public)
- POST `/` - Create campaign (organizer only)
- PUT `/:id` - Update campaign (owner/admin)
- PATCH `/:id/approve` - Approve campaign (admin)
- PATCH `/:id/close` - Close campaign (owner/admin)
- DELETE `/:id` - Delete campaign (owner/admin)

### Donations (`/api/donations`)
- POST `/` - Create donation (authenticated)
- PATCH `/:id/status` - Update donation status (admin)
- GET `/campaign/:campaignId` - Get campaign donations (public)
- GET `/my-donations` - Get user's donations (authenticated)
- GET `/` - Get all donations (admin)
- GET `/stats/:campaignId?` - Get donation statistics

### Organizer (`/api/organizer`)
- POST `/apply` - Submit organizer application (donor)
- GET `/my-applications` - Get user's applications
- GET `/applications` - Get all applications (admin)
- GET `/applications/:id` - Get single application (admin)
- PATCH `/applications/:id/approve` - Approve application (admin)
- PATCH `/applications/:id/reject` - Reject application (admin)

### Withdrawals (`/api/withdrawals`)
- POST `/` - Create withdrawal request (organizer)
- GET `/my-withdrawals` - Get organizer's withdrawals
- GET `/` - Get all withdrawals (admin)
- GET `/:id` - Get single withdrawal
- PATCH `/:id/approve` - Approve withdrawal (admin)
- PATCH `/:id/reject` - Reject withdrawal (admin)
- PATCH `/:id/mark-paid` - Mark as paid (admin)

## Middleware

### Authentication
- `authenticate`: Verifies JWT token
- `authorize(...roles)`: Checks user role
- `requireApprovedOrganizer`: Ensures organizer is approved

### Error Handling
- Global error handler with development/production modes
- Custom AppError class for operational errors
- Async handler wrapper for route handlers

## Environment Variables

Required variables in `.env`:
- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT signing
- `JWT_EXPIRES_IN`: Token expiration time
- `AWS_REGION`: AWS S3 region
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_S3_BUCKET_NAME`: S3 bucket name
- `PAYPAL_CLIENT_ID`: PayPal client ID
- `PAYPAL_SECRET`: PayPal secret
- `PAYPAL_ENVIRONMENT`: PayPal environment (sandbox/production)
- `FRONTEND_URL`: Frontend application URL
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run type-check` - Check TypeScript types
- `npm run create-admin` - Create admin user

## Security Features

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **JWT Authentication**: Secure token-based auth
3. **Role-Based Access Control**: Granular permissions
4. **Input Validation**: Schema validation with Mongoose
5. **CORS Configuration**: Controlled cross-origin access
6. **Environment Variables**: Sensitive data protection

## Best Practices Implemented

1. **Separation of Concerns**: Controllers, services, and models are separated
2. **Type Safety**: Full TypeScript implementation with proper interfaces
3. **Error Handling**: Centralized error handling middleware
4. **Code Organization**: Modular structure with clear responsibilities
5. **Database Indexing**: Optimized queries with proper indexes
6. **API Design**: RESTful endpoints with consistent response format
