# CVMS - AI Recruitment System

CVMS (Candidate & Vacancy Management System) is a web-based recruitment platform that supports companies, candidates, and administrators in managing recruitment activities on one system.

The system focuses on job posting management, candidate applications, CV handling, company recruitment workflow, wallet-based CV unlocking, and AI chatbot support for recruitment-related assistance.

---

## Overview

CVMS is designed for a multi-company recruitment environment.
Companies can register, buy recruitment packages, create job postings, receive candidate applications, manage recruitment pipelines, and unlock candidate CVs when needed.

Candidates can create accounts, search for jobs, apply to job postings, manage saved jobs, upload CVs, and receive support from the AI chatbot.

Administrators manage companies, review platform activities, confirm company payments, and monitor the overall recruitment system.

---

## Objectives

* Build a recruitment platform for multiple companies.
* Support candidates in finding and applying for jobs.
* Allow companies to manage job postings and candidate pipelines.
* Provide wallet and transaction features for CV unlocking.
* Support recruitment workflows such as screening, interview scheduling, and status tracking.
* Integrate AI chatbot support for recruitment questions and career guidance.
* Prepare the system for future AI Matching and CV analysis features.

---

## User Roles

### 1. Administrator

* Manage company accounts.
* Review company registration and booking requests.
* Confirm company payment requests.
* Monitor recruitment activities.
* Manage platform-level data.
* Review AI assessment and recruitment information.

### 2. Company / Recruiter

* Register as a company account.
* Purchase recruitment posting packages.
* Create, edit, pause, and close job postings.
* Receive candidate applications directly.
* View anonymous candidate information before unlocking CVs.
* Use wallet balance to unlock candidate CVs.
* Manage recruitment pipeline stages.
* Schedule and track interviews.
* View wallet transaction history.

### 3. Candidate

* Register and log in to the system.
* Create and update personal profile.
* Upload CV file.
* Search and filter job postings.
* Save favorite jobs.
* Apply to jobs.
* Track application status.
* Receive recruitment notifications.
* Use AI chatbot for job search and career support.

---

## Key Features

### Authentication & Authorization

* User registration and login.
* Role-based access control.
* Candidate, company, and admin role separation.
* Supabase Auth integration.
* OAuth orientation for Google, GitHub, and Facebook login.
* Session handling for authenticated users.

### Job Management

* Public job listing.
* Job detail view.
* Job search and filtering.
* Company job creation.
* Edit job posting.
* Pause or close job posting.
* Company ownership validation for job management.
* Admin is restricted from creating jobs on behalf of companies.

### Candidate & Application Management

* Candidate profile management.
* CV upload support.
* Job application submission.
* Duplicate application prevention.
* Application status tracking.
* Saved jobs management.
* Candidate notifications.

### Company Portal

* Company dashboard.
* Company job management.
* Candidate application list.
* Wallet balance display.
* CV unlock tracking.
* Recruitment pipeline management.
* Interview schedule management.
* Company booking and package purchase flow.

### Wallet & CV Unlocking

* Company wallet balance.
* Wallet top-up request.
* Admin payment confirmation.
* CV unlocking by wallet balance.
* CV unlock history.
* No duplicate charge for already unlocked CVs.

### Recruitment Pipeline

* New application stage.
* Screening stage.
* Interview stage.
* Review stage.
* Offer stage.
* Hired or rejected stage.
* Company feedback for applications.

### AI Chatbot

* Recruitment FAQ support.
* Job search assistance.
* Career guidance.
* CV improvement suggestions.
* Candidate support through AI conversation.

### Security & Validation

* Security headers.
* Rate limiting for write actions and authentication routes.
* Role-based API protection.
* Server-side validation for required fields.
* Protected company actions.
* Environment variables for API keys and Supabase configuration.
* `.env.example` provided for safe environment setup.

---

## Technology Stack

### Frontend

* HTML
* CSS
* JavaScript

### Backend

* Node.js
* Native HTTP server
* ES Modules (`.mjs`)
* REST-style API endpoints

### Database & Storage

* Supabase
* PostgreSQL / PLpgSQL
* Supabase REST API
* Supabase Storage for private CV files

### Authentication

* Supabase Auth
* Email/password authentication
* OAuth orientation for Google, GitHub, and Facebook

### AI Integration

* Groq API / OpenAI-compatible chat completion endpoint
* Configurable AI model through environment variables

### Development Tools

