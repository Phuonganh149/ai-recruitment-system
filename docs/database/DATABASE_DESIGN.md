# Tài Liệu Thiết Kế Cơ Sở Dữ Liệu Chi Tiết (Database Design Specification)
## Dự án: Hệ Thống Tuyển Dụng Cho Doanh Nghiệp (Enterprise Recruitment System)

[cite_start]Tài liệu này đặc tả cấu trúc cơ sở dữ liệu quan hệ MySQL, các ràng buộc toàn vẹn và giải pháp lưu trữ dữ liệu nâng cao phục vụ cho phân hệ Trí tuệ nhân tạo (AI Parsing, Matching và Chatbot)[cite: 51, 98].

---

## 📊 1. Sơ Đồ Thực Thể Mối Quan Hệ (Entity Relationship Diagram - ERD)

[cite_start]Hệ thống được thiết kế tối ưu hóa theo chuẩn hóa **3NF (Third Normal Form)** nhằm đảm bảo tính toàn vẹn dữ liệu, tránh trùng lặp thông tin và đáp ứng yêu cầu tốc độ phản hồi API < 1 giây/request.

*(Nhóm có thể sử dụng đoạn mã khối Mermaid dưới đây để tự động vẽ sơ đồ ERD trực quan ngay trên GitHub mà không cần chèn file ảnh bên ngoài)*

