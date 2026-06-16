# AUTHENTICATION SESSION & TOKEN DESIGN

## 1. Mục tiêu

Thiết kế cơ sở dữ liệu phục vụ chức năng quản lý phiên đăng nhập, Refresh Token và bảo mật xác thực cho hệ thống tuyển dụng.

---

# 2. Bảng RefreshTokens

Lưu Refresh Token của người dùng để hỗ trợ đăng nhập lâu dài.

| Tên cột   | Kiểu dữ liệu | Ràng buộc     |
| --------- | ------------ | ------------- |
| Id        | UUID         | Primary Key   |
| UserId    | UUID         | Foreign Key   |
| Token     | TEXT         | Not Null      |
| ExpiresAt | TIMESTAMP    | Not Null      |
| CreatedAt | TIMESTAMP    | Not Null      |
| RevokedAt | TIMESTAMP    | Nullable      |
| IsRevoked | BOOLEAN      | Default False |

---

# 3. Bảng Sessions

Lưu thông tin phiên đăng nhập của người dùng.

| Tên cột    | Kiểu dữ liệu | Ràng buộc    |
| ---------- | ------------ | ------------ |
| Id         | UUID         | Primary Key  |
| UserId     | UUID         | Foreign Key  |
| DeviceInfo | TEXT         | Nullable     |
| IpAddress  | VARCHAR(100) | Nullable     |
| LoginAt    | TIMESTAMP    | Not Null     |
| LogoutAt   | TIMESTAMP    | Nullable     |
| IsActive   | BOOLEAN      | Default True |

---

# 4. Quan hệ dữ liệu

```text
Users (1)
     │
     ├──────< RefreshTokens (N)
     │
     └──────< Sessions (N)
```

Một User có thể có nhiều phiên đăng nhập và nhiều Refresh Token.

---

# 5. Sơ đồ ERD

```text
+--------------------+
|       Users        |
+--------------------+
| Id (PK)            |
| Email              |
| PasswordHash       |
| RoleId (FK)        |
+--------------------+
          |
          |1
          |
          |N
+--------------------+
|   RefreshTokens    |
+--------------------+
| Id (PK)            |
| UserId (FK)        |
| Token              |
| ExpiresAt          |
| CreatedAt          |
| RevokedAt          |
| IsRevoked          |
+--------------------+

          |
          |1
          |
          |N
+--------------------+
|      Sessions      |
+--------------------+
| Id (PK)            |
| UserId (FK)        |
| DeviceInfo         |
| IpAddress          |
| LoginAt            |
| LogoutAt           |
| IsActive           |
+--------------------+
```

---

# 6. Luồng hoạt động

## Đăng nhập

```text
User
 ↓
Login API
 ↓
JWT Access Token
 ↓
Refresh Token
 ↓
Lưu RefreshTokens
 ↓
Tạo Session
```

---

## Làm mới Token

```text
Client
 ↓
Refresh Token
 ↓
Kiểm tra trạng thái Token
 ↓
Sinh JWT mới
```

---

## Đăng xuất

```text
User
 ↓
Logout API
 ↓
Thu hồi Refresh Token
 ↓
Cập nhật Session
```

---

# 7. Giải pháp bảo mật

* Mã hóa mật khẩu bằng BCrypt.
* Sử dụng JWT Authentication.
* Thiết lập thời gian hết hạn Access Token.
* Thu hồi Refresh Token khi đăng xuất.
* Hỗ trợ đăng xuất khỏi tất cả thiết bị.

---

# 8. Hướng mở rộng

* LoginHistory.
* Multi-factor Authentication (MFA).
* Email Verification.
* Password Reset.
* Device Management.

---

# 9. Kết luận

Thiết kế hiện tại đáp ứng:

✅ Quản lý phiên đăng nhập.

✅ Quản lý Refresh Token.

✅ Hỗ trợ JWT Authentication.

✅ Có khả năng mở rộng cho các cơ chế bảo mật nâng cao.
