/**
 * AI Travel Companion — app logic.
 * Pure/testable functions are exported via module.exports for Node (see tests/app.test.js).
 * DOM wiring only runs when a `document` is present (browser).
 */
(function (root) {
'use strict';

const DEFAULT_LANG = 'vi';
const SUPPORTED_LANGS = ['vi', 'ja', 'en'];

// ---------- i18n dictionary ----------
// Every leaf is either a string or a function(...) => string (for messages needing interpolation).
const I18N = {
  vi: {
    appSubtitle: 'Local prototype · AI chạy trên máy bạn qua Ollama · dùng được cả từ điện thoại trong cùng mạng',
    checkConnBtn: 'Kiểm tra kết nối',
    connect: {
      defaultHint: 'Cần cài <a href="https://ollama.com/download" target="_blank" style="color:var(--accent)">Ollama</a> trên máy này trước (miễn phí, chạy hoàn toàn offline). Sau khi cài: mở Terminal chạy <code>ollama pull llama3.2</code> để tải model, rồi bấm "Kiểm tra kết nối". Muốn dùng từ điện thoại: điện thoại phải cùng Wi-Fi với máy này, thay <code>localhost</code> ở ô Server bằng địa chỉ IP LAN của máy (VD: <code>http://192.168.3.23:11434</code>), và mở trang này trên điện thoại qua <code>http://192.168.3.23:8765/app.html</code>.',
      connecting: 'Đang kết nối tới Ollama...',
      noModel: (model) => `⚠️ Kết nối được nhưng chưa có model nào. Chạy: <code>ollama pull ${model}</code> rồi thử lại.`,
      modelMissing: (names, model) => `⚠️ Server có các model: ${names} — không thấy "${model}". Sửa lại tên model hoặc chạy <code>ollama pull ${model}</code>.`,
      ready: (model) => `✅ Đã kết nối Ollama, model "${model}" sẵn sàng — AI chạy trên máy này, hoàn toàn offline/miễn phí.`,
      failed: (base, err) => `⚠️ Không kết nối được tới ${base}. Kiểm tra: Ollama đã chạy chưa, đúng địa chỉ IP chưa, và nếu gọi từ điện thoại/máy khác thì đã bật <code>OLLAMA_HOST=0.0.0.0</code> và <code>OLLAMA_ORIGINS=*</code> chưa. Lỗi: ${err}`
    },
    tabs: { planner: '🗺️ Lịch trình', group: '👥 Group Matching', voice: '🎙️ Trợ lý giọng nói', heal: '🌧️ Self-Healing', camera: '📷 Camera AI' },
    common: {
      mapLink: '📍 Xem bản đồ',
      venueWarning: '⚠️ chưa xác minh giờ mở cửa',
      dayLabel: (n) => `Day ${n}`,
      noResult: 'Không có kết quả.',
      noChange: 'Không có thay đổi.',
      aiFinal: '🤖 AI chốt:',
      criteriaHeader: 'Tiêu chí',
      scoreHeader: 'Điểm',
      changesHeader: 'Thay đổi',
      newItineraryHeader: 'Lịch trình mới',
      plannerDisclaimer: '📍 Bấm "Xem bản đồ" để xem địa chỉ, giờ mở cửa thật và số điện thoại (nếu quán có đăng). ⚠️ AI chạy local không có dữ liệu thời gian thực nên <strong>không biết chắc quán có mở cửa vào giờ đó không</strong>, và thứ tự/khoảng cách di chuyển giữa các điểm chỉ là suy đoán chung của AI — <strong>không dựa trên dữ liệu giao thông hay bản đồ thời gian thực</strong>. Luôn kiểm tra qua Maps trước khi đến.',
      unlimitedBudget: 'không giới hạn',
      soloTraveler: 'một mình'
    },
    errors: {
      timeout: 'AI không phản hồi sau 60 giây — model có thể đang tải lần đầu (chậm hơn bình thường) hoặc máy đang quá tải. Thử lại, hoặc đổi model nhẹ hơn.',
      cannotConnect: (base) => `Không gọi được tới ${base}. Bấm "Kiểm tra kết nối" ở góc trên để chẩn đoán.`,
      visionCannotConnect: (base) => `Không gọi được tới ${base}. Kiểm tra Ollama đang chạy chưa.`,
      modelNotFoundSuffix: (model) => ` — có thể chưa tải model. Chạy: ollama pull ${model}`,
      noJson: 'AI không trả về dữ liệu dạng JSON như yêu cầu — model có thể quá nhỏ để tuân theo định dạng. Thử lại hoặc đổi sang model khác.',
      malformedJson: 'AI trả về JSON không hợp lệ (bị lỗi cú pháp giữa chừng). Thử lại hoặc đổi sang model khác.'
    },
    planner: {
      title: 'Tạo lịch trình tự động',
      destLabel: 'Điểm đến',
      daysLabel: 'Số ngày',
      budgetLabel: 'Ngân sách (yên / tổng)',
      budgetPlaceholder: '80000',
      groupLabel: 'Thành phần nhóm',
      groupPlaceholder: 'Vợ chồng + 1 bé 5 tuổi',
      notesLabel: 'Ghi chú thêm (phương tiện, sở thích...)',
      notesPlaceholder: 'Thuê xe, thích hải sản, thích biển',
      runBtn: 'Tạo lịch trình',
      loading: 'Đang tạo lịch trình...',
      systemPrompt: 'Bạn là AI Travel Companion, trợ lý lập kế hoạch du lịch cá nhân hóa. Mỗi hoạt động nên nêu tên địa điểm/quán cụ thể có thể tìm trên Google Maps (VD: "Ăn trưa tại Yunangi Okinawan Cuisine" thay vì chỉ "Lunch"). Bạn KHÔNG có dữ liệu thời gian thực nên KHÔNG được khẳng định giờ mở cửa, địa chỉ, số điện thoại, hay tình trạng giao thông/khoảng cách di chuyển thực tế của bất kỳ địa điểm nào — thứ tự hoạt động chỉ nên dựa trên suy luận hợp lý chung (VD: bãi biển buổi chiều, ngắm hoàng hôn cuối ngày), không khẳng định là tối ưu về đường đi hay đã kiểm tra kẹt xe thật. Trả lời DUY NHẤT bằng JSON hợp lệ (giữ nguyên tên field tiếng Anh như trong schema, chỉ viết NỘI DUNG bằng tiếng Việt), không kèm text hay markdown code fence nào khác, theo đúng schema:\n{"days":[{"day":1,"activities":["Naha Airport","Ăn trưa tại nhà hàng Yunangi","American Village","Sunset Beach","Ăn tối tại Steak House 88"]}],"summary":"1-2 câu tổng kết về chi phí ước tính và lưu ý chính, nhắc người dùng kiểm tra giờ mở cửa thật trước khi đi"}',
      userPrompt: (dest, days, budget, group, notes) => `Lên lịch trình du lịch ${dest}, ${days} ngày. Ngân sách: ${budget} yên. Nhóm: ${group}. ${notes ? 'Ghi chú: ' + notes : ''}\nSắp xếp hoạt động theo thứ tự hợp lý trong ngày (sáng/trưa/chiều/tối), phù hợp thời tiết chung của điểm đến, chi phí, và trải nghiệm phù hợp cả nhóm. Không cần đảm bảo giờ mở cửa hay khoảng cách di chuyển chính xác vì bạn không có dữ liệu thời gian thực.`
    },
    group: {
      title: 'Chấm điểm địa điểm cho cả nhóm',
      placeLabel: 'Địa điểm cần đánh giá',
      membersLabel: 'Thành viên & sở thích',
      addMemberBtn: '+ Thêm thành viên',
      runBtn: 'Chấm điểm phù hợp',
      loading: 'Đang chấm điểm...',
      memberNamePlaceholder: 'Tên (VD: A)',
      memberPrefPlaceholder: 'Sở thích (VD: Hải sản, thích chụp ảnh)',
      defaultMembers: [['A', 'Hải sản'], ['B', 'Check-in, chụp ảnh'], ['C', 'Shopping'], ['D', 'Có trẻ em'], ['E', 'Orion Beer']],
      systemPrompt: 'Bạn là AI Group Matching Engine, đánh giá mức độ phù hợp của một địa điểm du lịch với sở thích từng thành viên trong nhóm, rồi mô phỏng ngắn gọn góc nhìn của từng người như một cuộc tranh luận thật trước khi AI chốt đề xuất. Trả lời DUY NHẤT bằng JSON hợp lệ (giữ nguyên tên field tiếng Anh như trong schema, chỉ viết NỘI DUNG bằng tiếng Việt) theo schema:\n{"criteria":[{"name":"Food","score":9}],"debate":[{"name":"A","comment":"1 câu nêu góc nhìn/lo ngại của người này về địa điểm, xưng theo tên"}],"recommendation":"1-2 câu AI chốt phương án dung hòa cả nhóm, giải thích ngắn gọn vì sao"}\nĐiểm số theo thang 1-10, suy ra tiêu chí từ sở thích từng thành viên. Mỗi người trong "debate" phải có ý kiến khác nhau, phản ánh đúng sở thích riêng của họ (có thể khen hoặc chê tùy sở thích).',
      userPrompt: (place, members) => `Địa điểm: ${place}\nThành viên và sở thích:\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}`
    },
    voice: {
      title: 'Trợ lý du lịch bằng giọng nói',
      voiceLabel: 'Giọng đọc',
      orTypeLabel: 'Hoặc gõ câu hỏi',
      textPlaceholder: 'Tìm nơi ngắm hoàng hôn đẹp gần đây',
      sendBtn: 'Gửi',
      micHintDefault: 'Nhấn để nói (VD: "Tôi muốn ăn sushi gần đây")',
      listening: 'Đang nghe...',
      heard: (t) => `Đã nghe: "${t}"`,
      hearing: (t) => `🎤 ${t} …`,
      noMatch: 'Không nhận ra câu nói — thử lại, nói rõ và chậm hơn.',
      notSupported: 'trình duyệt không hỗ trợ — hãy gõ câu hỏi bên dưới',
      supported: 'hỗ trợ trong trình duyệt này (cần internet để nhận diện giọng nói)',
      thinking: 'Đang nghĩ...',
      thinkingTick: (s) => `Đang nghĩ... (${s}s)`,
      noVoices: 'Trình duyệt chưa nạp xong danh sách giọng đọc, hoặc máy chưa cài giọng nào phù hợp.',
      noNativeVoices: 'Máy chưa có giọng tiếng Việt nào ngoài giọng mặc định, nên đang phát toàn bộ giọng có sẵn (có thể không đọc đúng tiếng Việt). Trên macOS: vào System Settings → Accessibility → Spoken Content → System Voice → tải thêm giọng tiếng Việt (chọn bản "Enhanced/Premium" để nghe tự nhiên hơn nhiều so với giọng mặc định).',
      voicesFound: (n) => `Tìm thấy ${n} giọng tiếng Việt. Nếu vẫn thấy robot, thử cài thêm giọng "Enhanced/Premium" trong Cài đặt hệ thống để có giọng tự nhiên hơn.`,
      recognitionErrors: {
        'not-allowed': 'Trình duyệt chưa được cấp quyền micro — vào Cài đặt trình duyệt cho phép micro cho trang này.',
        'no-speech': 'Không nghe thấy giọng nói — thử nói to hơn hoặc gần mic hơn.',
        'audio-capture': 'Không tìm thấy micro trên máy này.',
        'network': 'Lỗi mạng — nhận diện giọng nói của Chrome cần internet để hoạt động, kiểm tra kết nối mạng.',
        'aborted': 'Đã dừng nghe.'
      },
      micErrorPrefix: 'Lỗi mic: ',
      systemPrompt: 'Bạn là trợ lý du lịch AI bằng giọng nói, thân thiện, trả lời ngắn gọn (2-4 câu), thực tế, như đang đề xuất trực tiếp cho người dùng đang ở gần đó (nhà hàng, địa điểm ngắm cảnh...). Trả lời bằng tiếng Việt, không dùng markdown.'
    },
    heal: {
      title: 'Lịch trình tự thay đổi',
      itinLabel: 'Lịch trình hiện tại (mỗi dòng 1 hoạt động)',
      destLabel: 'Điểm đến (để lấy thời tiết thật)',
      eventLabel: 'Tình huống bất ngờ',
      eventPlaceholder: 'Buổi sáng mưa lớn',
      weatherBtn: '🌦️ Lấy thời tiết thật',
      runBtn: 'Cập nhật lịch trình',
      loading: 'Đang cập nhật lịch trình...',
      defaultItinerary: 'Beach\nSunset viewing\nOutdoor BBQ\nDinner ngoài trời',
      defaultEvent: 'Buổi sáng mưa lớn',
      needDest: '⚠️ Nhập điểm đến trước.',
      lookingUp: 'Đang tra vị trí và thời tiết thật...',
      notFound: (dest) => `⚠️ Không tìm thấy vị trí "${dest}".`,
      weatherText: (place, country, desc, temp, precip) => `Tại ${place}${country ? ', ' + country : ''} hiện đang ${desc}, ${temp}°C${precip > 0 ? `, lượng mưa ${precip}mm` : ''}.`,
      weatherReady: (time) => `✅ Dữ liệu thật từ Open-Meteo, cập nhật lúc ${time}.`,
      weatherError: (msg) => `⚠️ Không lấy được thời tiết: ${msg}`,
      systemPrompt: 'Bạn là AI Self-Healing Itinerary Engine. Khi có tình huống bất ngờ, tự động thay thế các hoạt động không còn phù hợp bằng lựa chọn thay thế hợp lý, giữ nguyên các hoạt động không bị ảnh hưởng. Trả lời DUY NHẤT bằng JSON (giữ nguyên tên field tiếng Anh như trong schema, chỉ viết NỘI DUNG bằng tiếng Việt) theo schema:\n{"replacements":[{"original":"Beach","replacement":"Aquarium","reason":"..."}],"updated_itinerary":["Aquarium","Sunset viewing", "..."]}',
      userPrompt: (itin, event) => `Lịch trình hiện tại:\n${itin.map(i => '- ' + i).join('\n')}\n\nTình huống: ${event}`
    },
    camera: {
      title: 'AI hiểu qua camera',
      modeLabel: 'Chế độ',
      modeFood: '🍜 Món ăn',
      modeLandmark: '🏯 Địa danh',
      visionModelLabel: 'Vision model (Ollama)',
      modelHint: 'Model mặc định <code>moondream</code> nhẹ, chạy nhanh trên local nhưng nhận diện còn thô. Muốn chính xác hơn: <code>ollama pull llama3.2-vision</code> rồi đổi ô model.',
      fileLabel: 'Chụp hoặc chọn ảnh',
      runBtn: 'Phân tích ảnh',
      step1: 'Đang nhìn ảnh (bước 1/2)...',
      step2: 'Đang phân tích & viết câu trả lời (bước 2/2)...',
      noCaption: (model) => `Model vision "${model}" không trả về mô tả nào cho ảnh này — thử ảnh khác hoặc đổi model.`,
      disclaimer: (model) => `⚠️ AI vision chạy local (${model}) dễ nhận diện sai, đặc biệt với chữ trên ảnh (menu, biển hiệu) và món/địa danh ít phổ biến. Coi đây là gợi ý tham khảo, không phải kết luận chắc chắn.`,
      systemPromptFood: 'Bạn nhận được mô tả bằng tiếng Anh (từ 1 AI vision) về ảnh 1 món ăn. Dựa vào đó, viết bằng tiếng Việt: 1) Đây có thể là món gì. 2) Thành phần nhìn thấy. 3) Gợi ý 1-2 món tương tự đáng thử. KHÔNG bịa giá tiền/calories chính xác — nếu nhắc tới phải ghi rõ là ước tính. Nếu mô tả quá mơ hồ để đoán món, hãy nói thẳng là không chắc. Ngắn gọn, không markdown.',
      systemPromptLandmark: 'Bạn nhận được mô tả bằng tiếng Anh (từ 1 AI vision) về ảnh 1 địa danh/công trình. Dựa vào đó, viết bằng tiếng Việt: 1) Đây có thể là địa danh gì. 2) Vài nét lịch sử/văn hóa nếu bạn biết chắc. 3) Loại điểm tham quan tương tự gần đó. Nếu mô tả quá mơ hồ để nhận diện, nói thẳng là không chắc thay vì đoán bừa. Ngắn gọn, không markdown.',
      userPrompt: (caption) => `Mô tả từ AI vision: "${caption}"`
    },
    weatherCodes: {
      0: 'trời quang', 1: 'quang, ít mây', 2: 'có mây rải rác', 3: 'nhiều mây',
      45: 'sương mù', 48: 'sương mù đóng băng',
      51: 'mưa phùn nhẹ', 53: 'mưa phùn vừa', 55: 'mưa phùn dày',
      61: 'mưa nhẹ', 63: 'mưa vừa', 65: 'mưa to',
      71: 'tuyết nhẹ', 73: 'tuyết vừa', 75: 'tuyết to',
      80: 'mưa rào nhẹ', 81: 'mưa rào vừa', 82: 'mưa rào dữ dội',
      95: 'giông bão', 96: 'giông kèm mưa đá nhẹ', 99: 'giông kèm mưa đá to',
      unknown: 'thời tiết không xác định'
    },
    venueKeywords: ['ăn trưa','ăn tối','ăn sáng','nhà hàng','quán ','café','cafe','lunch','dinner','breakfast','restaurant','bar','beer','izakaya','shop','store','mall','shopping'],
    speechLang: 'vi-VN',
    speechVoicePrefix: 'vi',
    geocodeLang: 'vi'
  },
  ja: {
    appSubtitle: 'ローカル試作版 · Ollama経由でこの端末上でAIが動作 · 同じネットワーク内ならスマホからも利用可',
    checkConnBtn: '接続確認',
    connect: {
      defaultHint: 'まずこの端末に<a href="https://ollama.com/download" target="_blank" style="color:var(--accent)">Ollama</a>をインストールしてください（無料・完全オフライン動作）。インストール後、ターミナルで <code>ollama pull llama3.2</code> を実行してモデルを取得し、「接続確認」を押してください。スマホから使う場合：スマホは同じWi-Fiに接続し、Server欄の <code>localhost</code> をこの端末のLAN IPアドレスに置き換え（例：<code>http://192.168.3.23:11434</code>）、スマホでは <code>http://192.168.3.23:8765/app.html</code> を開いてください。',
      connecting: 'Ollamaに接続中...',
      noModel: (model) => `⚠️ 接続はできましたが、モデルがまだありません。<code>ollama pull ${model}</code> を実行してから再試行してください。`,
      modelMissing: (names, model) => `⚠️ サーバーにあるモデル：${names} — 「${model}」が見つかりません。モデル名を修正するか <code>ollama pull ${model}</code> を実行してください。`,
      ready: (model) => `✅ Ollamaに接続済み、モデル「${model}」使用可能 — この端末上で完全オフライン・無料で動作しています。`,
      failed: (base, err) => `⚠️ ${base} に接続できません。Ollamaが起動しているか、IPアドレスが正しいか確認してください。スマホ/他端末から接続する場合は <code>OLLAMA_HOST=0.0.0.0</code> と <code>OLLAMA_ORIGINS=*</code> を設定してください。エラー内容：${err}`
    },
    tabs: { planner: '🗺️ 旅程', group: '👥 グループマッチング', voice: '🎙️ 音声アシスタント', heal: '🌧️ 自動リカバリー', camera: '📷 カメラAI' },
    common: {
      mapLink: '📍 地図を見る',
      venueWarning: '⚠️ 営業時間未確認',
      dayLabel: (n) => `${n}日目`,
      noResult: '結果がありません。',
      noChange: '変更はありません。',
      aiFinal: '🤖 AIの結論：',
      criteriaHeader: '項目',
      scoreHeader: 'スコア',
      changesHeader: '変更点',
      newItineraryHeader: '新しい旅程',
      plannerDisclaimer: '📍 「地図を見る」で実際の住所・営業時間・電話番号（掲載があれば）を確認できます。⚠️ このAIはローカル動作でリアルタイム情報を持たないため、<strong>実際の営業時間は保証できません</strong>。また移動順序や距離はAIの一般的な推測であり、<strong>実際の交通・地図データには基づいていません</strong>。出発前に必ずMapsで確認してください。',
      unlimitedBudget: '無制限',
      soloTraveler: '一人旅'
    },
    errors: {
      timeout: 'AIが60秒以内に応答しませんでした — モデルの初回読み込みに時間がかかっているか、端末の負荷が高い可能性があります。再試行するか、より軽量なモデルに変更してください。',
      cannotConnect: (base) => `${base} に接続できませんでした。右上の「接続確認」で診断してください。`,
      visionCannotConnect: (base) => `${base} に接続できませんでした。Ollamaが起動しているか確認してください。`,
      modelNotFoundSuffix: (model) => ` — モデルが未取得の可能性があります。実行：ollama pull ${model}`,
      noJson: 'AIが要求されたJSON形式でデータを返しませんでした — モデルが小さすぎて形式に従えない可能性があります。再試行するか、別のモデルに変更してください。',
      malformedJson: 'AIが返したJSONが不正な形式です（途中で構文エラー）。再試行するか、別のモデルに変更してください。'
    },
    planner: {
      title: '旅程を自動作成',
      destLabel: '目的地',
      daysLabel: '日数',
      budgetLabel: '予算（円・合計）',
      budgetPlaceholder: '80000',
      groupLabel: 'メンバー構成',
      groupPlaceholder: '夫婦 + 5歳の子供1人',
      notesLabel: '補足（交通手段・好みなど）',
      notesPlaceholder: 'レンタカー希望、魚介類が好き、海が好き',
      runBtn: '旅程を作成',
      loading: '旅程を作成中...',
      systemPrompt: 'あなたはAI Travel Companion、パーソナライズされた旅行プランニングアシスタントです。各アクティビティにはGoogleマップで検索できる具体的な店名・施設名を含めてください（例：「昼食はランチのみ」ではなく「Yunangi Okinawan Cuisineで昼食」）。あなたはリアルタイム情報を持たないため、営業時間・住所・電話番号・実際の交通状況や移動距離を断定してはいけません — アクティビティの順序は一般的な妥当性（例：午後はビーチ、1日の終わりに夕日鑑賞）に基づく推測に留め、経路が最適化されている、または渋滞を確認したとは主張しないでください。必ずJSONのみで回答し（スキーマの英語フィールド名はそのまま維持し、内容は日本語で記述）、それ以外のテキストやMarkdownのコードフェンスは付けないでください。スキーマ：\n{"days":[{"day":1,"activities":["那覇空港","Yunangi Okinawan Cuisineで昼食","American Village","サンセットビーチ","Steak House 88で夕食"]}],"summary":"概算費用と主な注意点についての1〜2文。出発前に実際の営業時間を確認するよう促すこと"}',
      userPrompt: (dest, days, budget, group, notes) => `${dest}への${days}日間の旅行プランを作成してください。予算：${budget}円。メンバー：${group}。${notes ? '補足：' + notes : ''}\n1日の中で時間帯（朝/昼/午後/夜）ごとに妥当な順序でアクティビティを配置し、目的地の一般的な気候、費用、グループ全員に合う体験を考慮してください。リアルタイム情報がないため、営業時間や正確な移動距離は保証しなくて構いません。`
    },
    group: {
      title: 'グループ全員向けにスポットを採点',
      placeLabel: '評価するスポット',
      membersLabel: 'メンバーと好み',
      addMemberBtn: '+ メンバーを追加',
      runBtn: '適合度を採点',
      loading: '採点中...',
      memberNamePlaceholder: '名前（例：A）',
      memberPrefPlaceholder: '好み（例：魚介類、写真撮影が好き）',
      defaultMembers: [['A', '魚介類'], ['B', '写真映え・チェックイン重視'], ['C', 'ショッピング'], ['D', '子供連れ'], ['E', 'オリオンビール']],
      systemPrompt: 'あなたはAI Group Matching Engineです。ある旅行スポットが、グループの各メンバーの好みにどれだけ合っているかを評価し、実際の議論のように各メンバーの視点を短くシミュレートしてから、AIとしての提案をまとめてください。必ずJSONのみで回答してください（スキーマの英語フィールド名はそのまま維持し、内容は日本語で記述）。スキーマ：\n{"criteria":[{"name":"Food","score":9}],"debate":[{"name":"A","comment":"このスポットについてのこの人の視点・懸念を1文で、本人の立場で述べる"}],"recommendation":"グループ全員が納得できる落としどころをAIとして1〜2文で提案し、簡潔に理由も述べる"}\nスコアは1〜10段階で、各メンバーの好みから項目を推測してください。"debate"内の各メンバーは、それぞれの好みを反映した異なる意見を持つようにしてください（好みに応じて肯定的にも否定的にもなり得ます）。',
      userPrompt: (place, members) => `スポット：${place}\nメンバーと好み：\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}`
    },
    voice: {
      title: '音声旅行アシスタント',
      voiceLabel: '読み上げ音声',
      orTypeLabel: 'または質問を入力',
      textPlaceholder: '近くの綺麗な夕日スポットを探して',
      sendBtn: '送信',
      micHintDefault: 'タップして話す（例：「近くで寿司を食べたい」）',
      listening: '聞き取り中...',
      heard: (t) => `聞き取り結果：「${t}」`,
      hearing: (t) => `🎤 ${t} …`,
      noMatch: '聞き取れませんでした — もう一度、はっきりゆっくり話してください。',
      notSupported: 'このブラウザは音声認識に対応していません — 下のテキスト欄から質問してください',
      supported: 'このブラウザで利用可能（音声認識にはインターネット接続が必要です）',
      thinking: '考え中...',
      thinkingTick: (s) => `考え中...（${s}秒）`,
      noVoices: 'ブラウザがまだ音声リストを読み込んでいないか、対応する音声がインストールされていません。',
      noNativeVoices: 'この端末に日本語の音声がデフォルト以外にないため、利用可能な音声を全て表示しています（日本語がうまく読み上げられない場合があります）。macOSの場合：システム設定 → アクセシビリティ → 読み上げコンテンツ → システムの声 → 日本語の音声を追加（「拡張/プレミアム」版を選ぶとより自然な声になります）。',
      voicesFound: (n) => `日本語の音声が${n}件見つかりました。ロボットっぽい場合は、システム設定で「拡張/プレミアム」音声を追加すると自然になります。`,
      recognitionErrors: {
        'not-allowed': 'マイクの使用が許可されていません — ブラウザの設定でこのページのマイクを許可してください。',
        'no-speech': '発話が検出されませんでした — もっと大きな声で、マイクに近づいて話してください。',
        'audio-capture': 'この端末にマイクが見つかりません。',
        'network': 'ネットワークエラー — Chromeの音声認識にはインターネット接続が必要です。接続を確認してください。',
        'aborted': '聞き取りを停止しました。'
      },
      micErrorPrefix: 'マイクエラー：',
      systemPrompt: 'あなたはフレンドリーな音声旅行アシスタントです。簡潔（2〜4文）かつ実用的に、近くにいるユーザーに直接おすすめするように答えてください（レストラン、景勝地など）。日本語で、Markdownを使わずに答えてください。'
    },
    heal: {
      title: '旅程の自動リカバリー',
      itinLabel: '現在の旅程（1行に1つのアクティビティ）',
      destLabel: '目的地（実際の天気を取得するため）',
      eventLabel: '突発的な状況',
      eventPlaceholder: '朝から大雨',
      weatherBtn: '🌦️ 実際の天気を取得',
      runBtn: '旅程を更新',
      loading: '旅程を更新中...',
      defaultItinerary: 'ビーチ\n夕日鑑賞\n屋外バーベキュー\n屋外ディナー',
      defaultEvent: '朝から大雨',
      needDest: '⚠️ まず目的地を入力してください。',
      lookingUp: '位置情報と実際の天気を取得中...',
      notFound: (dest) => `⚠️ 「${dest}」の位置が見つかりません。`,
      weatherText: (place, country, desc, temp, precip) => `${place}${country ? '、' + country : ''}は現在${desc}、${temp}°C${precip > 0 ? `、降水量${precip}mm` : ''}です。`,
      weatherReady: (time) => `✅ Open-Meteoの実データ、${time}時点。`,
      weatherError: (msg) => `⚠️ 天気を取得できませんでした：${msg}`,
      systemPrompt: 'あなたはAI Self-Healing Itinerary Engineです。突発的な状況が発生した場合、もう適さなくなったアクティビティを合理的な代替案に自動的に置き換え、影響を受けないアクティビティはそのまま維持してください。必ずJSONのみで回答してください（スキーマの英語フィールド名はそのまま維持し、内容は日本語で記述）。スキーマ：\n{"replacements":[{"original":"Beach","replacement":"Aquarium","reason":"..."}],"updated_itinerary":["Aquarium","Sunset viewing", "..."]}',
      userPrompt: (itin, event) => `現在の旅程：\n${itin.map(i => '- ' + i).join('\n')}\n\n状況：${event}`
    },
    camera: {
      title: 'カメラでAI認識',
      modeLabel: 'モード',
      modeFood: '🍜 料理',
      modeLandmark: '🏯 観光地',
      visionModelLabel: 'Vision モデル（Ollama）',
      modelHint: 'デフォルトの<code>moondream</code>は軽量でローカルでも高速に動きますが、認識精度は粗めです。より正確にしたい場合は <code>ollama pull llama3.2-vision</code> を実行してモデル欄を変更してください。',
      fileLabel: '写真を撮影または選択',
      runBtn: '画像を分析',
      step1: '画像を確認中（ステップ1/2）...',
      step2: '分析して回答を作成中（ステップ2/2）...',
      noCaption: (model) => `Visionモデル「${model}」がこの画像の説明を返しませんでした — 別の画像を試すか、モデルを変更してください。`,
      disclaimer: (model) => `⚠️ ローカル動作のVision AI（${model}）は誤認識しやすく、特に画像内の文字（メニューや看板）やマイナーな料理・観光地では精度が落ちます。参考程度に留め、断定的な結論とはみなさないでください。`,
      systemPromptFood: '英語で書かれた画像の説明（Vision AIによるもの）を受け取ります。それをもとに日本語で次を書いてください：1) これは何の料理と考えられるか。2) 見える材料。3) 似ていて試す価値のある料理を1〜2つ提案。価格やカロリーを正確に断定しないでください — 触れる場合は概算であることを明記してください。説明が曖昧すぎて判断できない場合は、正直に「確信が持てない」と伝えてください。簡潔に、Markdownなしで。',
      systemPromptLandmark: '英語で書かれた画像の説明（Vision AIによるもの）を受け取ります。それをもとに日本語で次を書いてください：1) これは何の観光地・建造物と考えられるか。2) 確かな情報があれば歴史・文化的背景を少し。3) 近くにありそうな似た種類の観光スポット。説明が曖昧すぎて識別できない場合は、当てずっぽうで答えず正直に「確信が持てない」と伝えてください。簡潔に、Markdownなしで。',
      userPrompt: (caption) => `Vision AIによる説明：「${caption}」`
    },
    weatherCodes: {
      0: '快晴', 1: 'ほぼ晴れ', 2: '所により曇り', 3: '曇り',
      45: '霧', 48: '着氷性の霧',
      51: '弱い霧雨', 53: '霧雨', 55: '強い霧雨',
      61: '弱い雨', 63: '雨', 65: '強い雨',
      71: '弱い雪', 73: '雪', 75: '強い雪',
      80: '弱いにわか雨', 81: 'にわか雨', 82: '激しいにわか雨',
      95: '雷雨', 96: '雹を伴う軽い雷雨', 99: '雹を伴う激しい雷雨',
      unknown: '不明な天気'
    },
    venueKeywords: ['ランチ','昼食','夕食','夕飯','朝食','レストラン','カフェ','喫茶店','バー','居酒屋','ショップ','ストア','モール','ショッピング','食堂','飲み屋'],
    speechLang: 'ja-JP',
    speechVoicePrefix: 'ja',
    geocodeLang: 'ja'
  },
  en: {
    appSubtitle: 'Local prototype · AI runs on your machine via Ollama · usable from your phone on the same network',
    checkConnBtn: 'Check connection',
    connect: {
      defaultHint: 'You need <a href="https://ollama.com/download" target="_blank" style="color:var(--accent)">Ollama</a> installed on this machine first (free, fully offline). After installing: open a terminal and run <code>ollama pull llama3.2</code> to fetch the model, then click "Check connection". To use it from your phone: your phone must be on the same Wi-Fi, replace <code>localhost</code> in the Server field with this machine\'s LAN IP address (e.g. <code>http://192.168.3.23:11434</code>), and open this page on your phone via <code>http://192.168.3.23:8765/app.html</code>.',
      connecting: 'Connecting to Ollama...',
      noModel: (model) => `⚠️ Connected, but no model is available yet. Run: <code>ollama pull ${model}</code> and try again.`,
      modelMissing: (names, model) => `⚠️ The server has these models: ${names} — "${model}" wasn't found. Fix the model name or run <code>ollama pull ${model}</code>.`,
      ready: (model) => `✅ Connected to Ollama, model "${model}" is ready — running fully offline/free on this machine.`,
      failed: (base, err) => `⚠️ Couldn't connect to ${base}. Check that Ollama is running, the IP address is correct, and — if calling from a phone/other device — that <code>OLLAMA_HOST=0.0.0.0</code> and <code>OLLAMA_ORIGINS=*</code> are set. Error: ${err}`
    },
    tabs: { planner: '🗺️ Itinerary', group: '👥 Group Matching', voice: '🎙️ Voice Assistant', heal: '🌧️ Self-Healing', camera: '📷 Camera AI' },
    common: {
      mapLink: '📍 View map',
      venueWarning: '⚠️ hours not verified',
      dayLabel: (n) => `Day ${n}`,
      noResult: 'No results.',
      noChange: 'No changes.',
      aiFinal: '🤖 AI\'s call:',
      criteriaHeader: 'Criteria',
      scoreHeader: 'Score',
      changesHeader: 'Changes',
      newItineraryHeader: 'Updated itinerary',
      plannerDisclaimer: '📍 Click "View map" to see the real address, opening hours, and phone number (if listed). ⚠️ This AI runs locally with no real-time data, so it <strong>cannot confirm whether a place is actually open at that time</strong>, and the ordering/distance between stops is just the AI\'s general guess — <strong>not based on real traffic or map data</strong>. Always double-check on Maps before you go.',
      unlimitedBudget: 'unlimited',
      soloTraveler: 'solo'
    },
    errors: {
      timeout: "The AI didn't respond within 60 seconds — the model might be loading for the first time (slower than usual), or the machine is under heavy load. Try again, or switch to a lighter model.",
      cannotConnect: (base) => `Couldn't reach ${base}. Click "Check connection" up top to diagnose.`,
      visionCannotConnect: (base) => `Couldn't reach ${base}. Check that Ollama is running.`,
      modelNotFoundSuffix: (model) => ` — the model might not be pulled yet. Run: ollama pull ${model}`,
      noJson: "The AI didn't return the JSON it was asked for — the model might be too small to follow the format. Try again or switch to a different model.",
      malformedJson: 'The AI returned invalid JSON (a syntax error partway through). Try again or switch to a different model.'
    },
    planner: {
      title: 'Create an itinerary',
      destLabel: 'Destination',
      daysLabel: 'Number of days',
      budgetLabel: 'Budget (JPY / total)',
      budgetPlaceholder: '80000',
      groupLabel: 'Group composition',
      groupPlaceholder: 'Couple + 1 child (age 5)',
      notesLabel: 'Notes (transport, preferences...)',
      notesPlaceholder: 'Renting a car, love seafood, love the beach',
      runBtn: 'Create itinerary',
      loading: 'Creating itinerary...',
      systemPrompt: 'You are AI Travel Companion, a personalized trip-planning assistant. Every activity should name a specific place/venue that can be looked up on Google Maps (e.g. "Lunch at Yunangi Okinawan Cuisine" instead of just "Lunch"). You have NO real-time data, so you must NOT assert opening hours, addresses, phone numbers, or real traffic conditions/travel distances for any place — the order of activities should only reflect general reasonable judgment (e.g. beach in the afternoon, sunset viewing at the end of the day), and you must not claim the route is optimized or that you checked real traffic. Reply with ONLY valid JSON (keep the English field names exactly as in the schema, write the CONTENT in English), with no other text or markdown code fences, matching this schema:\n{"days":[{"day":1,"activities":["Naha Airport","Lunch at Yunangi Okinawan Cuisine","American Village","Sunset Beach","Dinner at Steak House 88"]}],"summary":"1-2 sentences summarizing estimated cost and key notes, reminding the user to verify real opening hours before going"}',
      userPrompt: (dest, days, budget, group, notes) => `Plan a ${days}-day trip to ${dest}. Budget: ${budget} JPY. Group: ${group}. ${notes ? 'Notes: ' + notes : ''}\nOrder activities sensibly through the day (morning/midday/afternoon/evening), fitting the destination's general climate, cost, and an experience that suits the whole group. You don't need to guarantee opening hours or exact travel distances since you have no real-time data.`
    },
    group: {
      title: 'Score a place for the whole group',
      placeLabel: 'Place to evaluate',
      membersLabel: 'Members & preferences',
      addMemberBtn: '+ Add member',
      runBtn: 'Score fit',
      loading: 'Scoring...',
      memberNamePlaceholder: 'Name (e.g. A)',
      memberPrefPlaceholder: 'Preference (e.g. seafood, loves photos)',
      defaultMembers: [['A', 'Seafood'], ['B', 'Check-ins, photos'], ['C', 'Shopping'], ['D', 'Traveling with kids'], ['E', 'Orion Beer']],
      systemPrompt: 'You are the AI Group Matching Engine. Assess how well a travel spot fits each group member\'s preferences, then briefly simulate each person\'s perspective like a real discussion before the AI settles on a recommendation. Reply with ONLY valid JSON (keep the English field names exactly as in the schema, write the CONTENT in English) matching this schema:\n{"criteria":[{"name":"Food","score":9}],"debate":[{"name":"A","comment":"One sentence giving this person\'s perspective/concern about the place, in their own voice"}],"recommendation":"1-2 sentences where the AI settles on a compromise that works for the whole group, with a brief reason"}\nScore on a 1-10 scale, inferring criteria from each member\'s preferences. Each person in "debate" should have a different opinion reflecting their own preference (can be positive or negative depending on their taste).',
      userPrompt: (place, members) => `Place: ${place}\nMembers and preferences:\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}`
    },
    voice: {
      title: 'Voice travel assistant',
      voiceLabel: 'Voice',
      orTypeLabel: 'Or type your question',
      textPlaceholder: 'Find a nice sunset spot nearby',
      sendBtn: 'Send',
      micHintDefault: 'Tap to speak (e.g. "I want sushi nearby")',
      listening: 'Listening...',
      heard: (t) => `Heard: "${t}"`,
      hearing: (t) => `🎤 ${t} …`,
      noMatch: "Couldn't understand — try again, speak clearly and slowly.",
      notSupported: "this browser doesn't support it — type your question below instead",
      supported: 'supported in this browser (needs internet for speech recognition)',
      thinking: 'Thinking...',
      thinkingTick: (s) => `Thinking... (${s}s)`,
      noVoices: "The browser hasn't finished loading voices yet, or no suitable voice is installed.",
      noNativeVoices: 'This device has no English voice besides the default one, so all available voices are shown (they may not read English correctly). On macOS: System Settings → Accessibility → Spoken Content → System Voice → add an English voice (pick an "Enhanced/Premium" one for a much more natural sound).',
      voicesFound: (n) => `Found ${n} English voices. If it still sounds robotic, try adding an "Enhanced/Premium" voice in System Settings for a more natural sound.`,
      recognitionErrors: {
        'not-allowed': "Microphone access wasn't granted — allow the microphone for this page in your browser settings.",
        'no-speech': "No speech detected — try speaking louder or closer to the mic.",
        'audio-capture': 'No microphone found on this device.',
        'network': "Network error — Chrome's speech recognition needs internet to work, check your connection.",
        'aborted': 'Stopped listening.'
      },
      micErrorPrefix: 'Mic error: ',
      systemPrompt: 'You are a friendly AI voice travel assistant. Answer briefly (2-4 sentences) and practically, as if recommending something directly to a user nearby (a restaurant, a scenic spot...). Reply in English, without markdown.'
    },
    heal: {
      title: 'Self-healing itinerary',
      itinLabel: 'Current itinerary (one activity per line)',
      destLabel: 'Destination (to fetch real weather)',
      eventLabel: 'Unexpected situation',
      eventPlaceholder: 'Heavy rain in the morning',
      weatherBtn: '🌦️ Fetch real weather',
      runBtn: 'Update itinerary',
      loading: 'Updating itinerary...',
      defaultItinerary: 'Beach\nSunset viewing\nOutdoor BBQ\nOutdoor dinner',
      defaultEvent: 'Heavy rain in the morning',
      needDest: '⚠️ Enter a destination first.',
      lookingUp: 'Looking up location and real weather...',
      notFound: (dest) => `⚠️ Couldn't find a location for "${dest}".`,
      weatherText: (place, country, desc, temp, precip) => `${place}${country ? ', ' + country : ''} currently has ${desc}, ${temp}°C${precip > 0 ? `, ${precip}mm of precipitation` : ''}.`,
      weatherReady: (time) => `✅ Real data from Open-Meteo, updated at ${time}.`,
      weatherError: (msg) => `⚠️ Couldn't fetch weather: ${msg}`,
      systemPrompt: 'You are the AI Self-Healing Itinerary Engine. When an unexpected situation comes up, automatically replace activities that no longer fit with reasonable alternatives, keeping unaffected activities unchanged. Reply with ONLY JSON (keep the English field names exactly as in the schema, write the CONTENT in English) matching this schema:\n{"replacements":[{"original":"Beach","replacement":"Aquarium","reason":"..."}],"updated_itinerary":["Aquarium","Sunset viewing", "..."]}',
      userPrompt: (itin, event) => `Current itinerary:\n${itin.map(i => '- ' + i).join('\n')}\n\nSituation: ${event}`
    },
    camera: {
      title: 'AI understands via camera',
      modeLabel: 'Mode',
      modeFood: '🍜 Food',
      modeLandmark: '🏯 Landmark',
      visionModelLabel: 'Vision model (Ollama)',
      modelHint: 'The default <code>moondream</code> model is lightweight and fast locally but recognition is rough. For better accuracy: <code>ollama pull llama3.2-vision</code> and change the model field.',
      fileLabel: 'Take or choose a photo',
      runBtn: 'Analyze image',
      step1: 'Looking at the image (step 1/2)...',
      step2: 'Analyzing and writing a reply (step 2/2)...',
      noCaption: (model) => `The vision model "${model}" returned no description for this image — try a different image or model.`,
      disclaimer: (model) => `⚠️ The local vision AI (${model}) can misidentify things easily, especially text in the image (menus, signs) and less common dishes/landmarks. Treat this as a reference suggestion, not a firm conclusion.`,
      systemPromptFood: "You receive an English description (from a vision AI) of a photo of a dish. Based on it, write in English: 1) What this dish might be. 2) Visible ingredients. 3) 1-2 similar dishes worth trying. Do NOT make up exact prices/calories — if you mention them, clearly label them as estimates. If the description is too vague to guess, say plainly that you're not sure. Keep it brief, no markdown.",
      systemPromptLandmark: "You receive an English description (from a vision AI) of a photo of a landmark/structure. Based on it, write in English: 1) What this landmark might be. 2) A bit of history/culture if you're confident about it. 3) Similar types of attractions likely nearby. If the description is too vague to identify, say plainly that you're not sure instead of guessing. Keep it brief, no markdown.",
      userPrompt: (caption) => `Description from vision AI: "${caption}"`
    },
    weatherCodes: {
      0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
      45: 'fog', 48: 'depositing rime fog',
      51: 'light drizzle', 53: 'moderate drizzle', 55: 'dense drizzle',
      61: 'light rain', 63: 'moderate rain', 65: 'heavy rain',
      71: 'light snow', 73: 'moderate snow', 75: 'heavy snow',
      80: 'light rain showers', 81: 'moderate rain showers', 82: 'violent rain showers',
      95: 'thunderstorm', 96: 'thunderstorm with light hail', 99: 'thunderstorm with heavy hail',
      unknown: 'unknown weather'
    },
    venueKeywords: ['lunch','dinner','breakfast','restaurant','cafe','bar','pub','izakaya','shop','store','mall','shopping','market','diner'],
    speechLang: 'en-US',
    speechVoicePrefix: 'en',
    geocodeLang: 'en'
  }
};

function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Looks up a translation by dot-path for the given language, falling back to DEFAULT_LANG, then the key itself. */
function tr(lang, path, ...args) {
  lang = normalizeLang(lang);
  let val = getPath(I18N[lang], path);
  if (val === undefined) val = getPath(I18N[DEFAULT_LANG], path);
  if (val === undefined) return path;
  return typeof val === 'function' ? val(...args) : val;
}

// ---------- Pure utils (no DOM, safe to unit test) ----------

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function mapLink(place, context, lang) {
  const q = encodeURIComponent(context ? `${place}, ${context}` : place);
  return `<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener" class="map-link">${tr(lang, 'common.mapLink')}</a>`;
}

function venueWarning(text, lang) {
  const keywords = tr(lang, 'venueKeywords');
  const t = String(text).toLowerCase();
  if (Array.isArray(keywords) && keywords.some(k => t.includes(k.toLowerCase()))) {
    return ` <span class="warn-badge" title="${escapeHtml(tr(lang, 'common.venueWarning'))}">${tr(lang, 'common.venueWarning')}</span>`;
  }
  return '';
}

function weatherDescription(code, lang) {
  const codes = tr(lang, 'weatherCodes');
  return (codes && codes[code]) || tr(lang, 'weatherCodes.unknown');
}

/**
 * Finds the first balanced {...} object in text, respecting strings/escapes,
 * instead of a greedy "first { to last }" regex — more robust when the model
 * adds prose before/after the JSON block.
 */
function findFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escapeNext = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\') { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parses one line of Ollama's streaming NDJSON /api/chat response and returns
 * the text delta it carries, or '' if the line is empty/unparseable/has no content.
 */
function extractChunkContent(line) {
  if (!line || !line.trim()) return '';
  let obj;
  try { obj = JSON.parse(line); } catch (e) { return ''; }
  return (obj && obj.message && obj.message.content) || '';
}

/**
 * Extracts and parses a JSON object from an LLM text response.
 * Throws a user-facing Error (localized) on failure, not a raw JSON.parse error.
 */
function extractJson(text, lang) {
  const stripped = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(stripped);
  } catch (e) { /* fall through to balanced-brace extraction */ }

  const found = findFirstJsonObject(stripped);
  if (!found) {
    throw new Error(tr(lang, 'errors.noJson'));
  }
  try {
    return JSON.parse(found);
  } catch (e) {
    throw new Error(tr(lang, 'errors.malformedJson'));
  }
}

// ---------- Render helpers (return HTML strings; pure given data) ----------

function renderPlannerHtml(data, dest, lang) {
  let dayHtml = '';
  (data.days || []).forEach((d, i) => {
    if (!d || !Array.isArray(d.activities) || d.activities.length === 0) return;
    const items = d.activities.map(a => `<li>${escapeHtml(a)} ${mapLink(a, dest, lang)}${venueWarning(a, lang)}</li>`).join('');
    dayHtml += `<div class="day-block"><h4>${tr(lang, 'common.dayLabel', d.day || (i + 1))}</h4><ul>${items}</ul></div>`;
  });
  if (!dayHtml) return tr(lang, 'common.noResult');
  let html = dayHtml;
  if (data.summary) html += `<div class="summary-note">${escapeHtml(data.summary)}</div>`;
  html += `<div class="summary-note">${tr(lang, 'common.plannerDisclaimer')}</div>`;
  return html;
}

function renderGroupScoreTableHtml(data, lang) {
  let html = `<table class="score-table"><thead><tr><th>${tr(lang, 'common.criteriaHeader')}</th><th>${tr(lang, 'common.scoreHeader')}</th></tr></thead><tbody>`;
  (data.criteria || []).forEach(c => { html += `<tr><td>${escapeHtml(c.name)}</td><td>${c.score}/10</td></tr>`; });
  html += `</tbody></table>`;
  return html;
}

function dedupePlanItems(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter(item => {
    const key = String(item || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function flattenActivities(planData) {
  if (!planData || !Array.isArray(planData.days)) return [];
  const flat = [];
  planData.days.forEach(day => {
    if (!day || !Array.isArray(day.activities)) return;
    day.activities.forEach(activity => {
      if (typeof activity === 'string' && activity.trim()) flat.push(activity.trim());
    });
  });
  return dedupePlanItems(flat);
}

function normalizeHealedText(text) {
  return String(text || '').trim().toLowerCase();
}

function classifyIncident(eventText) {
  const text = normalizeHealedText(eventText);
  const rainy = /mưa|rain|drizzle|bão|giông|typhoon|lụt|flood|雨|嵐|台風/.test(text);
  const hot = /nắng|nóng|heat|heatwave|extreme heat|猛暑|酷暑|暑/.test(text);
  const windy = /gió|wind|gust|強風|風が強/.test(text);
  let type = 'default';
  let severity = 'low';

  if (/bão|giông|typhoon|lụt|flood|hurricane|台風|暴風雨|雷雨/.test(text) || (rainy && windy && /(mưa to|mưa lớn|heavy rain|rainstorm|torrential|豪雨|大雨|gió lớn|gió mạnh|strong wind|暴風|強風)/.test(text))) {
    type = 'storm';
    severity = 'high';
  } else if (rainy && /(mưa rất to|mưa to|mưa lớn|heavy rain|rainstorm|torrential|mưa dông|豪雨|大雨)/.test(text)) {
    type = 'rain';
    severity = 'high';
  } else if (windy && /(gió lớn|gió mạnh|strong wind|gust|windy|暴風|強風)/.test(text)) {
    type = 'wind';
    severity = 'high';
  } else if (hot && /(nắng gắt|nắng mạnh|nóng quá|heatwave|extreme heat|猛暑|酷暑)/.test(text)) {
    type = 'heat';
    severity = 'high';
  } else if (rainy) {
    type = 'rain';
    severity = 'medium';
  } else if (windy) {
    type = 'wind';
    severity = 'medium';
  }
  return { type, severity, text };
}

function isSevereWeatherIncident(incident) {
  return !!incident && incident.severity === 'high';
}

function classifyActivity(item) {
  const text = normalizeHealedText(item);
  const outdoor = /beach|sunset|outdoor|park|hike|trail|garden|boat|cruise|snorkel|surf|bbq|barbecue|bay|海|ビーチ|公園|散策|ハイキング/.test(text);
  const indoor = /museum|aquarium|mall|shopping|café|cafe|restaurant|food hall|arcade|spa|cinema|movie|indoor|market|shop|博物館|水族館|モール|映画館|屋内/.test(text);
  const transit = /airport|flight|train|bus|car|drive|taxi|transfer|station|空港|駅|移動/.test(text);
  const food = /lunch|dinner|breakfast|ăn|restaurant|café|cafe|izakaya|sushi|ramen|bbq|barbecue|food|昼食|夕食|朝食|レストラン/.test(text);
  let category = 'general';
  if (transit) category = 'transit';
  else if (food) category = 'food';
  else if (indoor) category = 'indoor';
  else if (outdoor) category = 'outdoor';
  return { category, outdoor };
}

function parseBudgetNumber(value) {
  const raw = String(value || '').replace(/[^\d]/g, '');
  return raw ? parseInt(raw, 10) : null;
}

function buildPlannerContextSummary(context) {
  const parts = [];
  if (context && context.days) parts.push(`${context.days} ngày`);
  if (context && context.budget) parts.push(`ngân sách ${context.budget} yên`);
  if (context && context.group) parts.push(`nhóm: ${context.group}`);
  if (context && context.notes) parts.push(`ghi chú: ${context.notes}`);
  return parts.join(' • ');
}

function shouldReplaceActivity(item, info, incident) {
  if (!isSevereWeatherIncident(incident)) return false;
  const text = normalizeHealedText(item);
  const seaTransit = /boat|cruise|ferry|港|船/.test(text);
  const hasIndoorFoodCue = /nhà hàng|quán|restaurant|café|cafe|izakaya|food hall|indoor/.test(text);
  const outdoorFood = /bbq|barbecue|picnic|outdoor dining|grill/.test(text) && !hasIndoorFoodCue;
  if (info.category === 'transit' && !seaTransit) return false;
  if (info.category === 'food' && !outdoorFood) return false;
  return info.category === 'outdoor' || seaTransit || outdoorFood;
}

function rankReplacementCandidates(candidates, original, context, incidentType) {
  const text = normalizeHealedText(original);
  const group = normalizeHealedText(context && context.group);
  const notes = normalizeHealedText(context && context.notes);
  const budget = parseBudgetNumber(context && context.budget);
  const scored = [];
  const seen = new Set();

  (Array.isArray(candidates) ? candidates : []).forEach(candidate => {
    const key = normalizeHealedText(candidate);
    if (!key || seen.has(key)) return;
    seen.add(key);
    let score = 0;
    if (/aquarium|museum/.test(key)) score += 3;
    if (/indoor activity|food hall|indoor market|café|cafe|cinema/.test(key)) score += 2;
    if (/bé|baby|child|kid|trẻ em|子供|kids/.test(group + ' ' + notes)) {
      if (/aquarium|museum|indoor activity|cinema|arcade|food hall/.test(key)) score += 4;
    }
    if (budget !== null && budget <= 120000) {
      if (/museum|café|cafe|indoor market|food hall|arcade|aquarium|indoor activity/.test(key)) score += 3;
      if (/spa|shopping mall/.test(key)) score -= 2;
    }
    if (/beach|sea|ocean|snorkel|surf|boat|cruise|bay/.test(text + ' ' + notes)) {
      if (/aquarium|museum|food hall|indoor market|café|cafe/.test(key)) score += 3;
    }
    if (/bbq|barbecue|food|ẩm thực|eat|grill/.test(text + ' ' + notes)) {
      if (/food hall|restaurant|café|cafe|indoor market/.test(key)) score += 3;
    }
    if (incidentType === 'storm') score += /indoor|museum|aquarium|cinema|food hall|market|café|cafe/.test(key) ? 2 : 0;
    scored.push({ candidate, score });
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.candidate);
}

function getReplacementCandidates(original, context, incidentType, info) {
  const text = normalizeHealedText(original);
  const scenicPool = ['Aquarium', 'Museum', 'Indoor Market', 'Shopping Mall', 'Café', 'Cinema'];
  const outdoorPool = ['Museum', 'Aquarium', 'Indoor Activity', 'Indoor Market', 'Café', 'Cinema', 'Arcade', 'Shopping Mall'];
  const foodPool = ['Food Hall', 'Restaurant', 'Café', 'Indoor Market', 'Museum', 'Aquarium', 'Indoor Activity', 'Cinema'];
  const defaultPool = ['Museum', 'Aquarium', 'Indoor Market', 'Food Hall', 'Café', 'Indoor Activity', 'Cinema', 'Arcade', 'Shopping Mall'];
  let pool = defaultPool;
  if (/bbq|barbecue|picnic|grill|food|ăn|lunch|dinner|breakfast/.test(text) || info.category === 'food') pool = foodPool;
  else if (/beach|sunset|sea|ocean|snorkel|surf|boat|cruise|bay|viewpoint|park|hike|trail|bãi biển|ngắm hoàng hôn|biển/.test(text)) pool = scenicPool;
  else if (info.category === 'outdoor') pool = outdoorPool;
  return rankReplacementCandidates(pool, original, context, incidentType);
}

function formatReplacementActivity(original, replacement) {
  const source = String(original || '').trim();
  const target = String(replacement || '').trim();
  const lower = normalizeHealedText(source);
  if (!source || !target) return target || source;
  if (/^đi đến\s+/i.test(source)) return source.replace(/^đi đến\s+/i, `Đi đến ${target} (thay thế cho) `);
  if (/^visit\s+/i.test(source)) return source.replace(/^visit\s+/i, `Visit ${target} (instead of) `);
  if (/^tham quan\s+/i.test(source)) return `Tham quan ${target}`;
  if (/ăn|lunch|dinner|breakfast|restaurant|quán|nhà hàng/.test(lower)) return `Ăn tại ${target}`;
  if (/ngắm|sunset|view|beach|biển/.test(lower)) return `Tham quan trong nhà tại ${target}`;
  return `${target}`;
}

function summarizeIncident(eventText, incident) {
  const text = String(eventText || '').trim();
  if (!text) return 'Không có mô tả tình huống cụ thể.';
  if (incident.type === 'storm') return `Sự cố nghiêm trọng: ${text}`;
  if (incident.type === 'rain') return `Thời tiết mưa: ${text}`;
  if (incident.type === 'heat') return `Thời tiết nóng / nắng: ${text}`;
  if (incident.type === 'wind') return `Thời tiết gió mạnh: ${text}`;
  return text;
}

function buildSelfHealingPlan(planData, itin, eventText, context) {
  const incident = classifyIncident(eventText);
  const sourceDays = Array.isArray(planData && planData.days) && planData.days.length
    ? planData.days
    : [{ day: 1, activities: dedupePlanItems(itin) }];

  const updatedDays = [];
  const replacements = [];
  const used = new Set();

  sourceDays.forEach((day, index) => {
    const activities = [];
    const originalItems = dedupePlanItems(Array.isArray(day && day.activities) ? day.activities : []);
    originalItems.forEach(item => {
      const info = classifyActivity(item);
      const key = normalizeHealedText(item);
      used.add(key);

      if (!shouldReplaceActivity(item, info, incident)) {
        activities.push({ original: item, text: item, changed: false, reason: '' });
        return;
      }

      const replacement = getReplacementCandidates(item, context || {}, incident.type, info)
        .find(candidate => !used.has(normalizeHealedText(candidate)) && normalizeHealedText(candidate) !== key);

      if (!replacement) {
        activities.push({ original: item, text: item, changed: false, reason: '' });
        return;
      }

      used.add(normalizeHealedText(replacement));
      const reason = incident.type === 'storm'
        ? 'Bão / gió lớn / mưa dông nên ưu tiên hoạt động trong nhà và gần nhau hơn'
        : incident.type === 'heat'
          ? 'Nắng nóng cực đoan, chuyển sang nơi có điều hòa'
          : incident.type === 'rain'
            ? 'Mưa to khiến hoạt động ngoài trời không còn phù hợp'
            : 'Thời tiết xấu khiến hoạt động ngoài trời nên được thay thế';

      const replacementText = formatReplacementActivity(item, replacement);
      activities.push({ original: item, text: replacementText, changed: true, reason });
      replacements.push({ original: item, replacement: replacementText, reason });
    });
    updatedDays.push({ day: day.day || (index + 1), activities });
  });

  if (!isSevereWeatherIncident(incident)) {
    return {
      incident_summary: summarizeIncident(eventText, incident),
      severity: incident.severity,
      replacements: [],
      updated_days: updatedDays.map(day => ({
        day: day.day,
        activities: day.activities.map(a => ({ original: a.original, text: a.original, changed: false, reason: '' }))
      })),
      updated_itinerary: dedupePlanItems(sourceDays.flatMap(d => Array.isArray(d.activities) ? d.activities : [])),
      context_summary: buildPlannerContextSummary(context || {}),
      notes: 'Thời tiết chưa chuyển xấu tới mức cần đổi lịch trình; giữ nguyên kế hoạch hiện tại.'
    };
  }

  return {
    incident_summary: summarizeIncident(eventText, incident),
    severity: incident.severity,
    replacements,
    updated_days: updatedDays,
    updated_itinerary: updatedDays.flatMap(day => day.activities.map(a => a.text)),
    context_summary: buildPlannerContextSummary(context || {}),
    notes: incident.type === 'storm'
      ? 'Giữ lịch trình trong nhà, giảm di chuyển và ưu tiên điểm gần nhau.'
      : incident.type === 'heat'
        ? 'Ưu tiên điều hòa, nước uống và hạn chế nắng gắt.'
        : incident.type === 'rain'
          ? 'Chuyển sang các điểm trong nhà, tránh hoạt động ngoài trời kéo dài.'
          : 'Điều chỉnh nhẹ để phù hợp với thời tiết hiện tại.'
  };
}

function renderHealHtml(data, lang) {
  let html = '';
  if (data.incident_summary) {
    html += `<div class="summary-note"><strong>Tình huống:</strong> ${escapeHtml(data.incident_summary)}${data.severity ? ` · Mức độ: ${escapeHtml(data.severity)}` : ''}</div>`;
  }
  if (data.context_summary) {
    html += `<div class="summary-note"><strong>Bám theo plan Tab 1:</strong> ${escapeHtml(data.context_summary)}</div>`;
  }
  if ((data.replacements || []).length) {
    html += `<div class="day-block"><h4>${tr(lang, 'common.changesHeader')}</h4><ul>`;
    data.replacements.forEach(r => {
      html += `<li><strong>${escapeHtml(r.original)}</strong> → <strong>${escapeHtml(r.replacement)}</strong> — ${escapeHtml(r.reason || '')}</li>`;
    });
    html += `</ul></div>`;
  }
  if (Array.isArray(data.updated_days) && data.updated_days.length) {
    html += `<div class="day-block"><h4>${tr(lang, 'common.newItineraryHeader')}</h4>${data.updated_days.map((day, idx) => {
      const activities = Array.isArray(day.activities) ? day.activities : [];
      return `<div class="day-block"><h4>${tr(lang, 'common.dayLabel', day.day || (idx + 1))}</h4><ul>${activities.map(activity => {
        const changed = !!activity.changed;
        const original = String(activity.original || '');
        const text = String(activity.text || original);
        const reason = changed && activity.reason ? `<span class="reason-tag">Lý do: ${escapeHtml(activity.reason)}</span>` : '';
        const before = changed && original && original !== text ? `<del>${escapeHtml(original)}</del> → ` : '';
        return `<li class="${changed ? 'changed-item' : ''}">${before}<strong>${escapeHtml(text)}</strong>${reason} ${mapLink(text, undefined, lang)}${venueWarning(text, lang)}</li>`;
      }).join('')}</ul></div>`;
    }).join('')}</div>`;
  } else if ((data.updated_itinerary || []).length) {
    html += `<div class="day-block"><h4>${tr(lang, 'common.newItineraryHeader')}</h4><ul>${data.updated_itinerary.map(a => `<li>${escapeHtml(a)} ${mapLink(a, undefined, lang)}${venueWarning(a, lang)}</li>`).join('')}</ul></div>`;
  }
  if (data.notes) html += `<div class="summary-note">${escapeHtml(data.notes)}</div>`;
  return html || tr(lang, 'common.noChange');
}

// ---------- localStorage persistence (guarded — private mode can throw) ----------

const STORAGE_KEYS = {
  url: 'ollama_url',
  model: 'ollama_model',
  voiceName: 'voice_name',
  lang: 'app_lang',
  planner: 'planner_state_v1',
  group: 'group_state_v1',
  heal: 'heal_state_v1',
  voiceLog: 'voice_log_v1'
};
const VOICE_LOG_MAX = 40;

function safeSave(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* storage full/unavailable — ignore, non-critical */ }
}
function safeLoad(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function safeSaveString(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch (e) { /* ignore */ }
}
function safeLoadString(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch (e) { return null; }
}

const AppCore = {
  DEFAULT_LANG, SUPPORTED_LANGS, I18N, tr, normalizeLang,
  escapeHtml, mapLink, venueWarning,
  weatherDescription,
  findFirstJsonObject, extractJson, extractChunkContent,
  renderPlannerHtml, renderGroupScoreTableHtml, renderHealHtml,
  dedupePlanItems, flattenActivities, normalizeHealedText,
  classifyIncident, isSevereWeatherIncident, classifyActivity,
  parseBudgetNumber, buildPlannerContextSummary, buildSelfHealingPlan,
  STORAGE_KEYS, VOICE_LOG_MAX, safeSave, safeLoad, safeSaveString, safeLoadString
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppCore;
}

// ---------- DOM wiring (browser only) ----------
if (typeof document !== 'undefined') {
  initApp();
}

function initApp() {
  let currentLang = normalizeLang(safeLoadString(STORAGE_KEYS.lang) || DEFAULT_LANG);
  const T = (path, ...args) => tr(currentLang, path, ...args);
  const tripState = {
    destination: '',
    itinerary: [],
    plannerData: null,
    plannerContext: null
  };
  // Tracks fields still showing the built-in example content (not user-typed/saved),
  // so switching language can re-translate them instead of leaving stale text behind.
  let healUsesDefaultItin = false;
  let groupUsesDefaultMembers = false;

  // ---------- Static text translation ----------
  function applyStaticTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = T(key);
      if (el.dataset.i18nAttr) el.setAttribute(el.dataset.i18nAttr, val);
      else if (el.dataset.i18nHtml) el.innerHTML = val;
      else el.textContent = val;
    });
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
    loadProgress.innerHTML = T('connect.defaultHint');
    updateVoiceSupportLabel();
    updateMicHintIdle();
    populateVoices();
    if (healUsesDefaultItin) hItin.value = T('heal.defaultItinerary');
    if (groupUsesDefaultMembers) {
      membersDiv.innerHTML = '';
      T('group.defaultMembers').forEach(([n, p]) => addMemberRow(n, p));
    }
  }

  // ---------- Ollama connection ----------
  const serverUrlInput = document.getElementById('serverUrl');
  const modelSelect = document.getElementById('modelSelect');
  const statusDot = document.getElementById('statusDot');
  const loadProgress = document.getElementById('loadProgress');
  const loadModelBtn = document.getElementById('loadModelBtn');

  serverUrlInput.value = safeLoadString(STORAGE_KEYS.url) || 'http://localhost:11434';
  modelSelect.value = safeLoadString(STORAGE_KEYS.model) || 'llama3.2';

  function ollamaBase() {
    return (serverUrlInput.value.trim() || 'http://localhost:11434').replace(/\/+$/, '');
  }

  function setStatus(state, html) {
    statusDot.className = 'status-dot ' + (state === 'ready' ? 'status-ok' : state === 'loading' ? 'status-warn' : 'status-off');
    loadProgress.innerHTML = html != null ? html : T('connect.defaultHint');
  }

  loadModelBtn.addEventListener('click', checkConnection);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === currentLang) return;
      currentLang = normalizeLang(btn.dataset.lang);
      safeSaveString(STORAGE_KEYS.lang, currentLang);
      if (recognition) recognition.lang = T('speechLang');
      applyStaticTranslations();
    });
  });

  async function checkConnection() {
    safeSaveString(STORAGE_KEYS.url, serverUrlInput.value.trim());
    safeSaveString(STORAGE_KEYS.model, modelSelect.value.trim());
    loadModelBtn.disabled = true;
    setStatus('loading', T('connect.connecting'));
    try {
      const res = await fetch(`${ollamaBase()}/api/tags`);
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const data = await res.json();
      const names = (data.models || []).map(m => m.name);
      const model = modelSelect.value.trim();
      if (names.length === 0) {
        setStatus('off', T('connect.noModel', model || 'llama3.2'));
      } else if (!names.some(n => n === model || n.startsWith(model + ':'))) {
        setStatus('off', T('connect.modelMissing', names.join(', '), model));
      } else {
        setStatus('ready', T('connect.ready', model));
      }
    } catch (err) {
      setStatus('off', T('connect.failed', ollamaBase(), err.message));
    } finally {
      loadModelBtn.disabled = false;
    }
  }

  // ---------- Tabs ----------
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ---------- Local LLM call (Ollama server, chạy trên máy/mạng LAN, không cloud) ----------
  /**
   * Calls Ollama's /api/chat with streaming enabled so callers can show tokens as they
   * arrive instead of a spinner-then-everything-at-once. The 60s timeout is a rolling
   * "no new data" idle timeout (reset on every chunk), not a total-request cap — a
   * response that's steadily streaming shouldn't be killed just because it's long.
   */
  async function callClaude(system, userText, { json = false, onChunk } = {}) {
    const model = modelSelect.value.trim() || 'llama3.2';
    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText }
      ],
      stream: true
    };
    if (json) body.format = 'json';

    const controller = new AbortController();
    let timeoutId;
    const resetIdleTimeout = () => { clearTimeout(timeoutId); timeoutId = setTimeout(() => controller.abort(), 60000); };
    resetIdleTimeout();

    let res;
    try {
      res = await fetch(`${ollamaBase()}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error(T('errors.timeout'));
      throw new Error(T('errors.cannotConnect', ollamaBase()));
    }
    if (!res.ok) {
      clearTimeout(timeoutId);
      let msg = res.status + ' ' + res.statusText;
      try { const errJson = await res.json(); msg = errJson.error || msg; } catch (e) {}
      throw new Error(msg);
    }

    let text = '';
    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        let step;
        try {
          step = await reader.read();
        } catch (err) {
          if (err.name === 'AbortError') throw new Error(T('errors.timeout'));
          throw err;
        }
        if (step.done) break;
        resetIdleTimeout();
        buffer += decoder.decode(step.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const delta = extractChunkContent(line);
          if (delta) { text += delta; if (onChunk) onChunk(text); }
        }
      }
      const delta = extractChunkContent(buffer);
      if (delta) { text += delta; if (onChunk) onChunk(text); }
    } finally {
      clearTimeout(timeoutId);
    }

    if (json) return extractJson(text, currentLang);
    return text;
  }

  function streamPreview(el, loadingLabel) {
    return (partialText) => {
      el.innerHTML = `<div class="loading"><div class="spinner"></div>${loadingLabel}</div><pre class="stream-preview">${escapeHtml(partialText)}</pre>`;
    };
  }

  function setLoading(el, on, label) {
    if (on) el.innerHTML = `<div class="loading"><div class="spinner"></div>${label}</div>`;
  }
  function showError(el, err) {
    el.innerHTML = `<div class="error-box">⚠️ ${escapeHtml(err.message)}</div>`;
  }

  // ---------- TAB 1: Trip Planner ----------
  const pDest = document.getElementById('p-dest');
  const pDays = document.getElementById('p-days');
  const pBudget = document.getElementById('p-budget');
  const pGroup = document.getElementById('p-group');
  const pNotes = document.getElementById('p-notes');
  const pResult = document.getElementById('p-result');

  function getPlannerContext() {
    const fallback = tripState.plannerContext || {};
    return {
      destination: pDest.value.trim() || fallback.destination || tripState.destination || '',
      days: pDays.value || fallback.days || '',
      budget: pBudget.value || fallback.budget || T('common.unlimitedBudget'),
      group: pGroup.value.trim() || fallback.group || T('common.soloTraveler'),
      notes: pNotes.value.trim() || fallback.notes || ''
    };
  }

  function syncPlannerToSelfHealing() {
    const hDestEl = document.getElementById('h-dest');
    const hItinEl = document.getElementById('h-itin');
    if (hDestEl) hDestEl.value = tripState.destination || '';
    if (hItinEl) hItinEl.value = Array.isArray(tripState.itinerary) ? tripState.itinerary.join('\n') : '';
  }

  function updateTripStateFromPlannerData(data, context) {
    const itinerary = flattenActivities(data);
    tripState.destination = context.destination || tripState.destination || '';
    tripState.itinerary = itinerary;
    tripState.plannerData = data || null;
    tripState.plannerContext = {
      destination: context.destination || tripState.destination || '',
      days: context.days || '',
      budget: context.budget || T('common.unlimitedBudget'),
      group: context.group || T('common.soloTraveler'),
      notes: context.notes || ''
    };
    syncPlannerToSelfHealing();
  }

  function plannerInputs() {
    return { dest: pDest.value, days: pDays.value, budget: pBudget.value, group: pGroup.value, notes: pNotes.value };
  }
  function savePlannerState(extra) {
    safeSave(STORAGE_KEYS.planner, Object.assign(plannerInputs(), extra));
  }
  [pDest, pDays, pBudget, pGroup, pNotes].forEach(el => el.addEventListener('input', () => savePlannerState({})));

  (function restorePlanner() {
    const saved = safeLoad(STORAGE_KEYS.planner);
    if (!saved) return;
    if (saved.dest) pDest.value = saved.dest;
    if (saved.days) pDays.value = saved.days;
    if (saved.budget) pBudget.value = saved.budget;
    if (saved.group) pGroup.value = saved.group;
    if (saved.notes) pNotes.value = saved.notes;
    if (saved.data) {
      updateTripStateFromPlannerData(saved.data, {
        destination: saved.dest || '',
        days: saved.days || '',
        budget: saved.budget || '',
        group: saved.group || '',
        notes: saved.notes || ''
      });
      pResult.innerHTML = `<div class="result-box">${renderPlannerHtml(saved.data, saved.dest || '', currentLang)}</div>`;
    }
  })();

  document.getElementById('p-run').addEventListener('click', async () => {
    const dest = pDest.value.trim() || 'Okinawa';
    const days = pDays.value || 4;
    const budget = pBudget.value || T('common.unlimitedBudget');
    const group = pGroup.value.trim() || T('common.soloTraveler');
    const notes = pNotes.value.trim();
    setLoading(pResult, true, T('planner.loading'));

    const system = T('planner.systemPrompt');
    const user = tr(currentLang, 'planner.userPrompt', dest, days, budget, group, notes);

    try {
      const data = await callClaude(system, user, { json: true, onChunk: streamPreview(pResult, T('planner.loading')) });
      updateTripStateFromPlannerData(data, { destination: dest, days, budget, group, notes });
      pResult.innerHTML = `<div class="result-box">${renderPlannerHtml(data, dest, currentLang)}</div>`;
      savePlannerState({ data });
    } catch (err) { showError(pResult, err); }
  });

  // ---------- TAB 2: Group Matching ----------
  const membersDiv = document.getElementById('g-members');
  const gPlace = document.getElementById('g-place');
  const gResult = document.getElementById('g-result');
  const gDebate = document.getElementById('g-debate');

  function addMemberRow(name = '', pref = '') {
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `<input type="text" placeholder="${escapeHtml(T('group.memberNamePlaceholder'))}" class="g-name" value="${escapeHtml(name)}">
      <input type="text" placeholder="${escapeHtml(T('group.memberPrefPlaceholder'))}" class="g-pref" value="${escapeHtml(pref)}">
      <button type="button" class="secondary small g-remove">✕</button>`;
    row.querySelector('.g-remove').addEventListener('click', () => { row.remove(); groupUsesDefaultMembers = false; saveGroupState({}); });
    row.querySelector('.g-name').addEventListener('input', () => { groupUsesDefaultMembers = false; saveGroupState({}); });
    row.querySelector('.g-pref').addEventListener('input', () => { groupUsesDefaultMembers = false; saveGroupState({}); });
    membersDiv.appendChild(row);
  }

  function currentMembers() {
    return [...membersDiv.querySelectorAll('.member-row')].map(row => ({
      name: row.querySelector('.g-name').value.trim(),
      pref: row.querySelector('.g-pref').value.trim()
    })).filter(m => m.name);
  }
  function saveGroupState(extra) {
    safeSave(STORAGE_KEYS.group, Object.assign({ place: gPlace.value, members: currentMembers() }, extra));
  }

  const savedGroup = safeLoad(STORAGE_KEYS.group);
  if (savedGroup && Array.isArray(savedGroup.members) && savedGroup.members.length) {
    savedGroup.members.forEach(m => addMemberRow(m.name, m.pref));
  } else {
    groupUsesDefaultMembers = true;
    T('group.defaultMembers').forEach(([n, p]) => addMemberRow(n, p));
  }
  if (savedGroup && savedGroup.place) gPlace.value = savedGroup.place;
  if (savedGroup && savedGroup.data) {
    gResult.innerHTML = `<div class="result-box">${renderGroupScoreTableHtml(savedGroup.data, currentLang)}</div>`;
    renderDebate(savedGroup.data);
  }
  gPlace.addEventListener('input', () => saveGroupState({}));

  document.getElementById('g-addMember').addEventListener('click', () => { groupUsesDefaultMembers = false; addMemberRow(); saveGroupState({}); });

  function renderDebate(data) {
    gDebate.innerHTML = '';
    (data.debate || []).forEach(d => {
      const div = document.createElement('div');
      div.className = 'msg ai';
      div.innerHTML = `<strong>${escapeHtml(d.name || '')}:</strong> ${escapeHtml(d.comment || '')}`;
      gDebate.appendChild(div);
    });
    if (data.recommendation) {
      const div = document.createElement('div');
      div.className = 'msg user';
      div.innerHTML = `<strong>${T('common.aiFinal')}</strong> ${escapeHtml(data.recommendation)}`;
      gDebate.appendChild(div);
    }
  }

  document.getElementById('g-run').addEventListener('click', async () => {
    const place = gPlace.value.trim() || 'American Village';
    const members = currentMembers();
    setLoading(gResult, true, T('group.loading'));

    const system = T('group.systemPrompt');
    const user = tr(currentLang, 'group.userPrompt', place, members);
    gDebate.innerHTML = '';

    try {
      const data = await callClaude(system, user, { json: true, onChunk: streamPreview(gResult, T('group.loading')) });
      gResult.innerHTML = `<div class="result-box">${renderGroupScoreTableHtml(data, currentLang)}</div>`;
      renderDebate(data);
      saveGroupState({ data });
    } catch (err) { showError(gResult, err); }
  });

  // ---------- TAB 3: Voice Assistant ----------
  const vLog = document.getElementById('v-log');
  const micBtn = document.getElementById('v-mic');
  const vHint = document.getElementById('v-hint');
  let recognition = null;
  let recording = false;

  function updateMicHintIdle() {
    if (!recording && !vHint.dataset.locked) vHint.textContent = T('voice.micHintDefault');
  }
  function updateVoiceSupportLabel() {
    document.getElementById('voiceSupport').textContent = SpeechRecognitionCtor ? T('voice.supported') : T('voice.notSupported');
  }

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognitionCtor) {
    recognition = new SpeechRecognitionCtor();
    recognition.lang = T('speechLang');
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      let transcript = '';
      let isFinal = false;
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
        if (e.results[i].isFinal) isFinal = true;
      }
      document.getElementById('v-text').value = transcript;
      vHint.dataset.locked = '1';
      vHint.textContent = isFinal ? T('voice.heard', transcript) : T('voice.hearing', transcript);
      if (isFinal && transcript.trim()) sendVoiceQuery(transcript.trim());
    };
    recognition.onnomatch = () => { vHint.dataset.locked = '1'; vHint.textContent = T('voice.noMatch'); };
    recognition.onend = () => {
      recording = false;
      micBtn.classList.remove('recording');
      delete vHint.dataset.locked;
      updateMicHintIdle();
    };
    recognition.onerror = (e) => {
      recording = false;
      micBtn.classList.remove('recording');
      vHint.dataset.locked = '1';
      vHint.textContent = (T('voice.recognitionErrors')[e.error]) || (T('voice.micErrorPrefix') + e.error);
    };
  } else {
    micBtn.disabled = true;
  }

  // ---------- Chọn giọng đọc ----------
  const voiceSelect = document.getElementById('v-voice');
  const voiceHint = document.getElementById('v-voiceHint');
  let availableVoices = [];

  function populateVoices() {
    availableVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const prefix = T('speechVoicePrefix');
    const langVoices = availableVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
    const list = langVoices.length ? langVoices : availableVoices;
    const savedVoiceName = safeLoadString(STORAGE_KEYS.voiceName);

    voiceSelect.innerHTML = '';
    if (list.length === 0) {
      voiceSelect.innerHTML = '<option value="">—</option>';
      voiceHint.textContent = T('voice.noVoices');
      return;
    }
    list.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.name === savedVoiceName) opt.selected = true;
      voiceSelect.appendChild(opt);
    });
    if (!langVoices.length) {
      voiceHint.innerHTML = T('voice.noNativeVoices');
    } else {
      voiceHint.textContent = T('voice.voicesFound', langVoices.length);
    }
  }
  if (window.speechSynthesis) {
    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }
  voiceSelect.addEventListener('change', () => safeSaveString(STORAGE_KEYS.voiceName, voiceSelect.value));

  micBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (recording) { recognition.stop(); return; }
    recording = true;
    micBtn.classList.add('recording');
    vHint.dataset.locked = '1';
    vHint.textContent = T('voice.listening');
    recognition.lang = T('speechLang');
    recognition.start();
  });

  document.getElementById('v-send').addEventListener('click', () => {
    const text = document.getElementById('v-text').value.trim();
    if (text) sendVoiceQuery(text);
  });
  document.getElementById('v-text').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('v-send').click();
  });

  function saveVoiceLog() {
    const messages = [...vLog.querySelectorAll('.msg')].map(el => ({
      role: el.classList.contains('user') ? 'user' : 'ai',
      text: el.textContent
    })).slice(-VOICE_LOG_MAX);
    safeSave(STORAGE_KEYS.voiceLog, messages);
  }

  (function restoreVoiceLog() {
    const saved = safeLoad(STORAGE_KEYS.voiceLog);
    if (!Array.isArray(saved)) return;
    saved.forEach(m => addMsg(m.role, m.text, false));
  })();

  async function sendVoiceQuery(text) {
    addMsg('user', text);
    document.getElementById('v-text').value = '';
    const thinking = addMsg('ai', T('voice.thinking'));
    const startedAt = Date.now();
    const tickId = setInterval(() => {
      thinking.textContent = T('voice.thinkingTick', Math.round((Date.now() - startedAt) / 1000));
    }, 1000);
    const system = T('voice.systemPrompt');
    try {
      const reply = await callClaude(system, text, {
        onChunk: (partial) => { clearInterval(tickId); thinking.textContent = partial; }
      });
      clearInterval(tickId);
      thinking.textContent = reply;
      speak(reply);
      saveVoiceLog();
    } catch (err) {
      clearInterval(tickId);
      thinking.textContent = '⚠️ ' + err.message;
      saveVoiceLog();
    }
  }

  function addMsg(role, text, persist = true) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = text;
    vLog.appendChild(div);
    vLog.scrollTop = vLog.scrollHeight;
    if (persist) saveVoiceLog();
    return div;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const chosen = availableVoices.find(v => v.name === voiceSelect.value);
    if (chosen) { utter.voice = chosen; utter.lang = chosen.lang; }
    else { utter.lang = T('speechLang'); }
    utter.rate = 1.02;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  }

  // ---------- TAB 4: Self-Healing Itinerary ----------
  const hItin = document.getElementById('h-itin');
  const hDest = document.getElementById('h-dest');
  const hEvent = document.getElementById('h-event');
  const hResult = document.getElementById('h-result');

  function saveHealState(extra) {
    safeSave(STORAGE_KEYS.heal, Object.assign({ itin: hItin.value, dest: hDest.value, event: hEvent.value }, extra));
  }
  hItin.addEventListener('input', () => { healUsesDefaultItin = false; saveHealState({}); });
  [hDest, hEvent].forEach(el => el.addEventListener('input', () => saveHealState({})));

  (function restoreHeal() {
    const saved = safeLoad(STORAGE_KEYS.heal);
    if (saved) {
      if (saved.itin) hItin.value = saved.itin;
      if (saved.dest) hDest.value = saved.dest;
      if (saved.event) hEvent.value = saved.event;
      if (saved.data) {
        hResult.innerHTML = `<div class="result-box">${renderHealHtml(saved.data, currentLang)}</div>`;
      }
    } else {
      healUsesDefaultItin = true;
      hItin.value = T('heal.defaultItinerary');
    }
    if (!hDest.value && tripState.destination) hDest.value = tripState.destination;
    if ((!hItin.value || healUsesDefaultItin) && Array.isArray(tripState.itinerary) && tripState.itinerary.length) {
      hItin.value = tripState.itinerary.join('\n');
      healUsesDefaultItin = false;
    }
  })();

  document.getElementById('h-weather').addEventListener('click', async () => {
    const dest = hDest.value.trim();
    const statusEl = document.getElementById('h-weatherStatus');
    if (!dest) { statusEl.textContent = T('heal.needDest'); return; }
    statusEl.textContent = T('heal.lookingUp');
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=${encodeURIComponent(T('geocodeLang'))}&name=${encodeURIComponent(dest)}`);
      const geo = await geoRes.json();
      const place = geo.results && geo.results[0];
      if (!place) { statusEl.textContent = T('heal.notFound', dest); return; }

      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,precipitation`);
      const w = await wRes.json();
      const c = w.current;
      const desc = weatherDescription(c.weather_code, currentLang);
      hEvent.value = tr(currentLang, 'heal.weatherText', place.name, place.country, desc, c.temperature_2m, c.precipitation);
      statusEl.textContent = T('heal.weatherReady', c.time?.slice(11, 16) || '');
      saveHealState({});
    } catch (err) {
      statusEl.textContent = T('heal.weatherError', err.message);
    }
  });

  document.getElementById('h-run').addEventListener('click', async () => {
    const itin = hItin.value.split('\n').map(s => s.trim()).filter(Boolean);
    const event = hEvent.value.trim() || T('heal.defaultEvent');
    const plannerContext = getPlannerContext();
    const plannerData = tripState.plannerData || {
      days: [{ day: 1, activities: dedupePlanItems(itin) }],
      summary: ''
    };

    if (itin.length === 0) {
      hResult.innerHTML = `<div class="error-box">⚠️ ${escapeHtml(tr(currentLang, 'common.noResult'))}</div>`;
      return;
    }

    tripState.itinerary = dedupePlanItems(itin);
    tripState.destination = hDest.value.trim() || plannerContext.destination || tripState.destination;
    if (!tripState.plannerContext) tripState.plannerContext = plannerContext;
    setLoading(hResult, true, T('heal.loading'));
    const data = buildSelfHealingPlan(plannerData, itin, event, plannerContext);
    hResult.innerHTML = `<div class="result-box">${renderHealHtml(data, currentLang)}</div>`;
    saveHealState({ data });
  });

  // ---------- TAB 5: Camera AI ----------
  const cFile = document.getElementById('c-file');
  const cPreview = document.getElementById('c-preview');
  const cRun = document.getElementById('c-run');
  let cImageBase64 = null;

  cFile.addEventListener('change', () => {
    const file = cFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      cImageBase64 = reader.result.split(',')[1];
      cPreview.src = reader.result;
      cPreview.style.display = 'block';
      cRun.disabled = false;
    };
    reader.readAsDataURL(file);
  });

  cRun.addEventListener('click', async () => {
    if (!cImageBase64) return;
    const mode = document.getElementById('c-mode').value;
    const visionModel = document.getElementById('c-model').value.trim() || 'moondream';
    const resultEl = document.getElementById('c-result');

    try {
      setLoading(resultEl, true, T('camera.step1'));
      const captionPrompt = 'Describe this image in detail, mentioning any text you can see.';
      const caption = await callVision(captionPrompt, cImageBase64, visionModel);
      if (!caption || !caption.trim()) throw new Error(T('camera.noCaption', visionModel));

      const system = mode === 'food' ? T('camera.systemPromptFood') : T('camera.systemPromptLandmark');
      const text = await callClaude(system, tr(currentLang, 'camera.userPrompt', caption), {
        onChunk: streamPreview(resultEl, T('camera.step2'))
      });
      resultEl.innerHTML = `<div class="result-box">${escapeHtml(text)}</div><div class="summary-note">${T('camera.disclaimer', escapeHtml(visionModel))}</div>`;
    } catch (err) { showError(resultEl, err); }
  });

  async function callVision(prompt, imageBase64, model) {
    let res;
    try {
      res = await fetch(`${ollamaBase()}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt, images: [imageBase64] }],
          stream: false
        })
      });
    } catch (err) {
      throw new Error(T('errors.visionCannotConnect', ollamaBase()));
    }
    if (!res.ok) {
      let msg = res.status + ' ' + res.statusText;
      try { const errJson = await res.json(); msg = errJson.error || msg; } catch (e) {}
      if (/not found/i.test(msg)) msg += T('errors.modelNotFoundSuffix', model);
      throw new Error(msg);
    }
    const data = await res.json();
    return data.message?.content || '(no response)';
  }

  applyStaticTranslations();
}

})(typeof globalThis !== 'undefined' ? globalThis : this);