```mermaid
erDiagram
    USERS ||--o| CANDIDATES : "has_profile (1:1)"
    USERS ||--o| RECRUITERS : "has_profile (1:1)"
    RECRUITERS ||--o{ JOBS : "creates (1:N)"
    JOBS ||--o{ APPLICATIONS : "receives (1:N)"
    CANDIDATES ||--o{ APPLICATIONS : "submits (1:N)"
    APPLICATIONS ||--o| CV_ANALYSIS_RESULTS : "analyzed_by (1:1)"
    APPLICATIONS ||--o{ INTERVIEWS : "schedules (1:N)"
    CANDIDATES ||--o{ CANDIDATE_SKILLS : "has (1:N)"
    SKILLS ||--o{ CANDIDATE_SKILLS : "belongs_to (1:N)"
    USERS ||--o{ NOTIFICATIONS : "receives (1:N)"

    USERS {
        int user_id PK "AUTO_INCREMENT"
        varchar email "UNIQUE"
        varchar password_hash
        enum role "Admin / Candidate"
        datetime created_at
    }

    CANDIDATES {
        int candidate_id PK "FK to Users.user_id"
        varchar fullname
        varchar phone
        varchar cv_url "Path to PDF/DOCX file"
        datetime updated_at
    }

    RECRUITERS {
        int recruiter_id PK "FK to Users.user_id"
        varchar fullname
        varchar department
    }

    JOBS {
        int job_id PK "AUTO_INCREMENT"
        int recruiter_id FK
        varchar title
        varchar department
        text description
        varchar salary
        date deadline
        enum status "Đang mở / Đã đóng"
    }

    APPLICATIONS {
        int application_id PK "AUTO_INCREMENT"
        int job_id FK
        int candidate_id FK
        text cover_letter
        varchar cv_submitted_url
        enum status "Mới tiếp nhận / Đang xét duyệt / Phỏng vấn / Đạt / Từ chối"
        datetime applied_at
    }

    INTERVIEWS {
        int interview_id PK "AUTO_INCREMENT"
        int application_id FK
        datetime interview_date
        varchar location_type "Online / Offline"
        text hr_notes
        enum result "Chưa có / Đạt / Từ chối"
    }

    SKILLS {
        int skill_id PK "AUTO_INCREMENT"
        varchar skill_name "UNIQUE"
    }

    CANDIDATE_SKILLS {
        int candidate_id PK, FK
        int skill_id PK, FK
        int years_of_experience
    }

    CV_ANALYSIS_RESULTS {
        int analysis_id PK "AUTO_INCREMENT"
        int application_id FK, UNIQUE
        int match_score "Scale 0-100"
        text key_skills_extracted "JSON text"
        text missing_skills "JSON text"
        text ai_recommendations
        datetime analyzed_at
    }

    NOTIFICATIONS {
        int notification_id PK "AUTO_INCREMENT"
        int user_id FK
        varchar title
        text content
        boolean is_read
        datetime created_at
    }
🗄️ 2. Danh Sách Các Bảng Dữ Liệu Và Quy Định Khóa (Data Dictionary)2.1. Bảng Users (Quản lý tài khoản hệ thống) Mô tả: Lưu trữ thông tin đăng nhập, mật khẩu mã hóa và phân cấp vai trò cơ bản.  Khóa chính (PK): user_id (Kiểu dữ liệu: INT, Cơ chế: Tự động tăng).Ràng buộc: email là duy nhất (UNIQUE), password_hash lưu chuỗi đã băm bảo mật.2.2. Bảng Candidates (Hồ sơ chi tiết Ứng viên) Mô tả: Chứa thông tin cá nhân mở rộng của người dùng có vai trò là Ứng viên.  Khóa chính (PK): candidate_id (Kiểu dữ liệu: INT).Khóa ngoại (FK): candidate_id liên kết trực tiếp đến Users(user_id) theo mối quan hệ 1:1, cấu hình ràng buộc ON DELETE CASCADE.2.3. Bảng Recruiters (Thông tin Chuyên viên Nhân sự/Admin) Mô tả: Chứa thông tin phòng ban của bộ phận HR phục vụ bài toán phân hệ quản trị.  Khóa chính (PK): recruiter_id (Kiểu dữ liệu: INT).Khóa ngoại (FK): recruiter_id liên kết trực tiếp đến Users(user_id) theo mối quan hệ 1:1, cấu hình ràng buộc ON DELETE CASCADE.2.4. Bảng Jobs (Quản lý vị trí / Tin tuyển dụng) Mô tả: Lưu trữ thông tin chi tiết về các cơ hội việc làm đang tuyển dụng.  Khóa chính (PK): job_id (Kiểu dữ liệu: INT, Tự động tăng).Khóa ngoại (FK): recruiter_id liên kết đến Recruiters(recruiter_id) để xác định người đăng tin.  2.5. Bảng Applications (Quản lý Đơn ứng tuyển) Mô tả: Điểm chạm kết nối giữa Ứng viên và Tin tuyển dụng, đóng vai trò là Pipeline theo dõi trạng thái hồ sơ.  Khóa chính (PK): application_id (Kiểu dữ liệu: INT, Tự động tăng).Khóa ngoại (FK): * job_id liên kết với Jobs(job_id).candidate_id liên kết với Candidates(candidate_id).2.6. Bảng Interviews (Quản lý Lịch phỏng vấn) Mô tả: Lưu trữ thời gian, hình thức và kết quả đánh giá chuyên môn sau phỏng vấn.  Khóa chính (PK): interview_id (Kiểu dữ liệu: INT, Tự động tăng).Khóa ngoại (FK): application_id liên kết với Applications(application_id) nhằm truy vết lịch sử phỏng vấn của đơn ứng tuyển.  2.7. Bảng Skills (Từ điển Kỹ năng công nghệ) Mô tả: Danh mục chuẩn hóa các từ khóa kỹ năng (Ví dụ: ReactJS, Node.js, Python...).  Khóa chính (PK): skill_id (Kiểu dữ liệu: INT, Tự động tăng).2.8. Bảng CandidateSkills (Bảng trung gian Kỹ năng Ứng viên) Mô tả: Hiện thực hóa mối quan hệ Nhiều - Nhiều (N:N) giữa Ứng viên và kỹ năng, lưu kèm số năm kinh nghiệm thực tế.  Khóa chính (PK): Hợp thể cặp khóa (candidate_id, skill_id).Khóa ngoại (FK): Liên kết đồng thời sang bảng Candidates và Skills.2.9. Bảng Notifications (Quản lý thông báo hệ thống) Mô tả: Lưu trạng thái gửi thư mời phỏng vấn hoặc kết quả tuyển dụng tới người dùng.  Khóa chính (PK): notification_id (Kiểu dữ liệu: INT, Tự động tăng).Khóa ngoại (FK): user_id liên kết đến Users(user_id).🤖 3. Đề Xuất Cấu Trúc Lưu Trữ Dữ Liệu Phục Vụ AI (CVAnalysisResults)Để phục vụ tốt nhất cho các thuật toán phân tích ngôn ngữ tự nhiên (NLP) và so khớp ngữ nghĩa (Semantic Matching) mà không làm chậm hệ thống Web chính, dữ liệu AI được cấu trúc tối ưu như sau:  3.1. Bảng cấu trúc dữ liệu CVAnalysisResultsKhóa chính (PK): analysis_id (Kiểu dữ liệu: INT, Tự động tăng).Khóa ngoại (FK): application_id liên kết UNIQUE đến bảng Applications để đảm bảo mỗi đơn ứng tuyển chỉ có một kết quả phân tích AI duy nhất.3.2. Cấu trúc các trường lưu trữ phục vụ thuật toán AITrường match_score (Kiểu dữ liệu INT): Lưu trữ điểm số tương tương thích theo thang điểm 100 sau khi AI so khớp CV với Job Description, giúp Admin sử dụng bộ lọc nâng cao hàng loạt.  Trường key_skills_extracted (Kiểu dữ liệu TEXT / LONGTEXT - Lưu dưới dạng chuỗi JSON): * Mục đích: Lưu trữ mảng các kỹ năng chuyên môn được AI bóc tách tự động.  Cấu trúc JSON mẫu: {"technical_skills": ["Node.js", "MySQL", "JavaScript"], "soft_skills": ["Teamwork"]}.  Trường missing_skills (Kiểu dữ liệu TEXT - Lưu dưới dạng chuỗi JSON):Mục đích: Lưu trữ các lỗ hổng kỹ năng phục vụ tính năng "Khuyến nghị tự đánh giá" cho Ứng viên.  Cấu trúc JSON mẫu: ["TypeScript", "Docker", "AWS"].  Trường ai_recommendations (Kiểu dữ liệu TEXT): Lưu trữ đoạn văn bản tự nhiên chứa lời khuyên, nhận xét tổng quan và gợi ý bổ sung chứng chỉ nghề nghiệp của AI dành cho hồ sơ.  3.3. Định hướng lưu trữ nâng cao phục vụ Chatbot AI (Knowledge Base)Hệ thống đề xuất sử dụng giải pháp lưu trữ Hybrid kết hợp:Mã nguồn MySQL lưu trữ dữ liệu thô dạng bảng để chạy tính năng lọc thông thường.  Cấu hình một cơ sở dữ liệu Vector độc lập (như ChromaDB) chạy song song bên dịch vụ Python FastAPI để lưu trữ chuỗi toán học (Vector Embeddings) của các file CV tài liệu. Mô hình RAG Chatbot sẽ truy vấn trực tiếp trên database Vector này để trả lời câu hỏi dưới 3 giây.  
---

### II. MÃ SCRIPT SQL KHỞI TẠO CƠ SỞ DỮ LIỆU CỤC BỘ

Hiếu hãy tạo thêm một file script tại đường dẫn **`database/DATABASE.sql`**, copy đoạn mã SQL chuẩn hóa dưới đây dán vào để sẵn sàng import chạy trên MySQL Server:

```sql
-- 1. Khởi tạo Database hệ thống tuyển dụng
CREATE DATABASE IF NOT EXISTS recruitment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE recruitment_db;

