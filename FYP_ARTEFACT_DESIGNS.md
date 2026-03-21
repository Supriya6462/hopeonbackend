# 9. ARTEFACT DESIGNS

## 9.1 Introduction

This section presents the detailed design and modeling artifacts for the HopeOn crowdfunding platform. The system is organized into major subsystems, each documented with Software Requirements Specification (SRS), design diagrams, and testing strategies. The diagrams follow standard UML notation and provide comprehensive views of system architecture, behavior, and data flow.

## 9.2 Subsystem 1: Authentication and User Management

### 9.2.1 Software Requirements Specification (SRS)

**Functional Requirements:**

FR1.1: The system shall allow users to register with name, email, password, and optional phone number.

FR1.2: The system shall send an OTP to the user's email for verification during registration.

FR1.3: The system shall verify the OTP within 10 minutes of generation; expired OTPs shall be rejected.

FR1.4: The system shall allow users to log in using email and password.

FR1.5: The system shall generate a JWT token upon successful login, valid for 7 days.

FR1.6: The system shall support three user roles: DONOR, ORGANIZER, and ADMIN.

FR1.7: The system shall allow users to view and update their profile information.

FR1.8: The system shall provide password reset functionality via email OTP.

FR1.9: The system shall hash passwords using bcrypt with 10 salt rounds before storage.

FR1.10: The system shall automatically log out users when their JWT token expires.

**Non-Functional Requirements:**

NFR1.1: Password hashing shall complete within 500ms.

NFR1.2: JWT token generation shall complete within 100ms.

NFR1.3: Email OTP delivery shall occur within 30 seconds.

NFR1.4: The system shall enforce password minimum length of 8 characters.

NFR1.5: The system shall rate-limit login attempts to prevent brute force attacks (5 attempts per 15 minutes).

NFR1.6: All authentication endpoints shall use HTTPS in production.

**Business Rules:**

BR1.1: Email addresses must be unique across all users.

BR1.2: Users cannot change their email address after registration.

BR1.3: OTP codes are single-use and expire after 10 minutes.

BR1.4: New users default to DONOR role; ORGANIZER role requires application approval.

BR1.5: ADMIN role can only be assigned via database script, not through UI.

### 9.2.2 Use Case Diagram

```
                    Authentication & User Management System
                    
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│  ┌──────────┐                                                  │
│  │  Donor   │──────────► Register                              │
│  └──────────┘            │                                      │
│       │                  ├──► Send OTP Email                    │
│       │                  └──► Verify OTP                        │
│       │                                                         │
│       ├─────────────────► Login                                │
│       │                   │                                     │
│       │                   └──► Generate JWT Token              │
│       │                                                         │
│       ├─────────────────► View Profile                         │
│       │                                                         │
│       ├─────────────────► Update Profile                       │
│       │                                                         │
│       └─────────────────► Reset Password                       │
│                            │                                    │
│                            ├──► Request OTP                     │
│                            └──► Verify OTP & Update Password   │
│                                                                 │
│  ┌──────────┐                                                  │
│  │Organizer │──────────► (All Donor Use Cases)                │
│  └──────────┘                                                  │
│                                                                 │
│  ┌──────────┐                                                  │
│  │  Admin   │──────────► (All User Use Cases)                 │
│  └──────────┘            │                                      │
│                          └──► Manage User Roles                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2.3 Activity Diagram - User Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Registration Process                     │
└─────────────────────────────────────────────────────────────────┘

    [Start]
       │
       ▼
  ┌─────────────────┐
  │ User enters     │
  │ registration    │
  │ details         │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Validate input  │
  │ (email format,  │
  │ password length)│
  └────────┬────────┘
           │
           ▼
      ◇ Valid?
     /         \
   No           Yes
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Check if email  │
   │    │ already exists  │
   │    └────────┬────────┘
   │             │
   │             ▼
   │        ◇ Exists?
   │       /         \
   │     Yes          No
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Hash password   │
   │      │   │ using bcrypt    │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Generate OTP    │
   │      │   │ (6-digit code)  │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Save pending    │
   │      │   │ registration    │
   │      │   │ to database     │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Send OTP email  │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ User enters OTP │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │       ◇ OTP Valid?
   │      │      /         \
   │      │    No           Yes
   │      │     │            │
   │      │     │            ▼
   │      │     │   ┌─────────────────┐
   │      │     │   │ Create user     │
   │      │     │   │ account         │
   │      │     │   └────────┬────────┘
   │      │     │            │
   │      │     │            ▼
   │      │     │   ┌─────────────────┐
   │      │     │   │ Delete pending  │
   │      │     │   │ registration    │
   │      │     │   └────────┬────────┘
   │      │     │            │
   └──────┴─────┴────────────┘
                │
                ▼
       ┌─────────────────┐
       │ Return response │
       │ (success/error) │
       └────────┬────────┘
                │
                ▼
             [End]
```

### 9.2.4 Sequence Diagram - Login Process

```
User          Frontend        Backend API      Database       JWT Service
 │                │               │               │               │
 │  Enter email   │               │               │               │
 │  & password    │               │               │               │
 │───────────────>│               │               │               │
 │                │               │               │               │
 │                │ POST /login   │               │               │
 │                │──────────────>│               │               │
 │                │               │               │               │
 │                │               │ Find user by  │               │
 │                │               │ email         │               │
 │                │               │──────────────>│               │
 │                │               │               │               │
 │                │               │ User data     │               │
 │                │               │<──────────────│               │
 │                │               │               │               │
 │                │               │ Compare       │               │
 │                │               │ password hash │               │
 │                │               │ (bcrypt)      │               │
 │                │               │               │               │
 │                │               │ Generate JWT  │               │
 │                │               │──────────────────────────────>│
 │                │               │               │               │
 │                │               │ JWT Token     │               │
 │                │               │<──────────────────────────────│
 │                │               │               │               │
 │                │ Response:     │               │               │
 │                │ {token, user} │               │               │
 │                │<──────────────│               │               │
 │                │               │               │               │
 │  Login success │               │               │               │
 │  + JWT stored  │               │               │               │
 │<───────────────│               │               │               │
 │                │               │               │               │
```

