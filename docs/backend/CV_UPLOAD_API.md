# CV UPLOAD API DESIGN

## Mục tiêu

Xây dựng API phục vụ tải lên và quản lý CV của ứng viên.

---

# 1. Upload CV

```http
POST /api/cvs/upload
```

## Request

```text
multipart/form-data
```

## File

```text
cv.pdf
cv.docx
```

---

# 2. Danh sách CV

```http
GET /api/cvs
```

---

# Response

```json
[
  {
    "id": "uuid",
    "fileName": "cv.pdf",
    "uploadedAt": "2026-06-17"
  }
]
```

---

# 3. Xóa CV

```http
DELETE /api/cvs/{id}
```

---

# 4. Xem chi tiết CV

```http
GET /api/cvs/{id}
```

---

# Điều kiện Upload

* Chỉ hỗ trợ PDF và DOCX.
* Kích thước tối đa: 10 MB.

---

# Luồng Upload

```text
Candidate
      ↓
Frontend
      ↓
Upload API
      ↓
Supabase Storage
      ↓
Lưu metadata
      ↓
Database
```

---

# Kết luận

API hỗ trợ:

✅ Upload CV.

✅ Quản lý nhiều CV.

✅ Tích hợp Supabase Storage.

✅ Chuẩn bị cho AI Parsing.
