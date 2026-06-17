# CV UPLOAD UI DESIGN

## 1. Mục tiêu

Thiết kế giao diện tải lên và quản lý CV của ứng viên, hỗ trợ:

* Upload CV dưới định dạng PDF hoặc DOCX.
* Quản lý danh sách CV đã tải lên.
* Xem trạng thái phân tích CV bằng AI.
* Xóa hoặc thay thế CV.
* Hỗ trợ Responsive trên nhiều thiết bị.

---

# 2. Các chức năng chính

## 2.1 Upload CV

Cho phép ứng viên:

* Chọn tệp từ máy tính.
* Kéo và thả tệp vào khu vực Upload.
* Chỉ chấp nhận:

```text
PDF
DOCX
```

* Kích thước tệp tối đa:

```text
10 MB
```

---

## 2.2 Danh sách CV

Hiển thị:

* Tên tệp.
* Ngày tải lên.
* Kích thước tệp.
* Trạng thái phân tích.
* Nút xem chi tiết.
* Nút xóa.

---

## 2.3 Trạng thái phân tích AI

### Pending

```text
Đang phân tích...
```

### Completed

```text
Đã phân tích thành công.
```

### Failed

```text
Phân tích thất bại.
```

---

# 3. Wireframe

## Trang Upload CV

```text
---------------------------------------------------
|                 Upload CV                        |
---------------------------------------------------
|                                                   |
|        Kéo và thả CV vào đây                      |
|                    hoặc                           |
|            [ Chọn tệp từ máy tính ]               |
|                                                   |
---------------------------------------------------
| Hỗ trợ: PDF, DOCX (Tối đa 10 MB)                  |
---------------------------------------------------
```

---

## Danh sách CV

```text
------------------------------------------------------------
| Tên tệp      | Ngày tải | Trạng thái | Thao tác          |
------------------------------------------------------------
| cv_1.pdf     | 01/08/26 | Completed  | Xem | Xóa         |
| cv_2.docx    | 02/08/26 | Pending    | Xem | Xóa         |
------------------------------------------------------------
```

---

# 4. Luồng hoạt động

## Upload CV

```text
Candidate
      ↓
Chọn hoặc kéo thả tệp
      ↓
Validate định dạng
      ↓
Upload API
      ↓
Supabase Storage
      ↓
Lưu metadata
      ↓
Bắt đầu AI Parsing
```

---

## Xóa CV

```text
Candidate
      ↓
Nhấn Xóa
      ↓
Xác nhận
      ↓
Delete API
      ↓
Xóa dữ liệu
```

---

# 5. Responsive Design

## Desktop

* Upload Area lớn.
* Danh sách CV hiển thị dạng bảng.

## Tablet

* Danh sách hiển thị dạng Card.

## Mobile

* Upload Area toàn màn hình.
* Mỗi CV hiển thị theo chiều dọc.

---

# 6. Components

* CVUploadArea
* DragDropZone
* UploadButton
* CVList
* CVCard
* DeleteModal
* AnalysisStatusBadge

---

# 7. Thông báo hệ thống

## Upload thành công

```text
Tải CV lên thành công.
```

## Upload thất bại

```text
Không thể tải CV lên.
Vui lòng thử lại.
```

## Sai định dạng

```text
Chỉ hỗ trợ tệp PDF hoặc DOCX.
```

## Quá dung lượng

```text
Kích thước tệp không được vượt quá 10 MB.
```

---

# 8. Kết luận

Giao diện đáp ứng:

✅ Upload CV.

✅ Quản lý nhiều CV.

✅ Theo dõi trạng thái phân tích AI.

✅ Hỗ trợ Responsive.

---

# Hướng phát triển

* Xem trước nội dung CV.
* Đổi tên CV.
* Đặt CV mặc định.
* Hiển thị kết quả CV Parsing.
* Gợi ý cải thiện CV bằng AI.
