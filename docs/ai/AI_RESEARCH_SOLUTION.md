# Tài Liệu Nghiên Cứu Giải Pháp Và Đề Xuất Công Nghệ Hệ Thống AI
## Phân hệ: Tự động phân tích CV và Trợ lý ảo Chatbot thông minh

---

## 🧠 1. Tài Liệu Nghiên Cứu Giải Pháp AI (AI Solution Research)

Để hiện thực hóa các nghiệp vụ tự động hóa quy trình sàng lọc hồ sơ và tối ưu hóa tương tác trực tuyến, hệ thống triển khai nghiên cứu 4 giải pháp công nghệ cốt lõi:

### 1.1. Giải pháp bóc tách dữ liệu hồ sơ (CV Parsing)
* **Bản chất nghiệp vụ:** Trích xuất tự động văn bản thô từ các định dạng tệp CV phổ biến (PDF, DOCX) sang dữ liệu có cấu trúc định dạng JSON bao gồm thông tin cá nhân, học vấn, kinh nghiệm làm việc và danh sách kỹ năng.
* **Giải pháp nghiên cứu:** Sử dụng các thư viện bóc tách tầng thấp (như `pdfplumber`, `mammoth` trong Python) để chuyển đổi tệp thành chuỗi Text thô. Sau đó, áp dụng kỹ thuật Trích xuất thực thể có tên (Named Entity Recognition - NER) kết hợp với các mô hình ngôn ngữ lớn (LLM) thông qua cấu trúc thiết kế Prompt (Prompt Engineering) để ép kiểu dữ liệu trả về chuẩn JSON.

### 1.2. Giải pháp trích xuất từ khóa kỹ năng chuyên ngành (Skill Extraction)
* **Bản chất nghiệp vụ:** Nhận diện và bóc tách chính xác các từ khóa công nghệ, kỹ năng mềm có trong CV của ứng viên và trong Mô tả công việc (Job Description) của doanh nghiệp.
* **Giải pháp nghiên cứu:** Xây dựng một từ điển dữ liệu kỹ năng (Skill Taxonomy Dictionary) kết hợp với khả năng phân tích ngữ nghĩa chuyên sâu của LLM để nhận diện thực thể, tránh bỏ sót các từ khóa viết tắt hoặc đồng nghĩa (Ví dụ: `JS`, `JavaScript`, `ES6` đều được quy về nhóm kỹ năng Frontend).

### 1.3. Thuật toán chấm điểm và so khớp hồ sơ (CV Matching)
* **Bản chất nghiệp vụ:** Đối chiếu tự động năng lực ứng viên với tiêu chuẩn tuyển dụng, chấm điểm tương thích (thang điểm 100) và đưa ra đánh giá ưu/nhược điểm.
* **Giải pháp nghiên cứu:** Sử dụng kỹ thuật nhúng từ (Text Embedding) để chuyển đổi văn bản CV và Job Description thành các Vector toán học. Sử dụng thuật toán độ tương đồng Cosine (Cosine Similarity) kết hợp với bộ trọng số (Weights) được tính toán bởi LLM cho các trường bắt buộc (Kỹ năng, Số năm kinh nghiệm) để đưa ra điểm số so khớp ngữ nghĩa chính xác nhất.

### 1.4. Kiến trúc Trợ lý ảo thông minh (Chatbot AI)
* **Bản chất nghiệp vụ:** Tiếp nhận câu lệnh ngôn ngữ tự nhiên từ Ứng viên để giải đáp thông tin, và từ Admin để truy vấn số liệu báo cáo nhân sự nhanh.
* **Giải pháp nghiên cứu:** Áp dụng kiến trúc RAG (Retrieval-Augmented Generation). Khi ứng viên đặt câu hỏi, hệ thống sẽ tìm kiếm thông tin liên quan trong kho dữ liệu tri thức nội bộ công ty (Knowledge Base) thông qua cơ sở dữ liệu Vector (Vector Database), sau đó cung cấp ngữ cảnh này cho LLM để tạo ra câu trả lời chính xác, tránh hiện tượng ảo tưởng (Hallucination) của AI.

---

## 🛠️ 2. Đề Xuất Kiến Trúc Tech Stack Cho Phân Hệ AI

Để đảm bảo hệ thống vận hành mượt mà, phân hệ AI được thiết kế độc lập dưới dạng một dịch vụ vi mô (Microservice) kết nối với ứng dụng Web MVC hiện tại thông qua giao thức RESTful API. 

