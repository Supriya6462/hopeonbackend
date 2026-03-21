Trello + npm

## 8.8 Conclusion

Each technology and tool was selected based on specific project requirements rather than popularity or familiarity. The choices prioritize security (TypeScript, bcryptjs, JWT), developer productivity (Vite, Tailwind, TanStack Query), scalability (MongoDB, AWS S3, Node.js), and maintainability (TypeScript, React components, Express middleware). This technology stack provides a solid foundation for building a secure, scalable, and user-friendly crowdfunding platform.
n and has fewer compatibility issues than pnpm.

## 8.7 Technology Stack Summary

**Frontend:** React.js + TypeScript + Vite + Tailwind CSS + shadcn/ui + Radix UI + TanStack Query + React Router + Axios + Lucide + date-fns + Sonner

**Backend:** Node.js + Express.js + TypeScript + MongoDB + Mongoose + AWS S3 + bcryptjs + jsonwebtoken + Nodemailer + Multer + CORS + dotenv

**Payment Gateways:** Khalti + eSewa + PayPal + Cryptocurrency

**Development Tools:** VS Code + Git/GitHub + Postman + MongoDB Compass + ng → Done) provides intuitive progress tracking, easy prioritization through drag-and-drop, task checklists, categorization labels, and deadline tracking. It's simpler than Jira (too complex for solo projects) and more intuitive than GitHub Projects.

### 8.6.6 Package Manager - npm

**Why npm was chosen:**

npm is the default Node.js package manager with the largest registry (over 2 million packages), lock files ensuring consistent installs, and script support for common tasks. It's more widely used than Yarvalidation, and generates API documentation from collections.

### 8.6.4 Database Management - MongoDB Compass

**Why MongoDB Compass was chosen:**

Compass provides visual query building, schema analysis for identifying data inconsistencies, index management for performance optimization, performance insights for slow query analysis, and data import/export capabilities.

### 8.6.5 Task Management - Trello

**Why Trello was chosen:**

Trello's visual kanban board approach (Backlog → To Do → In Progress → Testire chosen:**

Git provides distributed version control for tracking changes, reverting to previous versions, and branching for feature development. GitHub offers remote backup, issue tracking, project boards, and portfolio showcase for career purposes.

### 8.6.3 API Testing - Postman

**Why Postman was chosen:**

Postman organizes endpoints into collections, supports environment variables for different configurations, enables pre-request scripts for automatic token setting, provides test scripts for response ode provides best-in-class TypeScript support (developed by Microsoft, creators of TypeScript) with real-time type checking, intelligent code completion, and refactoring tools. The integrated terminal, rich extension ecosystem (ESLint, Prettier, GitLens, Tailwind IntelliSense), built-in debugger, and free cross-platform availability made it the ideal choice over WebStorm (paid), Sublime Text (weaker TypeScript support), or Atom (slower performance).

### 8.6.2 Version Control - Git and GitHub

**Why Git and GitHub weegrated:**

PayPal enables international donations from diaspora donors, supports multiple currencies, provides buyer protection, and offers trusted brand recognition globally.

### 8.5.4 Cryptocurrency

**Why Cryptocurrency was included:**

Cryptocurrency payments provide decentralized, censorship-resistant donations with lower fees for international transfers, privacy for donors, and showcase platform innovation.

## 8.6 Development Tools

### 8.6.1 IDE - Visual Studio Code

**Why VS Code was chosen:**

VS Cti is Nepal's leading digital wallet with the largest user base. Integration was essential for reaching Nepalese donors who prefer local payment methods, offering lower transaction fees than international gateways and instant payment confirmation with NPR currency support.

### 8.5.2 eSewa

**Why eSewa was integrated:**

eSewa is Nepal's oldest and most trusted digital wallet. Integration provides payment method choice and covers maximum Nepalese market share alongside Khalti.

### 8.5.3 PayPal

**Why PayPal was inttorage.

**Nodemailer:** Email sending with support for multiple services, HTML templates, and attachments.

**Multer:** Express middleware for handling multipart/form-data file uploads with size and type validation.

