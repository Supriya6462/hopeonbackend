# 7. PROJECT METHODOLOGY

## 7.1 Introduction

The selection of an appropriate software development methodology is critical to project success, particularly for a complex system like HopeOn that involves multiple stakeholders, security-sensitive operations, and evolving requirements. This section explains the rationale behind choosing Agile methodology with Scrum framework for the HopeOn crowdfunding platform development, focusing on why this approach was most suitable for the project's unique characteristics and constraints.

## 7.2 Methodology Selection: Agile with Scrum Framework

### 7.2.1 Why Agile Over Waterfall?

The decision to adopt Agile methodology rather than traditional Waterfall was driven by several critical factors specific to the HopeOn project:

**1. Evolving Requirements and Uncertainty**

At the project's inception, while the core concept of a crowdfunding platform was clear, many implementation details were uncertain. Questions such as "Which payment gateways should be prioritized?", "What level of organizer verification is sufficient?", and "How should the withdrawal approval process work?" could not be definitively answered without building, testing, and gathering feedback. Waterfall's requirement for complete upfront specification would have forced premature decisions that might prove incorrect later.

Agile's iterative approach allowed requirements to emerge and refine through successive development cycles. For example, the organizer revocation system was not part of the initial requirements but emerged as a critical need during development when considering fraud prevention scenarios. Agile accommodated this addition without derailing the entire project.

**2. Need for Frequent Stakeholder Feedback**

The HopeOn platform serves three distinct user types (Donors, Organizers, Administrators), each with different needs and expectations. Understanding these needs required continuous feedback rather than a single requirements gathering phase. Agile's emphasis on regular demonstrations and feedback loops enabled:

- Early validation of user interface designs with potential users
- Iterative refinement of the organizer application workflow based on usability testing
- Adjustment of administrative controls based on supervisor feedback
- Continuous alignment with project objectives and academic requirements

Waterfall's delayed feedback (only after complete implementation) would have risked building features that didn't meet user needs, requiring costly rework.

**3. Risk Mitigation Through Incremental Delivery**

The HopeOn project involved several high-risk components:
- Integration with external payment gateways (Khalti, eSewa, PayPal)
- Secure handling of financial transactions
- Document storage and verification workflows
- Complex role-based access control

Agile's incremental delivery approach allowed tackling these risks early. By implementing and testing payment integration in early sprints, technical challenges were identified and resolved before they could jeopardize the entire project. Waterfall's big-bang delivery would have deferred risk discovery until late in the project when mitigation options are limited and costly.

**4. Flexibility to Adapt to Technical Challenges**

During development, several technical challenges emerged that required methodology flexibility:

- **Payment Gateway API Changes**: Khalti updated their API during development, requiring immediate adaptation
- **Security Enhancements**: Discovery of potential vulnerabilities necessitated additional security measures
- **Performance Optimization**: Initial MongoDB query patterns proved inefficient at scale, requiring refactoring

Agile's adaptive planning allowed addressing these challenges without formal change control processes that would have delayed resolution. Waterfall's rigid phase gates would have made such adaptations bureaucratic and time-consuming.

### 7.2.2 Why Scrum Framework Specifically?

Within the Agile family, Scrum was selected over alternatives like Kanban or Extreme Programming (XP) for specific reasons:

**1. Time-Boxed Sprints Align with Academic Calendar**

Scrum's fixed-length sprints (2 weeks for HopeOn) aligned perfectly with the academic project timeline and supervisor meeting schedule. Each sprint concluded with a demonstration to the supervisor, providing natural checkpoints for:
- Progress assessment
- Feedback incorporation
- Timeline adjustment
- Academic milestone completion

This structure provided the discipline needed for a solo developer project where self-management is critical. Kanban's continuous flow lacks these built-in checkpoints, which could lead to scope creep or loss of focus.

**2. Sprint Planning Enforces Prioritization**

Scrum's sprint planning ceremony forced explicit prioritization of features based on:
- Academic objectives and deliverables
- Technical dependencies (e.g., authentication before campaign management)
- Risk level (high-risk features tackled early)
- Supervisor guidance

This prioritization was essential given the project's time constraints (one academic year). Without Scrum's structured planning, there was risk of spending excessive time on less critical features while neglecting core functionality.

**3. Sprint Retrospectives Enable Continuous Improvement**

