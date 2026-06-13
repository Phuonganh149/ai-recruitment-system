# Tài Liệu Thiết Kế RESTful API - Hệ Thống Tuyển Dụng Doanh Nghiệp

Tài liệu này định nghĩa cấu trúc Hợp đồng API (API Contract) cốt lõi của hệ thống, phục vụ việc giao tiếp và đồng bộ dữ liệu giữa tầng hiển thị Client (ReactJS View) và Máy chủ xử lý (Node.js Express Controller).

## 📌 1. Quy Định Chung (Global Specifications)
* **Định dạng dữ liệu mặc định (Content-Type):** `application/json`
* **Mã trạng thái phản hồi tiêu chuẩn (HTTP Status Codes):**
  * `200 OK`: Truy vấn hoặc xử lý biến đổi dữ liệu thành công.
  * `201 Created`: Khởi tạo mới thực thể thành công (Đăng ký, đăng tin, nộp hồ sơ).
  * `400 Bad Request`: Dữ liệu gửi lên từ Client không hợp lệ hoặc thiếu các trường thông tin bắt buộc.
  * `401 Unauthorized`: Phiên làm việc hết hạn hoặc chưa đăng nhập (Thiếu chuỗi mã xác thực JWT).
  * `403 Forbidden`: Người dùng hợp lệ nhưng không đủ quyền hạn truy cập tài nguyên (Ứng viên cố truy cập API của Admin).
  * `500 Internal Server Error`: Lỗi phát sinh từ hệ thống máy chủ Backend.

---

## 🔒 2. Phân Hệ Xác Thực Hệ Thống (Authentication API)