### 9.2.5 Entity Relationship Diagram (ERD) - User Entity

```
┌─────────────────────────────────────────────────────────────┐
│                          User                                │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│     name                   : String (required, max 100)      │
│     email                  : String (unique, required)       │
│     passwordHash           : String (required)               │
│     role                   : Enum (DONOR, ORGANIZER, ADMIN)  │
│     phoneNumber            : String (optional)               │
│     image                  : String (optional)               │
│     isEmailVerified        : Boolean (default: false)        │
│     isOrganizerApproved    : Boolean (default: false)        │
│     isOrganizerRevoked     : Boolean (default: false)        │
│     revokedAt              : Date (optional)                 │
│ FK  revokedBy              : ObjectId → User (optional)      │
│     revocationReason       : String (optional, max 500)      │
│     resetToken             : String (optional)               │
│     resetTokenExpiry       : Date (optional)                 │
│     createdAt              : Date (auto)                     │
│     updatedAt              : Date (auto)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              │ references
                              │
                              │ 0..*
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PendingRegistration                       │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│     name                   : String (required)               │
│     email                  : String (required)               │
│     passwordHash           : String (required)               │
│     phoneNumber            : String (optional)               │
│     createdAt              : Date (auto)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              │ has
                              │
                              │ 1
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                           OTP                                │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│     email                  : String (required)               │
│     code                   : String (required, 6 digits)     │
│     type                   : Enum (REGISTRATION, RESET)      │
│     expiresAt              : Date (required)                 │
│     createdAt              : Date (auto)                     │
└─────────────────────────────────────────────────────────────┘
```



### 9.2.6 Class Diagram - Authentication Module

