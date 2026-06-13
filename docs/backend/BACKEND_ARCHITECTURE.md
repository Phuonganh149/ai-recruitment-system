# BACKEND ARCHITECTURE

## 1. Sơ đồ kiến trúc Backend

```text
                    ┌─────────────────┐
                    │     ReactJS     │
                    │    Frontend     │
                    └────────┬────────┘
                             │ HTTP/HTTPS
                             ▼
                ┌─────────────────────────┐
                │ ASP.NET Core Web API    │
                │        Backend          │
                └───────────┬─────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼

┌──────────────┐   ┌──────────────┐   ┌────────────────┐
│ Authentication│   │ Business     │   │ AI Integration │
│    Module     │   │   Modules    │   │    Module      │
└──────┬────────┘   └──────┬───────┘   └───────┬────────┘
       │                   │                   │
       └─────────┬─────────┴─────────┬─────────┘
                 ▼                   ▼

        ┌────────────────┐   ┌────────────────┐
        │ Supabase       │   │ AI Service     │
        │ PostgreSQL DB  │   │ (Python/NLP)   │
        └────────────────┘   └────────────────┘
```

---

# 2. Các Module Backend

## 2.1 Authentication Module

Chức năng:

* Đăng ký tài khoản
* Đăng nhập
* Đăng xuất
* Xác thực người dùng
* Phân quyền theo vai trò

Các vai trò:

* Candidate
* Recruiter
* Admin

---

## 2.2 User Management Module

Chức năng:

* Quản lý thông tin người dùng
* Cập nhật hồ sơ cá nhân
* Quản lý quyền truy cập

---

## 2.3 Recruitment Management Module

Chức năng:

* Tạo tin tuyển dụng
* Cập nhật tin tuyển dụng
* Xóa tin tuyển dụng
* Quản lý trạng thái tuyển dụng

---

## 2.4 Candidate Management Module

Chức năng:

* Quản lý hồ sơ ứng viên
* Quản lý CV
* Theo dõi trạng thái ứng tuyển

---

## 2.5 Interview Management Module

Chức năng:

* Tạo lịch phỏng vấn
* Cập nhật lịch phỏng vấn
* Gửi thông báo phỏng vấn
* Quản lý kết quả phỏng vấn

---

## 2.6 AI Integration Module

Chức năng:

* Gửi CV đến AI Service
* Nhận kết quả CV Parsing
* Nhận kết quả Skill Extraction
* Nhận kết quả CV Matching
* Giao tiếp với Chatbot AI

---

## 2.7 Notification Module

Chức năng:

* Gửi thông báo hệ thống
* Thông báo trạng thái hồ sơ
* Thông báo lịch phỏng vấn

---

# 3. Cấu trúc thư mục Backend

```text
Backend
│
├── Controllers
│   ├── AuthController
│   ├── UserController
│   ├── JobController
│   ├── CandidateController
│   ├── InterviewController
│   └── AIController
│
├── Services
│   ├── AuthService
│   ├── JobService
│   ├── CandidateService
│   ├── InterviewService
│   └── AIService
│
├── Repositories
│
├── Models
│
├── DTOs
│
├── Middleware
│
├── Configurations
│
└── Program.cs
```

---

# 4. Luồng xử lý dữ liệu

## 4.1 Luồng đăng nhập

```text
User
 │
 ▼
Frontend
 │
 ▼
POST /login
 │
 ▼
AuthController
 │
 ▼
AuthService
 │
 ▼
Supabase Database
 │
 ▼
Xác thực thành công
 │
 ▼
JWT Token
 │
 ▼
Frontend
```

---

## 4.2 Luồng ứng tuyển

```text
Candidate
 │
 ▼
Frontend
 │
 ▼
Upload CV
 │
 ▼
Backend API
 │
 ▼
Supabase Storage
 │
 ▼
Lưu thông tin hồ sơ
 │
 ▼
AI Service
 │
 ▼
CV Parsing
 │
 ▼
Skill Extraction
 │
 ▼
CV Matching
 │
 ▼
Kết quả đánh giá
 │
 ▼
Supabase Database
 │
 ▼
Recruiter Dashboard
```

---

## 4.3 Luồng Chatbot AI

```text
User
 │
 ▼
Frontend Chat
 │
 ▼
Backend API
 │
 ▼
AI Service
 │
 ▼
LLM Processing
 │
 ▼
Generate Response
 │
 ▼
Backend API
 │
 ▼
Frontend
 │
 ▼
User
```

---

# 5. Công nghệ Backend dự kiến

## Framework

* ASP.NET Core Web API (.NET 8)

## Database

* Supabase
* PostgreSQL

## Authentication

* JWT Authentication

## AI Integration

* Python
* NLP
* LLM API

## Development Tools

* Git
* GitHub
* Postman
* Visual Studio 2022
* Visual Studio Code

```
```