* Git
* GitHub
* VS Code
* Supabase Dashboard
* Postman or browser-based API testing

---

## Project Structure

```text
ai-recruitment-system/
│
├── docs/
│   ├── ai/
│   ├── api/
│   ├── backend/
│   ├── database/
│   ├── srs/
│   └── use-case/
│
├── dashboard.html
├── dashboard.css
├── login.html
├── data.js
├── serve.mjs
├── db-adapter.mjs
├── schema.sql
│
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── .env.example
└── .gitignore
```

---

## Installation & Setup

### Requirements

* Node.js 20 or newer.
* A Supabase project for database-backed flows.
* Environment variables configured from `.env.example`.

### 1. Clone Repository

```bash
git clone https://github.com/Phuonganh149/ai-recruitment-system.git
cd ai-recruitment-system
```

### 2. Prepare Environment Variables

Create a `.env` file based on `.env.example`.

```bash
cp .env.example .env
```

Update the required values:

```env
PORT=4173

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_CV_BUCKET=private-cvs

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

Do not commit real API keys or secret keys to GitHub.

### 3. Setup Supabase Database

Open Supabase SQL Editor and run the SQL script from:

```text
schema.sql
```

Make sure the required tables, policies, functions, and storage bucket are configured before running the server.

### 4. Run the Application

```bash
npm start
```

Default local address:

```text
http://localhost:4173
```

### 5. Run Verification Checks

```bash
npm test
```

The current test command performs syntax verification and release-readiness checks. Additional manual release checks are documented in `docs/TESTING.md` and `docs/MANUAL_TEST_REPORT.md`.

---

## Main Pages

### Login Page

```text
login.html
```

Main functions:

* Register account.
* Login account.
* Choose candidate or company role.
* OAuth login orientation.
* Navigate to company booking page.

### Company Dashboard

```text
dashboard.html
```

Main functions:

* View company overview.
* Manage job postings.
* View received applications.
* Manage wallet and CV unlocks.
* Track recruitment pipeline.
* View interview schedules.
* Buy recruitment posting packages.

---

## API Overview

The backend provides API routes for:

* Authentication and user profile.
* Company management.
* Job management.
* Candidate applications.
* Saved jobs.
* CV file access.
* AI chatbot.
* Company booking.
* Wallet and payment confirmation.
* Recruitment pipeline updates.
* Notifications.

Example route groups:

```text
/api/auth
/api/companies
/api/jobs
/api/applications
/api/saved-jobs
/api/chat
/api/company-bookings
/api/cv-files
```

---

## Release Status

Current planned release:

```text
v0.1.2 - Release Readiness Baseline
```

This release marks a release-readiness prototype milestone. It is still a prerelease because production hosting, full browser automation, and complete Supabase/AI integration tests are not finished yet.

Included in this milestone:

* Initial project structure.
* Recruitment platform UI pages.
* Node.js backend server.
* Supabase database connection.
* Company portal features.
* Candidate application flow.
* AI chatbot integration orientation.
* Documentation and release preparation files.
* Node.js syntax checks through `npm test`.
* Node.js release-readiness tests through `npm test`.
* GitHub Actions CI workflow.
* Testing evidence and release checklist documents.
* Deployment, security review, and manual test report documents.

---

## Documentation

Project documentation is located in the `/docs` directory.

Main documentation groups:

* AI documentation.
* API documentation.
* Backend documentation.
* Database documentation.
* Software Requirement Specification.
* Use case documentation.
* Testing evidence.
* Release checklist.
* Deployment guide.
* Security review.
* Manual test report.

---

## Future Enhancements

* AI-based CV parsing.
* AI Matching between CV and job description.
* Candidate ranking system.
* Email notification automation.
* Advanced company verification workflow.
* Admin analytics dashboard.
* Online interview scheduling integration.
* Payment gateway integration.
* Improved responsive UI.
* Automated testing and CI/CD pipeline.

---

## Contributors

| Name       | Responsibilities                             |
| ---------- | -------------------------------------------- |
| Phương Anh | Frontend, UI Design, Documentation           |
| Hiếu       | Database Design, AI Chatbot, Backend Support |
| Nguyên     | Frontend, Backend Development                |
| Nghĩa      | Backend Development, System Integration      |

---

## License

This project is licensed under the MIT License.

See the `LICENSE` file for more information.

---

## Academic Purpose

This project is developed for educational and academic purposes.
It demonstrates the design and implementation of a recruitment management system with AI support.