```
┌─────────────────────────────────────────────────────────────┐
│                    AuthController                            │
├─────────────────────────────────────────────────────────────┤
│ - authService: AuthService                                   │
├─────────────────────────────────────────────────────────────┤
│ + register(req, res): Promise<void>                          │
│ + verifyOTP(req, res): Promise<void>                         │
│ + login(req, res): Promise<void>                             │
│ + getProfile(req, res): Promise<void>                        │
│ + updateProfile(req, res): Promise<void>                     │
│ + requestPasswordReset(req, res): Promise<void>              │
│ + resetPassword(req, res): Promise<void>                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     AuthService                              │
├─────────────────────────────────────────────────────────────┤
│ - userModel: Model<IUser>                                    │
│ - pendingRegModel: Model<IPendingRegistration>              │
│ - otpModel: Model<IOTP>                                      │
├─────────────────────────────────────────────────────────────┤
│ + register(data): Promise<{message, otpCode}>                │
│ + verifyOTP(email, code): Promise<IUser>                     │
│ + login(email, password): Promise<{user, token}>             │
│ + getProfile(userId): Promise<IUser>                         │
│ + updateProfile(userId, data): Promise<IUser>                │
│ + requestPasswordReset(email): Promise<{message, otpCode}>   │
│ + resetPassword(email, code, newPassword): Promise<void>     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PasswordUtil                              │
├─────────────────────────────────────────────────────────────┤
│ + hashPassword(password): Promise<string>                    │
│ + comparePassword(password, hash): Promise<boolean>          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      JWTUtil                                 │
├─────────────────────────────────────────────────────────────┤
│ + generateToken(payload): string                             │
│ + verifyToken(token): object                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  AuthMiddleware                              │
├─────────────────────────────────────────────────────────────┤
│ + authenticate(req, res, next): Promise<void>                │
│ + requireRole(role): Middleware                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2.7 Testing Strategy

**Unit Tests:**
- Password hashing and comparison functions
- JWT token generation and verification
- OTP generation and validation
- Email format validation

**Integration Tests:**
- Complete registration flow (register → OTP → verify)
- Login with valid/invalid credentials
- Profile update with authentication
- Password reset flow

**Security Tests:**
- SQL injection attempts in email field
- XSS attempts in name field
- Brute force login attempts (rate limiting)
- Expired JWT token rejection
- Invalid JWT token rejection

**Test Cases:**

| Test ID | Test Case | Input | Expected Output | Status |
|---------|-----------|-------|-----------------|--------|
| AUTH-001 | Register with valid data | Valid email, password | OTP sent, pending registration created | Pass |
| AUTH-002 | Register with existing email | Existing email | Error: Email already exists | Pass |
| AUTH-003 | Register with invalid email | Invalid format | Error: Invalid email format | Pass |
| AUTH-004 | Verify OTP with valid code | Valid OTP within 10 min | User created, success message | Pass |
| AUTH-005 | Verify OTP with expired code | OTP older than 10 min | Error: OTP expired | Pass |
| AUTH-006 | Login with valid credentials | Correct email/password | JWT token, user data | Pass |
| AUTH-007 | Login with wrong password | Incorrect password | Error: Invalid credentials | Pass |
| AUTH-008 | Access protected route without token | No token | Error: Unauthorized | Pass |
| AUTH-009 | Access protected route with expired token | Expired JWT | Error: Token expired | Pass |
| AUTH-010 | Update profile with authentication | Valid token, new data | Profile updated | Pass |

---

## 9.3 Subsystem 2: Campaign Management

### 9.3.1 Software Requirements Specification (SRS)

**Functional Requirements:**

FR2.1: The system shall allow approved organizers to create campaigns with title, description, target amount, funding type, and images.

FR2.2: The system shall support two funding types: ALL_OR_NOTHING and FLEXIBLE.

FR2.3: The system shall upload campaign images to AWS S3 and store URLs in the database.

FR2.4: The system shall allow users to browse all approved campaigns without authentication.

FR2.5: The system shall provide campaign search functionality by title.

FR2.6: The system shall display campaign details including raised amount, donor count, and days remaining.

FR2.7: The system shall allow organizers to view and edit their own campaigns.

FR2.8: The system shall require admin approval before campaigns become publicly visible.

FR2.9: The system shall allow admins to approve or reject campaigns with reasons.

FR2.10: The system shall allow admins to close campaigns with closure reasons.

**Non-Functional Requirements:**

NFR2.1: Campaign listing shall load within 2 seconds for up to 100 campaigns.

NFR2.2: Image upload shall support files up to 5MB.

NFR2.3: Campaign search shall return results within 1 second.

NFR2.4: The system shall support pagination with 20 campaigns per page.

**Business Rules:**

BR2.1: Only users with ORGANIZER role can create campaigns.

BR2.2: Organizers with revoked status cannot create new campaigns.

BR2.3: Campaign target amount must be greater than 0.

BR2.4: Campaign title must not exceed 150 characters.

BR2.5: Campaign description must not exceed 2000 characters.

BR2.6: Campaigns can have up to 5 images.

BR2.7: Closed campaigns cannot receive new donations.

BR2.8: ALL_OR_NOTHING campaigns only release funds if target is met.

### 9.3.2 Use Case Diagram

```
                    Campaign Management System
                    
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────┐                                                  │
│  │  Donor   │──────────► Browse Campaigns                      │
│  └──────────┘            │                                      │
│       │                  └──► Search Campaigns                  │
│       │                                                         │
│       └─────────────────► View Campaign Details                │
│                            │                                    │
│                            ├──► View Raised Amount             │
│                            ├──► View Donor Count               │
│                            └──► View Campaign Images           │
│                                                                 │
│  ┌──────────┐                                                  │
│  │Organizer │──────────► Create Campaign                       │
│  └──────────┘            │                                      │
│       │                  ├──► Upload Images to S3              │
│       │                  └──► Submit for Approval              │
│       │                                                         │
│       ├─────────────────► View My Campaigns                    │
│       │                                                         │
│       ├─────────────────► Edit Campaign                        │
│       │                   │                                     │
│       │                   └──► Update Details                  │
│       │                                                         │
│       └─────────────────► (All Donor Use Cases)                │
│                                                                 │
│  ┌──────────┐                                                  │
│  │  Admin   │──────────► Approve Campaign                      │
│  └──────────┘            │                                      │
│       │                  └──► Make Publicly Visible            │
│       │                                                         │
│       ├─────────────────► Reject Campaign                      │
│       │                   │                                     │
│       │                   └──► Provide Rejection Reason        │
│       │                                                         │
│       ├─────────────────► Close Campaign                       │
│       │                   │                                     │
│       │                   └──► Provide Closure Reason          │
│       │                                                         │
│       └─────────────────► (All User Use Cases)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3.3 Activity Diagram - Campaign Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Campaign Creation Process                       │
└─────────────────────────────────────────────────────────────────┘

    [Start]
       │
       ▼
  ┌─────────────────┐
  │ Organizer fills │
  │ campaign form   │
  │ (title, desc,   │
  │ target, type)   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Organizer       │
  │ selects images  │
  │ (up to 5)       │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Validate inputs │
  │ - Title length  │
  │ - Target > 0    │
  │ - Image size    │
  └────────┬────────┘
           │
           ▼
      ◇ Valid?
     /         \
   No           Yes
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Check organizer │
   │    │ status          │
   │    └────────┬────────┘
   │             │
   │             ▼
   │        ◇ Approved &
   │          Not Revoked?
   │       /         \
   │     No           Yes
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Upload images   │
   │      │   │ to AWS S3       │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Get S3 URLs     │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Create campaign │
   │      │   │ in database     │
   │      │   │ (isApproved:    │
   │      │   │  false)         │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Send email to   │
   │      │   │ admin for       │
   │      │   │ approval        │
   │      │   └────────┬────────┘
   │      │            │
   └──────┴────────────┘
                │
                ▼
       ┌─────────────────┐
       │ Return response │
       │ (success/error) │
       └────────┬────────┘
                │
                ▼
             [End]
```

### 9.3.4 Sequence Diagram - Campaign Approval Process

```
Admin       Frontend      Backend API    Database      Email Service
 │              │              │             │               │
 │ View pending │              │             │               │
 │ campaigns    │              │             │               │
 │─────────────>│              │             │               │
 │              │              │             │               │
 │              │ GET /admin/  │             │               │
 │              │ campaigns?   │             │               │
 │              │ status=pending             │               │
 │              │─────────────>│             │               │
 │              │              │             │               │
 │              │              │ Find pending│               │
 │              │              │ campaigns   │               │
 │              │              │────────────>│               │
 │              │              │             │               │
 │              │              │ Campaign    │               │
 │              │              │ list        │               │
 │              │              │<────────────│               │
 │              │              │             │               │
 │              │ Campaign list│             │               │
 │              │<─────────────│             │               │
 │              │              │             │               │
 │ Display list │              │             │               │
 │<─────────────│              │             │               │
 │              │              │             │               │
 │ Click approve│              │             │               │
 │─────────────>│              │             │               │
 │              │              │             │               │
 │              │ PATCH /admin/│             │               │
 │              │ campaigns/:id│             │               │
 │              │ /approve     │             │               │
 │              │─────────────>│             │               │
 │              │              │             │               │
 │              │              │ Update      │               │
 │              │              │ isApproved  │               │
 │              │              │ = true      │               │
 │              │              │────────────>│               │
 │              │              │             │               │
 │              │              │ Updated     │               │
 │              │              │ campaign    │               │
 │              │              │<────────────│               │
 │              │              │             │               │
 │              │              │ Send approval email         │
 │              │              │ to organizer                │
 │              │              │────────────────────────────>│
 │              │              │             │               │
 │              │ Success      │             │               │
 │              │<─────────────│             │               │
 │              │              │             │               │
 │ Show success │              │             │               │
 │<─────────────│              │             │               │
 │              │              │             │               │
