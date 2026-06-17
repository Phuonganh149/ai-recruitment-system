# CANDIDATE PROFILE API DESIGN

## Mục tiêu

Xây dựng API quản lý thông tin hồ sơ ứng viên.

---

# 1. Lấy thông tin hồ sơ

```http
GET /api/candidates/profile
```

## Response

```json
{
  "id": "uuid",
  "fullName": "Nguyen Van A",
  "email": "candidate@gmail.com",
  "phoneNumber": "0123456789",
  "dateOfBirth": "2004-01-01",
  "address": "Ha Noi"
}
```

---

# 2. Cập nhật hồ sơ

```http
PUT /api/candidates/profile
```

## Request

```json
{
  "fullName": "Nguyen Van A",
  "phoneNumber": "0123456789",
  "address": "Ha Noi"
}
```

---

# 3. Cập nhật học vấn

```http
POST /api/candidates/educations
```

## Request

```json
{
  "schoolName": "CMC University",
  "major": "Information Security",
  "startYear": 2022,
  "endYear": 2026
}
```

---

# 4. Cập nhật kinh nghiệm

```http
POST /api/candidates/experiences
```

## Request

```json
{
  "companyName": "ABC Company",
  "position": "Intern Developer",
  "startDate": "2025-01-01",
  "endDate": "2025-06-01"
}
```

---

# Luồng xử lý

```text
Candidate
      ↓
Frontend
      ↓
Candidate API
      ↓
Supabase Database
      ↓
Response
```

---

# Kết luận

API hỗ trợ:

✅ Quản lý hồ sơ ứng viên.

✅ Quản lý học vấn.

✅ Quản lý kinh nghiệm làm việc.