Scrum's retrospective ceremony at the end of each sprint provided structured opportunities to reflect on:
- What development practices worked well
- What technical approaches proved ineffective
- How to improve productivity in subsequent sprints
- Lessons learned from challenges encountered

For a solo developer, these retrospectives (conducted as self-reflection sessions) were invaluable for identifying and correcting inefficient practices early. For example, early sprints revealed that attempting to implement multiple payment gateways simultaneously was overwhelming; subsequent sprints adopted a sequential approach (one gateway per sprint), significantly improving productivity.

**4. Clear Definition of Done Prevents Scope Creep**

Scrum's emphasis on defining "done" for each user story prevented the common trap of endlessly refining features. For HopeOn, "done" meant:
- Feature implemented and tested
- Code reviewed for security vulnerabilities
- Documentation updated
- Supervisor approval obtained

This definition prevented perfectionism from delaying progress. Without it, features like the email notification system could have consumed excessive time on aesthetic refinements rather than functional completeness.

### 7.2.3 Why Not Other Methodologies?

**Extreme Programming (XP) - Not Chosen Because:**
- XP's pair programming is impractical for a solo developer project
- XP's emphasis on test-driven development (TDD), while valuable, would have significantly extended the timeline given the learning curve
- XP's continuous integration requirements exceed the infrastructure available for an academic project

**Kanban - Not Chosen Because:**
- Kanban's continuous flow lacks the time-boxed structure beneficial for academic projects with fixed deadlines
- Without sprints, there are fewer natural points for supervisor feedback and course correction
- Kanban's flexibility could lead to scope creep in a solo project without external accountability

**Waterfall - Not Chosen Because:**
- Requirements were not fully known upfront and evolved during development
- Late feedback would risk building the wrong solution
- High-risk components needed early validation, not late-stage discovery
- Inflexibility to accommodate emerging requirements (like the revocation system)

## 7.3 Scrum Implementation for HopeOn

### 7.3.1 Sprint Structure

**Sprint Duration: 2 Weeks**

Two-week sprints were chosen as the optimal balance between:
- Sufficient time to complete meaningful functionality
- Frequent enough feedback to catch issues early
- Alignment with bi-weekly supervisor meetings

Shorter sprints (1 week) would have resulted in excessive overhead from planning and review ceremonies. Longer sprints (3-4 weeks) would have delayed feedback and increased the risk of building incorrect solutions.

**Sprint Ceremonies Adapted for Solo Development:**

1. **Sprint Planning** (Start of each sprint)
   - Review product backlog (maintained in project management tool)
   - Select user stories for the sprint based on priority and capacity
   - Break down user stories into technical tasks
   - Estimate effort for each task
   - Define sprint goal

2. **Daily Stand-up** (Self-reflection, 15 minutes each morning)
   - What was accomplished yesterday?
   - What will be worked on today?
   - Are there any blockers?
   - Documented in daily log for supervisor review

3. **Sprint Review** (End of sprint, with supervisor)
   - Demonstrate completed functionality
   - Gather feedback on implementation
   - Discuss any deviations from plan
   - Update product backlog based on feedback

4. **Sprint Retrospective** (After sprint review)
   - Reflect on what went well
   - Identify what could be improved
   - Document lessons learned
   - Plan process improvements for next sprint

### 7.3.2 Product Backlog Management

The product backlog was organized hierarchically:

**Epics** (Major features):
- User Authentication and Authorization
- Campaign Management
- Payment Processing
- Donation Management
- Organizer Application and Verification
- Withdrawal Management
- Administrative Dashboard
- Email Notification System

**User Stories** (Specific functionality):
Example: "As a donor, I want to donate to a campaign using Khalti so that I can support causes I care about using my preferred payment method."

**Tasks** (Technical implementation steps):
- Design payment initiation API endpoint
- Implement Khalti provider class
- Create payment verification logic
- Add error handling and logging
- Write API documentation
- Test with Khalti sandbox

**Prioritization Criteria:**

1. **Must Have** (Critical for core functionality)
   - User registration and authentication
   - Campaign creation and browsing
   - At least one payment gateway integration
   - Basic donation processing

2. **Should Have** (Important but not critical)
   - Multiple payment gateway options
   - Organizer verification workflow
   - Email notifications
   - Administrative approval processes

3. **Could Have** (Desirable if time permits)
   - Advanced search and filtering
   - Campaign statistics and analytics
   - Withdrawal request management
   - Organizer revocation system