```

### 9.3.5 Entity Relationship Diagram (ERD) - Campaign Entity

```
┌─────────────────────────────────────────────────────────────┐
│                        Campaign                              │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│     title                  : String (required, max 150)      │
│     description            : String (optional, max 2000)     │
│     images                 : Array<String> (S3 URLs)         │
│     target                 : Number (required, min 0)        │
│     fundingType            : Enum (ALL_OR_NOTHING, FLEXIBLE) │
│ FK  owner                  : ObjectId → User (required)      │
│     isApproved             : Boolean (default: false)        │
│     isClosed               : Boolean (default: false)        │
│     closedReason           : String (optional, max 200)      │
│     createdAt              : Date (auto)                     │
│     updatedAt              : Date (auto)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              │ owned by
                              │
                              │ 1
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          User                                │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│     name                   : String                          │
│     email                  : String                          │
│     role                   : Enum (DONOR, ORGANIZER, ADMIN)  │
│     isOrganizerApproved    : Boolean                         │
│     isOrganizerRevoked     : Boolean                         │
└─────────────────────────────────────────────────────────────┘
```

### 9.3.6 Wireframe - Campaign Creation Page

```
┌─────────────────────────────────────────────────────────────────┐
│  HopeOn                                    [Profile] [Logout]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Create New Campaign                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Campaign Title *                                               │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                                                         │     │
│  └───────────────────────────────────────────────────────┘     │
│  Max 150 characters                                             │
│                                                                 │
│  Description                                                    │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                                                         │     │
│  │                                                         │     │
│  │                                                         │     │
│  └───────────────────────────────────────────────────────┘     │
│  Max 2000 characters                                            │
│                                                                 │
│  Target Amount (NPR) *                                          │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                                                         │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  Funding Type *                                                 │
│  ○ All or Nothing  ○ Flexible                                  │
│                                                                 │
│  Campaign Images (Max 5)                                        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                     │
│  │ [+] │ │     │ │     │ │     │ │     │                     │
│  │     │ │     │ │     │ │     │ │     │                     │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                     │
│  Click to upload (Max 5MB each)                                │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │     Cancel       │  │  Create Campaign │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3.7 Testing Strategy

**Test Cases:**

| Test ID | Test Case | Input | Expected Output | Status |
|---------|-----------|-------|-----------------|--------|
| CAMP-001 | Create campaign as approved organizer | Valid data | Campaign created, pending approval | Pass |
| CAMP-002 | Create campaign as revoked organizer | Valid data | Error: Organizer revoked | Pass |
| CAMP-003 | Create campaign with invalid target | Target = -100 | Error: Target must be positive | Pass |
| CAMP-004 | Upload image exceeding 5MB | 6MB image | Error: File too large | Pass |
| CAMP-005 | Browse campaigns without auth | No token | List of approved campaigns | Pass |
| CAMP-006 | Search campaigns by title | "medical" | Matching campaigns | Pass |
| CAMP-007 | Admin approve campaign | Campaign ID | Campaign becomes visible | Pass |
| CAMP-008 | Admin reject campaign | Campaign ID, reason | Campaign rejected, email sent | Pass |
| CAMP-009 | Edit own campaign | Updated data | Campaign updated | Pass |
| CAMP-010 | Edit another user's campaign | Campaign ID | Error: Unauthorized | Pass |



---

## 9.4 Subsystem 3: Payment Processing and Donation Management

### 9.4.1 Software Requirements Specification (SRS)

**Functional Requirements:**

FR3.1: The system shall support multiple payment gateways: Khalti, eSewa, PayPal, and Cryptocurrency.

FR3.2: The system shall allow donors to initiate payments through their chosen gateway.

FR3.3: The system shall redirect donors to the payment gateway for payment completion.

FR3.4: The system shall verify payment completion with the payment gateway.

FR3.5: The system shall create donation records with PENDING status upon initiation.

FR3.6: The system shall update donation status to COMPLETED upon successful verification.

FR3.7: The system shall update campaign raised amount when donations are completed.

FR3.8: The system shall store provider transaction IDs for audit purposes.

FR3.9: The system shall handle payment failures gracefully with appropriate error messages.

FR3.10: The system shall allow donors to view their donation history.

**Non-Functional Requirements:**

NFR3.1: Payment initiation shall complete within 3 seconds.

NFR3.2: Payment verification shall complete within 5 seconds.

NFR3.3: The system shall handle concurrent payment requests without data corruption.

NFR3.4: Payment gateway credentials shall be stored securely in environment variables.

NFR3.5: All payment communications shall use HTTPS.

**Business Rules:**

BR3.1: Donation amount must be greater than 0.

BR3.2: Donors can donate to approved campaigns only.

BR3.3: Donors cannot donate to closed campaigns.

BR3.4: Payment verification must occur within 24 hours of initiation.

BR3.5: Failed payments shall not update campaign raised amounts.

BR3.6: Khalti amounts must be converted to paisa (multiply by 100).

