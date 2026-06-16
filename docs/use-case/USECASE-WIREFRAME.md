# PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG TUYỂN DỤNG

## 1. Use Case Diagram Tổng Thể

### Actors

**Ứng viên**

* Đăng ký tài khoản
* Đăng nhập
* Cập nhật hồ sơ cá nhân
* Tìm kiếm việc làm
* Xem chi tiết tin tuyển dụng
* Ứng tuyển việc làm
* Theo dõi trạng thái ứng tuyển

**Nhà tuyển dụng**

* Đăng ký tài khoản doanh nghiệp
* Đăng nhập
* Quản lý hồ sơ doanh nghiệp
* Đăng tin tuyển dụng
* Chỉnh sửa tin tuyển dụng
* Xóa tin tuyển dụng
* Quản lý hồ sơ ứng viên
* Xem thống kê tuyển dụng

**Quản trị viên**

* Quản lý tài khoản
* Quản lý doanh nghiệp
* Kiểm duyệt tin tuyển dụng
* Phân quyền người dùng
* Xem báo cáo thống kê

### Mô tả Use Case Diagram

Hệ thống tuyển dụng gồm ba tác nhân chính: Ứng viên, Nhà tuyển dụng và Quản trị viên. Ứng viên sử dụng hệ thống để tìm kiếm việc làm và nộp hồ sơ. Nhà tuyển dụng quản lý tin tuyển dụng và xử lý hồ sơ ứng viên. Quản trị viên chịu trách nhiệm giám sát, kiểm duyệt và quản lý toàn bộ hệ thống.

---

## 2. Use Case Specification

### UC01 - Đăng nhập

**Tên Use Case:** Đăng nhập

**Actor:** Ứng viên, Nhà tuyển dụng, Quản trị viên

**Mô tả:**
Người dùng đăng nhập vào hệ thống bằng email và mật khẩu.

**Tiền điều kiện:**

* Người dùng đã có tài khoản.

**Luồng chính:**

1. Người dùng truy cập trang đăng nhập.
2. Nhập email.
3. Nhập mật khẩu.
4. Nhấn nút Đăng nhập.
5. Hệ thống kiểm tra thông tin.
6. Hệ thống chuyển đến trang phù hợp với vai trò người dùng.

**Luồng thay thế:**

* Email hoặc mật khẩu không đúng.
* Hệ thống hiển thị thông báo lỗi.

**Hậu điều kiện:**

* Người dùng đăng nhập thành công.

---

### UC02 - Đăng ký tài khoản

**Actor:** Ứng viên, Nhà tuyển dụng

**Tiền điều kiện:**

* Chưa có tài khoản trên hệ thống.

**Luồng chính:**

1. Người dùng truy cập trang đăng ký.
2. Nhập thông tin cá nhân.
3. Nhập email.
4. Nhập mật khẩu.
5. Xác nhận mật khẩu.
6. Nhấn Đăng ký.
7. Hệ thống tạo tài khoản.

**Hậu điều kiện:**

* Tài khoản mới được tạo thành công.

---

### UC03 - Đăng tin tuyển dụng

**Actor:** Nhà tuyển dụng

**Tiền điều kiện:**

* Đã đăng nhập.

**Luồng chính:**

1. Chọn chức năng Đăng tuyển.
2. Nhập thông tin công việc.
3. Nhập mức lương.
4. Nhập yêu cầu tuyển dụng.
5. Nhấn Lưu.
6. Hệ thống gửi tin đến quản trị viên kiểm duyệt.

**Hậu điều kiện:**

* Tin tuyển dụng được lưu.

---

### UC04 - Ứng tuyển việc làm

**Actor:** Ứng viên

**Tiền điều kiện:**

* Đăng nhập hệ thống.
* Có hồ sơ cá nhân.

**Luồng chính:**

1. Tìm kiếm công việc.
2. Chọn công việc phù hợp.
3. Xem chi tiết tuyển dụng.
4. Nhấn Ứng tuyển.
5. Tải CV lên hệ thống.
6. Xác nhận gửi hồ sơ.
7. Hệ thống ghi nhận đơn ứng tuyển.

**Hậu điều kiện:**

* Hồ sơ được gửi đến nhà tuyển dụng.

---

## 3. Wireframe Giao Diện

### 3.1 Wireframe Đăng Nhập

+------------------------------------------------+
|                 ĐĂNG NHẬP                      |
+------------------------------------------------+
| Email                                          |
| [****************************]                |
|                                                |
| Mật khẩu                                       |
| [****************************]                |
|                                                |
| [ Đăng nhập ]                                  |
|                                                |
| Chưa có tài khoản? Đăng ký                     |
+------------------------------------------------+

---

### 3.2 Wireframe Đăng Ký

+------------------------------------------------+
|                 ĐĂNG KÝ                        |
+------------------------------------------------+
| Họ và tên                                      |
| [****************************]                |
|                                                |
| Email                                          |
| [****************************]                |
|                                                |
| Mật khẩu                                       |
| [****************************]                |
|                                                |
| Xác nhận mật khẩu                              |
| [****************************]                |
|                                                |
| [ Đăng ký ]                                    |
+------------------------------------------------+

---

### 3.3 Wireframe Trang Chủ

+------------------------------------------------+
| Logo | Trang chủ | Việc làm | Hồ sơ | Đăng xuất|
+------------------------------------------------+
|                                                |
|      THANH TÌM KIẾM VIỆC LÀM                  |
| [_____________________________________]        |
|                                                |

| Danh sách công việc                                |
| -------------------------------------------------- |
| Công việc 1                            [Xem]       |
| Công việc 2                            [Xem]       |
| Công việc 3                            [Xem]       |
| ------------------------------------------------   |
| +------------------------------------------------+ |

---

### 3.4 Wireframe Trang Quản Lý Tuyển Dụng

+------------------------------------------------+
|                QUẢN LÝ TUYỂN DỤNG              |
+------------------------------------------------+
| [ Thêm tin tuyển dụng ]                        |

|                                                    |            |          |     |
| -------------------------------------------------- | ---------- | -------- | --- |
| Vị trí                                             | Trạng thái | Thao tác |     |
| ------------------------------------------------   |            |          |     |
| Java Dev                                           | Đang tuyển | Sửa      | Xóa |
| Tester                                             | Đang tuyển | Sửa      | Xóa |
| BA                                                 | Tạm dừng   | Sửa      | Xóa |
| ------------------------------------------------   |            |          |     |
| +------------------------------------------------+ |            |          |     |

---

### 3.5 Wireframe Trang Ứng Tuyển

+------------------------------------------------+
|              THÔNG TIN TUYỂN DỤNG              |
+------------------------------------------------+
| Tên công việc                                  |
| Mô tả công việc                                |
| Yêu cầu                                        |
| Mức lương                                      |
|                                                |
| Tải CV                                         |
| [ Chọn tệp ]                                   |
|                                                |
| [ Ứng tuyển ngay ]                             |
+------------------------------------------------+

## Kết quả đạt được

* Hoàn thành Use Case Diagram tổng thể.
* Hoàn thành Use Case Specification cho các chức năng chính.
* Hoàn thành bộ Wireframe giao diện hệ thống tuyển dụng.
* Làm cơ sở cho giai đoạn thiết kế và phát triển hệ thống.