**CORS:** Middleware enabling frontend-backend communication across different origins with credential support.

**dotenv:** Loads environment variables from .env files, keeping secrets out of source code.

## 8.5 Payment Gateway Integration

### 8.5.1 Khalti

**Why Khalti was integrated:**

KhalLs for temporary access. Direct browser uploads using pre-signed POST URLs reduce server load.

Alternatives like local file system (not scalable, no redundancy) or database storage (inefficient for large files) were unsuitable for production requirements.

### 8.4.5 Supporting Backend Libraries

**bcryptjs:** Industry-standard password hashing with automatic salt generation and configurable work factor.

**jsonwebtoken:** Stateless JWT authentication enabling scalability across multiple servers without session spt integration. This adds structure to MongoDB while maintaining flexibility.

### 8.4.4 AWS S3

**Why AWS S3 was chosen:**

S3 provides virtually unlimited, automatically scaling storage with 99.999999999% durability guarantee. The pay-as-you-go pricing with a generous free tier (5GB storage, 20,000 GET requests monthly) makes it cost-effective for development and initial deployment.

Comprehensive security features include IAM policies, encryption at rest and in transit, versioning, access logging, and pre-signed URike format, making it natural for JavaScript/TypeScript applications. Data retrieved from MongoDB can be used directly without ORM mapping overhead.

MongoDB's horizontal scalability through sharding enables growth by adding servers rather than upgrading hardware. Embedded documents reduce the need for joins, improving read performance for common queries.

**Why Mongoose was chosen:**

Mongoose provides schema validation ensuring data integrity, middleware for pre/post hooks, virtual properties, and TypeScrities for organizing API endpoints.

Alternatives like Fastify (smaller ecosystem), Koa (smaller community), or NestJS (too heavyweight) were not suitable for this project's requirements.

### 8.4.3 MongoDB with Mongoose

**Why MongoDB was chosen:**

MongoDB's flexible schema accommodates varying campaign data structures without complex table designs. Different campaign types (medical, startup, community) can have different fields without requiring schema migrations.

The document model stores data in JSON-lthentication libraries.

### 8.4.2 Express.js

**Why Express.js was chosen:**

Express's minimalist, unopinionated design provides essential web server functionality without imposing architectural constraints. The middleware architecture enables clean separation of concerns (authentication, authorization, error handling) through a modular pattern.

Express's maturity means extensive middleware availability for common tasks (CORS, body parsing, file uploads, compression, rate limiting) and robust routing capabiliend (type definitions, validation logic, utility functions). This reduces context switching and allows single language expertise.

Node.js's non-blocking I/O architecture efficiently handles concurrent operations like multiple payment gateway requests, database queries, file uploads to S3, and email sending—all common in HopeOn's workflow.

The npm ecosystem provides over 2 million packages, offering solutions for every backend requirement including payment gateway SDKs, AWS integration, email sending, and aule icons with consistent design and TypeScript support.

**date-fns:** Modular date manipulation library chosen over deprecated moment.js for smaller bundle size and immutable operations.

**Sonner:** Elegant toast notifications with automatic stacking, minimal configuration, and promise-based API for async operations.

## 8.4 Backend Technologies

### 8.4.1 Node.js

**Why Node.js was chosen:**

Using Node.js allows JavaScript/TypeScript across the entire stack, enabling code sharing between frontend and backhy Axios was chosen:**

Axios automatically transforms JSON data in requests and responses, eliminating manual parsing required with the Fetch API. Interceptors allow adding authentication tokens and handling errors globally, reducing repetitive code across the application.

Request cancellation prevents memory leaks when components unmount, and progress tracking supports file upload feedback for campaign images and organizer documents.

### 8.3.8 Supporting Frontend Libraries

**Lucide React:** Provides tree-shakeabexity.

### 8.3.6 React Router

**Why React Router was chosen:**

React Router's declarative routing approach makes navigation configuration intuitive and maintainable. Nested routes allow sharing layouts across multiple pages, reducing code duplication. Protected routes for authentication are easily implemented, ensuring only authorized users access sensitive pages.