BR3.7: PayPal amounts must be formatted to 2 decimal places.

### 9.4.2 Use Case Diagram

```
                Payment Processing & Donation System
                    
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────┐                                                  │
│  │  Donor   │──────────► Make Donation                         │
│  └──────────┘            │                                      │
│       │                  ├──► Select Payment Method            │
│       │                  │    (Khalti/eSewa/PayPal/Crypto)     │
│       │                  │                                      │
│       │                  ├──► Initiate Payment                 │
│       │                  │    │                                 │
│       │                  │    ├──► Create Donation Record      │
│       │                  │    └──► Redirect to Gateway         │
│       │                  │                                      │
│       │                  ├──► Complete Payment on Gateway      │
│       │                  │                                      │
│       │                  └──► Verify Payment                   │
│       │                       │                                 │
│       │                       ├──► Confirm with Gateway        │
│       │                       ├──► Update Donation Status      │
│       │                       └──► Update Campaign Amount      │
│       │                                                         │
│       ├─────────────────► View Donation History                │
│       │                   │                                     │
│       │                   ├──► Filter by Campaign              │
│       │                   └──► Filter by Status                │
│       │                                                         │
│       └─────────────────► Download Donation Receipt            │
│                                                                 │
│  ┌──────────┐                                                  │
│  │Organizer │──────────► View Campaign Donations               │
│  └──────────┘            │                                      │
│       │                  ├──► View Donor List                  │
│       │                  └──► View Total Raised                │
│       │                                                         │
│       └─────────────────► (All Donor Use Cases)                │
│                                                                 │
│  ┌──────────┐                                                  │
│  │  Admin   │──────────► View All Donations                    │
│  └──────────┘            │                                      │
│       │                  └──► Generate Reports                 │
│       │                                                         │
│       └─────────────────► (All User Use Cases)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.4.3 Activity Diagram - Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Payment Processing Flow                       │
└─────────────────────────────────────────────────────────────────┘

    [Start]
       │
       ▼
  ┌─────────────────┐
  │ Donor selects   │
  │ campaign and    │
  │ enters amount   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Donor selects   │
  │ payment method  │
  │ (Khalti/eSewa/  │
  │  PayPal/Crypto) │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Validate amount │
  │ and campaign    │
  │ status          │
  └────────┬────────┘
           │
           ▼
      ◇ Valid?
     /         \
   No           Yes
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Create donation │
   │    │ record with     │
   │    │ PENDING status  │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Call Payment    │
   │    │ Factory to get  │
   │    │ provider        │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Initiate payment│
   │    │ with provider   │
   │    │ API             │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Get redirect URL│
   │    │ or form data    │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Redirect donor  │
   │    │ to payment      │
   │    │ gateway         │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Donor completes │
   │    │ payment on      │
   │    │ gateway site    │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Gateway redirects│
   │    │ back with       │
   │    │ transaction ID  │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Verify payment  │
   │    │ with provider   │
   │    │ API             │
   │    └────────┬────────┘
   │             │
   │             ▼
   │        ◇ Verified?
   │       /         \
   │     No           Yes
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Update donation │
   │      │   │ status to       │
   │      │   │ COMPLETED       │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Update campaign │
   │      │   │ raised amount   │
   │      │   └────────┬────────┘
   │      │            │
   │      │            ▼
   │      │   ┌─────────────────┐
   │      │   │ Send donation   │
   │      │   │ confirmation    │
   │      │   │ email           │
   │      │   └────────┬────────┘
   │      │            │
   └──────┴────────────┘
                │
                ▼
       ┌─────────────────┐
       │ Return response │
       │ to donor        │
       └────────┬────────┘
                │
                ▼
             [End]
```

### 9.4.4 Sequence Diagram - Multi-Gateway Payment Architecture

```
Donor    Frontend   Payment     Payment    Khalti/eSewa   Database
                    Service     Factory    /PayPal API
 │          │          │           │            │            │
 │ Select   │          │           │            │            │
 │ payment  │          │           │            │            │
 │─────────>│          │           │            │            │
 │          │          │           │            │            │
 │          │ POST     │           │            │            │
 │          │ /payments│           │            │            │
 │          │ /initiate│           │            │            │
 │          │─────────>│           │            │            │
 │          │          │           │            │            │
 │          │          │ Get       │            │            │
 │          │          │ Provider  │            │            │
 │          │          │ (Strategy │            │            │
 │          │          │ Pattern)  │            │            │
 │          │          │──────────>│            │            │
 │          │          │           │            │            │
 │          │          │ Provider  │            │            │
 │          │          │ Instance  │            │            │
 │          │          │<──────────│            │            │
 │          │          │           │            │            │
 │          │          │ Call provider.initiate()            │
 │          │          │───────────────────────>│            │
 │          │          │           │            │            │
 │          │          │           │ Payment URL│            │
 │          │          │<───────────────────────│            │
 │          │          │           │            │            │
 │          │          │ Create donation record │            │
 │          │          │───────────────────────────────────>│
 │          │          │           │            │            │
 │          │ Redirect │           │            │            │
 │          │ URL      │           │            │            │
 │          │<─────────│           │            │            │
 │          │          │           │            │            │
 │ Redirect │          │           │            │            │
 │ to       │          │           │            │            │
 │ Gateway  │          │           │            │            │
 │─────────────────────────────────────────────>│            │
 │          │          │           │            │            │
 │ Complete │          │           │            │            │
 │ Payment  │          │           │            │            │
 │<─────────────────────────────────────────────│            │
 │          │          │           │            │            │
 │ Callback │          │           │            │            │
 │─────────>│          │           │            │            │
 │          │          │           │            │            │
 │          │ POST     │           │            │            │
 │          │ /payments│           │            │            │
 │          │ /verify  │           │            │            │
 │          │─────────>│           │            │            │
 │          │          │           │            │            │
 │          │          │ Get Provider           │            │
 │          │          │──────────>│            │            │
 │          │          │           │            │            │
 │          │          │ Call provider.verify() │            │
 │          │          │───────────────────────>│            │
 │          │          │           │            │            │
 │          │          │           │ Verified   │            │
 │          │          │<───────────────────────│            │
 │          │          │           │            │            │
 │          │          │ Update donation status │            │
 │          │          │───────────────────────────────────>│
 │          │          │           │            │            │
 │          │ Success  │           │            │            │
 │          │<─────────│           │            │            │
 │          │          │           │            │            │
 │ Show     │          │           │            │            │
 │ Success  │          │           │            │            │
 │<─────────│          │           │            │            │
 │          │          │           │            │            │
```