4. **Won't Have This Time** (Deferred to future versions)
   - Social media integration
   - In-app messaging
   - Mobile applications
   - Real-time notifications

### 7.3.3 Sprint Breakdown

**Sprint 0 (Weeks 1-2): Project Setup and Planning**
- Environment setup (Node.js, MongoDB, React)
- Project structure creation
- Initial database schema design
- Technology stack finalization
- Development workflow establishment

**Sprint 1 (Weeks 3-4): Authentication Foundation**
- User registration with email verification
- Login with JWT token generation
- Password hashing implementation
- Basic profile management
- Role-based access control middleware

**Sprint 2 (Weeks 5-6): Campaign Management Core**
- Campaign creation with image upload
- Campaign listing and browsing
- Campaign detail view
- AWS S3 integration for images
- Basic search functionality

**Sprint 3 (Weeks 7-8): First Payment Gateway Integration**
- Payment architecture design (Strategy Pattern)
- Khalti payment provider implementation
- Payment initiation and verification
- Donation record creation
- Payment callback handling

**Sprint 4 (Weeks 9-10): Additional Payment Gateways**
- eSewa payment provider implementation
- PayPal payment provider implementation
- Cryptocurrency payment provider (basic)
- Payment provider factory pattern
- Unified payment interface

**Sprint 5 (Weeks 11-12): Organizer Application System**
- Organizer application form
- Document upload to S3
- Application submission workflow
- Admin review interface
- Application approval/rejection

**Sprint 6 (Weeks 13-14): Email Notification System**
- Email service configuration (Nodemailer)
- Email template design
- OTP email implementation
- Organizer application status emails
- Campaign approval notifications

**Sprint 7 (Weeks 15-16): Administrative Dashboard**
- Campaign approval/rejection interface
- Organizer application management
- User management functionality
- Platform statistics dashboard
- Audit log viewing

**Sprint 8 (Weeks 17-18): Withdrawal Management**
- Withdrawal request creation
- Admin approval workflow
- Withdrawal status tracking
- Fund availability validation
- Transaction audit trail

**Sprint 9 (Weeks 19-20): Organizer Revocation System**
- Revocation mechanism implementation
- Automatic campaign closure on revocation
- Pending withdrawal rejection
- Reinstatement functionality
- Revocation audit trail

**Sprint 10 (Weeks 21-22): Frontend Enhancement**
- Responsive design refinement
- Tailwind CSS optimization
- User experience improvements
- Loading states and error handling
- Accessibility enhancements

**Sprint 11 (Weeks 23-24): Security Hardening**
- Security vulnerability assessment
- Input validation enhancement
- Rate limiting implementation
- Error message sanitization
- Security testing

**Sprint 12 (Weeks 25-26): Testing and Bug Fixes**
- Integration testing
- User acceptance testing
- Bug fixing
- Performance optimization
- Documentation completion

**Sprint 13 (Weeks 27-28): Deployment and Final Polish**
- Deployment preparation
- Production environment setup
- Final testing in production-like environment
- Documentation finalization
- Project handover preparation

### 7.3.4 Adaptation and Flexibility

While the sprint plan provided structure, Agile's flexibility allowed adaptations:

**Mid-Project Adjustments:**
- Sprint 9 (Organizer Revocation) was not in the original plan but added after identifying the need during Sprint 5
- Cryptocurrency payment implementation was simplified when blockchain verification proved more complex than anticipated
- Additional time was allocated to security hardening after a code review revealed potential vulnerabilities

**Velocity Tracking:**
- Initial sprints completed fewer story points as development patterns were established
- Mid-project sprints showed highest velocity as familiarity with codebase increased
- Final sprints focused on quality over quantity, with lower story point completion but higher polish

## 7.4 Development Practices

### 7.4.1 Version Control Strategy

**Git Workflow:**
- **Main Branch**: Production-ready code only
- **Development Branch**: Integration branch for completed features
- **Feature Branches**: Individual features developed in isolation
- **Naming Convention**: `feature/payment-integration`, `bugfix/auth-token-expiry`

**Commit Practices:**
- Frequent, small commits with descriptive messages
- Commit message format: `[Component] Brief description`
- Example: `[Payment] Implement Khalti payment verification`

