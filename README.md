# CVMS - Multi-Enterprise Recruitment System with AI Chatbot

## 📌 Overview

CVMS (Candidate & Vacancy Management System) is a web-based recruitment platform that allows multiple companies to manage job postings, candidate applications, interview schedules, and recruitment workflows on a single system.

The platform integrates an AI Chatbot to assist candidates in searching jobs, answering recruitment-related questions, and providing career guidance.

---

## 🎯 Objectives

* Support recruitment activities for multiple enterprises.
* Simplify candidate application and tracking processes.
* Centralize job management and applicant data.
* Improve candidate experience through AI-powered assistance.
* Provide efficient recruitment analytics and management tools.

---

## 👥 User Roles

### 1. Administrator

* Manage enterprises.
* Manage user accounts.
* Monitor system activities.
* View recruitment statistics.

### 2. Recruiter (Enterprise)

* Create and manage job postings.
* Review candidate applications.
* Schedule interviews.
* Update recruitment status.
* Manage company profiles.

### 3. Candidate

* Register and manage profiles.
* Upload CVs and resumes.
* Search and apply for jobs.
* Track application status.
* Interact with AI Chatbot.

---

## ✨ Key Features

### Authentication & Authorization

* User Registration
* User Login/Logout
* Role-Based Access Control (RBAC)
* JWT Authentication

### Candidate Management

* Candidate Profile Management
* CV Upload & Storage
* Application Tracking
* Application History

### Job Management

* Create Job Postings
* Edit/Delete Job Postings
* Job Search & Filtering
* Job Detail View

### Recruitment Process

* Application Submission
* Candidate Screening
* Interview Scheduling
* Recruitment Status Updates

### AI Chatbot Integration

* Job Recommendation
* Recruitment FAQ Support
* CV Improvement Suggestions
* Career Guidance
* Intelligent Candidate Assistance

### Reporting & Analytics

* Number of Applications
* Recruitment Performance Statistics
* Enterprise Dashboard
* Candidate Analytics

---

## 🏗️ System Architecture

```
Frontend (ReactJS)
|
v
Backend (ASP.NET Core Web API)
|
v
Database (SQL Server)
|
+---- AI Chatbot Service
```

---

## 🛠️ Technology Stack

### Frontend

* ReactJS
* Tailwind CSS
* Axios
* React Router

### Backend

* ASP.NET Core Web API
* Entity Framework Core
* JWT Authentication

### Database

* SQL Server

### AI Integration

* OpenAI API / Gemini API
* NLP-based Candidate Support

### Development Tools

* Git
* GitHub
* Postman
* Visual Studio
* VS Code

---

## 📂 Project Structure

```
CVMS/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── components/
│
├── backend/
│   ├── Controllers/
│   ├── Services/
│   ├── Models/
│   ├── Repositories/
│   └── Data/
│
├── database/
│   └── scripts/
│
├── docs/
│   ├── usecases/
│   ├── diagrams/
│   └── requirements/
│
└── README.md
```

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/your-username/cvms.git
cd cvms
```

### Backend Setup

```bash
cd backend
dotnet restore
dotnet ef database update
dotnet run
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

---

## 📊 Future Enhancements

* Resume Parsing with AI
* Candidate Ranking System
* Video Interview Integration
* Email Notification Automation
* AI-powered Skill Matching
* Recruitment Recommendation Engine

---

## 📖 Documentation

Project documentation can be found in the `/docs` directory, including:

* Software Requirements Specification (SRS)
* Use Case Specifications
* UML Diagrams
* Database Design
* API Documentation

---

## 🤝 Contributors

| Name       | Responsibilities                        |
| ---------- | --------------------------------------- |
| Phương Anh | Frontend, Database Design               |
| Hiếu       | Database Design, AI Chatbot             |
| Nguyên     | Frontend, Backend Development           |
| Nghĩa      | Backend Development, System Integration |

---

## 📄 License

This project is developed for educational and academic purposes.
