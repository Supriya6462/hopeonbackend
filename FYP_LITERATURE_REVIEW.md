# 6. LITERATURE REVIEW

## 6.1 Introduction

This literature review examines existing research, industry practices, and technological frameworks relevant to the development of the HopeOn crowdfunding platform. The review is structured around key themes including crowdfunding platform architectures, payment gateway integration strategies, security frameworks, fraud prevention mechanisms, and modern web application development practices. By analyzing existing systems and academic research, this review establishes the foundation for addressing the academic question regarding multi-gateway payment architecture design and implementation.

## 6.2 Crowdfunding Platforms: Comparative Analysis

### 6.2.1 Existing Crowdfunding Ecosystems

The global crowdfunding market has experienced significant growth, with projections indicating it will reach $28.8 billion by 2025 ([Spocket, 2024](https://www.spocket.co/blogs/best-crowdfunding-sites-and-platforms)). Major platforms like Kickstarter, Indiegogo, and GoFundMe dominate the market, each serving distinct niches and employing different funding models.

**Kickstarter** operates on an "all-or-nothing" funding model, where campaigns only receive funds if they meet their target goal. This approach is particularly suited for creative projects such as games, films, and technology products ([Grasshopper, 2024](https://grasshopper.com/resources/tools/crowdfunding-platforms-kickstarter-gofundme-indiegogo/)). The platform's strict approval process and focus on creative ventures has established it as a trusted brand, though this rigidity can limit accessibility for certain campaign types.

**Indiegogo** offers both flexible and fixed funding options, providing creators with more control over their fundraising strategy ([Efulfillment Service, 2024](https://www.efulfillmentservice.com/2024/07/top-15-kickstarter-alternatives-find-the-best-fit-for-your-business/)). The flexible funding model allows organizers to keep whatever amount is raised, even if the goal is not met, making it suitable for projects that can scale based on available resources.

**GoFundMe** specializes in personal causes and life events, such as medical emergencies and community support initiatives. Unlike project-based platforms, GoFundMe does not impose an all-or-nothing requirement and charges reasonable fees, making it accessible for individuals facing urgent financial needs ([Grasshopper, 2024](https://grasshopper.com/resources/tools/crowdfunding-platforms-kickstarter-gofundme-indiegogo/)).

### 6.2.2 Platform Architecture Considerations

CrowdEngine's analysis of custom crowdfunding platform development emphasizes that building proprietary software offers maximum customization and control but requires substantial upfront investment and ongoing maintenance ([CrowdEngine, 2025](https://www.crowdengine.com/blog/build-vs-buy-crowdfunding-portals)). The decision between building custom solutions versus using white-label platforms depends on factors including budget, timeline, required features, and long-term scalability needs.

Inexture's case study on crowdfunding platform development highlights the importance of secure wallet integration, multi-gateway payment support, escrow workflows, and seamless campaign management ([Inexture, 2025](https://www.inexture.com/case-study/crowdfunding-platform-development-wallet-integration/)). These features enable creators and backers to transact safely across global fundraising campaigns while maintaining platform integrity.

### 6.2.3 Implications for HopeOn

The analysis of existing platforms reveals several gaps that HopeOn addresses:

1. **Regional Payment Accessibility**: Major international platforms often lack integration with regional payment gateways like Khalti and eSewa, limiting accessibility for Nepalese users.

2. **Organizer Verification**: While platforms implement basic identity checks, comprehensive document verification and revocation systems are often lacking.

3. **Flexible Funding Models**: HopeOn's support for both All-or-Nothing and Flexible funding provides organizers with options suited to different campaign types.

4. **Administrative Oversight**: Enhanced administrative controls for campaign approval and organizer management address trust and fraud concerns.

## 6.3 Payment Gateway Integration Architectures

### 6.3.1 Multi-Gateway Design Patterns

The integration of multiple payment gateways presents significant architectural challenges. Research by Global Fintech Series emphasizes that a modular and service-oriented architecture (SOA) is ideal for multi-gateway platforms, allowing independent integration and management of payment gateways while maintaining scalability ([Global Fintech Series, 2024](https://globalfintechseries.com/featured/designing-multi-gateway-payment-platforms/)).

**Adapter Pattern**: The Adapter Pattern serves as a bridge between e-commerce platforms and various payment service providers, wrapping existing interfaces and presenting a unified interface to the application ([Momentslog, 2023](https://www.momentslog.com/development/design-pattern/adapter-pattern-in-payment-gateway-integration-unifying-different-payment-services)). This pattern is particularly effective when dealing with payment gateways that have significantly different API structures.

**Factory Method Pattern**: The Factory Method Pattern enables extensible payment systems by allowing easy integration of new payment gateways as they become available while keeping the core application intact ([Momentslog, 2024](https://www.momentslog.com/development/web-backend/extensible-payment-systems-using-the-factory-method-pattern-implementing-multiple-payment-gateways)). This approach aligns with the Open/Closed Principle, where systems are open for extension but closed for modification.

### 6.3.2 Payment Infrastructure Requirements

Oxagile's analysis of fintech payment integrations emphasizes that payment systems must be viewed as core business infrastructure where small bugs can translate into massive losses. Therefore, architectures must deliver scalability, resilience, secure payment processing, and performance simultaneously ([Oxagile, 2025](https://www.oxagile.com/article/practical-payment-integration-approaches-for-fintech/)).

Multi-gateway payment routing has evolved from an optional upgrade to a core infrastructure requirement, particularly for high-risk merchants who need to proactively manage regulatory pressure, stabilize revenue, and eliminate single points of failure ([FT3Pay, 2026](https://www.ft3pay.com/blog/why-high-risk-merchants-need-multi-gateway-payment-routing)).

### 6.3.3 Regional Payment Gateway Integration

For the Nepalese market, integrating Khalti and eSewa payment gateways is essential. A Medium article by Saransh Pachhai notes that eSewa and Khalti process over 80% of online transactions in Nepal, making their integration crucial for maximum reach ([Medium, 2025](https://medium.com/@saranshpachhai/building-a-payment-gateway-integration-in-nepal-esewa-khalti-with-react-node-js-18b2b1dc3d3c)).

The technical implementation differs between these gateways:
- **eSewa** uses form submission rather than API redirect, requiring frontend form generation and submission
- **Khalti** provides API-based payment initiation with direct redirect URLs
- Both require server-side verification to confirm payment completion

### 6.3.4 Payment Architecture Security

UniPaas emphasizes that payment gateway architecture must be PCI compliant, aligned with anti-fraud legislation, reliable, robust, secure, agile, flexible, and accessible ([UniPaas, 2025](https://www.unipaas.com/blog/payment-gateway-architecture)). Additionally, user experience is critical—customers expect seamless transactions without delays or failures.

Research by Ottu indicates that digital buyers now expect to pay with their preferred method, whether card, wallet, BNPL, local A2A, or crypto. A single gateway often results in lower authorization rates and higher cart abandonment (69.99% average) ([Ottu, 2025](https://blog.ottu.com/posts/multiple-payment-gateways-101)).

### 6.3.5 Application to HopeOn

HopeOn's payment architecture implements the Strategy Pattern (also called Factory Pattern) to handle multiple payment providers. This design allows:
- Easy addition of new payment providers without modifying core logic
- Consistent interface across all providers
- Independent testing of each provider
- Switching between providers without changing business logic

The system supports Khalti, eSewa, PayPal, and cryptocurrency options, providing donors with flexibility while maintaining a unified user experience.

## 6.4 Security and Authentication Frameworks

### 6.4.1 JWT-Based Authentication

JSON Web Tokens (JWT) have become the standard for stateless authentication in modern web applications. Research by Cerbos describes JWTs as "backstage passes" to application resources, where each pass has different access levels based on user roles ([Cerbos, 2024](https://www.cerbos.dev/blog/easy-way-to-put-user-role-in-jwt)).

A Medium article by Sragu emphasizes that Role-Based Access Control (RBAC) is crucial for defining which users can access certain resources or functionalities. For example, administrators may manage users while regular users can only view their own profiles ([Medium, 2024](https://sragu2000.medium.com/secure-role-based-access-control-in-react-with-http-only-cookies-and-express-2c3e55660a57)).

### 6.4.2 Role-Based Access Control Implementation

UMA Technology's guide on implementing RBAC in Express.js REST APIs using Passport.js and JWT explains that RBAC is a security model restricting access to resources based on assigned roles. This model ensures users can only access information and features they are authorized to access ([UMA Technology, 2024](https://umatechnology.org/how-to-implement-role-based-access-control-in-express-js-rest-apis-using-passport-js-and-jwt/)).

Hoop.dev's analysis notes that JWTs consist of three parts: header, payload, and signature. Together, they identify who is using the app and what they can do ([Hoop.dev, 2023](https://hoop.dev/blog/unlocking-security-role-based-access-control-with-jwt/)). The payload typically contains user identification and role information, while the signature ensures token integrity.

### 6.4.3 Security Best Practices

BasicUtils outlines best practices for securing JWT authentication:
- Use strong secret keys with sufficient entropy
- Implement token expiration and refresh mechanisms
- Store tokens securely (HTTP-only cookies for web applications)
- Validate tokens on every protected route
- Implement token revocation for compromised accounts
([BasicUtils, 2024](https://basicutils.com/learn/spring-security/best-practices-securing-jwt-authentication))

### 6.4.4 HopeOn Security Implementation

HopeOn implements a comprehensive security framework including:
- JWT-based authentication with role information embedded in tokens
- Three-tier RBAC system (Donor, Organizer, Administrator)
- Bcrypt password hashing with salt rounds
- Input validation and sanitization
- Middleware-based route protection
- Secure file upload with AWS S3 integration

## 6.5 Fraud Prevention and Organizer Verification

### 6.5.1 Crowdfunding Fraud Landscape

Research published on ResearchGate indicates that donations to charity-based crowdfunding environments have increased alongside deception and fraud. Crowdfunding platforms are typically the only entities performing oversight, but they are not properly incentivized to combat fraud since revenue is directly proportional to transaction volume ([ResearchGate, 2020](https://www.researchgate.net/publication/342587156_I_call_BS_Fraud_Detection_in_Crowdfunding_Campaigns)).

GetFocal.ai emphasizes that through integration of cautious donor conduct and auto-regulatory technology solutions, platforms can reduce fraud, provide transparency, and retain confidence within the fast-growing crowdfunding system ([GetFocal.ai, 2025](https://www.getfocal.ai/blog/crowdfunding-scams)).

### 6.5.2 Identity Verification Strategies

A Quora discussion on fraud prevention strategies highlights that implementing strong KYC (Know Your Customer) protocols requiring users to provide valid identification, such as government-issued IDs, is essential before they can launch projects or make large contributions ([Quora, 2024](https://www.quora.com/What-strategies-can-prevent-fraud-in-crowdfunding-platforms-including-identity-verification)).

GetSilt's blog notes that on many platforms, creators can register with false information due to lack of secure identity verification systems like KYC or KYB (Know Your Business) ([GetSilt, 2024](https://blog.getsilt.com/en/crowdfunding-scams/)). This vulnerability enables fraudulent campaigns to proliferate.

### 6.5.3 Verification Best Practices

Scamwatch provides a charity crowdfund verification toolkit emphasizing that fundraisers running dedicated websites can reveal useful signals including registration date, registrar, name servers, and contact details. Newly registered domains, privacy-protected WHOIS records, or mismatched registrar details indicate higher risk ([Scamwatch, 2024](https://scamwatch.com/article/charity-crowdfund-verification-toolkit-how-to-spot-fake-relief-campaigns)).

Donorbox's nonprofit fraud prevention guide stresses that having an actionable fraud prevention strategy is important to avoid breaches and ensure successful fundraising while protecting sensitive data and maintaining trust ([Donorbox, 2024](https://donorbox.org/nonprofit-blog/fraud-prevention)).

### 6.5.4 HopeOn Verification System

HopeOn addresses fraud prevention through:
- Mandatory document submission for organizer applications
- Administrative review and approval workflow
- Document storage in secure AWS S3 buckets
- Organizer revocation system with reason tracking
- Automatic campaign closure upon organizer revocation
- Audit trails for all administrative actions

This multi-layered approach ensures that only verified individuals can create campaigns while providing mechanisms to suspend privileges when necessary.

## 6.6 Full-Stack Web Application Architecture

### 6.6.1 MERN Stack Overview

The MERN stack (MongoDB, Express.js, React, Node.js) provides a powerful full-stack JavaScript solution for modern web application development. Medium's analysis by Jalina Hirushan describes MERN as simplifying and speeding up deployment of full-stack web applications through four core technologies working cohesively ([Medium, 2024](https://medium.com/@jalinahirushan2002/mastering-mern-building-full-stack-web-apps-with-mongodb-express-js-react-and-node-js-e32646b6ace4)).

Capital Numbers' insights for 2025 highlight that React's component-based architecture enables creation of powerful user interfaces, while Node.js allows JavaScript to run on the server, enabling use of a single language across the entire application stack ([Capital Numbers, 2025](https://www.capitalnumbers.com/blog/mern-stack-in-2025/)).

### 6.6.2 React and Tailwind CSS for Frontend Development

Refine.dev's guide on Tailwind Flex emphasizes that TailwindCSS provides numerous utility classes for layout, sizing, colors, and typography. One of its most powerful capabilities is responsive variants of utility classes for all screen sizes ([Refine.dev, 2024](https://refine.dev/blog/tailwind-flex/)).

CloudNonic's guide to mastering responsive UI with Tailwind CSS notes that responsive modifiers enable developers to apply different styles at specified breakpoints, instrumental in creating designs that adapt seamlessly from smallest mobile devices to large desktop screens ([CloudNonic, 2024](https://www.blog.cloudnonic.com/2024/01/03/mastering-responsive-ui-a-guide-to-using-tailwind-css/)).

Nishangiri.dev's analysis of styling React applications in 2024 identifies Tailwind CSS, Radix UI, and ShadCN UI as the best tools for creating attractive and responsive interfaces. Tailwind's utility-first approach allows rapid creation of custom designs without leaving HTML or JSX ([Nishangiri.dev, 2024](https://nishangiri.dev/blog/styling-react-apps)).

### 6.6.3 Backend Architecture with Node.js and Express

Noder254's guide on building full-stack applications emphasizes understanding React components, state, and props for frontend, while Node.js enables server-side JavaScript and Express.js provides a robust foundation for building Node.js servers ([Hashnode, 2024](https://noder254.hashnode.dev/building-a-full-stack-application-with-react-and-nodejs)).

Kitemetric's comprehensive MERN guide explains that Express.js is a minimal and flexible Node.js web application framework providing a robust foundation for building APIs and handling server-side logic ([Kitemetric, 2024](https://kitemetric.com/blogs/mastering-the-mern-stack-a-comprehensive-guide)).

### 6.6.4 MongoDB for Data Persistence

MongoDB's document-oriented NoSQL approach offers flexibility and scalability for modern web applications. MBloging's guide explains that scalable web applications need to handle increasing data amounts, high user traffic, and complex queries without sacrificing performance. MongoDB addresses these challenges through horizontal scaling, flexibility, and high availability ([MBloging, 2025](https://www.mbloging.com/post/how-to-use-mongodb-for-scalable-web-applications)).

Nucamp's 2026 fundamentals guide notes that MongoDB pairs flexible document modeling with enterprise-grade features and built-in AI capabilities like Atlas Vector Search, making it a practical NoSQL foundation for modern applications ([Nucamp, 2026](https://www.nucamp.co/blog/mongodb-fundamentals-in-2026-nosql-database-for-modern-applications)).

Tidewave's playbook for high-performance data architectures emphasizes that MongoDB is built to scale horizontally using sharding, where large datasets are distributed across multiple nodes. This enables handling massive traffic spikes and ever-growing data volumes without overburdening a single server ([Tidewave, 2025](https://tidewave.net/blog/the-ultimate-mongodb-playbook-for-high-performance-data-architectures)).

### 6.6.5 Application to HopeOn Architecture

HopeOn leverages the MERN stack with Tailwind CSS to deliver:
- **Frontend**: React.js with Tailwind CSS for responsive, component-based UI
- **Backend**: Node.js with Express.js for RESTful API development
- **Database**: MongoDB for flexible document storage and scalability
- **File Storage**: AWS S3 for secure document management
- **Type Safety**: TypeScript across the entire stack for reduced errors

This architecture provides a cohesive development experience with JavaScript/TypeScript throughout, enabling rapid development while maintaining code quality and type safety.

## 6.7 AWS S3 for Secure File Storage

### 6.7.1 S3 Security Best Practices

Strac.io's guide on securing S3 buckets emphasizes that security best practices include implementing bucket and IAM policies, enabling logging and versioning, using MFA for bucket deletion, encrypting data at rest and in transit, conducting regular audits, and limiting public access ([Strac.io, 2022](https://www.strac.io/blog/how-to-secure-your-s3-buckets-in-aws)).

Hostersi's analysis of secure data storage in AWS S3 recommends blocking public access at the bucket level to avoid accidental data sharing, and setting IAM policy rules to define precisely who can access resources and under what conditions ([Hostersi, 2025](https://www.hostersi.com/blog/secure-data-storage-in-aws-s3-best-practices/)).

### 6.7.2 S3 Storage Classes and Lifecycle Management

Toxigon's guide on AWS S3 data management discusses utilizing lifecycle policies to automatically transition objects between storage classes based on access patterns. Options include S3 Intelligent-Tiering for automatic movement between access tiers, S3 Standard-IA for infrequently accessed data requiring rapid access, and S3 One Zone-IA for data that can be recreated if lost ([Toxigon, 2024](https://toxigon.com/aws-s3-data-management)).

### 6.7.3 HopeOn S3 Implementation

HopeOn uses AWS S3 for:
- Organizer document storage (identity verification documents)
- Campaign image storage
- Secure URL generation with expiration
- IAM-based access control
- Encryption at rest for sensitive documents

This approach ensures document security while providing scalable storage that grows with platform usage.

## 6.8 Legal and Compliance Considerations

### 6.8.1 Crowdfunding Regulations

Aaron Hall's analysis of legal best practices for crowdfunding campaigns emphasizes that clear campaign terms outlining fund usage, contributor rights, and risk disclosures are essential. Adherence to securities laws, protection of intellectual property, and truthful marketing claims mitigate legal risks ([Aaron Hall, 2024](https://aaronhall.com/legal-best-practices-structuring-crowdfunding-campaigns/)).

Faison Law Group's SEC crowdfunding compliance guide notes that as of 2024, platforms can raise up to $5 million in a 12-month period under Regulation Crowdfunding (Reg CF) ([Faison Law Group, 2024](https://faisonlawgroup.com/blog/navigating-crowdfunding-compliance-with-the-sec-a-practical-guide-for-startups/)).

### 6.8.2 Data Privacy and Security

Robust payment systems and rigorous data privacy safeguards maintain transactional integrity. Effective post-campaign communication ensures accountability. A comprehensive understanding of these elements facilitates lawful and successful crowdfunding initiatives ([Aaron Hall, 2024](https://aaronhall.com/legal-best-practices-structuring-crowdfunding-campaigns/)).

### 6.8.3 HopeOn Compliance Approach

While HopeOn is designed for the Nepalese market and does not fall under SEC regulations, the platform implements:
- Clear terms of service and privacy policy
- Transparent fund usage disclosure requirements
- Secure payment processing with audit trails
- Data encryption and access controls
- Administrative oversight for campaign approval

## 6.9 Gap Analysis and Research Contribution

### 6.9.1 Identified Gaps in Existing Literature

The literature review reveals several gaps that HopeOn addresses:

1. **Regional Payment Integration**: Limited research exists on integrating Nepalese payment gateways (Khalti, eSewa) with international options (PayPal, cryptocurrency) in a unified architecture.

2. **Organizer Revocation Systems**: While fraud prevention is discussed extensively, comprehensive revocation systems that maintain data integrity while suspending privileges are underexplored.

3. **Flexible Funding Implementation**: Most research focuses on all-or-nothing models, with limited analysis of hybrid approaches supporting both funding types.

4. **Multi-Gateway Architecture Patterns**: While design patterns are discussed individually, comprehensive implementation guides combining Strategy Pattern, Factory Pattern, and provider-specific handling are scarce.

### 6.9.2 HopeOn's Contribution

HopeOn contributes to existing knowledge by:

1. **Demonstrating practical multi-gateway integration** combining regional (Khalti, eSewa) and international (PayPal, cryptocurrency) payment providers using Strategy Pattern.

2. **Implementing comprehensive organizer verification** with document submission, administrative approval, and revocation mechanisms that maintain audit trails.

3. **Providing flexible funding options** within a single platform, allowing organizers to choose between All-or-Nothing and Flexible models based on campaign needs.

4. **Showcasing MERN stack with TypeScript** for type-safe full-stack development with modern security practices.

## 6.10 Conclusion

The literature review establishes that successful crowdfunding platforms require careful consideration of multiple factors including payment gateway integration, security frameworks, fraud prevention, user experience, and legal compliance. Existing platforms like Kickstarter, Indiegogo, and GoFundMe provide valuable insights into different funding models and user needs, while research on payment architectures, security practices, and fraud prevention informs technical implementation decisions.

HopeOn builds upon this foundation by addressing identified gaps, particularly in regional payment integration, organizer verification, and flexible funding models. The platform's architecture leverages proven design patterns (Strategy Pattern, Factory Pattern) while implementing modern web technologies (MERN stack with TypeScript, Tailwind CSS) to deliver a secure, scalable, and user-friendly crowdfunding solution.

The next sections of this report detail how these research findings informed the project methodology, technology choices, and system design, ultimately addressing the academic question regarding multi-gateway payment architecture design and implementation.

---

**Note**: All references are cited inline with publication dates and URLs. A complete reference list in standard academic format is provided in Section 13 of the full report.
