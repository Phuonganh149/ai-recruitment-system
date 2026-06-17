# CANDIDATE PROFILE UI DESIGN

## 1. Mục tiêu

Thiết kế giao diện quản lý hồ sơ ứng viên, cho phép ứng viên:

* Xem thông tin cá nhân.
* Cập nhật thông tin cá nhân.
* Quản lý học vấn.
* Quản lý kinh nghiệm làm việc.
* Quản lý kỹ năng.

Giao diện cần trực quan, dễ sử dụng và hỗ trợ Responsive trên nhiều thiết bị.

---

# 2. Các chức năng chính

## 2.1 Xem hồ sơ ứng viên

Ứng viên có thể xem:

* Họ và tên
* Email
* Số điện thoại
* Ngày sinh
* Địa chỉ
* Ảnh đại diện
* Học vấn
* Kinh nghiệm làm việc
* Kỹ năng

---

## 2.2 Cập nhật hồ sơ

Cho phép chỉnh sửa:

* Họ và tên
* Số điện thoại
* Ngày sinh
* Địa chỉ
* Ảnh đại diện

---

## 2.3 Quản lý học vấn

Cho phép:

* Thêm học vấn.
* Chỉnh sửa học vấn.
* Xóa học vấn.

Thông tin:

* Trường học
* Chuyên ngành
* Năm bắt đầu
* Năm kết thúc
* Xếp loại

---

## 2.4 Quản lý kinh nghiệm

Cho phép:

* Thêm kinh nghiệm.
* Chỉnh sửa kinh nghiệm.
* Xóa kinh nghiệm.

Thông tin:

* Công ty
* Vị trí
* Ngày bắt đầu
* Ngày kết thúc
* Mô tả công việc

---

## 2.5 Quản lý kỹ năng

Cho phép:

* Thêm kỹ năng.
* Xóa kỹ năng.
* Cập nhật mức độ thành thạo.

---

# 3. Wireframe

## Trang hồ sơ ứng viên

```text
--------------------------------------------------
| Avatar | Nguyễn Văn A                         |
|         | Candidate                           |
--------------------------------------------------
| Email: candidate@gmail.com                    |
| Phone: 0123456789                             |
| Address: Hà Nội                               |
--------------------------------------------------
| Học vấn                                       |
| + Đại học CMC                                 |
--------------------------------------------------
| Kinh nghiệm                                   |
| + Intern Developer                            |
--------------------------------------------------
| Kỹ năng                                       |
| + Java                                        |
| + ReactJS                                     |
| + SQL                                         |
--------------------------------------------------
|      [ Chỉnh sửa hồ sơ ]                      |
--------------------------------------------------
```

---

# 4. Luồng hoạt động

```text
Candidate
      ↓
Profile Page
      ↓
Edit Profile
      ↓
Submit
      ↓
Profile API
      ↓
Database
      ↓
Update Success
```

---

# 5. Responsive Design

## Desktop

* Sidebar bên trái.
* Nội dung hiển thị 2 cột.

## Tablet

* Nội dung hiển thị 1 cột.

## Mobile

* Toàn bộ thông tin hiển thị theo chiều dọc.

---

# 6. Thành phần giao diện

## Components

* ProfileCard
* PersonalInformationForm
* EducationSection
* ExperienceSection
* SkillSection
* UpdateButton

---

# 7. Thông báo hệ thống

## Thành công

```text
Cập nhật hồ sơ thành công.
```

## Thất bại

```text
Không thể cập nhật hồ sơ.
Vui lòng thử lại.
```

---

# 8. Kết luận

Giao diện đáp ứng:

✅ Quản lý hồ sơ cá nhân.

✅ Quản lý học vấn.

✅ Quản lý kinh nghiệm.

✅ Quản lý kỹ năng.

✅ Hỗ trợ Responsive trên nhiều thiết bị.

---

# Hướng phát triển

* Tích hợp Upload Avatar.
* Tích hợp CV Parsing AI.
* Gợi ý kỹ năng còn thiếu.
* Tự động cập nhật hồ sơ từ CV.
