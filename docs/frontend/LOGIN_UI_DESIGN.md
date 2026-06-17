# LOGIN UI DESIGN

## Mục tiêu

Thiết kế giao diện đăng nhập và luồng điều hướng theo vai trò người dùng.

## Công việc cần thực hiện

* [x] Thiết kế Wireframe trang Login.
* [x] Thiết kế Form Login.
* [x] Thiết kế luồng lưu JWT Token.
* [x] Thiết kế điều hướng theo Role.
* [x] Thiết kế trạng thái đăng nhập.

---

## Các thành phần giao diện

### Form Đăng nhập

* Email
* Mật khẩu
* Ghi nhớ đăng nhập
* Quên mật khẩu
* Nút Đăng nhập

---

## Điều hướng sau đăng nhập

### Candidate

```text
Dashboard Ứng viên
```

### Recruiter

```text
Dashboard Nhà tuyển dụng
```

### Admin

```text
Dashboard Quản trị
```

---

## Luồng hoạt động

```text
Người dùng
      ↓
Nhập Email & Password
      ↓
Login API
      ↓
Nhận JWT Token
      ↓
Lưu Token
      ↓
Điều hướng theo Role
```

---

## Kết quả đầu ra

* Wireframe trang Login.
* Thiết kế luồng phân quyền.
* Tài liệu mô tả giao diện.

## Acceptance Criteria

* [x] Hoàn thành Wireframe Login.
* [x] Hoàn thành thiết kế phân quyền.
* [x] Hoàn thành luồng lưu Token.
* [x] Tài liệu được lưu trên GitHub Repository.