React Router is the de facto standard for React applications with the largest community and best ecosystem integration.

### 8.3.7 Axios

**Wre server responses arrive. Request deduplication prevents multiple components from making redundant API calls.

Using plain Axios would require manually implementing all these features, significantly increasing development time and code complnagement.

### 8.3.5 TanStack Query (React Query)

**Why TanStack Query was chosen:**

TanStack Query automatically caches API responses and refetches data in the background, ensuring users always see fresh data without manual cache management. This is crucial for HopeOn where campaign data (raised amounts, donor counts) changes frequently.

The library provides loading, error, and success states automatically, eliminating boilerplate code. Optimistic updates make the application feel instant by updating the UI befocomponents are copied directly into the project. This provides full control over component code and styling without version conflicts or breaking changes from library updates.

Radix UI primitives provide unstyled, accessible components following WAI-ARIA standards, ensuring HopeOn is usable by people with disabilities. The headless UI pattern separates behavior (Radix) from styling (Tailwind), allowing complete visual customization while maintaining proper keyboard navigation, screen reader support, and focus mascales, preventing arbitrary values that lead to inconsistent UI. The purge feature removes unused styles, resulting in tiny CSS files (under 10KB) in production.

Unlike Bootstrap or Material-UI which impose specific design aesthetics, Tailwind is unopinionated, allowing HopeOn's unique branding to be implemented without fighting framework defaults.

### 8.3.4 shadcn/ui and Radix UI

**Why shadcn/ui and Radix UI were chosen:**

Rather than installing a traditional component library as an npm package, shadcn/ui matic code splitting, resulting in faster page loads for users.

### 8.3.3 Tailwind CSS

**Why Tailwind CSS was chosen:**

Tailwind's utility-first approach allows styling directly in JSX without switching between files or inventing class names, significantly accelerating UI development. The responsive modifiers make creating mobile-first designs straightforward, essential for a platform accessed primarily on mobile devices.

Tailwind enforces design consistency through predefined spacing, colors, and sizing stry demand made it the clear choice over alternatives like Vue.js or Angular.

### 8.3.2 Vite

**Why Vite was chosen:**

Vite provides near-instantaneous development server startup and hot module replacement, dramatically improving development productivity compared to traditional bundlers like Webpack or Create React App. Changes appear in the browser within milliseconds, maintaining application state during development.

For production builds, Vite uses Rollup to generate highly optimized bundles with autoucture, where elements like campaign cards, donation forms, and payment modals are reused throughout the application. This reusability reduces code duplication and ensures UI consistency.

The large ecosystem provides battle-tested solutions for common challenges (routing, state management, form handling), accelerating development. React's virtual DOM ensures efficient updates, crucial for displaying dynamic content like real-time donation amounts and campaign lists.

React's strong TypeScript integration and indunterface, the frontend can use the same types, preventing mismatches in data structure expectations.

TypeScript's enhanced IDE support provides intelligent code completion and inline documentation, significantly improving development speed and reducing bugs. The self-documenting nature of type definitions makes the codebase easier to maintain and understand.

## 8.3 Frontend Technologies

### 8.3.1 React.js

**Why React.js was chosen:**

React's component-based architecture perfectly matches HopeOn's UI stres a Campaign iypeScript

**Why TypeScript was chosen:**

TypeScript was selected over JavaScript for both frontend and backend development because it provides static type checking that catches errors during development rather than in production. For a financial platform handling real money transactions, this significantly reduces the risk of runtime errors that could affect payments or user data.

The ability to share type definitions between frontend and backend ensures consistency across the full stack. When the backend definnd tools used in developing the HopeOn crowdfunding platform. The focus is on explaining why each technology was chosen rather than describing what it is, demonstrating how each choice aligns with project requirements for security, scalability, and maintainability.

## 8.2 Programming Languages

### 8.2.1 T# 8. DIFFERENT TECHNOLOGY AND TOOLS USED FOR THE PROJECT

## 8.1 Introduction