**Why This Approach:**
- Feature branches prevent incomplete work from affecting stable code
- Clear commit history aids in debugging and understanding code evolution
- Enables easy rollback if a feature proves problematic

### 7.4.2 Code Quality Practices

**TypeScript for Type Safety:**
- Strict mode enabled to catch type errors at compile time
- Interface definitions for all data structures
- Type guards for runtime type checking

**Why TypeScript:**
- Reduces runtime errors by catching type mismatches during development
- Improves code maintainability through self-documenting type definitions
- Enhances IDE support with autocomplete and inline documentation

**Code Organization:**
- Separation of concerns (Routes → Controllers → Services → Models)
- Single Responsibility Principle for each module
- DRY (Don't Repeat Yourself) principle throughout

**Why This Structure:**
- Easier to locate and modify specific functionality
- Facilitates testing by isolating business logic
- Enables code reuse across different parts of the application

### 7.4.3 Documentation Practices

**Code Documentation:**
- Inline comments for complex logic
- JSDoc comments for public functions
- README files for each major module

**API Documentation:**
- Endpoint descriptions with request/response examples
- Authentication requirements clearly stated
- Error response documentation

**Why Comprehensive Documentation:**
- Facilitates supervisor review and understanding
- Aids in debugging and maintenance
- Provides reference for future enhancements
- Demonstrates professional development practices

## 7.5 Risk Management

### 7.5.1 Identified Risks and Mitigation Strategies

**Technical Risks:**

1. **Payment Gateway Integration Failures**
   - **Risk**: External APIs may be unreliable or change unexpectedly
   - **Mitigation**: Implement robust error handling, use sandbox environments for testing, maintain fallback options
   - **Outcome**: Khalti API change was handled smoothly due to abstraction layer

2. **Security Vulnerabilities**
   - **Risk**: Financial platform is attractive target for attacks
   - **Mitigation**: Follow OWASP guidelines, implement input validation, conduct security reviews
   - **Outcome**: Multiple potential vulnerabilities identified and fixed during development

3. **Scalability Concerns**
   - **Risk**: System may not handle growth in users and transactions
   - **Mitigation**: Design with scalability in mind, use MongoDB indexing, implement efficient queries
   - **Outcome**: Performance testing showed acceptable response times under load

**Project Management Risks:**

1. **Scope Creep**
   - **Risk**: Continuous addition of features could prevent completion
   - **Mitigation**: Strict sprint planning, clear definition of done, prioritization framework
   - **Outcome**: Some features deferred but core functionality completed on time

2. **Time Constraints**
   - **Risk**: Academic deadlines are inflexible
   - **Mitigation**: Regular progress tracking, early identification of delays, buffer time in schedule
   - **Outcome**: Project completed within academic timeline

3. **Single Developer Limitation**
   - **Risk**: Illness or other issues could halt progress
   - **Mitigation**: Maintain detailed documentation, regular backups, clear commit history
   - **Outcome**: No significant disruptions occurred

### 7.5.2 Contingency Planning

**Backup Plans:**
- If payment gateway integration proved too complex, focus on one gateway (Khalti) and document others as future work
- If organizer verification system couldn't be completed, implement basic approval without document upload
- If time ran short, prioritize core donor and organizer workflows over administrative features

**Actual Contingencies Used:**
- Cryptocurrency payment verification simplified to basic implementation due to complexity
- Some advanced analytics features deferred to focus on core security and functionality

## 7.6 Quality Assurance Approach

### 7.6.1 Testing Strategy

**Manual Testing:**
- Functional testing of each feature upon completion
- User acceptance testing with sample users
- Cross-browser testing (Chrome, Firefox, Safari)
- Responsive design testing on multiple devices

**Why Manual Testing:**
- Appropriate for academic project scope
- Provides hands-on understanding of user experience
- Identifies usability issues automated tests might miss

**Security Testing:**
- Input validation testing (SQL injection, XSS attempts)
- Authentication and authorization testing
- Payment flow security verification
- File upload security testing

**Why Security Focus:**
- Financial platform requires high security standards
- Protects user data and funds
- Demonstrates professional security awareness

### 7.6.2 Code Review Process

**Self-Review:**
- Review own code before committing
- Check for security vulnerabilities
- Verify adherence to coding standards
- Ensure proper error handling

**Supervisor Review:**
- Demonstrate code during sprint reviews
- Discuss architectural decisions
- Receive feedback on implementation approaches
- Incorporate suggestions for improvement

**Why Code Review:**
- Catches errors before they reach production
- Ensures code quality and maintainability
- Provides learning opportunities
- Validates architectural decisions

## 7.7 Tools and Infrastructure

### 7.7.1 Development Tools

**Integrated Development Environment:**
- Visual Studio Code with extensions for TypeScript, React, and Node.js
- **Why**: Free, powerful, excellent TypeScript support, extensive extension ecosystem

**Version Control:**
- Git for source control
- GitHub for remote repository hosting
- **Why**: Industry standard, free for public repositories, excellent collaboration features

**API Testing:**
- Postman for API endpoint testing
- **Why**: User-friendly interface, supports collections, enables automated testing

**Database Management:**
- MongoDB Compass for database visualization
- **Why**: Official MongoDB GUI, intuitive interface, query performance analysis

### 7.7.2 Project Management Tools

**Task Tracking:**
- Trello for sprint planning and task management
- **Why**: Visual kanban board, simple to use, free tier sufficient for solo project

**Documentation:**
- Markdown files in repository for technical documentation
- Google Docs for report writing
- **Why**: Version controlled with code, easy to maintain, accessible format

**Time Tracking:**
- Manual log sheet for supervisor meetings
- Daily development journal
- **Why**: Required for academic project, provides accountability

### 7.7.3 Deployment Infrastructure

**Development Environment:**
- Local machine for development
- MongoDB Atlas for cloud database (free tier)
- AWS S3 for file storage (free tier)

**Why Cloud Services:**
- Eliminates local infrastructure setup
- Provides production-like environment
- Free tiers sufficient for development and testing

## 7.8 Gantt Chart Overview

A detailed Gantt chart showing major milestones and deliverables is provided in Section 12 (Evidence of Project Management). The high-level timeline includes:

**Phase 1: Foundation (Weeks 1-8)**
- Project setup and planning
- Authentication system
- Campaign management core
- First payment gateway

**Phase 2: Core Features (Weeks 9-16)**
- Additional payment gateways
- Organizer application system
- Email notifications
- Administrative dashboard

**Phase 3: Advanced Features (Weeks 17-22)**
- Withdrawal management
- Organizer revocation system
- Frontend enhancement

**Phase 4: Quality and Deployment (Weeks 23-28)**
- Security hardening
- Testing and bug fixes
- Deployment preparation
- Documentation finalization

## 7.9 Justification Summary

The Agile methodology with Scrum framework was chosen for HopeOn because:

1. **Uncertainty Management**: Requirements evolved during development; Agile accommodated this naturally
2. **Risk Mitigation**: Incremental delivery allowed early identification and resolution of technical challenges
3. **Feedback Integration**: Regular sprint reviews enabled continuous alignment with project objectives
4. **Time Management**: Fixed sprints provided structure and accountability for a solo developer
5. **Flexibility**: Agile allowed adaptation to technical challenges and emerging requirements
6. **Quality Focus**: Iterative development enabled continuous refinement and improvement

This methodology proved highly effective, enabling successful delivery of a complex, secure, and feature-rich crowdfunding platform within the academic timeline while maintaining high code quality and security standards.

## 7.10 Lessons Learned

**What Worked Well:**
- Two-week sprints provided optimal balance of structure and flexibility
- Early payment gateway integration revealed technical challenges when mitigation was still feasible
- Regular supervisor feedback prevented development of incorrect solutions
- Feature branch workflow enabled experimentation without risking stable code

**What Could Be Improved:**
- Earlier focus on security testing would have identified vulnerabilities sooner
- More detailed initial architecture planning could have prevented some refactoring
- Automated testing would have caught regression bugs earlier
- Better time estimation in early sprints would have improved planning accuracy

**Recommendations for Future Projects:**
- Invest time in comprehensive architecture design before coding begins
- Implement automated testing from the start, even if it slows initial development
- Build security considerations into every sprint rather than dedicating a late sprint to hardening
- Maintain more detailed documentation during development rather than retrospectively

---

**Conclusion**: The Agile methodology with Scrum framework provided the structure, flexibility, and feedback mechanisms necessary for successful development of the HopeOn crowdfunding platform. The iterative approach enabled continuous improvement, early risk mitigation, and delivery of a high-quality product that meets academic objectives and real-world requirements.