### 2.1. Đăng ký tài khoản ứng viên mới
* **Phương thức & Đường dẫn:** `POST /api/auth/register`
* **Quyền truy cập:** Công khai (Public)
* **Dữ liệu gửi lên (Request Body):**
```json
{
  "fullname": "Niê Phương Anh",
  "email": "phuonganh@example.com",
  "password": "SecurePassword123",
  "role": "Candidate"
}
Dữ liệu trả về thành công (Response - 201 Created):JSON{
  "success": true,
  "message": "Đăng ký tài khoản thành công.",
  "data": {
    "userId": "USR-1492006",
    "fullname": "Niê Phương Anh",
    "email": "phuonganh@example.com",
    "role": "Candidate"
  }
}
2.2. Đăng nhập hệ thốngPhương thức & Đường dẫn: POST /api/auth/loginQuyền truy cập: Công khai (Public)Dữ liệu gửi lên (Request Body):JSON{
  "email": "phuonganh@example.com",
  "password": "SecurePassword123"
}
Dữ liệu trả về thành công (Response - 200 OK):JSON{
  "success": true,
  "message": "Đăng nhập thành công.",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJVU1ItMTQ5MjAwNiIsImZ1bGxuYW1lIjoiTmllIFBodW9uZyBBbmgiLCJyb2xlIjoiQ2FuZGlkYXRlIn0...",
  "userData": {
    "userId": "USR-1492006",
    "fullname": "Niê Phương Anh",
    "role": "Candidate"
  }
}
2.3. Truy vấn thông tin tài khoản hiện tạiPhương thức & Đường dẫn: GET /api/auth/meQuyền truy cập: Yêu cầu đăng nhập (Yêu cầu JWT Token trong Header)Yêu cầu Header: Authorization: Bearer <accessToken>Dữ liệu trả về thành công (Response - 200 OK):JSON{
  "success": true,
  "data": {
    "userId": "USR-1492006",
    "fullname": "Niê Phương Anh",
    "email": "phuonganh@example.com",
    "role": "Candidate"
  }
}
💼 3. Phân Hệ Quản Lý Tin Tuyển Dụng (Jobs API)3.1. Lấy danh sách tin tuyển dụng công khai (Hỗ trợ phân trang)Phương thức & Đường dẫn: GET /api/jobs?page=1&limit=10Quyền truy cập: Công khai (Public)Dữ liệu trả về thành công (Response - 200 OK):JSON{
  "success": true,
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 48
  },
  "data": [
    {
      "jobId": "JOB-001",
      "title": "Lập trình viên Backend Node.js",
      "department": "Phòng Phát triển Phần mềm",
      "salary": "Cạnh tranh",
      "deadline": "2026-07-15",
      "status": "Đang mở"
    }
  ]
}
3.2. Khởi tạo tin tuyển dụng mớiPhương thức & Đường dẫn: POST /api/jobsQuyền truy cập: Giới hạn quyền - Chỉ dành cho Quản trị viên (Admin)Yêu cầu Header: Authorization: Bearer <accessToken>Dữ liệu gửi lên (Request Body):JSON{
  "title": "Lập trình viên Frontend ReactJS",
  "department": "Phòng Công nghệ",
  "salary": "15,000,000 - 25,000,000 VND",
  "skillsRequired": ["ReactJS", "TypeScript", "RESTful API"],
  "description": "Xây dựng các giao diện Single Page Application tối ưu, tương thích đa thiết bị...",
  "deadline": "2026-07-30"
}
Dữ liệu trả về thành công (Response - 201 Created):JSON{
  "success": true,
  "message": "Đăng tin tuyển dụng mới thành công.",
  "data": {
    "jobId": "JOB-002",
    "title": "Lập trình viên Frontend ReactJS",
    "status": "Đang mở",
    "createdAt": "2026-06-14T01:00:00Z"
  }
}
📄 4. Phân Hệ Nộp Hồ Sơ Ứng Tuyển (Applications API)4.1. Đẩy tệp tin tài liệu CV cá nhân lên hệ thốngPhương thức & Đường dẫn: POST /api/applications/upload-cvQuyền truy cập: Ứng viên đã đăng nhập (Candidate)Yêu cầu Header: Authorization: Bearer <accessToken>Kiểu dữ liệu dữ liệu gửi lên (Content-Type): multipart/form-dataRàng buộc kỹ thuật: Tệp tin đính kèm truyền vào thuộc tính có khóa là cv_file, dung lượng tối đa $\le$ 10MB, định dạng cho phép: PDF hoặc DOCX.Dữ liệu trả về thành công (Response - 200 OK):JSON{
  "success": true,
  "message": "Tải lên tệp hồ sơ CV thành công.",
  "fileUrl": "/uploads/cv/cv_nie_phuong_anh_2026.pdf"
}
4.2. Gửi đơn ứng tuyển vị trí việc làm chính thứcPhương thức & Đường dẫn: POST /api/applicationsQuyền truy cập: Ứng viên đã đăng nhập (Candidate)Yêu cầu Header: Authorization: Bearer <accessToken>Dữ liệu gửi lên (Request Body):JSON{
  "jobId": "JOB-001",
  "coverLetter": "Tôi mong muốn ứng tuyển vào vị trí này để phát huy năng lực...",
  "cvUrl": "/uploads/cv/cv_nie_phuong_anh_2026.pdf"
}
Dữ liệu trả về thành công (Response - 201 Created):JSON{
  "success": true,
  "message": "Nộp đơn ứng tuyển thành công. Hồ sơ đã được chuyển tới bộ phận nhân sự.",
  "application": {
    "applicationId": "APP-9982",
    "status": "Mới tiếp nhận",
    "appliedAt": "2026-06-14T01:05:00Z"
  }
}
🔄 5. Sơ Đồ Luồng Xác Thực Bảo Mật (JWT Authentication Flow)Dưới đây là kiến trúc tuần tự thể hiện cơ chế bảo vệ tài nguyên API bằng JWT giữa Trình duyệt (ReactJS View) và Máy chủ (Node.js Express Controller/Model):Đoạn mãsequenceDiagram
    autonumber
    actor User as Người dùng (Admin/Ứng viên)
    participant Client as Client App (ReactJS View)
    participant Server as Server Backend (Node.js Controller)
    participant DB as Database (MySQL Model)

    User->>Client: Nhập Email & Mật khẩu + Nhấn Đăng nhập
    Client->>Server: Gửi POST /api/auth/login (Request Body)
    Server->>DB: Truy vấn đối chiếu thông tin tài khoản (SELECT)
    DB-->>Server: Trả về bản ghi người dùng (Mật khẩu đã băm mã hóa)
    
    alt Thông tin xác thực chính xác
        Server->>Server: Tạo chuỗi ký số accessToken (JWT Token) chứa phân quyền (Role)
        Server-->>Client: Trả về HTTP 200 OK kèm theo chuỗi accessToken
        Client->>Client: Lưu trữ accessToken vào bộ nhớ cục bộ (LocalStorage)
        Client-->>User: Điều hướng vào phân hệ giao diện tương ứng quyền hạn
    else Thông tin xác thực sai lệch
        Server-->>Client: Trả về HTTP 401 Unauthorized
        Client-->>User: Hiển thị thông báo cảnh báo lỗi trực quan trên màn hình
    end

    Note over Client, Server: Luồng tương tác các API yêu cầu bảo mật định danh (Thêm việc, Nộp CV, Đánh giá)
    User->>Client: Thực hiện hành động yêu cầu dữ liệu giới hạn quyền
    Client->>Server: Gửi HTTP Request đính kèm Header [Authorization: Bearer <accessToken>]
    Server->>Server: Đi qua Auth Middleware tiến hành giải mã, kiểm tra chữ ký và đối chiếu Role
    
    alt Token hợp lệ & Đủ thẩm quyền (Role hợp lệ)
        Server->>DB: Thực thi truy vấn cập nhật / lấy dữ liệu nghiệp vụ
        DB-->>Server: Phản hồi kết quả thực thi thành công
        Server-->>Client: Trả về dữ liệu định dạng JSON (HTTP 200 OK / 201 Created)
    else Token không hợp lệ / Sai thẩm quyền (Role không khớp)
        Server-->>Client: Phản hồi mã lỗi hệ thống (HTTP 401 Unauthorized / 403 Forbidden)
        Client-->>User: Hiển thị thông báo từ chối truy cập trên giao diện
    end
