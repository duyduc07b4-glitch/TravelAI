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

## Giới hạn hiện tại

- AI chạy local (llama3.2 qua Ollama) không có dữ liệu thời gian thực — giờ mở cửa, số điện thoại, địa chỉ do AI gợi ý **chưa được xác minh**, luôn kiểm tra qua nút "Xem bản đồ" trước khi đi.
- Chất lượng phụ thuộc vào model đã pull và cấu hình máy chạy.

## Cấu trúc file

| File | Mô tả |
|---|---|
| `app.html` | Giao diện chính |
| `start-mac.command` | Khởi chạy nhanh trên macOS |
| `start-windows.bat` | Khởi chạy nhanh trên Windows |
| `setup-guide.html` | Hướng dẫn cài đặt chi tiết |
| `AI Voice Travel Assistant.pdf` | Tài liệu Product Vision gốc |
