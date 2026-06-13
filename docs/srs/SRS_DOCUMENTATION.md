# Tài Liệu Đặc Tả Yêu Cầu Phần Mềm (Software Requirements Specification - SRS)
## Dự án: Hệ Thống Tuyển Dụng Cho Doanh Nghiệp (Enterprise Recruitment System)

---

## 🎯 1. Mô Tả Tổng Quan Hệ Thống (System Overview)

### 1.1. Bối cảnh và Lý do chọn đề tài
[cite_start]Trong bối cảnh tuyển dụng hiện đại, việc quản lý hồ sơ ứng viên bằng các phương pháp thủ công (email, Excel, lưu trữ tệp tin rời rạc) gây ra nhiều bất cập, làm giảm hiệu suất của bộ phận nhân sự và tăng thời gian sàng lọc ứng viên[cite: 16, 17, 18]. 

[cite_start]**Hệ thống Tuyển dụng cho Doanh nghiệp** được xây dựng dưới dạng ứng dụng Web theo kiến trúc phân tầng MVC (Model - View - Controller) nhằm tối ưu hóa, tự động hóa quy trình quản lý tuyển dụng tập trung, nâng cao trải nghiệm ứng tuyển và sẵn sàng mở rộng tích hợp các dịch vụ AI thông minh trong tương lai[cite: 21, 22, 98, 171].

### 1.2. Mô hình phân loại người dùng (User Classes and Characteristics)
[cite_start]Hệ thống phục vụ hai nhóm đối tượng người dùng cốt lõi với vai trò và không gian tương tác giao diện độc lập[cite: 101, 102]:

* [cite_start]**Quản trị viên (Admin - Giao diện Admin Dashboard):** Chịu trách nhiệm quản lý tài khoản, phân quyền, đăng tin tuyển dụng, tiếp nhận dữ liệu hồ sơ ứng viên, sàng lọc, lên lịch phỏng vấn, cấu hình hệ thống và sử dụng các công cụ trợ lý quản trị thông minh[cite: 103, 106].
* [cite_start]**Ứng viên (Candidate - Giao diện Candidate Portal):** Thực hiện đăng ký/đăng nhập, tìm kiếm cơ hội việc làm công khai, nộp hồ sơ trực tuyến, tải lên CV cá nhân, tương tác với Chatbot AI giải đáp tự động và giám sát trạng thái pipeline ứng tuyển[cite: 103, 106].

---

## 🛠️ 2. Yêu Cầu Chức Năng (Functional Requirements)

[cite_start]Yêu cầu chức năng mô tả chi tiết các nghiệp vụ và phân hệ mà hệ thống bắt buộc phải thực thi để đáp ứng nhu cầu sử dụng của người dùng[cite: 123, 126]:

### 2.1. Phân hệ Quản lý Tài khoản & Phân quyền
* [cite_start]Hệ thống phải cho phép Admin thực hiện các thao tác CRUD tài khoản, thiết lập vai trò (Roles) và giám sát nhật ký hoạt động[cite: 128, 179].
* [cite_start]Hệ thống phải cung cấp tính năng Đăng ký và Đăng nhập bảo mật cho Ứng viên để tham gia ứng tuyển trực tuyến[cite: 129].

### 2.2. Phân hệ Quản lý Tin tuyển dụng
* [cite_start]Cung cấp giao diện cho Admin khởi tạo, hiệu chỉnh thông tin (vị trí, phòng ban, mức lương, kỹ năng bắt buộc, hạn nộp hồ sơ) và thay đổi trạng thái (Đang mở / Đã đóng) của các vị trí việc làm[cite: 131, 132, 133].

### 2.3. Phân hệ Quản lý Hồ sơ Ứng viên (CV)
* [cite_start]Cho phép ứng viên nộp đơn ứng tuyển trực tuyến và tải lên tệp tin CV cá nhân định dạng PDF hoặc DOCX[cite: 135].
* [cite_start]Hệ thống phải hiển thị chi tiết thông tin ứng viên, tệp CV đính kèm và cho phép Admin cập nhật trạng thái hồ sơ theo từng giai đoạn tuyển dụng[cite: 136, 137].

### 2.4. Phân hệ Tìm kiếm & Lọc ứng viên nâng cao
* [cite_start]Thực thi các truy vấn động theo nhiều tiêu chí tích hợp đồng thời như: tìm kiếm theo từ khóa kỹ năng công nghệ, số năm kinh nghiệm, vị trí ứng tuyển hoặc trạng thái hồ sơ[cite: 139].

### 2.5. Phân hệ Quản lý Quy trình & Lịch phỏng vấn
* [cite_start]Cho phép Admin khởi tạo lịch hẹn phỏng vấn (thời gian, hình thức, ghi chú liên quan) và tự động hóa quy trình gửi thư mời đến email của ứng viên[cite: 142, 143, 179].

