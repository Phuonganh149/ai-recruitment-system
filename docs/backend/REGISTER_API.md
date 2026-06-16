# REGISTER API DESIGN

## Mục tiêu

Xây dựng API đăng ký tài khoản cho người dùng mới.

---

# Endpoint

```http
POST /api/auth/register
```

---

# Request Body

```json
{
  "email": "candidate@gmail.com",
  "password": "123456",
  "confirmPassword": "123456",
  "fullName": "Nguyen Van A",
  "phoneNumber": "0123456789",
  "role": "Candidate"
}
```

---

# Validation

* Email không được để trống.
* Email phải đúng định dạng.
* Mật khẩu tối thiểu 6 ký tự.
* Password và ConfirmPassword phải giống nhau.
* Email không được tồn tại trong hệ thống.

---

# Response Success

```json
{
  "success": true,
  "message": "Đăng ký thành công."
}
```

---

# Response Error

```json
{
  "success": false,
  "message": "Email đã tồn tại."
}
```

---

# Luồng xử lý

```text
Frontend
    ↓
Register API
    ↓
Validate dữ liệu
    ↓
Kiểm tra Email
    ↓
Hash Password
    ↓
Lưu Database
    ↓
Trả kết quả
```

---

# Kết luận

API hỗ trợ:

✅ Đăng ký Candidate

✅ Đăng ký Recruiter

✅ Kiểm tra dữ liệu đầu vào

✅ Mã hóa mật khẩu
