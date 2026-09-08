# TravelAI — AI-Powered Group Travel Decision Platform

Không chỉ lên lịch trình — TravelAI giúp cả nhóm ra quyết định du lịch cùng nhau, và cho thấy rõ vì sao AI đề xuất mỗi lựa chọn. Chạy AI hoàn toàn trên máy — không cloud, không tài khoản, không thể phát sinh chi phí — qua [Ollama](https://ollama.com).

Ý tưởng gốc: [`AI Voice Travel Assistant.pdf`](./AI%20Voice%20Travel%20Assistant.pdf) (Product Vision).

## Cài đặt

Xem hướng dẫn đầy đủ (macOS + Windows) tại [`setup-guide.html`](./setup-guide.html) — mở file này bằng trình duyệt.

Tóm tắt nhanh:

1. Cài [Ollama](https://ollama.com/download), chạy `ollama pull llama3.2`
2. macOS: double-click `start-mac.command` · Windows: double-click `start-windows.bat`
3. Trình duyệt tự mở `app.html`, bấm "Kiểm tra kết nối"

## Tính năng

- 🗺️ **Dynamic Trip Planning** — tạo lịch trình theo ngày, có link Google Maps cho từng địa điểm. Có thể khai sở thích riêng từng thành viên (mục "Thành viên & sở thích" ngay trong tab này) — AI sẽ cố cân bằng hoạt động cho nhiều người nhất có thể thay vì chỉ tối ưu chung chung, và **📊 Điểm hài lòng của nhóm** hiện ngay sau khi tạo lịch trình (tính cục bộ, không qua LLM) — sửa sở thích một thành viên là điểm cập nhật tức thì, không cần tạo lại lịch trình.
- 👥 **Group Decision Engine** — không chỉ chấm điểm, mà còn:
  - 📊 **Điểm hài lòng theo từng thành viên** (không chỉ điểm trung bình chung)
  - ⚠️ **Phát hiện xung đột sở thích** — ai thích, ai không, mức độ nghiêm trọng, lý do
  - 💡 **3 phương án theo 3 chiến lược khác nhau** — A = an toàn nhất (điểm sàn cao nhất, không ai bị bỏ lại), B = hài lòng chung cao nhất (điểm trung bình), C = có người mê nhất (điểm đỉnh cao nhất). Tránh được tình huống cả 3 phương án đều là "không ai ghét nhưng cũng chẳng ai thích" — nếu có lựa chọn khiến ai đó thực sự hào hứng, nó sẽ lộ diện ở phương án C thay vì bị lọc mất vì thuật toán chỉ nhìn điểm sàn. Phương án nào mà điểm cao nhất trong nhóm vẫn thấp sẽ bị gắn cảnh báo "an toàn nhưng chưa ai thực sự hào hứng"
  - 🧾 **Giải thích được (Explainable AI)** — mỗi gợi ý kèm lý do cụ thể từ dữ liệu thật (giá, khoảng cách, đánh giá, thân thiện trẻ em...)
  - Toàn bộ tính toán trên chạy **cục bộ, tức thời, không qua LLM** — cập nhật ngay khi bạn sửa sở thích thành viên, không cần bấm lại nút. Có thể ưu tiên dùng dữ liệu thật (giờ mở cửa, giá, đánh giá) từ RAG server local nếu đang chạy.
- 🆚 **Vì sao TravelAI** — màn hình so sánh trực tiếp với AI Travel Planner truyền thống (tối ưu cá nhân) và TravelAI (tối ưu quyết định nhóm)
- 🎙️ **Trợ lý giọng nói → tự tạo lịch trình** — không chỉ hỏi/đáp (Web Speech API): nói chuyện xong, bấm "Tạo lịch trình từ cuộc trò chuyện" (hoặc chỉ cần nói "tạo lịch trình cho tôi") là trợ lý tự đọc lại toàn bộ cuộc trò chuyện, trích xuất điểm đến/số ngày/ngân sách/nhóm đi cùng, rồi tạo lịch trình đầy đủ y như tab Lịch trình — và đưa luôn kết quả sang tab đó. Nếu cuộc trò chuyện còn thiếu thông tin bắt buộc (chưa biết đi đâu hoặc mấy ngày), trợ lý **chủ động hỏi lại đúng phần còn thiếu** thay vì im lặng hoặc tạo bừa.
- 🌧️ **Self-Healing Itinerary (giải thích được)** — khi có sự cố (thời tiết...), không chỉ đổi hoạt động mà còn cho thấy: **📉 mức độ hài lòng nhóm thay đổi thế nào** (VD: 64% → 63%) và **thay đổi theo từng thành viên** (VD: A -5%) — dựa trên sở thích thành viên đã khai ở tab Quyết định nhóm, tính cục bộ không qua LLM
- 🚦 **Kiểm tra rủi ro chuyến đi** — quét tự động 4 loại rủi ro (đi bộ quá nhiều, ngân sách, thiếu phương tiện di chuyển, thời tiết xấu) ngay sau khi tạo lịch trình hoặc self-healing, kèm mức độ và gợi ý khắc phục
- 🌐 **Đa ngôn ngữ Việt/Nhật/Anh** — nút VI/JA/EN ở góc trên bên phải đổi toàn bộ giao diện, nội dung AI trả về (lịch trình, group matching, giọng nói, self-healing, camera), nhận diện/phát giọng nói theo đúng ngôn ngữ đang chọn. Lựa chọn ngôn ngữ được lưu lại cho lần sau.
- ⚡ **Streaming** — kết quả AI hiện dần theo từng token thay vì đợi cả khối, cảm giác phản hồi nhanh hơn nhiều với lịch trình dài.
- 📤 **Chia sẻ lịch trình** — nút "Chia sẻ" ở tab Lịch trình mở bảng chia sẻ native trên điện thoại (Messenger, Zalo, email...), hoặc copy văn bản đã format sẵn vào clipboard trên desktop. Có phương án dự phòng để vẫn copy được khi mở app qua địa chỉ IP LAN (http, không phải https).

## Giới hạn hiện tại

- AI chạy local (llama3.2 qua Ollama) không có dữ liệu thời gian thực — giờ mở cửa, số điện thoại, địa chỉ do AI gợi ý **chưa được xác minh**, luôn kiểm tra qua nút "Xem bản đồ" trước khi đi.
- Chất lượng phụ thuộc vào model đã pull và cấu hình máy chạy.
- Chất lượng tiếng Nhật/Anh do AI sinh ra phụ thuộc vào model — `llama3.2` trả lời khá tốt nhưng không hoàn hảo, nên kiểm tra kỹ trước khi demo.

## Cấu trúc file

| File | Mô tả |
|---|---|
| `app.html` | Markup của giao diện chính |
| `style.css` | Toàn bộ style (bao gồm responsive cho mobile) |
| `app.js` | Toàn bộ logic — gọi Ollama, render kết quả, lưu trạng thái vào localStorage |
| `start-mac.command` | Khởi chạy nhanh trên macOS |
| `start-windows.bat` | Khởi chạy nhanh trên Windows |
| `setup-guide.html` | Hướng dẫn cài đặt chi tiết |
| `AI Voice Travel Assistant.pdf` | Tài liệu Product Vision gốc |
| `tests/app.test.js` | Unit test cho các hàm thuần trong `app.js` |
| `rag-server/` | (Tùy chọn) server RAG local — index tài liệu trong `knowledge/` và trả về đoạn liên quan cho tab Group Matching |
| `knowledge/` | Dữ liệu tham khảo (nhà hàng, điểm tham quan, ghi chú) dùng để index cho `rag-server` |

Dữ liệu bạn nhập (lịch trình, thành viên nhóm, lịch sử chat giọng nói...) được tự động lưu vào `localStorage` của trình duyệt nên sẽ không mất khi reload trang. Dữ liệu này chỉ nằm trên máy bạn, không gửi đi đâu.

## (Tùy chọn) Chạy RAG server cho Group Decision

Tab Quyết định nhóm sẽ tự dùng dữ liệu thật (giờ mở cửa, giá, đánh giá trong `knowledge/`) nếu server này đang chạy ở `http://localhost:8899` — cả cho phần LLM (debate/recommendation) lẫn engine tính điểm hài lòng/xung đột/phương án (hoàn toàn cục bộ, không qua LLM). Nếu server tắt, tab vẫn hoạt động nhưng engine sẽ chỉ có tên địa điểm bạn nhập để chấm điểm, không có dữ liệu giá/giờ mở cửa/đánh giá thật để tham khảo.

```bash
cd rag-server
npm install
npm run ingest   # index tài liệu trong knowledge/ (chạy lại mỗi khi đổi dữ liệu)
npm start        # chạy server tại http://localhost:8899
```

## Chạy test

Cần Node.js ≥ 18 (dùng `node:test` có sẵn, không cần cài thêm gì):

```bash
npm test
```

CI chạy test này tự động trên mọi push/PR vào `main` (xem `.github/workflows/test.yml`).