### 2.6. Phân hệ Tự động phân tích và Đánh giá CV (Định hướng tích hợp AI)
* [cite_start]**Dành cho Admin:** Hệ thống tự động bóc tách các trường thông tin cốt lõi từ file CV (Kỹ năng, học văn, kinh nghiệm) ngay sau khi tải lên, thực hiện so khớp dữ liệu với mô tả công việc để tính toán điểm số phù hợp theo thang điểm 100[cite: 146, 147, 148].
* [cite_start]**Dành cho Ứng viên:** Cung cấp tính năng "Kiểm tra hồ sơ" trước khi ứng tuyển chính thức, chỉ ra các kỹ năng còn thiếu và đưa ra gợi ý tối ưu hóa thuật ngữ chuyên ngành[cite: 151, 153, 155].

### 2.7. Phân hệ Trợ lý ảo Chatbot AI (Định hướng tích hợp AI)
* [cite_start]**Dành cho Ứng viên:** Hỗ trợ cửa sổ chat trực tuyến giải đáp tự động 24/7 về thông tin tin tuyển dụng, chế độ đãi ngộ, văn hóa doanh nghiệp và hỗ trợ tra cứu trạng thái hồ sơ theo thời gian thực[cite: 158, 159].
* [cite_start]**Dành cho Admin:** Tiếp nhận các câu lệnh bằng ngôn ngữ tự nhiên để truy vấn nhanh số liệu báo cáo, tìm kiếm hồ sơ thông minh và hỗ trợ soạn thảo tự động các mẫu email[cite: 161, 162, 163].

---

## ⚡ 3. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

[cite_start]Yêu cầu phi chức năng thiết lập các tiêu chí chất lượng và thuộc tính vận hành định lượng nhằm đảm bảo hệ thống chạy mượt mà, bảo mật và ổn định[cite: 124, 165]:

### 3.1. Tiêu chuẩn về Hiệu năng và Tốc độ xử lý (Performance)
* [cite_start]**Thời gian phản hồi API:** Cam kết các API truy vấn cơ bản, xử lý tính toán và điều hướng luồng dữ liệu thông thường phải phản hồi tức thời dưới **1 giây / request**[cite: 119, 186].
* [cite_start]**Thời gian tải trang:** Tối ưu hóa mã nguồn hiển thị phía Client (ReactJS SPA) để thời gian tải trang giao diện danh sách phân trang đạt dưới **2 giây**[cite: 119, 186].
* [cite_start]**Tốc độ xử lý Tải tệp (Upload CV):** Tiến trình tiếp nhận, kiểm tra dữ liệu đầu vào và đồng bộ hóa tệp tài liệu CV (dung lượng $\le$ 10MB) lên máy chủ phải hoàn thành trong thời gian dưới **10 giây** ở điều kiện mạng bình thường[cite: 119, 186].
* [cite_start]**Thời gian phản hồi của Chatbot AI:** Trả lời các câu thoại tương tác trực tuyến của người dùng dưới **3 giây / câu thoại**[cite: 119].
* [cite_start]**Thời gian phân tích & Chấm điểm CV:** Thực hiện quét ngữ nghĩa, bóc tách và tính toán điểm số phù hợp dưới **15 giây / mỗi tệp cấu trúc chuẩn** ($\le$ 10MB)[cite: 119].

### 3.2. Khả năng chịu tải và Độ sẵn sàng (Scalability & Availability)
* [cite_start]**Khả năng xử lý đồng thời:** Kiến trúc hệ thống phân tầng phải đảm bảo duy trì hiệu năng ổn định, không suy giảm tốc độ xử lý khi có tối thiểu từ **50 người dùng tương tác đồng thời**[cite: 119, 186].
* [cite_start]**Độ sẵn sàng của hệ thống (Uptime):** Hạ tầng triển khai ứng dụng web phải hoạt động liên tục với cam kết tỷ lệ sẵn sàng vận hành đạt mức tối thiểu là **99% trong một tháng**[cite: 119, 186].
* [cite_start]**Sao lưu dữ liệu (Backup):** Hệ thống cơ sở dữ liệu MySQL phải được cấu hình tự động sao lưu định kỳ **Hàng ngày** và lưu trữ bản vá tối thiểu **30 ngày** gần nhất[cite: 119].

### 3.3. Độ chính xác dữ liệu AI (Accuracy)
* [cite_start]**Độ chính xác bóc tách dữ liệu AI:** Đạt tỷ lệ chính xác mức tối thiểu là **$\ge$ 85%** đối với các định dạng cấu trúc tệp tin CV bằng cả tiếng Việt và tiếng Anh phổ biến hiện nay[cite: 119].

### 3.4. Khả năng tương thích và Khả năng mở rộng (Usability & Extensibility)
* [cite_start]**Khả năng tương thích:** Thiết kế giao diện (View) đáp ứng tốt tiêu chuẩn thiết kế Responsive, hiển thị đồng bộ mượt mà trên đa thiết bị (Máy tính, máy tính bảng, điện thoại di động)[cite: 111].
* [cite_start]**Khả năng mở rộng:** Cấu trúc mã nguồn thiết kế theo hướng module hóa, sẵn sàng kết nối mượt mà với các mô hình ngôn ngữ lớn (LLM) thông qua API mà không phá vỡ hay làm ảnh hưởng đến cấu trúc nền tảng MVC hiện tại[cite: 117, 171].
