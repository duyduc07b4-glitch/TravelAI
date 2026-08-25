# AI Travel Companion — Local Prototype

Trợ lý lập kế hoạch du lịch chạy AI hoàn toàn trên máy — không cloud, không tài khoản, không thể phát sinh chi phí. AI chạy qua [Ollama](https://ollama.com) trên máy của bạn.

Ý tưởng gốc: [`AI Voice Travel Assistant.pdf`](./AI%20Voice%20Travel%20Assistant.pdf) (Product Vision).

## Cài đặt

Xem hướng dẫn đầy đủ (macOS + Windows) tại [`setup-guide.html`](./setup-guide.html) — mở file này bằng trình duyệt.

Tóm tắt nhanh:

1. Cài [Ollama](https://ollama.com/download), chạy `ollama pull llama3.2`
2. macOS: double-click `start-mac.command` · Windows: double-click `start-windows.bat`
3. Trình duyệt tự mở `app.html`, bấm "Kiểm tra kết nối"

## Tính năng

- 🗺️ **Dynamic Trip Planning** — tạo lịch trình theo ngày, có link Google Maps cho từng địa điểm
- 👥 **AI Group Matching** — chấm điểm địa điểm theo sở thích từng thành viên trong nhóm
- 🎙️ **Trợ lý giọng nói** — hỏi/đáp bằng giọng nói (Web Speech API)
- 🌧️ **Self-Healing Itinerary** — tự đề xuất thay đổi lịch trình khi có sự cố (thời tiết...)
- 🌐 **Song ngữ Việt/Nhật** — nút VI/JA ở góc trên bên phải đổi toàn bộ giao diện, nội dung AI trả về (lịch trình, group matching, giọng nói, self-healing, camera), nhận diện/phát giọng nói theo đúng ngôn ngữ đang chọn. Lựa chọn ngôn ngữ được lưu lại cho lần sau.

## Giới hạn hiện tại

- AI chạy local (llama3.2 qua Ollama) không có dữ liệu thời gian thực — giờ mở cửa, số điện thoại, địa chỉ do AI gợi ý **chưa được xác minh**, luôn kiểm tra qua nút "Xem bản đồ" trước khi đi.
- Chất lượng phụ thuộc vào model đã pull và cấu hình máy chạy.
- Chất lượng tiếng Nhật do AI sinh ra phụ thuộc vào model — `llama3.2` hiểu và trả lời tiếng Nhật khá tốt nhưng không hoàn hảo như tiếng Anh, nên kiểm tra kỹ trước khi demo.

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

Dữ liệu bạn nhập (lịch trình, thành viên nhóm, lịch sử chat giọng nói...) được tự động lưu vào `localStorage` của trình duyệt nên sẽ không mất khi reload trang. Dữ liệu này chỉ nằm trên máy bạn, không gửi đi đâu.

## Chạy test

Cần Node.js ≥ 18 (dùng `node:test` có sẵn, không cần cài thêm gì):

```bash
npm test
```

CI chạy test này tự động trên mọi push/PR vào `main` (xem `.github/workflows/test.yml`).