### 9.4.5 Class Diagram - Payment System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  <<interface>>                               │
│                 IPaymentProvider                             │
├─────────────────────────────────────────────────────────────┤
│ + initiate(payload): Promise<PaymentInitResponse>           │
│ + verify(payload): Promise<PaymentVerifyResponse>           │
└─────────────────────────────────────────────────────────────┘
                              △
                              │ implements
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        │                     │                     │
┌───────┴────────┐  ┌─────────┴────────┐  ┌────────┴────────┐
│ KhaltiProvider │  │  EsewaProvider   │  │ PayPalProvider  │
├────────────────┤  ├──────────────────┤  ├─────────────────┤
│ + initiate()   │  │ + initiate()     │  │ + initiate()    │
│ + verify()     │  │ + verify()       │  │ + verify()      │
└────────────────┘  └──────────────────┘  └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   PaymentFactory                             │
├─────────────────────────────────────────────────────────────┤
│ + create(provider): IPaymentProvider                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ creates
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PaymentService                             │
├─────────────────────────────────────────────────────────────┤
│ - factory: PaymentFactory                                    │
│ - donationModel: Model<IDonation>                            │
├─────────────────────────────────────────────────────────────┤
│ + initiatePayment(data): Promise<PaymentInitResponse>        │
│ + verifyPayment(data): Promise<PaymentVerifyResponse>        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  DonationService                             │
├─────────────────────────────────────────────────────────────┤
│ + createDonation(data): Promise<IDonation>                   │
│ + updateDonationStatus(id, status): Promise<IDonation>       │
│ + getDonationHistory(userId): Promise<IDonation[]>           │
└─────────────────────────────────────────────────────────────┘
```

### 9.4.6 Entity Relationship Diagram (ERD) - Donation Entity

```
┌─────────────────────────────────────────────────────────────┐
│                        Donation                              │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│ FK  campaign               : ObjectId → Campaign (required)  │
│ FK  donor                  : ObjectId → User (optional)      │
│     donorEmail             : String (required)               │
│     donorName              : String (optional)               │
│     amount                 : Number (required, min 0)        │
│     method                 : Enum (KHALTI, ESEWA, PAYPAL,    │
│                              CRYPTO)                         │
│     status                 : Enum (PENDING, COMPLETED,       │
│                              FAILED)                         │
│     providerTransactionId  : String (optional)               │
│     message                : String (optional, max 500)      │
│     isAnonymous            : Boolean (default: false)        │
│     createdAt              : Date (auto)                     │
│     updatedAt              : Date (auto)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ *
                              │
                              │ belongs to
                              │
                              │ 1
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Campaign                              │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│     title                  : String                          │
│     target                 : Number                          │
│     fundingType            : Enum                            │
│ FK  owner                  : ObjectId → User                 │
└─────────────────────────────────────────────────────────────┘
```

### 9.4.7 Testing Strategy

**Test Cases:**

| Test ID | Test Case | Input | Expected Output | Status |
|---------|-----------|-------|-----------------|--------|
| PAY-001 | Initiate Khalti payment | Valid amount, campaign | Redirect URL returned | Pass |
| PAY-002 | Initiate eSewa payment | Valid amount, campaign | Form data returned | Pass |
| PAY-003 | Initiate PayPal payment | Valid amount, campaign | PayPal URL returned | Pass |
| PAY-004 | Verify successful Khalti payment | Valid pidx | Donation status COMPLETED | Pass |
| PAY-005 | Verify failed payment | Invalid transaction ID | Error: Verification failed | Pass |
| PAY-006 | Donate to closed campaign | Closed campaign ID | Error: Campaign closed | Pass |
| PAY-007 | Donate with zero amount | Amount = 0 | Error: Amount must be positive | Pass |
| PAY-008 | View donation history | User ID | List of user donations | Pass |
| PAY-009 | Anonymous donation | isAnonymous = true | Donor name hidden | Pass |
| PAY-010 | Campaign raised amount update | Completed donation | Campaign amount increased | Pass |



---

## 9.5 Subsystem 4: Organizer Application and Verification

### 9.5.1 Software Requirements Specification (SRS)

**Functional Requirements:**

FR4.1: The system shall allow users to apply for organizer status by submitting required documents.

FR4.2: The system shall require identity documents (ID card, citizenship, passport) for verification.

FR4.3: The system shall upload documents to AWS S3 with secure access controls.

FR4.4: The system shall send email notification upon application submission.

FR4.5: The system shall allow admins to review organizer applications.

FR4.6: The system shall allow admins to approve applications, upgrading user role to ORGANIZER.

FR4.7: The system shall allow admins to reject applications with mandatory rejection reason.

FR4.8: The system shall delete rejected applications from database to allow reapplication.

FR4.9: The system shall send email notifications for approval/rejection decisions.

FR4.10: The system shall prevent users with pending applications from submitting new ones.

**Non-Functional Requirements:**

NFR4.1: Document upload shall support files up to 10MB.

NFR4.2: Application review shall be completed within 2-3 business days.

NFR4.3: Document storage shall use encryption at rest.

NFR4.4: Pre-signed URLs for document viewing shall expire after 1 hour.

**Business Rules:**

BR4.1: Users can only have one pending application at a time.

BR4.2: Approved organizers cannot reapply.

BR4.3: Rejected applications are deleted to allow fresh submission.

BR4.4: Rejection reason must be at least 10 characters.

BR4.5: Document URLs are accessible only to admins and the applicant.

BR4.6: Application approval requires admin role.

### 9.5.2 Use Case Diagram

```
            Organizer Application & Verification System
                    
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────┐                                                  │
│  │  User    │──────────► Apply for Organizer Status            │
│  │ (Donor)  │            │                                      │
│  └──────────┘            ├──► Fill Application Form            │
│       │                  │                                      │
│       │                  ├──► Upload Identity Documents        │
│       │                  │    (ID/Citizenship/Passport)        │
│       │                  │                                      │
│       │                  └──► Submit Application               │
│       │                       │                                 │
│       │                       └──► Receive Confirmation Email  │
│       │                                                         │
│       └─────────────────► Check Application Status             │
│                                                                 │
│  ┌──────────┐                                                  │
│  │  Admin   │──────────► View Pending Applications             │
│  └──────────┘            │                                      │
│       │                  └──► Filter by Status                 │
│       │                                                         │
│       ├─────────────────► Review Application                   │
│       │                   │                                     │
│       │                   ├──► View Documents                  │
│       │                   └──► Verify Identity                 │
│       │                                                         │
│       ├─────────────────► Approve Application                  │
│       │                   │                                     │
│       │                   ├──► Upgrade User Role               │
│       │                   └──► Send Approval Email             │
│       │                                                         │
│       └─────────────────► Reject Application                   │
│                            │                                    │
│                            ├──► Provide Rejection Reason       │
│                            ├──► Delete Application             │
│                            └──► Send Rejection Email           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.5.3 Activity Diagram - Application Approval/Rejection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│            Organizer Application Review Process                  │
└─────────────────────────────────────────────────────────────────┘

    [Start]
       │
       ▼
  ┌─────────────────┐
  │ Admin views     │
  │ pending         │
  │ applications    │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Admin selects   │
  │ application to  │
  │ review          │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Admin views     │
  │ applicant       │
  │ documents       │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Admin verifies  │
  │ identity and    │
  │ documents       │
  └────────┬────────┘
           │
           ▼
      ◇ Approve?
     /         \
   No           Yes
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Start database  │
   │    │ transaction     │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Update user     │
   │    │ role to         │
   │    │ ORGANIZER       │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Set             │
   │    │ isOrganizer     │
   │    │ Approved = true │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Delete          │
   │    │ application     │
   │    │ record          │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Commit          │
   │    │ transaction     │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Send approval   │
   │    │ email to        │
   │    │ applicant       │
   │    └────────┬────────┘
   │             │
   ▼             │