-- 2. Khởi tạo bảng Users
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Candidate') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Khởi tạo bảng Candidates
CREATE TABLE Candidates (
    candidate_id INT PRIMARY KEY,
    fullname VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    cv_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Khởi tạo bảng Recruiters
CREATE TABLE Recruiters (
    recruiter_id INT PRIMARY KEY,
    fullname VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    FOREIGN KEY (recruiter_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Khởi tạo bảng Jobs
CREATE TABLE Jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    recruiter_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    description TEXT,
    salary VARCHAR(50),
    deadline DATE,
    status ENUM('Đang mở', 'Đã đóng') DEFAULT 'Đang mở',
    FOREIGN KEY (recruiter_id) REFERENCES Recruiters(recruiter_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Khởi tạo bảng Applications
CREATE TABLE Applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    candidate_id INT NOT NULL,
    cover_letter TEXT,
    cv_submitted_url VARCHAR(255),
    status ENUM('Mới tiếp nhận', 'Đang xét duyệt', 'Phỏng vấn', 'Đạt', 'Từ chối') DEFAULT 'Mới tiếp nhận',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES Jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES Candidates(candidate_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Khởi tạo bảng Interviews
CREATE TABLE Interviews (
    interview_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    interview_date DATETIME NOT NULL,
    location_type ENUM('Online', 'Offline') DEFAULT 'Online',
    hr_notes TEXT,
    result ENUM('Chưa có', 'Đạt', 'Từ chối') DEFAULT 'Chưa có',
    FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Khởi tạo bảng Skills
CREATE TABLE Skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 9. Khởi tạo bảng CandidateSkills
CREATE TABLE CandidateSkills (
    candidate_id INT NOT NULL,
    skill_id INT NOT NULL,
    years_of_experience INT DEFAULT 0,
    PRIMARY KEY (candidate_id, skill_id),
    FOREIGN KEY (candidate_id) REFERENCES Candidates(candidate_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES Skills(skill_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Khởi tạo bảng lưu trữ kết quả phân tích CV của AI
CREATE TABLE CVAnalysisResults (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    match_score INT CHECK (match_score >= 0 AND match_score <= 100),
    key_skills_extracted TEXT, -- Lưu định dạng mảng chuỗi JSON
    missing_skills TEXT,        -- Lưu định dạng mảng chuỗi JSON
    ai_recommendations TEXT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. Khởi tạo bảng Notifications
CREATE TABLE Notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;
