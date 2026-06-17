# CV ANALYSIS DATABASE DESIGN

## 1. Mục tiêu

Thiết kế cơ sở dữ liệu phục vụ phân tích CV bằng AI, bao gồm:

* CV Parsing
* Skill Extraction
* CV Matching

---

# 2. Bảng CVAnalysisResults

Lưu kết quả phân tích CV.

| Tên cột             | Kiểu dữ liệu | Ràng buộc                |
| ------------------- | ------------ | ------------------------ |
| Id                  | UUID         | Primary Key              |
| CvId                | UUID         | Foreign Key              |
| ExtractedName       | VARCHAR(100) | Nullable                 |
| ExtractedEmail      | VARCHAR(255) | Nullable                 |
| ExtractedPhone      | VARCHAR(20)  | Nullable                 |
| ExtractedEducation  | TEXT         | Nullable                 |
| ExtractedExperience | TEXT         | Nullable                 |
| AnalysisStatus      | VARCHAR(50)  | Pending/Completed/Failed |
| CreatedAt           | TIMESTAMP    | Not Null                 |

---

# 3. Bảng CandidateSkills

Lưu kỹ năng được AI trích xuất từ CV.

| Tên cột           | Kiểu dữ liệu | Ràng buộc   |
| ----------------- | ------------ | ----------- |
| Id                | UUID         | Primary Key |
| CandidateId       | UUID         | Foreign Key |
| SkillName         | VARCHAR(100) | Not Null    |
| SkillLevel        | VARCHAR(50)  | Nullable    |
| YearsOfExperience | INTEGER      | Nullable    |
| CreatedAt         | TIMESTAMP    | Not Null    |

---

# 4. Quan hệ dữ liệu

```text
CVs (1)
    │
    │
    └──────< CVAnalysisResults (1)

Candidates (1)
        │
        │
        └──────< CandidateSkills (N)
```

---

# 5. Luồng phân tích CV

```text
Upload CV
      ↓
Supabase Storage
      ↓
AI Service
      ↓
CV Parsing
      ↓
Skill Extraction
      ↓
Lưu kết quả vào Database
```

---

# 6. Dữ liệu phục vụ AI Matching

Hệ thống sẽ sử dụng:

* CandidateSkills
* JobSkills
* JobRequirements

để tính toán:

```text
Matching Score (%)
```

---

# 7. Hướng mở rộng

* Lưu Embedding Vector.
* Lưu kết quả Semantic Matching.
* Gợi ý công việc phù hợp.
* Phân tích điểm mạnh và điểm yếu của ứng viên.

---

# 8. Kết luận

Thiết kế hiện tại đáp ứng:

✅ CV Parsing.

✅ Skill Extraction.

✅ Chuẩn bị dữ liệu cho CV Matching.

✅ Có khả năng mở rộng cho các mô hình AI trong tương lai.