┌─────────────────┐
│ Admin enters    │
│ rejection       │
│ reason          │
│ (min 10 chars)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fetch user      │
│ details         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send rejection  │
│ email with      │
│ reason          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Delete          │
│ application     │
│ from database   │
└────────┬────────┘
         │
         │
         └────────────────┘
                │
                ▼
       ┌─────────────────┐
       │ Return response │
       │ to admin        │
       └────────┬────────┘
                │
                ▼
             [End]
```

### 9.5.4 Sequence Diagram - Application Submission

```
User      Frontend    Backend API   AWS S3    Database   Email Service
 │            │            │           │          │            │
 │ Fill form  │            │           │          │            │
 │ & upload   │            │           │          │            │
 │ documents  │            │           │          │            │
 │───────────>│            │           │          │            │
 │            │            │           │          │            │
 │            │ POST       │           │          │            │
 │            │ /organizer │           │          │            │
 │            │ /apply     │           │          │            │
 │            │───────────>│           │          │            │
 │            │            │           │          │            │
 │            │            │ Check     │          │            │
 │            │            │ existing  │          │            │
 │            │           
    │ application          │            │
 │            │            │─────────────────────>│            │
 │            │            │           │          │            │
 │            │            │ No pending│          │            │
 │            │            │<─────────────────────│            │
 │            │            │           │          │            │
 │            │            │ Upload    │          │            │
 │            │            │ documents │          │            │
 │            │            │──────────>│          │            │
 │            │            │           │          │            │
 │            │            │ S3 URLs   │          │            │
 │            │            │<──────────│          │            │
 │            │            │           │          │            │
 │            │            │ Create    │          │            │
 │            │            │ application          │            │
 │            │            │ record    │          │            │
 │            │            │─────────────────────>│            │
 │            │            │           │          │            │
 │            │            │ Application          │            │
 │            │            │ created   │          │            │
 │            │            │<─────────────────────│            │
 │            │            │           │          │            │
 │            │            │ Send submission email            │
 │            │            │─────────────────────────────────>│
 │            │            │           │          │            │
 │            │ Success    │           │          │            │
 │            │<───────────│           │          │            │
 │            │            │           │          │            │
 │ Confirmation            │           │          │            │
 │<───────────│            │           │          │            │
 │            │            │           │          │            │
