# AUTHENTICATION DATABASE DESIGN

## 1. Mục tiêu

Thiết kế cơ sở dữ liệu phục vụ chức năng xác thực và phân quyền người dùng trong hệ thống tuyển dụng thông minh.

Hệ thống hỗ trợ 3 vai trò:

* Admin
* Recruiter
* Candidate

---

# 2. Các bảng dữ liệu

## 2.1 Bảng Roles

Lưu thông tin các vai trò trong hệ thống.

| Tên cột     | Kiểu dữ liệu | Ràng buộc        |
| ----------- | ------------ | ---------------- |
| Id          | UUID         | Primary Key      |
| Name        | VARCHAR(50)  | Unique, Not Null |
| Description | TEXT         | Nullable         |

### Dữ liệu mẫu

| Id | Name      |
| -- | --------- |
| 1  | Admin     |
| 2  | Recruiter |
| 3  | Candidate |

---

## 2.2 Bảng Users

Lưu thông tin tài khoản người dùng.

| Tên cột      | Kiểu dữ liệu | Ràng buộc    |
| ------------ | ------------ | ------------ |
| Id           | UUID         | Primary Key  |
| Email        | VARCHAR(255) | Unique       |
| PasswordHash | TEXT         | Not Null     |
| FullName     | VARCHAR(100) | Not Null     |
| PhoneNumber  | VARCHAR(20)  | Nullable     |
| AvatarUrl    | TEXT         | Nullable     |
| RoleId       | UUID         | Foreign Key  |
| IsActive     | BOOLEAN      | Default True |
| CreatedAt    | TIMESTAMP    | Not Null     |
| UpdatedAt    | TIMESTAMP    | Nullable     |

---

# 3. Quan hệ dữ liệu

```text
Roles (1)
      │
      │
      └──────< Users (N)
```

Một Role có nhiều User.

Một User chỉ thuộc một Role.

---

# 4. Sơ đồ ERD

```text
+--------------------+
|       Roles        |
+--------------------+
| Id (PK)            |
| Name               |
| Description        |
+--------------------+
          |
          | 1
          |
          | N
+--------------------+
|       Users        |
+--------------------+
| Id (PK)            |
| Email              |
| PasswordHash       |
| FullName           |
| PhoneNumber        |
| AvatarUrl          |
| RoleId (FK)        |
| IsActive           |
| CreatedAt          |
| UpdatedAt          |
+--------------------+
```

---

# 5. Giải thích thiết kế

## Bảng Roles

Phục vụ chức năng:

* Phân quyền hệ thống.
* Điều hướng giao diện theo vai trò.
* Kiểm soát truy cập API.

---

## Bảng Users

Phục vụ chức năng:

* Đăng ký tài khoản.
* Đăng nhập.
* Quản lý hồ sơ người dùng.
* Xác thực JWT.

---

# 6. Hướng mở rộng

Trong các giai đoạn tiếp theo có thể mở rộng:

* Permissions
* UserRoles
* AuditLogs
* LoginHistory

---

# 7. Kết luận

Thiết kế hiện tại đáp ứng:

✅ Đăng ký tài khoản.

✅ Đăng nhập.

✅ Phân quyền người dùng.

✅ Khả năng mở rộng cho các chức năng quản trị trong tương lai.
