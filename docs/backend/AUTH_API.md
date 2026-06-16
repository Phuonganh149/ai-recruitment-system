# LOGIN API & JWT AUTHENTICATION

## Mục tiêu

Xây dựng chức năng đăng nhập và xác thực bằng JWT.

---

# Endpoint

```http
POST /api/auth/login
```

---

# Request Body

```json
{
  "email": "candidate@gmail.com",
  "password": "123456"
}
```

---

# Response Success

```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "role": "Candidate"
}
```

---

# Refresh Token API

```http
POST /api/auth/refresh-token
```

---

# Logout API

```http
POST /api/auth/logout
```

---

# Luồng xử lý

```text
User
 ↓
Login API
 ↓
Kiểm tra Email
 ↓
Kiểm tra Password
 ↓
Sinh JWT Token
 ↓
Sinh Refresh Token
 ↓
Lưu Session
 ↓
Trả Token về Frontend
```

---

# Phân quyền

## Candidate

* Ứng tuyển
* Quản lý hồ sơ

## Recruiter

* Đăng tin tuyển dụng
* Quản lý ứng viên

## Admin

* Quản lý toàn hệ thống

---

# Kết luận

Hệ thống hỗ trợ:

✅ JWT Authentication

✅ Refresh Token

✅ Logout

✅ Role-based Authorization
