# CV STORAGE DESIGN

## 1. Mục tiêu

Thiết kế cơ sở dữ liệu phục vụ việc lưu trữ CV của ứng viên và quản lý các tệp hồ sơ trên hệ thống.

Hệ thống hỗ trợ:

* Upload CV định dạng PDF.
* Upload CV định dạng DOCX.
* Quản lý nhiều CV cho một ứng viên.
* Chuẩn bị dữ liệu cho phân hệ AI.

---

# 2. Cơ chế lưu trữ

## Tệp CV

Tệp được lưu trên:

```text
Supabase Storage
```

Ví dụ:

```text
candidate-cvs/
├── candidate_01/
│   ├── cv_2026_01.pdf
│   └── cv_2026_02.docx
```

---

# 3. Bảng CVs

Lưu thông tin metadata của tệp CV.

| Tên cột          | Kiểu dữ liệu | Ràng buộc     |
| ---------------- | ------------ | ------------- |
| Id               | UUID         | Primary Key   |
| CandidateId      | UUID         | Foreign Key   |
| FileName         | VARCHAR(255) | Not Null      |
| OriginalFileName | VARCHAR(255) | Not Null      |
| FileType         | VARCHAR(20)  | PDF/DOCX      |
| FileSize         | BIGINT       | Not Null      |
| StoragePath      | TEXT         | Not Null      |
| IsDefault        | BOOLEAN      | Default False |
| UploadedAt       | TIMESTAMP    | Not Null      |
| UpdatedAt        | TIMESTAMP    | Nullable      |

---

# 4. Quan hệ dữ liệu

```text
Candidates (1)
        │
        │
        └──────< CVs (N)
```

Một ứng viên có thể tải lên nhiều CV.

---

# 5. Quy tắc lưu trữ

* Chỉ chấp nhận PDF và DOCX.
* Kích thước tệp tối đa: 10 MB.
* Một ứng viên có thể có nhiều CV.
* Một CV được đánh dấu là CV mặc định.

---

# 6. Luồng Upload

```text
Candidate
      ↓
Frontend
      ↓
Upload API
      ↓
Supabase Storage
      ↓
Lưu metadata vào bảng CVs
```

---

# 7. Hướng mở rộng

* Hỗ trợ nhiều phiên bản CV.
* Xóa mềm (Soft Delete).
* Lưu lịch sử tải lên.
* Hỗ trợ lưu CV bằng tiếng Việt và tiếng Anh.

---

# 8. Kết luận

Thiết kế đáp ứng:

✅ Quản lý nhiều CV.

✅ Hỗ trợ AI phân tích CV.

✅ Tối ưu lưu trữ bằng Supabase Storage.
