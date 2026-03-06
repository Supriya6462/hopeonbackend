# 8. DIFFERENT TECHNOLOGY AND TOOLS USED FOR THE PROJECT

## 8.1 Introduction

This section justifies the selection of technologies and tools used in developing the HopeOn crowdfunding platform. The focus is on explaining why each technology was chosen rather than describing what it is.

## 8.2 Programming Language

### TypeScript

**Why chosen:** TypeScript provides static type checking that catches errors during development rather than in production—critical for a financial platform. Type definitions can be shared between frontend and backend, ensuring consistency. Enhanced IDE support with intelligent code completion improves development speed and reduces bugs.

## 8.3 Frontend Technologies

### React.js
**Why chosen:** Component-based architecture matches HopeOn's reusable UI elements. Large ecosystem provides solutions for common challenges. Virtual DOM ensures efficient updates for dynamic content. Strong TypeScript integration and industry demand.

### Vite
**Why chosen:** Near-instantaneous development server startup and hot module replacement dramatically improve productivity compared to Create React App. Optimized production builds with automatic code splitting.

### Tailwind CSS
**Why chosen:** Utility-first approach accelerates UI development. Responsive modifiers simplify mobile-first design. Enforces design consistency. Tiny production CSS files. Unopinionated, allowing custom branding.

### shadcn/ui and Radix UI
**Why chosen:** Components copied into project provide full control without version conflicts. Radix UI primitives ensure accessibility (WAI-ARIA standards). Headless pattern separates behavior from styling.

### TanStack Query
**Why chosen:** Automatic caching and background refetching. Eliminates boilerplate for loading/error states. Optimistic updates for instant UI. Request deduplication. Purpose-built for server state management.

### React Router
**Why chosen:** Declarative routing. Nested routes for layout sharing. Easy protected route implementation. Industry standard with largest community.

### Axios
**Why chosen:** Automatic JSON transformation. Interceptors for global auth and error handling. Request cancellation. Progress tracking for file uploads.

### Supporting Libraries
- **Lucide React:** Tree-shakeable icons with TypeScript support
- **date-fns:** Modular, smaller than moment.js, immutable operations
- **Sonner:** Elegant toast notifications with minimal configuration

## 8.4 Backend Technologies

### Node.js
**Why chosen:** JavaScript/TypeScript across full stack enables code sharing. Non-blocking I/O efficiently handles concurrent operations (payments, database, file uploads, emails). Massive npm ecosystem (2M+ packages).

### Express.js
**Why chosen:** Minimalist and unopinionated. Middleware architecture for clean separation of concerns. Mature ecosystem with extensive middleware availability. Robust routing capabilities.

### MongoDB with Mongoose
**Why chosen:** Flexible schema accommodates varying campaign data structures. JSON-like document model natural for JavaScript/TypeScript. Horizontal scalability through sharding. Embedded documents reduce joins. Mongoose adds schema validation and TypeScript integration.

### AWS S3
**Why chosen:** Unlimited, auto-scaling storage with 99.999999999% durability. Pay-as-you-go with generous free tier. Comprehensive security (IAM, encryption, pre-signed URLs). Direct browser uploads reduce server load.

### Supporting Libraries
- **bcryptjs:** Industry-standard password hashing
- **jsonwebtoken:** Stateless JWT authentication
- **Nodemailer:** Email sending with HTML templates
- **Multer:** File upload handling with validation
- **CORS:** Cross-origin resource sharing
- **dotenv:** Environment variable management

## 8.5 Payment Gateway Integration

### Khalti
**Why chosen:** Nepal's leading digital wallet with largest user base. Lower fees than international gateways. Instant confirmation. NPR support.

### eSewa
**Why chosen:** Nepal's most trusted digital wallet. Provides payment choice. Maximum market coverage.

### PayPal
**Why chosen:** International donations from diaspora. Multiple currencies. Buyer protection. Global brand trust.

### Cryptocurrency
**Why chosen:** Decentralized donations. Lower international fees. Privacy. Innovation showcase.

## 8.6 Development Tools

### VS Code
**Why chosen:** Best TypeScript support. Integrated terminal. Rich extensions (ESLint, Prettier, GitLens). Built-in debugger. Free and cross-platform.

### Git and GitHub
**Why chosen:** Distributed version control. Remote backup. Issue tracking. Project boards. Portfolio showcase.

### Postman
**Why chosen:** Request collections. Environment variables. Pre-request scripts. Test automation. API documentation generation.

### MongoDB Compass
**Why chosen:** Visual query building. Schema analysis. Index management. Performance insights. Data import/export.

### Trello
**Why chosen:** Visual kanban board. Intuitive progress tracking. Easy prioritization. Task checklists. Simpler than Jira for solo projects.

### npm
**Why chosen:** Default Node.js package manager. Largest registry (2M+ packages). Lock files for consistency. Script support.

## 8.7 Technology Stack Summary

**Frontend:** React.js + TypeScript + Vite + Tailwind CSS + shadcn/ui + Radix UI + TanStack Query + React Router + Axios

**Backend:** Node.js + Express.js + TypeScript + MongoDB + Mongoose + AWS S3

**Payments:** Khalti + eSewa + PayPal + Cryptocurrency

**Tools:** VS Code + Git/GitHub + Postman + MongoDB Compass + Trello + npm

## 8.8 Conclusion

Each technology was selected based on specific project requirements: security (TypeScript, bcryptjs, JWT), productivity (Vite, Tailwind, TanStack Query), scalability (MongoDB, S3, Node.js), and maintainability (TypeScript, React, Express). This stack provides a solid foundation for a secure, scalable crowdfunding platform.