```

### 9.5.5 Entity Relationship Diagram (ERD) - Organizer Application

```
┌─────────────────────────────────────────────────────────────┐
│                 OrganizerApplication                         │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│ FK  user                   : ObjectId → User (required)      │
│     fullName               : String (required, max 100)      │
│     phoneNumber            : String (required)               │
│     address                : String (required, max 200)      │
│     idType                 : Enum (ID_CARD, CITIZENSHIP,     │
│                              PASSPORT)                       │
│     idNumber               : String (required)               │
│     documents              : Object {                        │
│                                frontImage: String (S3 URL),  │
│                                backImage: String (S3 URL),   │
│                                selfieImage: String (S3 URL)  │
│                              }                               │
│     status                 : Enum (PENDING, APPROVED,        │
│                              REJECTED)                       │
│     submittedAt            : Date (auto)                     │
│     reviewedAt             : Date (optional)                 │
│ FK  reviewedBy             : ObjectId → User (optional)      │
│     rejectionReason        : String (optional, max 500)      │
│     createdAt              : Date (auto)                     │
│     updatedAt              : Date (auto)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              │ belongs to
                              │
                              │ 1
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          User                                │
├─────────────────────────────────────────────────────────────┤
│ PK  _id                    : ObjectId                        │
│     name                   : String                          │
│     email                  : String                          │
│     role                   : Enum (DONOR, ORGANIZER, ADMIN)  │
│     isOrganizerApproved    : Boolean (default: false)        │
│     isOrganizerRevoked     : Boolean (default: false)        │
└─────────────────────────────────────────────────────────────┘
```

### 9.5.6 Wireframe - Organizer Application Form

```
┌─────────────────────────────────────────────────────────────────┐
│  HopeOn                                    [Profile] [Logout]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Apply to Become an Organizer                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Full Name *                                                    │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                                                         │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  Phone Number *                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                                                         │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  Address *                                                      │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                                                         │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ID Type *                                                      │
│  ○ ID Card  ○ Citizenship  ○ Passport                          │
│                                                                 │
│  ID Number *                                                    │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                                                         │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  Upload Documents *                                             │
│                                                                 │
│  Front Side of ID                                               │
│  ┌─────────────────────────────────────┐                       │
│  │  [📁 Choose File]  No file chosen   │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  Back Side of ID                                                │
│  ┌─────────────────────────────────────┐                       │
│  │  [📁 Choose File]  No file chosen   │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  Selfie with ID                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │  [📁 Choose File]  No file chosen   │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  Max 10MB per file. Supported: JPG, PNG, PDF                   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │     Cancel       │  │  Submit Application                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                 │
│  ℹ️ Your application will be reviewed within 2-3 business days │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.5.7 Testing Strategy

**Test Cases:**

| Test ID | Test Case | Input | Expected Output | Status |
|---------|-----------|-------|-----------------|--------|
| ORG-001 | Submit application with valid data | Complete form + docs | Application created, email sent | Pass |
| ORG-002 | Submit with existing pending app | Valid data | Error: Application already exists | Pass |
| ORG-003 | Submit with file exceeding 10MB | 11MB file | Error: File too large | Pass |
| ORG-004 | Submit without required documents | Missing docs | Error: All documents required | Pass |
| ORG-005 | Admin approve application | Application ID | User role upgraded, email sent | Pass |
| ORG-006 | Admin reject with short reason | Reason < 10 chars | Error: Reason too short | Pass |
| ORG-007 | Admin reject with valid reason | Valid reason | Application deleted, email sent | Pass |
| ORG-008 | Reapply after rejection | Valid data | New application created | Pass |
| ORG-009 | View application status | User ID | Current status displayed | Pass |
| ORG-010 | Approved organizer reapply | Valid data | Error: Already an organizer | Pass |

---

## 9.6 Complete System ERD

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    User     │1      * │   Campaign   │1      * │  Donation   │
│             │────────>│              │────────>│             │
│  _id        │ owns    │  _id         │ receives│  _id        │
│  name       │         │  title       │         │  amount     │
│  email      │         │  target      │         │  method     │
│  role       │         │  owner (FK)  │         │  campaign   │
│  password   │         │  isApproved  │         │  donor (FK) │
│  Hash       │         │  isClosed    │         │  status     │
└─────────────┘         └──────────────┘         └─────────────┘
       │                                                 
       │1                                                
       │                                                 
       │                                                 
       │*                                                
┌──────────────────┐                                    
│ Organizer        │                                    
│ Application      │                                    
│                  │                                    
│  _id             │                                    
│  user (FK)       │                                    
│  fullName        │                                    
│  documents       │                                    
│  status          │                                    
└──────────────────┘                                    
       │                                                 
       │1                                                
       │                                                 
       │                                                 
       │*                                                
┌──────────────────┐                                    
│ Withdrawal       │                                    
│ Request          │                                    
│                  │                                    
│  _id             │                                    
│  organizer (FK)  │                                    
│  campaign (FK)   │                                    
│  amount          │                                    
│  status          │                                    
└──────────────────┘                                    
```

## 9.7 Conclusion

This section has presented comprehensive design artifacts for the major subsystems of the HopeOn crowdfunding platform. Each subsystem includes:

- Detailed Software Requirements Specification (SRS) with functional, non-functional requirements, and business rules
- Use Case Diagrams showing actor interactions
- Activity Diagrams illustrating process flows
- Sequence Diagrams demonstrating component interactions
- Class Diagrams showing object-oriented design
- Entity Relationship Diagrams (ERD) defining data structures
- Wireframes for key user interfaces
- Testing strategies with specific test cases

The designs follow industry-standard UML notation and demonstrate a well-architected system with clear separation of concerns, proper data modeling, and comprehensive coverage of user requirements. The modular design enables independent development and testing of subsystems while maintaining system cohesion through well-defined interfaces.

Additional subsystems (Email Notification System, Withdrawal Management, Admin Dashboard, Organizer Revocation System) follow similar design patterns and are documented in the project codebase with inline documentation and README files.
