# TravelAI — AI-Powered Group Travel Decision Platform

Không chỉ lên lịch trình — TravelAI giúp cả nhóm ra quyết định du lịch cùng nhau, và cho thấy rõ vì sao AI đề xuất mỗi lựa chọn. AI chạy qua [Claude API](https://www.anthropic.com/api) (Anthropic) thông qua `claude-server` — một proxy nhỏ chạy trên máy bạn, giữ API key ở phía server nên trình duyệt không bao giờ thấy key thật (xem mục "Chạy claude-server" bên dưới). Có đăng nhập (demo) để mỗi thành viên trong nhóm có tài khoản riêng và gửi lời mời chuyến đi cho nhau.

Ý tưởng gốc: [`AI Voice Travel Assistant.pdf`](./AI%20Voice%20Travel%20Assistant.pdf) (Product Vision).

## Cài đặt

Xem hướng dẫn đầy đủ (macOS + Windows) tại [`setup-guide.html`](./setup-guide.html) — mở file này bằng trình duyệt.

Tóm tắt nhanh:

1. Chạy `claude-server` (giữ API key, xem chi tiết ở mục bên dưới):
   ```bash
   cd claude-server
   cp config.example.json config.json   # rồi mở config.json, dán API key Anthropic vào field "apiKey"
   npm install
   npm start        # chạy tại http://localhost:8901
   ```
2. macOS: double-click `start-mac.command` · Windows: double-click `start-windows.bat`
3. Trình duyệt tự mở `app.html`, bấm "Kiểm tra kết nối" — dùng được ngay, không cần đăng nhập
4. (Tuỳ chọn nhưng nên chạy) — để xem lịch trình rõ (không bị mờ) và dùng được tính năng mời/quản trị user, chạy thêm auth server:
   ```bash
   cd auth-server
   npm install
   npm start        # chạy tại http://localhost:8900
   ```
   Rồi bấm "Đăng nhập" ở góc trên bằng `admin1` / `user1` / `user2`, mật khẩu `123123`.

## Chạy claude-server (bắt buộc — server giữ API key gọi Claude)

App là 1 trang tĩnh chạy trong trình duyệt, không có backend riêng — nếu gọi thẳng Claude API từ trình duyệt thì API key sẽ lộ ra (ai mở DevTools/Network tab đều thấy được, kể cả người dùng chung LAN qua tính năng truy cập từ điện thoại). `claude-server/` là 1 proxy nhỏ đứng giữa: giữ key ở phía server (đọc từ `config.json`, không commit lên git), trình duyệt chỉ gọi vào proxy này.

```bash
cd claude-server
cp config.example.json config.json   # copy file mẫu — config.json đã nằm trong .gitignore
```

Mở `config.json` vừa tạo, thay `YOUR_ANTHROPIC_API_KEY_HERE` bằng API key Anthropic thật của bạn (lấy tại [console.anthropic.com](https://console.anthropic.com/)). Có thể đổi luôn `model` (mặc định `claude-sonnet-5`) nếu muốn dùng model khác.

```bash
npm install
npm start        # chạy tại http://localhost:8901
```

Trong app, ô "Server" ở góc trên để nguyên `http://localhost:8901` (hoặc đổi thành IP LAN của máy nếu dùng từ điện thoại khác, xem `setup-guide.html`), rồi bấm "Kiểm tra kết nối".

**Lưu ý về chi phí**: mỗi lần app gọi AI (tạo lịch trình, chấm điểm nhóm, self-healing, camera AI...) đều tính phí vào tài khoản Anthropic của bạn theo lượng token thực tế dùng — không còn miễn phí như chạy Ollama local trước đây. Nên đặt budget alert trên [Anthropic Console](https://console.anthropic.com/) nếu demo nhiều lần liên tiếp.

## Tính năng

- 🔐 **Đăng nhập & mời thành viên** — 3 tài khoản demo có sẵn: `admin1` / `user1` / `user2`, mật khẩu `123123`. Tab "Lịch trình" (đầu tiên) vẫn mở tự do không cần đăng nhập — cứ điền form và bấm "Tạo lịch trình" bình thường; nếu chưa đăng nhập, lịch trình vẫn được tạo thật nhưng hiện **mờ kèm khoá 🔒 và nút "Đăng nhập"** thay vì hiện rõ ngay, mời chào đăng nhập thay vì chặn cứng từ đầu. **5 tab còn lại** (Quyết định nhóm, Trợ lý giọng nói, Self-Healing, Camera AI, Vì sao TravelAI) hiện dấu 🔒 trên tên tab và yêu cầu đăng nhập mới bấm vào được. Đăng nhập xong mọi tab mở ngay, lịch trình hiện rõ ngay, không cần tạo lại; đăng xuất thì khoá lại hết và tự quay về tab Lịch trình. Đã đăng nhập thì mỗi lần tạo lịch trình xong có thể chọn người khác và bấm "Gửi lời mời" — người được mời thấy huy hiệu ✉️ ở góc trên, mở ra xem và bấm "Dùng lịch trình này" để áp ngay vào tab của họ. Tài khoản `admin1` có thêm tab "Quản trị" để thêm/xoá người dùng. Chạy qua `auth-server/` (Express + file JSON, xem bên dưới) — đăng nhập demo, không phải hệ thống bảo mật thật.
- 📜 **Lịch sử lịch trình** — mỗi lần tạo lịch trình xong (khi đã đăng nhập), lịch trình đó tự động lưu vào lịch sử riêng của tài khoản đang đăng nhập (nút "📜 Lịch sử" cạnh nút "Tạo lịch trình"). Mở lịch sử ra: bấm "Dùng lại để chỉnh sửa" để tải nguyên lịch trình đó (form + kết quả) vào tab Lịch trình như vừa tạo xong, chỉnh sửa hoặc tạo lại tuỳ ý; bấm "Xoá" để xoá hẳn 1 bản khỏi lịch sử. Giữ tối đa 30 bản gần nhất mỗi tài khoản (tự xoá bản cũ nhất khi vượt quá). Cũng lưu qua `auth-server/`, giống cơ chế lời mời.
- 🗺️ **Dynamic Trip Planning** — tạo lịch trình theo ngày, có link Google Maps cho từng địa điểm và **🗺️ link "Xem lộ trình cả ngày"** nối toàn bộ hoạt động trong ngày thành một chỉ đường Google Maps duy nhất (origin → các điểm giữa → destination theo đúng thứ tự trong lịch). Có thể khai sở thích riêng từng thành viên (mục "Thành viên & sở thích" ngay trong tab này) — AI sẽ cố cân bằng hoạt động cho nhiều người nhất có thể thay vì chỉ tối ưu chung chung, và **📊 Điểm hài lòng của nhóm** hiện ngay sau khi tạo lịch trình (tính cục bộ, không qua LLM) — sửa sở thích một thành viên là điểm cập nhật tức thì, không cần tạo lại lịch trình.
- 📍 **Tên quán ăn cụ thể thay vì chung chung** — khi tạo lịch trình, hệ thống tự tra RAG server (nếu đang chạy) để lấy tên nhà hàng/địa điểm thật gần điểm đến và đưa vào prompt cho AI, thay vì để AI tự đoán ra "ăn trưa gần đó". Nếu AI vẫn lỡ viết chung chung (hay gặp với model local nhỏ), có lớp xử lý tất định điền lại bằng một quán thật từ RAG (kèm giá thật của quán đó) — không quán nào bị lặp lại 2 lần trong cùng lịch trình nếu còn quán khác phù hợp. Kho dữ liệu gồm 48 quán soạn tay (có giá/rating thật) + có thể mở rộng thêm hàng trăm quán thật lấy miễn phí từ OpenStreetMap (xem mục "Mở rộng dữ liệu nhà hàng" bên dưới).
- 💰 **Chi phí ước tính từng hoạt động + nhân theo đầu người** — AI ước tính giá mỗi hoạt động/quán ăn ngay trong lịch trình (VD: "Ăn trưa tại Yunangi — 1.500 yên", "Miễn phí"), cộng thành **chi phí mỗi người** và **tổng cho cả nhóm** (nhân đúng theo số thành viên, vì giá mỗi hoạt động vốn đã là giá/người chứ không phải chi phí chung cần chia ra) — cập nhật tức thì khi thêm/bớt thành viên, không cần tạo lại lịch trình. Có lớp kiểm tra tự động: nếu AI lỡ ghi một bữa ăn/quán bar là miễn phí (hay gặp với model local nhỏ), hệ thống tự thay bằng mức giá tối thiểu hợp lý và đánh dấu rõ bằng dấu "~" để không làm tổng chi phí bị ảo thấp. Chỉ là ước tính từ hiểu biết chung của AI, không phải giá thật đã kiểm chứng, và chưa gồm vé máy bay/khách sạn. 3 phương án A/B/C ở tab Quyết định nhóm cũng hiện giá ước tính riêng cho từng địa điểm khi dữ liệu tham khảo có giá.
- 👥 **Group Decision Engine** — không chỉ chấm điểm, mà còn:
  - 📊 **Điểm hài lòng theo từng thành viên** (không chỉ điểm trung bình chung)
  - ⚠️ **Phát hiện xung đột sở thích** — ai thích, ai không, mức độ nghiêm trọng, lý do
  - 💡 **3 phương án theo 3 chiến lược khác nhau** — A = an toàn nhất (điểm sàn cao nhất, không ai bị bỏ lại), B = hài lòng chung cao nhất (điểm trung bình), C = có người mê nhất (điểm đỉnh cao nhất). Tránh được tình huống cả 3 phương án đều là "không ai ghét nhưng cũng chẳng ai thích" — nếu có lựa chọn khiến ai đó thực sự hào hứng, nó sẽ lộ diện ở phương án C thay vì bị lọc mất vì thuật toán chỉ nhìn điểm sàn. Phương án nào mà điểm cao nhất trong nhóm vẫn thấp sẽ bị gắn cảnh báo "an toàn nhưng chưa ai thực sự hào hứng"
  - 🧾 **Giải thích được (Explainable AI)** — mỗi gợi ý kèm lý do cụ thể từ dữ liệu thật (giá, khoảng cách, đánh giá, thân thiện trẻ em...)
  - Toàn bộ tính toán trên chạy **cục bộ, tức thời, không qua LLM** — cập nhật ngay khi bạn sửa sở thích thành viên, không cần bấm lại nút. Có thể ưu tiên dùng dữ liệu thật (giờ mở cửa, giá, đánh giá) từ RAG server local nếu đang chạy.
  - 🔒 **Phải có lịch trình rồi mới dùng được Quyết định nhóm** — tab Lịch trình chạy trước (tạo bộ khung chuyến đi), sau đó nút "Chấm điểm phù hợp" ở tab Quyết định nhóm mới mở khoá, để nhóm chọn giữa 3 phương án cho những chỗ còn phân vân trong lịch đó. Bấm "Chọn phương án này" trên 1 trong 3 card A/B/C để ghi lại quyết định của nhóm (✓ Đã chọn) — không bắt buộc, chỉ để có bằng chứng nhóm đã thực sự bàn bạc thay vì AI tự quyết.
- 🆚 **Vì sao TravelAI** — màn hình so sánh trực tiếp với AI Travel Planner truyền thống (tối ưu cá nhân) và TravelAI (tối ưu quyết định nhóm)
- 🎙️ **Trợ lý giọng nói → tự tạo lịch trình** — không chỉ hỏi/đáp (Web Speech API): nói chuyện xong, bấm "Tạo lịch trình từ cuộc trò chuyện" (hoặc chỉ cần nói "tạo lịch trình cho tôi") là trợ lý tự đọc lại toàn bộ cuộc trò chuyện, trích xuất điểm đến/số ngày/ngân sách/nhóm đi cùng, rồi tạo lịch trình đầy đủ y như tab Lịch trình — và đưa luôn kết quả sang tab đó. Có **khung "Thông tin đã ghi nhận" hiện trực tiếp (VD: 4/6)** cho thấy rõ AI đã nắm được gì, thay vì hộp đen im lặng. Nếu còn thiếu thông tin bắt buộc (chưa biết đi đâu hoặc mấy ngày), trợ lý **chủ động hỏi lại đúng phần còn thiếu** — nhưng không chặn cứng: luôn có nút **"Tạo lịch trình luôn"** để AI tự điền phần thiếu bằng giá trị hợp lý và tạo ngay, không bắt buộc phải trả lời hết mới dùng được.
- 🌧️ **Self-Healing Itinerary (giải thích được)** — khi có sự cố (thời tiết...), không chỉ đổi hoạt động mà còn cho thấy: **📉 mức độ hài lòng nhóm thay đổi thế nào** (VD: 64% → 63%) và **thay đổi theo từng thành viên** (VD: A -5%) — dựa trên sở thích thành viên đã khai ở tab Quyết định nhóm, tính cục bộ không qua LLM
- 🚦 **Kiểm tra rủi ro chuyến đi** — quét tự động 5 loại rủi ro (đi bộ quá nhiều, ngân sách, thiếu phương tiện di chuyển, thời tiết xấu, **và khoảng cách di chuyển vô lý giữa 2 điểm liên tiếp trong ngày** — dựa trên toạ độ thật trong knowledge base, phát hiện lịch trình "vòng vèo" AI tự sắp mà không biết khoảng cách thật) ngay sau khi tạo lịch trình hoặc self-healing, kèm mức độ và gợi ý khắc phục
- 🌐 **Đa ngôn ngữ Việt/Nhật/Anh** — nút VI/JA/EN ở góc trên bên phải đổi toàn bộ giao diện, nội dung AI trả về (lịch trình, group matching, giọng nói, self-healing, camera), nhận diện/phát giọng nói theo đúng ngôn ngữ đang chọn. Lựa chọn ngôn ngữ được lưu lại cho lần sau.
- ⚡ **Streaming** — kết quả AI hiện dần theo từng token thay vì đợi cả khối, cảm giác phản hồi nhanh hơn nhiều với lịch trình dài.
- 📤 **Chia sẻ lịch trình** — nút "Chia sẻ" ở tab Lịch trình mở bảng chia sẻ native trên điện thoại (Messenger, Zalo, email...), hoặc copy văn bản đã format sẵn vào clipboard trên desktop. Có phương án dự phòng để vẫn copy được khi mở app qua địa chỉ IP LAN (http, không phải https).

## Giới hạn hiện tại

- AI không có dữ liệu thời gian thực — giờ mở cửa, số điện thoại, địa chỉ do AI gợi ý **chưa được xác minh**, luôn kiểm tra qua nút "Xem bản đồ" trước khi đi.
- Cần internet liên tục khi dùng (mỗi lần gọi AI đều qua Claude API) và cần 1 API key Anthropic hợp lệ — mỗi lượt gọi tính phí vào tài khoản Anthropic của bạn (xem mục "Chạy claude-server" ở trên).
- `rag-server/` (tính năng RAG, tuỳ chọn) vẫn cần cài Ollama local để chạy embedding (`nomic-embed-text`) — Anthropic không cung cấp API embedding, đây là phần duy nhất còn phụ thuộc Ollama, tách biệt hoàn toàn với AI trả lời chính.
- Đăng nhập chỉ là **demo cho hackathon**, không phải hệ thống bảo mật thật — mật khẩu chung ai cũng biết (`123123`), phiên đăng nhập lưu trong bộ nhớ server nên mất khi restart `auth-server`, và dữ liệu người dùng/lời mời chỉ nằm trên máy đang chạy `auth-server` (không đồng bộ giữa các máy).

## Cấu trúc file

| File | Mô tả |
|---|---|
| `app.html` | Markup của giao diện chính |
| `style.css` | Toàn bộ style (bao gồm responsive cho mobile) |
| `app.js` | Toàn bộ logic — gọi `claude-server`, render kết quả, lưu trạng thái vào localStorage |
| `claude-server/` | Proxy giữ API key Anthropic, gọi Claude API thay cho trình duyệt (xem mục "Chạy claude-server" ở trên) |
| `start-mac.command` | Khởi chạy nhanh trên macOS |
| `start-windows.bat` | Khởi chạy nhanh trên Windows |
| `setup-guide.html` | Hướng dẫn cài đặt chi tiết |
| `AI Voice Travel Assistant.pdf` | Tài liệu Product Vision gốc |
| `tests/app.test.js` | Unit test cho các hàm thuần trong `app.js` |
| `rag-server/` | (Tùy chọn) server RAG local — index tài liệu trong `knowledge/` và trả về đoạn liên quan cho tab Group Matching |
| `knowledge/` | Dữ liệu tham khảo (nhà hàng, điểm tham quan, ghi chú) dùng để index cho `rag-server` |
| `auth-server/` | (Tuỳ chọn nhưng nên chạy) server đăng nhập/quản lý user/lời mời (Express + file JSON, xem bên dưới) |

Dữ liệu bạn nhập (lịch trình, thành viên nhóm, lịch sử chat giọng nói...) được tự động lưu vào `localStorage` của trình duyệt nên sẽ không mất khi reload trang, và không rời khỏi máy bạn trừ khi cần thiết: lời mời chuyến đi được gửi qua `auth-server` để người khác đọc được, và nội dung liên quan tới mỗi lượt tạo lịch trình/chấm điểm/self-healing/camera AI được gửi qua `claude-server` tới Claude API (Anthropic) để lấy câu trả lời — đây là nơi duy nhất dữ liệu chuyến đi của bạn rời khỏi máy.

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

### Mở rộng dữ liệu nhà hàng từ OpenStreetMap (miễn phí, không cần API key)

Ngoài `knowledge/restaurants.json` (48 quán soạn tay, có giá/rating thật) và `knowledge/attractions.json`, có thể lấy thêm hàng trăm quán ăn/uống thật trên đảo chính Okinawa từ OpenStreetMap (Overpass API) — miễn phí, không cần đăng ký hay API key:

```bash
node rag-server/fetch-osm-restaurants.js --limit 300   # ghi ra knowledge/restaurants-osm.json (mặc định 300 quán, không đè lên restaurants.json)
node rag-server/ingest.js                               # đọc lại toàn bộ knowledge/, rebuild embedding — cần rag-server đã npm install
```

Lưu ý: dữ liệu OSM là do cộng đồng đóng góp (giấy phép ODbL, cần ghi nguồn `© OpenStreetMap contributors` nếu phát hành lại), **chưa được kiểm chứng thủ công**, giờ mở cửa/địa chỉ có thể lỗi thời. OSM không có sẵn giá hay rating — **rating** bỏ qua hẳn (app coi là "chưa có đánh giá", không đoán), còn **giá** thì script tự gán một khoảng ước lượng theo loại quán (VD: ramen ~800-1300 yên, steak/BBQ ~2500-4500 yên...) vì tính năng chia chi phí cần có con số để hoạt động — luôn hiện kèm dấu `~` và ghi rõ "(ước lượng theo loại quán)" ở mọi nơi hiển thị, không lẫn với giá thật của 48 quán soạn tay. Chạy lại script này bất cứ lúc nào để lấy dữ liệu mới hơn hoặc đổi vùng/số lượng (sửa `OKINAWA_HONTO_BBOX` trong file để đổi khu vực, hoặc sửa bảng `PRICE_ESTIMATE_BANDS` để tinh chỉnh mức giá ước lượng).

### Thêm toạ độ cho dữ liệu soạn tay (phục vụ cảnh báo khoảng cách di chuyển)

`knowledge/restaurants.json` và `knowledge/attractions.json` (soạn tay) không có sẵn toạ độ như dữ liệu OSM. Chạy script này 1 lần (hoặc mỗi khi thêm quán/địa điểm mới chưa có toạ độ) để tự tra cứu toạ độ thật qua Nominatim (OpenStreetMap, miễn phí, không cần key) và ghi thêm field `lat`/`lon` vào 2 file đó — không đụng tới field nào khác đã soạn tay:

```bash
node rag-server/geocode-curated.js   # tự bỏ qua mục đã có lat/lon, chỉ tra những mục còn thiếu
node rag-server/ingest.js            # rebuild embedding với toạ độ mới
```

Toạ độ này được dùng để tính khoảng cách thực tế giữa các hoạt động liên tiếp trong ngày (mục "🚦 Kiểm tra rủi ro chuyến đi" ở trên) — hoạt động nào không khớp được tên với dữ liệu có toạ độ sẽ bị bỏ qua (không đoán), chứ không làm sai lệch cảnh báo.

## Chạy test

Cần Node.js ≥ 18 (dùng `node:test` có sẵn, không cần cài thêm gì):

```bash
npm test
```

CI chạy test này tự động trên mọi push/PR vào `main` (xem `.github/workflows/test.yml`).
