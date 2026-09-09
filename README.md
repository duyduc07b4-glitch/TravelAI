# TravelAI — AI-Powered Group Travel Decision Platform

Không chỉ lên lịch trình — TravelAI giúp cả nhóm ra quyết định du lịch cùng nhau, và cho thấy rõ vì sao AI đề xuất mỗi lựa chọn. AI chạy hoàn toàn trên máy — không cloud, không thể phát sinh chi phí — qua [Ollama](https://ollama.com). Có đăng nhập (demo) để mỗi thành viên trong nhóm có tài khoản riêng và gửi lời mời chuyến đi cho nhau.

Ý tưởng gốc: [`AI Voice Travel Assistant.pdf`](./AI%20Voice%20Travel%20Assistant.pdf) (Product Vision).

## Cài đặt

Xem hướng dẫn đầy đủ (macOS + Windows) tại [`setup-guide.html`](./setup-guide.html) — mở file này bằng trình duyệt.

Tóm tắt nhanh:

1. Cài [Ollama](https://ollama.com/download), chạy `ollama pull llama3.2`
2. macOS: double-click `start-mac.command` · Windows: double-click `start-windows.bat`
3. Trình duyệt tự mở `app.html`, bấm "Kiểm tra kết nối" — dùng được ngay, không cần đăng nhập
4. (Tuỳ chọn nhưng nên chạy) — để xem lịch trình rõ (không bị mờ) và dùng được tính năng mời/quản trị user, chạy thêm auth server:
   ```bash
   cd auth-server
   npm install
   npm start        # chạy tại http://localhost:8900
   ```
   Rồi bấm "Đăng nhập" ở góc trên bằng `admin1` / `user1` / `user2`, mật khẩu `123123`.

## Tính năng

- 🔐 **Đăng nhập & mời thành viên** — 3 tài khoản demo có sẵn: `admin1` / `user1` / `user2`, mật khẩu `123123`. App không bắt đăng nhập ngay từ đầu — cứ điền form và bấm "Tạo lịch trình" bình thường; nếu chưa đăng nhập, lịch trình vẫn được tạo thật nhưng hiện **mờ kèm khoá 🔒 và nút "Đăng nhập"** thay vì hiện rõ ngay, mời chào đăng nhập thay vì chặn cứng từ đầu. Đăng nhập xong là hiện rõ ngay, không cần tạo lại. Đã đăng nhập thì mỗi lần tạo lịch trình xong có thể chọn người khác và bấm "Gửi lời mời" — người được mời thấy huy hiệu ✉️ ở góc trên, mở ra xem và bấm "Dùng lịch trình này" để áp ngay vào tab của họ. Tài khoản `admin1` có thêm tab "Quản trị" để thêm/xoá người dùng. Chạy qua `auth-server/` (Express + file JSON, xem bên dưới) — đăng nhập demo, không phải hệ thống bảo mật thật.
- 🗺️ **Dynamic Trip Planning** — tạo lịch trình theo ngày, có link Google Maps cho từng địa điểm. Có thể khai sở thích riêng từng thành viên (mục "Thành viên & sở thích" ngay trong tab này) — AI sẽ cố cân bằng hoạt động cho nhiều người nhất có thể thay vì chỉ tối ưu chung chung, và **📊 Điểm hài lòng của nhóm** hiện ngay sau khi tạo lịch trình (tính cục bộ, không qua LLM) — sửa sở thích một thành viên là điểm cập nhật tức thì, không cần tạo lại lịch trình.
- 👥 **Group Decision Engine** — không chỉ chấm điểm, mà còn:
  - 📊 **Điểm hài lòng theo từng thành viên** (không chỉ điểm trung bình chung)
  - ⚠️ **Phát hiện xung đột sở thích** — ai thích, ai không, mức độ nghiêm trọng, lý do
  - 💡 **3 phương án theo 3 chiến lược khác nhau** — A = an toàn nhất (điểm sàn cao nhất, không ai bị bỏ lại), B = hài lòng chung cao nhất (điểm trung bình), C = có người mê nhất (điểm đỉnh cao nhất). Tránh được tình huống cả 3 phương án đều là "không ai ghét nhưng cũng chẳng ai thích" — nếu có lựa chọn khiến ai đó thực sự hào hứng, nó sẽ lộ diện ở phương án C thay vì bị lọc mất vì thuật toán chỉ nhìn điểm sàn. Phương án nào mà điểm cao nhất trong nhóm vẫn thấp sẽ bị gắn cảnh báo "an toàn nhưng chưa ai thực sự hào hứng"
  - 🧾 **Giải thích được (Explainable AI)** — mỗi gợi ý kèm lý do cụ thể từ dữ liệu thật (giá, khoảng cách, đánh giá, thân thiện trẻ em...)
  - Toàn bộ tính toán trên chạy **cục bộ, tức thời, không qua LLM** — cập nhật ngay khi bạn sửa sở thích thành viên, không cần bấm lại nút. Có thể ưu tiên dùng dữ liệu thật (giờ mở cửa, giá, đánh giá) từ RAG server local nếu đang chạy.
  - 🔒 **Phải có lịch trình rồi mới dùng được Quyết định nhóm** — tab Lịch trình chạy trước (tạo bộ khung chuyến đi), sau đó nút "Chấm điểm phù hợp" ở tab Quyết định nhóm mới mở khoá, để nhóm chọn giữa 3 phương án cho những chỗ còn phân vân trong lịch đó. Bấm "Chọn phương án này" trên 1 trong 3 card A/B/C để ghi lại quyết định của nhóm (✓ Đã chọn) — không bắt buộc, chỉ để có bằng chứng nhóm đã thực sự bàn bạc thay vì AI tự quyết.
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
- Đăng nhập chỉ là **demo cho hackathon**, không phải hệ thống bảo mật thật — mật khẩu chung ai cũng biết (`123123`), phiên đăng nhập lưu trong bộ nhớ server nên mất khi restart `auth-server`, và dữ liệu người dùng/lời mời chỉ nằm trên máy đang chạy `auth-server` (không đồng bộ giữa các máy).

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
| `auth-server/` | (Tuỳ chọn nhưng nên chạy) server đăng nhập/quản lý user/lời mời (Express + file JSON, xem bên dưới) |

Dữ liệu bạn nhập (lịch trình, thành viên nhóm, lịch sử chat giọng nói...) được tự động lưu vào `localStorage` của trình duyệt nên sẽ không mất khi reload trang. Dữ liệu này chỉ nằm trên máy bạn, không gửi đi đâu. Trừ lời mời chuyến đi — thứ duy nhất được gửi qua `auth-server` để người khác đọc được.

## Chạy Auth server cho đăng nhập/mời/quản trị

App **không bắt đăng nhập ngay từ đầu** — mọi tab dùng được bình thường kể cả khi chưa đăng nhập và kể cả khi `auth-server` chưa chạy. Khác biệt duy nhất: nếu bấm "Tạo lịch trình" mà chưa đăng nhập, lịch trình vẫn được tạo thật nhưng hiển thị **mờ kèm khoá 🔒** thay vì hiện rõ ngay — bấm "Đăng nhập" trong đó (hoặc nút "Đăng nhập" ở header) để mở form đăng nhập, xong là hiện rõ ngay lập tức, không cần tạo lại. Server này seed sẵn 3 tài khoản (`admin1`/`user1`/`user2`, mật khẩu `123123`) vào `auth-server/data.json` (tự tạo ở lần chạy đầu, mật khẩu được hash chứ không lưu thô).

```bash
cd auth-server
npm install
npm start        # chạy tại http://localhost:8900
```

- `admin1` có quyền admin → thấy thêm tab "Quản trị" để thêm/xoá tài khoản.
- Đã đăng nhập, sau khi tạo lịch trình ở tab Lịch trình, một khung "✉️ Mời người khác" hiện ra để chọn người gửi lời mời.
- Người được mời đăng nhập vào sẽ thấy số lời mời ở nút ✉️ trên header, bấm vào để xem và áp lịch trình đó vào tab của họ bằng 1 click.
- Nếu nhiều người demo trên các máy khác nhau, mỗi máy cần tự chạy `auth-server` riêng (dữ liệu không đồng bộ qua mạng) — phù hợp để demo trên 1 máy với nhiều tài khoản, chưa phải giải pháp multi-device thật.
- Nếu `auth-server` không chạy hoặc mất kết nối, đăng nhập/mời/quản trị chỉ đơn giản là không dùng được (có thông báo lỗi rõ ràng) — không ảnh hưởng tới các tính năng AI khác.

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