| Tầng kiến trúc | Công nghệ đề xuất | Phiên bản | Vai trò trong phân hệ AI |
| :--- | :--- | :--- | :--- |
| **Ngôn ngữ lập trình** | `Python` | `3.10+` | Ngôn ngữ tối ưu nhất cho các thư viện xử lý dữ liệu, học máy và tích hợp LLM. |
| **Dịch vụ API Gateway** | `FastAPI` | `0.100+` | Framework hiệu năng cao, bất đồng bộ (Asynchronous), phục vụ việc tạo endpoits cho Node.js gọi sang. |
| **Mô hình Ngôn ngữ Lớn** | `Gemini 3.1` | `Latest` | Đóng vai trò bộ não suy luận, xử lý ngữ nghĩa, bóc tách JSON và sinh câu thoại cho Chatbot. |
| **Cổng kết nối LLM** | `9router API Gateway`| `-` | Trạm trung chuyển và quản lý API key bảo mật, tối ưu chi phí và điều phối request đến mô hình. |
| **Cơ sở dữ liệu Vector** | `ChromaDB / Pinecone`| `Latest` | Lưu trữ các chuỗi Vector Embedding của dữ liệu tuyển dụng phục vụ kiến trúc RAG Chatbot. |

---

## 🎯 3. Danh Sách Công Nghệ Được Lựa Chọn Và Lý Do Lựa Chọn

### 3.1. Framework FastAPI (Python)
* **Lý do lựa chọn:** 
  * **Hiệu năng vượt trội:** FastAPI là một trong những Python framework nhanh nhất hiện nay nhờ kiến trúc dựa trên `Starlette` và `Pydantic`, đáp ứng hoàn hảo tiêu chí thời gian phản hồi API tính toán cực nhanh.
  * **Hỗ trợ Asynchronous (Bất đồng bộ):** Giúp hệ thống xử lý song song nhiều request đọc file CV dung lượng lớn ($\le$ 10MB) mà không gây nghẽn hệ thống, đáp ứng tiêu chuẩn chịu tải $\ge$ 50 người dùng đồng thời của đồ án.
  * **Tự động sinh tài liệu:** Tích hợp sẵn Swagger UI giúp nhóm dễ dàng kiểm thử các endpoints AI độc lập.

### 3.2. Mô hình ngôn ngữ lớn Gemini 3.1 (Qua 9router Gateway)
* **Lý do lựa chọn:**
  * **Xử lý tiếng Việt xuất sắc:** Gemini 3.1 được đánh giá là một trong những mô hình LLM có khả năng hiểu ngữ nghĩa văn bản và văn phong tiếng Việt tốt nhất hiện nay, đáp ứng tiêu chuẩn độ chính xác bóc tách dữ liệu CV $\ge$ 85%.
  * **Tốc độ xử lý (Latency) thấp:** Đảm bảo thời gian sinh câu thoại trả lời của Chatbot dưới **3 giây** và thời gian phân tích, so khớp điểm CV dưới **15 giây**, đúng với cam kết hiệu năng trong báo cáo.
  * **Tính năng Structured Outputs:** Ép kiểu mô hình trả về chính xác 100% định dạng JSON theo cấu trúc quy định sẵn, giúp lập trình viên Backend (Node.js) dễ dàng đọc dữ liệu để lưu vào MySQL.

### 3.3. Thư viện xử lý tệp văn bản (pdfplumber & mammoth)
* **Lý do lựa chọn:**
  * Thư viện mã nguồn mở, chạy offline hoàn toàn trên server giúp bảo mật thông tin hồ sơ ứng viên.
  * `pdfplumber` hỗ trợ bóc tách cấu trúc bảng biểu (Table) trong file PDF CV rất tốt, giữ nguyên được mạch thông tin học vấn và kinh nghiệm.
  * `mammoth` tập trung chuyển đổi file DOCX sang dạng văn bản thô mà không chèn các mã định dạng thừa, giúp giảm lượng token tiêu thụ khi gửi dữ liệu lên LLM API.

### 3.4. Cơ sở dữ liệu Vector mã nguồn mở ChromaDB
* **Lý do lựa chọn:**
  * Là một cơ sở dữ liệu Vector gọn nhẹ, có thể nhúng chạy trực tiếp (Embedded) cùng ứng dụng FastAPI mà không cần cài đặt hạ tầng server phức tạp.
  * Tốc độ truy vấn các đoạn văn bản tương đồng (Query Similarity Search) đạt mức miligiây, là mảnh ghép hoàn hảo để tối ưu tốc độ cho Trợ lý ảo Chatbot AI.
