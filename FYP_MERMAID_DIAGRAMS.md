# Mermaid Diagrams for HopeOn Platform

This file contains all the Mermaid diagram codes for the HopeOn crowdfunding platform. You can copy these codes and paste them into:
- GitHub Markdown files
- Mermaid Live Editor (https://mermaid.live/)
- VS Code with Mermaid extension
- Any documentation tool that supports Mermaid

---

## 1. Authentication & User Management

### 1.1 Use Case Diagram

```mermaid
graph TB
    subgraph "Authentication & User Management System"
        Donor[Donor]
        Organizer[Organizer]
        Admin[Admin]
        
        Register[Register]
        SendOTP[Send OTP Email]
        VerifyOTP[Verify OTP]
        Login[Login]
        GenerateJWT[Generate JWT Token]
        ViewProfile[View Profile]
        UpdateProfile[Update Profile]
        ResetPassword[Reset Password]
        RequestOTP[Request OTP]
        VerifyResetOTP[Verify OTP & Update Password]
        ManageRoles[Manage User Roles]
        
        Donor --> Register
        Register --> SendOTP
        Register --> VerifyOTP
        Donor --> Login
        Login --> GenerateJWT
        Donor --> ViewProfile
        Donor --> UpdateProfile
        Donor --> ResetPassword
        ResetPassword --> RequestOTP
        ResetPassword --> VerifyResetOTP
        
        Organizer -.->|inherits| Donor
        Admin -.->|inherits| Organizer
        Admin --> ManageRoles
    end
```

### 1.2 Activity Diagram - User Registration

```mermaid
flowchart TD
    Start([Start]) --> EnterDetails[User enters registration details]
    EnterDetails --> ValidateInput{Validate input<br/>email format,<br/>password length}
    
    ValidateInput -->|Invalid| ReturnError1[Return error message]
    ValidateInput -->|Valid| CheckEmail[Check if email already exists]
    
    CheckEmail -->|Exists| ReturnError2[Return error:<br/>Email already exists]
    CheckEmail -->|Not exists| HashPassword[Hash password using bcrypt]
    
    HashPassword --> GenerateOTP[Generate OTP<br/>6-digit code]
    GenerateOTP --> SavePending[Save pending registration to database]
    SavePending --> SendEmail[Send OTP email]
    SendEmail --> UserEntersOTP[User enters OTP]
    
    UserEntersOTP --> ValidateOTP{OTP Valid?<br/>Not expired?}
    ValidateOTP -->|Invalid/Expired| ReturnError3[Return error:<br/>Invalid or expired OTP]
    ValidateOTP -->|Valid| CreateUser[Create user account]
    
    CreateUser --> DeletePending[Delete pending registration]
    DeletePending --> ReturnSuccess[Return success response]
    
    ReturnError1 --> End([End])
    ReturnError2 --> End
    ReturnError3 --> End
    ReturnSuccess --> End
```

### 1.3 Sequence Diagram - Login Process

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend as Backend API
    participant DB as Database
    participant JWT as JWT Service
    
    User->>Frontend: Enter email & password
    Frontend->>Backend: POST /api/auth/login
    Backend->>DB: Find user by email
    DB-->>Backend: User data
    Backend->>Backend: Compare password hash (bcrypt)
    Backend->>JWT: Generate JWT token
    JWT-->>Backend: JWT Token
    Backend-->>Frontend: Response: {token, user}
    Frontend-->>User: Login success + JWT stored
```

### 1.4 Entity Relationship Diagram - User

```mermaid
erDiagram
    USER ||--o{ PENDING_REGISTRATION : "references"
    USER ||--o{ OTP : "has"
    
    USER {
        ObjectId _id PK
        String name
        String email UK
        String passwordHash
        Enum role
        String phoneNumber
        String image
        Boolean isEmailVerified
        Boolean isOrganizerApproved
        Boolean isOrganizerRevoked
        Date revokedAt
        ObjectId revokedBy FK
        String revocationReason
        String resetToken
        Date resetTokenExpiry
        Date createdAt
        Date updatedAt
    }
    
    PENDING_REGISTRATION {
        ObjectId _id PK
        String name
        String email
        String passwordHash
        String phoneNumber
        Date createdAt
    }
    
    OTP {
        ObjectId _id PK
        String email
        String code
        Enum type
        Date expiresAt
        Date createdAt
    }
```

### 1.5 Class Diagram - Authentication Module

```mermaid
classDiagram
    class AuthController {
        -authService: AuthService
        +register(req, res) Promise~void~
        +verifyOTP(req, res) Promise~void~
        +login(req, res) Promise~void~
        +getProfile(req, res) Promise~void~
        +updateProfile(req, res) Promise~void~
        +requestPasswordReset(req, res) Promise~void~
        +resetPassword(req, res) Promise~void~
    }
    
    class AuthService {
        -userModel: Model~IUser~
        -pendingRegModel: Model~IPendingRegistration~
        -otpModel: Model~IOTP~
        +register(data) Promise~Object~
        +verifyOTP(email, code) Promise~IUser~
        +login(email, password) Promise~Object~
        +getProfile(userId) Promise~IUser~
        +updateProfile(userId, data) Promise~IUser~
        +requestPasswordReset(email) Promise~Object~
        +resetPassword(email, code, newPassword) Promise~void~
    }
    
    class PasswordUtil {
        +hashPassword(password) Promise~string~
        +comparePassword(password, hash) Promise~boolean~
    }
    
    class JWTUtil {
        +generateToken(payload) string
        +verifyToken(token) object
    }
    
    class AuthMiddleware {
        +authenticate(req, res, next) Promise~void~
        +requireRole(role) Middleware
    }
    
    AuthController --> AuthService : uses
    AuthService --> PasswordUtil : uses
    AuthService --> JWTUtil : uses
```

---

## 2. Campaign Management

### 2.1 Use Case Diagram

```mermaid
graph TB
    subgraph "Campaign Management System"
        Donor[Donor]
        Organizer[Organizer]
        Admin[Admin]
        
        Browse[Browse Campaigns]
        Search[Search Campaigns]
        ViewDetails[View Campaign Details]
        ViewRaised[View Raised Amount]
        ViewDonors[View Donor Count]
        ViewImages[View Campaign Images]
        
        Create[Create Campaign]
        UploadImages[Upload Images to S3]
        SubmitApproval[Submit for Approval]
        ViewMy[View My Campaigns]
        Edit[Edit Campaign]
        UpdateDetails[Update Details]
        
        Approve[Approve Campaign]
        MakeVisible[Make Publicly Visible]
        Reject[Reject Campaign]
        ProvideReason[Provide Rejection Reason]
        Close[Close Campaign]
        ClosureReason[Provide Closure Reason]
        
        Donor --> Browse
        Browse --> Search
        Donor --> ViewDetails
        ViewDetails --> ViewRaised
        ViewDetails --> ViewDonors
        ViewDetails --> ViewImages
        
        Organizer --> Create
        Create --> UploadImages
        Create --> SubmitApproval
        Organizer --> ViewMy
        Organizer --> Edit
        Edit --> UpdateDetails
        Organizer -.->|inherits| Donor
        
        Admin --> Approve
        Approve --> MakeVisible
        Admin --> Reject
        Reject --> ProvideReason
        Admin --> Close
        Close --> ClosureReason
        Admin -.->|inherits| Organizer
    end
```

### 2.2 Activity Diagram - Campaign Creation

```mermaid
flowchart TD
    Start([Start]) --> FillForm[Organizer fills campaign form<br/>title, description, target, type]
    FillForm --> SelectImages[Organizer selects images<br/>up to 5]
    SelectImages --> ValidateInputs{Validate inputs<br/>Title length<br/>Target > 0<br/>Image size}
    
    ValidateInputs -->|Invalid| ReturnError1[Return error message]
    ValidateInputs -->|Valid| CheckStatus{Check organizer status<br/>Approved &<br/>Not Revoked?}
    
    CheckStatus -->|No| ReturnError2[Return error:<br/>Not authorized]
    CheckStatus -->|Yes| UploadS3[Upload images to AWS S3]
    
    UploadS3 --> GetURLs[Get S3 URLs]
    GetURLs --> CreateCampaign[Create campaign in database<br/>isApproved: false]
    CreateCampaign --> SendEmail[Send email to admin<br/>for approval]
    SendEmail --> ReturnSuccess[Return success response]
    
    ReturnError1 --> End([End])
    ReturnError2 --> End
    ReturnSuccess --> End
```

### 2.3 Sequence Diagram - Campaign Approval

```mermaid
sequenceDiagram
    actor Admin
    participant Frontend
    participant Backend as Backend API
    participant DB as Database
    participant Email as Email Service
    
    Admin->>Frontend: View pending campaigns
    Frontend->>Backend: GET /api/admin/campaigns?status=pending
    Backend->>DB: Find pending campaigns
    DB-->>Backend: Campaign list
    Backend-->>Frontend: Campaign list
    Frontend-->>Admin: Display list
    
    Admin->>Frontend: Click approve
    Frontend->>Backend: PATCH /api/admin/campaigns/:id/approve
    Backend->>DB: Update isApproved = true
    DB-->>Backend: Updated campaign
    Backend->>Email: Send approval email to organizer
    Backend-->>Frontend: Success
    Frontend-->>Admin: Show success message
```

### 2.4 Entity Relationship Diagram - Campaign

```mermaid
erDiagram
    CAMPAIGN ||--|| USER : "owned by"
    
    CAMPAIGN {
        ObjectId _id PK
        String title
        String description
        Array images
        Number target
        Enum fundingType
        ObjectId owner FK
        Boolean isApproved
        Boolean isClosed
        String closedReason
        Date createdAt
        Date updatedAt
    }
    
    USER {
        ObjectId _id PK
        String name
        String email
        Enum role
        Boolean isOrganizerApproved
        Boolean isOrganizerRevoked
    }
```

---

## 3. Payment Processing & Donation Management

### 3.1 Use Case Diagram

```mermaid
graph TB
    subgraph "Payment Processing & Donation System"
        Donor[Donor]
        Organizer[Organizer]
        Admin[Admin]
        
        MakeDonation[Make Donation]
        SelectMethod[Select Payment Method]
        InitiatePayment[Initiate Payment]
        CreateRecord[Create Donation Record]
        RedirectGateway[Redirect to Gateway]
        CompletePayment[Complete Payment on Gateway]
        VerifyPayment[Verify Payment]
        ConfirmGateway[Confirm with Gateway]
        UpdateStatus[Update Donation Status]
        UpdateAmount[Update Campaign Amount]
        
        ViewHistory[View Donation History]
        FilterCampaign[Filter by Campaign]
        FilterStatus[Filter by Status]
        DownloadReceipt[Download Donation Receipt]
        
        ViewCampaignDonations[View Campaign Donations]
        ViewDonorList[View Donor List]
        ViewTotalRaised[View Total Raised]
        
        ViewAllDonations[View All Donations]
        GenerateReports[Generate Reports]
        
        Donor --> MakeDonation
        MakeDonation --> SelectMethod
        MakeDonation --> InitiatePayment
        InitiatePayment --> CreateRecord
        InitiatePayment --> RedirectGateway
        MakeDonation --> CompletePayment
        MakeDonation --> VerifyPayment
        VerifyPayment --> ConfirmGateway
        VerifyPayment --> UpdateStatus
        VerifyPayment --> UpdateAmount
        
        Donor --> ViewHistory
        ViewHistory --> FilterCampaign
        ViewHistory --> FilterStatus
        Donor --> DownloadReceipt
        
        Organizer --> ViewCampaignDonations
        ViewCampaignDonations --> ViewDonorList
        ViewCampaignDonations --> ViewTotalRaised
        Organizer -.->|inherits| Donor
        
        Admin --> ViewAllDonations
        ViewAllDonations --> GenerateReports
        Admin -.->|inherits| Organizer
    end
```

### 3.2 Activity Diagram - Payment Flow

```mermaid
flowchart TD
    Start([Start]) --> SelectCampaign[Donor selects campaign<br/>and enters amount]
    SelectCampaign --> SelectPayment[Donor selects payment method<br/>Khalti/eSewa/PayPal/Crypto]
    SelectPayment --> ValidateAmount{Validate amount<br/>and campaign status}
    
    ValidateAmount -->|Invalid| ReturnError1[Return error message]
    ValidateAmount -->|Valid| CreateDonation[Create donation record<br/>with PENDING status]
    
    CreateDonation --> CallFactory[Call Payment Factory<br/>to get provider]
    CallFactory --> InitiatePayment[Initiate payment<br/>with provider API]
    InitiatePayment --> GetRedirect[Get redirect URL<br/>or form data]
    GetRedirect --> RedirectDonor[Redirect donor to<br/>payment gateway]
    RedirectDonor --> CompleteOnGateway[Donor completes payment<br/>on gateway site]
    CompleteOnGateway --> GatewayRedirect[Gateway redirects back<br/>with transaction ID]
    GatewayRedirect --> VerifyWithProvider[Verify payment<br/>with provider API]
    
    VerifyWithProvider --> CheckVerified{Verified?}
    CheckVerified -->|No| ReturnError2[Return error:<br/>Verification failed]
    CheckVerified -->|Yes| UpdateDonationStatus[Update donation status<br/>to COMPLETED]
    
    UpdateDonationStatus --> UpdateCampaignAmount[Update campaign<br/>raised amount]
    UpdateCampaignAmount --> SendConfirmation[Send donation<br/>confirmation email]
    SendConfirmation --> ReturnSuccess[Return response to donor]
    
    ReturnError1 --> End([End])
    ReturnError2 --> End
    ReturnSuccess --> End
```

### 3.3 Sequence Diagram - Multi-Gateway Payment

```mermaid
sequenceDiagram
    actor Donor
    participant Frontend
    participant PaymentService as Payment Service
    participant Factory as Payment Factory
    participant Provider as Khalti/eSewa/PayPal API
    participant DB as Database
    
    Donor->>Frontend: Select payment method
    Frontend->>PaymentService: POST /api/payments/initiate
    PaymentService->>Factory: Get Provider (Strategy Pattern)
    Factory-->>PaymentService: Provider Instance
    PaymentService->>Provider: Call provider.initiate()
    Provider-->>PaymentService: Payment URL
    PaymentService->>DB: Create donation record
    PaymentService-->>Frontend: Redirect URL
    Frontend-->>Donor: Redirect to Gateway
    
    Donor->>Provider: Complete Payment
    Provider-->>Donor: Redirect with transaction ID
    
    Donor->>Frontend: Callback
    Frontend->>PaymentService: POST /api/payments/verify
    PaymentService->>Factory: Get Provider
    PaymentService->>Provider: Call provider.verify()
    Provider-->>PaymentService: Verified
    PaymentService->>DB: Update donation status
    PaymentService-->>Frontend: Success
    Frontend-->>Donor: Show Success
```

### 3.4 Class Diagram - Payment Architecture

```mermaid
classDiagram
    class IPaymentProvider {
        <<interface>>
        +initiate(payload) Promise~PaymentInitResponse~
        +verify(payload) Promise~PaymentVerifyResponse~
    }
    
    class KhaltiProvider {
        +initiate(payload) Promise~PaymentInitResponse~
        +verify(payload) Promise~PaymentVerifyResponse~
    }
    
    class EsewaProvider {
        +initiate(payload) Promise~PaymentInitResponse~
        +verify(payload) Promise~PaymentVerifyResponse~
    }
    
    class PayPalProvider {
        +initiate(payload) Promise~PaymentInitResponse~
        +verify(payload) Promise~PaymentVerifyResponse~
    }
    
    class PaymentFactory {
        +create(provider) IPaymentProvider
    }
    
    class PaymentService {
        -factory: PaymentFactory
        -donationModel: Model~IDonation~
        +initiatePayment(data) Promise~PaymentInitResponse~
        +verifyPayment(data) Promise~PaymentVerifyResponse~
    }
    
    class DonationService {
        +createDonation(data) Promise~IDonation~
        +updateDonationStatus(id, status) Promise~IDonation~
        +getDonationHistory(userId) Promise~IDonation[]~
    }
    
    IPaymentProvider <|.. KhaltiProvider : implements
    IPaymentProvider <|.. EsewaProvider : implements
    IPaymentProvider <|.. PayPalProvider : implements
    PaymentFactory --> IPaymentProvider : creates
    PaymentService --> PaymentFactory : uses
    PaymentService --> DonationService : uses
```

### 3.5 Entity Relationship Diagram - Donation

```mermaid
erDiagram
    DONATION }o--|| CAMPAIGN : "belongs to"
    DONATION }o--o| USER : "made by"
    
    DONATION {
        ObjectId _id PK
        ObjectId campaign FK
        ObjectId donor FK
        String donorEmail
        String donorName
        Number amount
        Enum method
        Enum status
        String providerTransactionId
        String message
        Boolean isAnonymous
        Date createdAt
        Date updatedAt
    }
    
    CAMPAIGN {
        ObjectId _id PK
        String title
        Number target
        Enum fundingType
        ObjectId owner FK
    }
    
    USER {
        ObjectId _id PK
        String name
        String email
        Enum role
    }
```

---

## 4. Organizer Application & Verification

### 4.1 Use Case Diagram

```mermaid
graph TB
    subgraph "Organizer Application & Verification System"
        User[User/Donor]
        Admin[Admin]
        
        Apply[Apply for Organizer Status]
        FillForm[Fill Application Form]
        UploadDocs[Upload Identity Documents]
        SubmitApp[Submit Application]
        ReceiveEmail[Receive Confirmation Email]
        CheckStatus[Check Application Status]
        
        ViewPending[View Pending Applications]
        FilterStatus[Filter by Status]
        ReviewApp[Review Application]
        ViewDocs[View Documents]
        VerifyIdentity[Verify Identity]
        ApproveApp[Approve Application]
        UpgradeRole[Upgrade User Role]
        SendApproval[Send Approval Email]
        RejectApp[Reject Application]
        ProvideReason[Provide Rejection Reason]
        DeleteApp[Delete Application]
        SendRejection[Send Rejection Email]
        
        User --> Apply
        Apply --> FillForm
        Apply --> UploadDocs
        Apply --> SubmitApp
        SubmitApp --> ReceiveEmail
        User --> CheckStatus
        
        Admin --> ViewPending
        ViewPending --> FilterStatus
        Admin --> ReviewApp
        ReviewApp --> ViewDocs
        ReviewApp --> VerifyIdentity
        Admin --> ApproveApp
        ApproveApp --> UpgradeRole
        ApproveApp --> SendApproval
        Admin --> RejectApp
        RejectApp --> ProvideReason
        RejectApp --> DeleteApp
        RejectApp --> SendRejection
    end
```

### 4.2 Activity Diagram - Application Review

```mermaid
flowchart TD
    Start([Start]) --> ViewPending[Admin views pending applications]
    ViewPending --> SelectApp[Admin selects application to review]
    SelectApp --> ViewDocs[Admin views applicant documents]
    ViewDocs --> VerifyIdentity[Admin verifies identity and documents]
    
    VerifyIdentity --> Decision{Approve?}
    
    Decision -->|Yes| StartTransaction[Start database transaction]
    StartTransaction --> UpdateRole[Update user role to ORGANIZER]
    UpdateRole --> SetApproved[Set isOrganizerApproved = true]
    SetApproved --> DeleteAppRecord[Delete application record]
    DeleteAppRecord --> CommitTransaction[Commit transaction]
    CommitTransaction --> SendApprovalEmail[Send approval email to applicant]
    SendApprovalEmail --> ReturnSuccess[Return success response]
    
    Decision -->|No| EnterReason[Admin enters rejection reason<br/>min 10 characters]
    EnterReason --> FetchUser[Fetch user details]
    FetchUser --> SendRejectionEmail[Send rejection email with reason]
    SendRejectionEmail --> DeleteApplication[Delete application from database]
    DeleteApplication --> ReturnRejection[Return rejection response]
    
    ReturnSuccess --> End([End])
    ReturnRejection --> End
```

### 4.3 Sequence Diagram - Application Submission

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend as Backend API
    participant S3 as AWS S3
    participant DB as Database
    participant Email as Email Service
    
    User->>Frontend: Fill form & upload documents
    Frontend->>Backend: POST /api/organizer/apply
    Backend->>DB: Check existing application
    DB-->>Backend: No pending application
    Backend->>S3: Upload documents
    S3-->>Backend: S3 URLs
    Backend->>DB: Create application record
    DB-->>Backend: Application created
    Backend->>Email: Send submission email
    Backend-->>Frontend: Success
    Frontend-->>User: Confirmation message
```

### 4.4 Entity Relationship Diagram - Organizer Application

```mermaid
erDiagram
    ORGANIZER_APPLICATION ||--|| USER : "belongs to"
    
    ORGANIZER_APPLICATION {
        ObjectId _id PK
        ObjectId user FK
        String fullName
        String phoneNumber
        String address
        Enum idType
        String idNumber
        Object documents
        Enum status
        Date submittedAt
        Date reviewedAt
        ObjectId reviewedBy FK
        String rejectionReason
        Date createdAt
        Date updatedAt
    }
    
    USER {
        ObjectId _id PK
        String name
        String email
        Enum role
        Boolean isOrganizerApproved
        Boolean isOrganizerRevoked
    }
```

---

## 5. Complete System ERD

```mermaid
erDiagram
    USER ||--o{ CAMPAIGN : owns
    USER ||--o{ DONATION : makes
    USER ||--o{ ORGANIZER_APPLICATION : submits
    USER ||--o{ WITHDRAWAL_REQUEST : creates
    CAMPAIGN ||--o{ DONATION : receives
    CAMPAIGN ||--o{ WITHDRAWAL_REQUEST : "funds from"
    
    USER {
        ObjectId _id PK
        String name
        String email UK
        String passwordHash
        Enum role
        String phoneNumber
        String image
        Boolean isEmailVerified
        Boolean isOrganizerApproved
        Boolean isOrganizerRevoked
        Date revokedAt
        ObjectId revokedBy FK
        String revocationReason
        Date createdAt
        Date updatedAt
    }
    
    CAMPAIGN {
        ObjectId _id PK
        String title
        String description
        Array images
        Number target
        Enum fundingType
        ObjectId owner FK
        Boolean isApproved
        Boolean isClosed
        String closedReason
        Date createdAt
        Date updatedAt
    }
    
    DONATION {
        ObjectId _id PK
        ObjectId campaign FK
        ObjectId donor FK
        String donorEmail
        String donorName
        Number amount
        Enum method
        Enum status
        String providerTransactionId
        String message
        Boolean isAnonymous
        Date createdAt
        Date updatedAt
    }
    
    ORGANIZER_APPLICATION {
        ObjectId _id PK
        ObjectId user FK
        String fullName
        String phoneNumber
        String address
        Enum idType
        String idNumber
        Object documents
        Enum status
        Date submittedAt
        Date reviewedAt
        ObjectId reviewedBy FK
        String rejectionReason
        Date createdAt
        Date updatedAt
    }
    
    WITHDRAWAL_REQUEST {
        ObjectId _id PK
        ObjectId organizer FK
        ObjectId campaign FK
        Number amount
        Enum status
        String bankDetails
        Date requestedAt
        Date processedAt
        ObjectId processedBy FK
        String rejectionReason
        Date createdAt
        Date updatedAt
    }
```

---

## How to Use These Diagrams

1. **GitHub/GitLab**: Copy the code blocks and paste them in your markdown files. They will render automatically.

2. **Mermaid Live Editor**: 
   - Go to https://mermaid.live/
   - Paste the code
   - Export as PNG/SVG for your report

3. **VS Code**:
   - Install "Markdown Preview Mermaid Support" extension
   - Create a .md file and paste the code
   - Preview the markdown file

4. **Documentation Tools**:
   - Most modern documentation tools (Notion, Confluence, etc.) support Mermaid
   - Simply paste the code in a Mermaid code block

5. **For Your FYP Report**:
   - Export diagrams as high-resolution PNG or SVG
   - Insert them into your Word/PDF document
   - Ensure they are readable when printed

## Tips for Better Diagrams

- Adjust node spacing by modifying the graph direction (TB, LR, RL, BT)
- Use subgraphs to group related components
- Add colors using `style` commands if needed
- Keep diagrams focused on one aspect at a time
- Use consistent naming conventions across all diagrams
