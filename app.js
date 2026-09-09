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
    appSubtitle: 'AI giúp cả nhóm quyết định cùng nhau · chạy bằng Claude API qua proxy riêng · dùng được cả từ điện thoại trong cùng mạng',
    checkConnBtn: 'Kiểm tra kết nối',
    connect: {
      defaultHint: 'Cần chạy <code>claude-server</code> trước (xem README): copy <code>claude-server/config.example.json</code> thành <code>config.json</code>, dán API key Anthropic vào, rồi <code>npm install && npm start</code> trong thư mục đó. Xong thì bấm "Kiểm tra kết nối". Muốn dùng từ điện thoại: điện thoại phải cùng Wi-Fi với máy này, thay <code>localhost</code> ở ô Server bằng địa chỉ IP LAN của máy (VD: <code>http://192.168.3.23:8901</code>), và mở trang này trên điện thoại qua <code>http://192.168.3.23:8765/app.html</code>.',
      connecting: 'Đang kết nối tới claude-server...',
      noApiKey: '⚠️ Kết nối được tới claude-server nhưng chưa có API key — mở <code>claude-server/config.json</code>, dán API key Anthropic vào field "apiKey", rồi khởi động lại server.',
      ready: (model) => `✅ Đã kết nối, model "${model}" sẵn sàng qua Claude API.`,
      failed: (base, err) => `⚠️ Không kết nối được tới ${base}. Kiểm tra: claude-server đã chạy chưa (<code>npm start</code> trong thư mục <code>claude-server/</code>), đúng địa chỉ chưa. Lỗi: ${err}`
    },
    tabs: { planner: '🗺️ Lịch trình', group: '👥 Quyết định nhóm', voice: '🎙️ Trợ lý giọng nói', heal: '🌧️ Self-Healing', camera: '📷 Camera AI', diff: '🆚 Vì sao TravelAI' },
    common: {
      mapLink: '📍 Xem bản đồ',
      dayRouteLink: '🗺️ Xem lộ trình cả ngày',
      venueWarning: '⚠️ chưa xác minh giờ mở cửa',
      dayLabel: (n) => `Day ${n}`,
      noResult: 'Không có kết quả.',
      noChange: 'Không có thay đổi.',
      dayCountMismatch: (actual, requested) => `⚠️ Bạn yêu cầu ${requested} ngày nhưng AI chỉ tạo được ${actual} ngày. Thử bấm "Tạo lịch trình" lại lần nữa.`,
      aiFinal: '🤖 AI chốt:',
      copied: '✅ Đã copy lịch trình vào clipboard!',
      shareFailed: '⚠️ Không tự copy được — hãy chọn và copy đoạn văn bản dưới đây.',
      shareFallback: 'Chia sẻ native không được hỗ trợ trên http LAN/điện thoại này, nên app đã tự sao chép lịch trình vào clipboard.',
      sharedVia: 'Tạo bằng AI Travel Companion 🗺️',
      criteriaHeader: 'Tiêu chí',
      scoreHeader: 'Điểm',
      changesHeader: 'Thay đổi',
      newItineraryHeader: 'Lịch trình mới',
      plannerDisclaimer: '📍 Bấm "Xem bản đồ" để xem địa chỉ, giờ mở cửa thật và số điện thoại (nếu quán có đăng). ⚠️ AI không có dữ liệu thời gian thực nên <strong>không biết chắc quán có mở cửa vào giờ đó không</strong>, và thứ tự/khoảng cách di chuyển giữa các điểm chỉ là suy đoán chung của AI — <strong>không dựa trên dữ liệu giao thông hay bản đồ thời gian thực</strong>. Luôn kiểm tra qua Maps trước khi đến.',
      unlimitedBudget: 'không giới hạn',
      soloTraveler: 'một mình',
      close: 'Đóng',
      yen: 'yên',
      free: 'Miễn phí'
    },
    errors: {
      timeout: 'AI không phản hồi sau 60 giây — model có thể đang tải lần đầu (chậm hơn bình thường) hoặc máy đang quá tải. Thử lại, hoặc đổi model nhẹ hơn.',
      cannotConnect: (base) => `Không gọi được tới ${base}. Bấm "Kiểm tra kết nối" ở góc trên để chẩn đoán.`,
      visionCannotConnect: (base) => `Không gọi được tới ${base}. Kiểm tra claude-server đã chạy chưa (npm start trong thư mục claude-server/).`,
      noJson: 'AI không trả về dữ liệu dạng JSON như yêu cầu — model có thể quá nhỏ để tuân theo định dạng. Thử lại hoặc đổi sang model khác.',
      malformedJson: 'AI trả về JSON không hợp lệ (bị lỗi cú pháp giữa chừng). Thử lại hoặc đổi sang model khác.'
    },
    planner: {
      title: 'Tạo lịch trình tự động',
      destLabel: 'Điểm đến',
      daysLabel: 'Số ngày',
      startDateLabel: 'Ngày bắt đầu',
      budgetLabel: 'Ngân sách (yên / tổng)',
      budgetPlaceholder: '80000',
      groupLabel: 'Thành phần nhóm',
      groupPlaceholder: 'Vợ chồng + 1 bé 5 tuổi',
      notesLabel: 'Ghi chú thêm (phương tiện, sở thích...)',
      notesPlaceholder: 'Thuê xe, thích hải sản, thích biển',
      runBtn: 'Tạo lịch trình',
      shareBtn: '📤 Chia sẻ',
      loading: 'Đang tạo lịch trình...',
      systemPrompt: 'Bạn là AI Travel Companion, trợ lý lập kế hoạch du lịch cá nhân hóa. QUAN TRỌNG VỀ SỐ NGÀY: mảng "days" PHẢI có ĐỦ và ĐÚNG số ngày người dùng yêu cầu — không được rút gọn hay chỉ trả về 1 ngày nếu người dùng yêu cầu nhiều ngày hơn. Đánh số "day" liên tục từ 1 đến hết số ngày được yêu cầu, mỗi ngày một phần tử riêng trong mảng. Nếu có danh sách "Sở thích riêng từng thành viên" bên dưới, hãy cố gắng chọn hoạt động cân bằng, phù hợp với nhiều người trong nhóm nhất có thể — có thể xen kẽ hoạt động ưu tiên từng người qua các ngày khác nhau, không dồn hết vào sở thích của một người. Mỗi hoạt động là 1 object gồm "text" (tên địa điểm/quán cụ thể có thể tìm trên Google Maps, VD: "Ăn trưa tại Yunangi Okinawan Cuisine" thay vì chỉ "Lunch") và "price" (số nguyên, ước tính chi phí trung bình MỖI NGƯỜI cho hoạt động đó tính bằng yên — vé vào cửa, tiền ăn...; ghi 0 CHỈ khi hoạt động thực sự không tốn tiền như đi bộ, di chuyển, ngắm cảnh miễn phí ngoài trời — hoạt động ăn/uống tại một quán/nhà hàng/quán bar cụ thể GẦN NHƯ KHÔNG BAO GIỜ nên ghi 0, kể cả bữa sáng, luôn ước tính một mức giá hợp lý). Nếu bên dưới có mục "Dữ liệu tham khảo" liệt kê nhà hàng/địa điểm THẬT gần điểm đến, hãy ƯU TIÊN dùng ĐÚNG tên thật trong đó cho hoạt động ăn uống/tham quan tương ứng — TUYỆT ĐỐI không viết chung chung kiểu "ăn trưa gần đó" hay "một nhà hàng địa phương" khi đã có tên thật để dùng. Đây chỉ là ước tính hợp lý dựa trên hiểu biết chung, không phải giá thật đã kiểm chứng. Bạn KHÔNG có dữ liệu thời gian thực nên KHÔNG được khẳng định giờ mở cửa, địa chỉ, số điện thoại, hay tình trạng giao thông/khoảng cách di chuyển thực tế của bất kỳ địa điểm nào — thứ tự hoạt động chỉ nên dựa trên suy luận hợp lý chung (VD: bãi biển buổi chiều, ngắm hoàng hôn cuối ngày), không khẳng định là tối ưu về đường đi hay đã kiểm tra kẹt xe thật. Trả lời DUY NHẤT bằng JSON hợp lệ (giữ nguyên tên field tiếng Anh như trong schema, chỉ viết NỘI DUNG bằng tiếng Việt), không kèm text hay markdown code fence nào khác. Ví dụ schema cho chuyến 2 ngày (số phần tử trong "days" phải khớp đúng số ngày người dùng thực sự yêu cầu, không phải cố định theo ví dụ này):\n{"days":[{"day":1,"activities":[{"text":"Naha Airport","price":0},{"text":"Ăn trưa tại nhà hàng Yunangi","price":1500},{"text":"American Village","price":0},{"text":"Sunset Beach","price":0},{"text":"Ăn tối tại Steak House 88","price":3000}]},{"day":2,"activities":[{"text":"Churaumi Aquarium","price":2180},{"text":"Ăn trưa tại Motobu Umi Cafe","price":1200},{"text":"Cape Manzamo","price":0},{"text":"Ăn tối hải sản tại American Village Seafood House","price":3500}]}],"summary":"1-2 câu tổng kết về chi phí ước tính và lưu ý chính, nhắc người dùng kiểm tra giờ mở cửa thật trước khi đi"}',
      userPrompt: (dest, days, startDate, budget, group, notes, members, context) => `Lên lịch trình du lịch ${dest}, bắt đầu từ ngày ${startDate || 'chưa xác định'}, ĐÚNG ${days} ngày — mảng "days" phải có đủ ${days} phần tử, đánh số day từ 1 đến ${days}, không được thiếu ngày nào. Ngân sách: ${budget} yên. Nhóm: ${group}. ${notes ? 'Ghi chú: ' + notes : ''}\nSắp xếp hoạt động theo thứ tự hợp lý trong ngày (sáng/trưa/chiều/tối), phù hợp thời tiết chung của điểm đến, chi phí, và trải nghiệm phù hợp cả nhóm. Nếu ${startDate} là ngày du lịch cụ thể, hãy tính đến ngày nghỉ lễ, cuối tuần hoặc thời điểm đi để chọn hoạt động phù hợp. Không cần đảm bảo giờ mở cửa hay khoảng cách di chuyển chính xác vì bạn không có dữ liệu thời gian thực. Nhắc lại: PHẢI có đủ ${days} ngày trong kết quả.${(members && members.length) ? `\n\nSở thích riêng từng thành viên (hãy cân đối hoạt động để phù hợp với nhiều người nhất có thể, không chỉ ưu tiên một người):\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}` : ''}${context ? `\n\nDữ liệu tham khảo về nhà hàng/địa điểm THẬT gần ${dest} (RAG, từ knowledge base thật — ưu tiên dùng đúng tên từ đây thay vì viết chung chung):\n${context}` : ''}`,
      costSummaryTitle: '💰 Chi phí ước tính',
      costPerPersonLabel: 'Mỗi người',
      costTotalLabel: (count) => `Tổng cho ${count} người`,
      costDisclaimer: 'Ước tính từ AI dựa trên hiểu biết chung, chưa phải giá thật đã kiểm chứng — chỉ để chuẩn bị chi phí, không tính vé máy bay/khách sạn.',
      priceInferredTooltip: 'AI ban đầu ghi hoạt động này miễn phí, nhưng có vẻ không hợp lý (ăn uống tại quán) nên hệ thống tự thay bằng mức giá tối thiểu hợp lý hơn.'
    },
    group: {
      title: 'Chấm điểm địa điểm cho cả nhóm',
      placeLabel: 'Địa điểm cần đánh giá',
      placeEmptyOption: '-- Chọn địa điểm từ lịch trình --',
      placeNoItinerary: '-- Chưa có lịch trình, hãy tạo ở tab Lịch trình trước --',
      placeRequiredError: 'Vui lòng chọn địa điểm cần chấm điểm trước khi bấm "Chấm điểm phù hợp".',
      scoreHint: '👆 Bấm "Chấm điểm phù hợp" để xem nhận xét AI cho địa điểm này.',
      swapBtn: '🔄 Đổi địa điểm',
      swapLoading: 'Đang tìm địa điểm thay thế & chấm điểm lại...',
      swapNoCandidates: 'Hãy bấm "Chấm điểm phù hợp" trước để có dữ liệu tham khảo, rồi mới đổi địa điểm.',
      swapNoAlternative: 'Không tìm thấy địa điểm thay thế phù hợp trong dữ liệu tham khảo hiện có.',
      swapSuccess: (oldPlace, newPlace) => `✅ Đã đổi "${oldPlace}" thành "${newPlace}" và cập nhật lịch trình.`,
      membersLabel: 'Thành viên & sở thích',
      addMemberBtn: '+ Thêm thành viên',
      runBtn: 'Chấm điểm phù hợp',
      loading: 'Đang tra cứu dữ liệu & chấm điểm...',
      memberNamePlaceholder: 'Tên (VD: A)',
      memberPrefPlaceholder: 'Sở thích (VD: Hải sản, thích chụp ảnh)',
      defaultMembers: [['A', 'Hải sản'], ['B', 'Check-in, chụp ảnh'], ['C', 'Shopping'], ['D', 'Có trẻ em'], ['E', 'Orion Beer']],
      systemPrompt: 'Bạn là AI Group Matching Engine, đánh giá mức độ phù hợp của một địa điểm du lịch với sở thích từng thành viên trong nhóm, rồi mô phỏng ngắn gọn góc nhìn của từng người như một cuộc tranh luận thật trước khi AI chốt đề xuất. Nếu có "Dữ liệu tham khảo" bên dưới (giờ mở cửa, giá, đánh giá thật), hãy ưu tiên dùng thay vì đoán. Trả lời DUY NHẤT bằng JSON hợp lệ (giữ nguyên tên field tiếng Anh như trong schema, chỉ viết NỘI DUNG bằng tiếng Việt) theo schema:\n{"criteria":[{"name":"Food","score":9}],"debate":[{"name":"A","comment":"1 câu nêu góc nhìn/lo ngại của người này về địa điểm, xưng theo tên"}],"recommendation":"1-2 câu AI chốt phương án dung hòa cả nhóm, giải thích ngắn gọn vì sao"}\nĐiểm số theo thang 1-10, suy ra tiêu chí từ sở thích từng thành viên. Mỗi người trong "debate" phải có ý kiến khác nhau, phản ánh đúng sở thích riêng của họ (có thể khen hoặc chê tùy sở thích).',
      userPrompt: (place, members, context) => `Địa điểm: ${place}\nThành viên và sở thích:\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}${context ? `\n\nDữ liệu tham khảo (RAG, từ knowledge base thật):\n${context}` : ''}`,
      ragUsed: (sources) => `📚 Đã dùng dữ liệu từ: ${sources}`,
      ragNone: '📚 Không tìm thấy dữ liệu liên quan trong knowledge base (RAG server tắt hoặc chưa index) — AI sẽ tự suy đoán.',
      satisfactionTitle: '📊 Điểm hài lòng của nhóm',
      overallLabel: 'Chung',
      lowestWhy: (name) => `${name} đang có điểm thấp nhất — xem lý do trong phần xung đột bên dưới.`,
      conflictTitle: '⚠️ Phát hiện xung đột sở thích',
      severity: { low: 'Nhẹ', moderate: 'Vừa', high: 'Cao' },
      likeLabel: 'Thích',
      dislikeLabel: 'Không thích',
      reasonKeys: {
        conflictVegetarian: (name) => `${name} ăn chay, địa điểm này nghiêng về hải sản/thịt`,
        matchBudget: (name) => `${name} muốn tiết kiệm — giá phù hợp`,
        overBudget: (name) => `${name} muốn tiết kiệm — giá hơi cao`,
        matchLuxury: (name) => `${name} thích cao cấp — giá phù hợp`,
        tooBasic: (name) => `${name} thích cao cấp — chỗ này hơi bình dân`,
        matchKids: (name) => `${name} đi cùng trẻ em — nơi này thân thiện với trẻ em`,
        notKidFriendly: (name) => `${name} đi cùng trẻ em — nơi này chưa thân thiện với trẻ em`,
        matchTag: (name) => `${name} hợp sở thích với địa điểm này`
      },
      compromiseTitle: '💡 3 phương án thay vì 1 lựa chọn trung bình hoá',
      aiPick: '✓ AI đề xuất',
      optionLabel: (label) => `Phương án ${label}`,
      optionPro: (name, score) => `${name} hài lòng nhất (${score}%)`,
      optionCon: (name, score) => `${name} hài lòng ít nhất (${score}%)`,
      whyPicked: 'Không ai bị bỏ lại phía sau — điểm thấp nhất trong nhóm ở phương án này là cao nhất so với các phương án khác.',
      whyAlt: 'Điểm trung bình có thể cao, nhưng có thành viên hài lòng thấp hơn hẳn.',
      strategy: {
        safest: 'An toàn nhất',
        balanced: 'Hài lòng chung cao nhất',
        delight: 'Có người mê nhất'
      },
      blandCaveat: (maxScore) => `An toàn nhưng chưa ai thực sự hào hứng — điểm cao nhất trong nhóm ở phương án này mới ${maxScore}%.`,
      chooseBtn: 'Chọn phương án này',
      chosenLabel: '✓ Đã chọn',
      needPlanFirst: 'Hãy tạo lịch trình ở tab "Lịch trình" trước khi dùng Quyết định nhóm.',
      costPerPerson: (perPerson) => `≈ ${perPerson} yên/người`,
      costTotal: (total, count) => `tổng ≈ ${total} yên cho ${count} người`,
      whyTitle: (name) => `🧾 Vì sao chọn "${name}"?`,
      reasonPrefMatch: (count, total) => `${count}/${total} thành viên có sở thích khớp với địa điểm này`,
      reasonBudget: (price) => `Mức giá: ${price}`,
      reasonKidFriendly: 'Thân thiện với trẻ em',
      reasonRating: (rating) => `Đánh giá thật: ${rating}/5`,
      reasonAddress: (address) => `Địa chỉ: ${address}`
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
      systemPrompt: 'Bạn là trợ lý du lịch AI bằng giọng nói, thân thiện, trả lời ngắn gọn (2-4 câu), thực tế, như đang đề xuất trực tiếp cho người dùng đang ở gần đó (nhà hàng, địa điểm ngắm cảnh...). Trả lời bằng tiếng Việt, không dùng markdown.',
      buildBtn: '📅 Tạo lịch trình từ cuộc trò chuyện',
      buildHint: 'Trợ lý sẽ tự hỏi lại nếu cuộc trò chuyện còn thiếu thông tin (điểm đến, số ngày...) trước khi tạo lịch trình.',
      needConversation: 'Hãy kể cho mình nghe một chút về chuyến đi trước đã (muốn đi đâu, mấy ngày...), rồi bấm nút này để mình tạo lịch trình nhé.',
      extracting: 'Đang tổng hợp thông tin chuyến đi từ cuộc trò chuyện...',
      buildingItinerary: 'Đã đủ thông tin — đang tạo lịch trình...',
      itineraryReady: (dest, days) => `✅ Xong rồi! Lịch trình ${dest} (${days} ngày) đã sẵn sàng bên dưới, và cũng đã được đưa sang tab "Lịch trình".`,
      askDestination: 'Bạn muốn đi đâu để mình lên lịch trình giúp bạn nhé?',
      askDays: 'Chuyến đi này bạn định đi mấy ngày?',
      askBoth: 'Để lên được lịch trình, bạn cho mình biết thêm: bạn muốn đi đâu và đi mấy ngày nhé?',
      extractSystemPrompt: 'Bạn là bộ trích xuất thông tin lên kế hoạch du lịch từ hội thoại. Đọc đoạn hội thoại bên dưới (User = người dùng, Assistant = trợ lý), rồi trích xuất thông tin cần để tạo lịch trình. CHỈ điền giá trị khi người dùng đã nói rõ ràng, KHÔNG suy đoán hay bịa thêm — nếu chưa nhắc tới thì để chuỗi rỗng "" (hoặc null với "days"). Trả lời DUY NHẤT bằng JSON hợp lệ (giữ nguyên tên field tiếng Anh) theo đúng schema:\n{"destination":"","days":null,"startDate":"","budget":"","group":"","notes":""}',
      extractUserPrompt: (transcript) => `Hội thoại:\n${transcript}\n\nHãy trích xuất thông tin theo đúng schema JSON.`,
      buildTriggers: ['tạo lịch trình', 'lên lịch trình', 'lập lịch trình', 'chốt lịch trình', 'xây lịch trình', 'làm lịch trình', 'plan giúp tôi'],
      checklistTitle: 'Thông tin đã ghi nhận',
      checklistCaptured: (n, total) => `${n}/${total}`,
      checklistDest: 'Điểm đến',
      checklistDays: 'Số ngày',
      checklistStart: 'Ngày bắt đầu',
      checklistBudget: 'Ngân sách',
      checklistGroup: 'Nhóm đi cùng',
      checklistNotes: 'Ghi chú/sở thích',
      forceBuildBtn: 'Tạo lịch trình luôn (AI tự điền phần còn thiếu)',
      autoDestinationFallback: 'một điểm đến du lịch nổi tiếng do AI tự chọn phù hợp'
    },
    heal: {
      title: 'Lịch trình tự thay đổi',
      itinLabel: 'Lịch trình hiện tại (mỗi dòng 1 hoạt động)',
      itinPlaceholder: 'Day 1 | sáng | Beach\nDay 1 | tối | Outdoor BBQ\nDay 2 | chiều | Museum',
      itinFormatHint: 'Có thể nhập dạng nâng cao: Day/Ngày + buổi + hoạt động (VD: "Day 2 | chiều | Museum"). Nếu không nhập Day/buổi, app vẫn hiểu theo dạng mỗi dòng 1 hoạt động như cũ.',
      destLabel: 'Điểm đến (để lấy thời tiết thật)',
      eventLabel: 'Tình huống bất ngờ',
      eventPlaceholder: 'Buổi sáng mưa lớn',
      weatherBtn: '🌦️ Lấy thời tiết thật',
      runBtn: 'Cập nhật lịch trình',
      acceptBtn: 'Accept Plan vào Tab 1',
      acceptDisabledNoUpdate: 'Chưa có kế hoạch cập nhật để áp dụng. Hãy bấm "Cập nhật lịch trình" trước.',
      acceptDisabledAccepted: 'Kế hoạch này đã được áp dụng vào Tab 1.',
      acceptReady: 'Có kế hoạch cập nhật mới. Bấm Accept để ghi đè lịch trình Tab 1.',
      acceptDone: '✅ Đã áp dụng kế hoạch mới vào lịch trình Tab 1.',
      loading: 'Đang cập nhật lịch trình...',
      defaultItinerary: 'Beach\nSunset viewing\nOutdoor BBQ\nDinner ngoài trời',
      defaultEvent: 'Buổi sáng mưa lớn',
      needDest: '⚠️ Nhập điểm đến trước.',
      lookingUp: 'Đang tra vị trí và thời tiết thật...',
      notFound: (dest) => `⚠️ Không tìm thấy vị trí "${dest}".`,
      weatherText: (place, country, desc, temp, precip) => `Tại ${place}${country ? ', ' + country : ''} hiện đang ${desc}, ${temp}°C${precip > 0 ? `, lượng mưa ${precip}mm` : ''}.`,
      weatherForecastText: (date, desc, tempMax, precip) => `Dự báo: ${desc}, nhiệt độ cao nhất ${tempMax}°C${precip > 0 ? `, lượng mưa ${precip}mm` : ''}.`,
      weatherReady: (time) => `✅ Dữ liệu thật từ Open-Meteo, cập nhật lúc ${time}.`,
      weatherReadyForecast: (startDate, days) => `✅ Đã lấy dự báo theo chuyến đi từ ngày ${startDate} trong ${days} ngày.`,
      weatherFallbackCurrent: 'ℹ️ Chưa đủ dữ liệu ngày khởi hành/số ngày, nên đang dùng thời tiết hiện tại.',
      weatherError: (msg) => `⚠️ Không lấy được thời tiết: ${msg}`,
      incidentLabel: 'Tình huống:',
      planLabel: 'Bám theo plan Tab 1:',
      reasonPrefix: 'Lý do:',
      severityLabel: 'Mức độ:',
      satisfactionImpact: '📉 Tác động đến mức độ hài lòng nhóm',
      reasonStorm: 'Bão / gió lớn / mưa dông nên ưu tiên hoạt động trong nhà và gần nhau hơn',
      reasonRain: 'Mưa to khiến hoạt động ngoài trời không còn phù hợp',
      reasonHeat: 'Nắng nóng cực đoan, chuyển sang nơi có điều hòa',
      reasonWind: 'Thời tiết xấu khiến hoạt động ngoài trời nên được thay thế',
      reasonClosure: 'Điểm đến bị đóng cửa nên cần thay bằng phương án tương tự đang mở',
      reasonStrike: 'Sự cố đình công làm gián đoạn kế hoạch nên cần đổi hoạt động ít phụ thuộc vào tuyến bị ảnh hưởng',
      reasonTraffic: 'Kẹt xe/tắc đường nghiêm trọng nên ưu tiên hoạt động gần và dễ di chuyển hơn',
      reasonOverbook: 'Địa điểm hết chỗ nên cần thay bằng phương án tương đương còn chỗ',
      reasonHealth: 'Tình trạng sức khỏe không phù hợp hoạt động cường độ cao nên chuyển sang phương án nhẹ nhàng hơn',
      reasonDefault: 'Thời tiết xấu khiến hoạt động ngoài trời nên được thay thế',
      summaryDefault: 'Không có mô tả tình huống cụ thể.',
      summaryStorm: (text) => `Sự cố nghiêm trọng: ${text}`,
      summaryRain: (text) => `Thời tiết mưa: ${text}`,
      summaryHeat: (text) => `Thời tiết nóng / nắng: ${text}`,
      summaryWind: (text) => `Thời tiết gió mạnh: ${text}`,
      summaryClosure: (text) => `Địa điểm tạm ngừng hoạt động: ${text}`,
      summaryStrike: (text) => `Gián đoạn do đình công: ${text}`,
      summaryTraffic: (text) => `Kẹt xe / tắc đường: ${text}`,
      summaryOverbook: (text) => `Địa điểm đã kín chỗ: ${text}`,
      summaryHealth: (text) => `Vấn đề sức khỏe trong chuyến đi: ${text}`,
      impactAiTitle: '🧠 AI phân tích mức ảnh hưởng theo thành viên',
      impactAiSummary: 'Đánh giá tổng quan:',
      impactAiReason: 'Lý do:',
      impactAiAdvice: 'Gợi ý điều chỉnh:',
      impactAiChange: (before, after, diff) => `${before}% → ${after}% (${diff > 0 ? '+' : ''}${diff}%)`,
      impactAiTag: { positive: 'Tích cực', neutral: 'Trung tính', negative: 'Tiêu cực' },
      systemPrompt: 'Bạn là AI Self-Healing Itinerary Engine. Trả lời CHỈ JSON hợp lệ, không thêm văn bản. Viết nội dung tiếng Việt, giữ nguyên tên field tiếng Anh. Schema: {"updated_itinerary":["..."],"replacements":[{"original":"...","replacement":"...","reason":"..."}]}. Quy tắc: chỉ thay hoạt động bị ảnh hưởng; giữ nguyên hoạt động còn phù hợp; không thêm ngày/thời gian vào tên hoạt động.',
      userPrompt: (itin, event) => `Itinerary:\n${itin.map(i => '- ' + i).join('\n')}\nSituation: ${event}`
    },
    camera: {
      title: 'AI hiểu qua camera',
      modeLabel: 'Chế độ',
      modeFood: '🍜 Món ăn',
      modeLandmark: '🏯 Địa danh',
      fileLabel: 'Chụp hoặc chọn ảnh',
      runBtn: 'Phân tích ảnh',
      step1: 'Đang nhìn ảnh (bước 1/2)...',
      step2: 'Đang phân tích & viết câu trả lời (bước 2/2)...',
      noCaption: (model) => `${model} không trả về mô tả nào cho ảnh này — thử ảnh khác.`,
      fallbackUnknown: (model) => `${model} chưa xác định được nội dung ảnh rõ ràng. Đây là fallback an toàn: ảnh có thể quá mờ hoặc thiếu sáng. Hãy thử chụp lại với ánh sáng tốt hơn, không che chữ trên ảnh.`,
      fallbackFood: (guess) => `AI vision chưa đọc đủ chi tiết để khẳng định món ăn chắc chắn. Dựa trên mô tả hiện có, đây có thể là ${guess || 'một món ăn'} — thử chụp ảnh gần hơn, góc chụp rõ hơn và tránh ánh sáng quá tối.`,
      fallbackLandmark: (guess) => `AI vision chưa nhận diện được địa danh này một cách chắc chắn. Dựa trên mô tả hiện có, đây có thể là ${guess || 'một địa danh/công trình'} — thử chụp hình rộng hơn, rõ biển tên.`,
      fallbackAdvice: 'Nếu ảnh không ổn, hãy chụp lại ở góc sáng đủ, không che chữ trên biển hiệu/menu, và ưu tiên dùng ảnh rõ nét hơn.',
      disclaimer: (model) => `⚠️ AI vision (${model}) vẫn có thể nhận diện sai, đặc biệt với chữ trên ảnh (menu, biển hiệu) và món/địa danh ít phổ biến. Coi đây là gợi ý tham khảo, không phải kết luận chắc chắn.`,
      systemPromptFood: 'Bạn nhận được mô tả bằng tiếng Anh (từ 1 AI vision) về ảnh 1 món ăn. Dựa vào đó, viết bằng tiếng Việt: 1) Đây có thể là món gì. 2) Thành phần nhìn thấy. 3) Gợi ý 1-2 món tương tự đáng thử. KHÔNG bịa giá tiền/calories chính xác — nếu nhắc tới phải ghi rõ là ước tính. Nếu mô tả quá mơ hồ để đoán món, hãy nói thẳng là không chắc. Ngắn gọn, không markdown.',
      systemPromptLandmark: 'Bạn nhận được mô tả bằng tiếng Anh (từ 1 AI vision) về ảnh 1 địa danh/công trình. Dựa vào đó, viết bằng tiếng Việt: 1) Đây có thể là địa danh gì. 2) Vài nét lịch sử/văn hóa nếu bạn biết chắc. 3) Loại điểm tham quan tương tự gần đó. Nếu mô tả quá mơ hồ để nhận diện, nói thẳng là không chắc thay vì đoán bừa. Ngắn gọn, không markdown.',
      userPrompt: (caption) => `Mô tả từ AI vision: "${caption}"`
    },
    diff: {
      title: 'AI Travel Planner vs. TravelAI',
      subtitle: 'Không chỉ lên lịch trình — TravelAI giúp cả nhóm ra quyết định cùng nhau, và cho bạn thấy vì sao.',
      tradTitle: 'AI Travel Planner truyền thống',
      tradItems: [
        'Tối ưu theo sở thích của 1 người dùng nhập vào',
        'Ra đúng 1 lịch trình, chấp nhận hoặc bỏ qua',
        'Im lặng khi các thành viên trong nhóm bất đồng',
        '"AI đã quyết định" — không giải thích vì sao'
      ],
      usTitle: 'TravelAI',
      usItems: [
        'Tối ưu theo mức độ hài lòng chung của CẢ NHÓM',
        'Phát hiện xung đột sở thích, rồi đưa ra các đánh đổi thật',
        'Mỗi điểm số và mỗi thay đổi đều kèm lý do rõ ràng',
        'Tự điều chỉnh giữa chuyến đi mà không âm thầm bỏ rơi ai'
      ],
      mission: '"TravelAI không lên lịch trình — nó giúp nhóm du lịch ra quyết định tốt hơn cùng nhau, và cho từng thành viên thấy rõ tiếng nói của họ đã ảnh hưởng tới kết quả thế nào."',
      exampleTitle: '📊 Ví dụ thật từ chính bộ máy chấm điểm',
      exampleOldTag: 'Kiểu AI cá nhân hoá truyền thống',
      exampleOldText: '3 người tìm chỗ ăn ở Naha (thích hải sản / ăn chay / không quan trọng) — AI chọn nơi "trung bình an toàn": cả 3 người đều chỉ hài lòng 60%, không ai ghét nhưng cũng chẳng ai thực sự thích.',
      exampleNewTag: 'TravelAI',
      exampleNewText: 'Cùng dữ liệu đó, TravelAI tìm ra phương án khiến người thích hải sản đạt 78% hài lòng — đồng thời hiện rõ người ăn chay chỉ đạt 35% để nhóm tự cân nhắc đánh đổi, thay vì AI âm thầm quyết định thay cả nhóm.'
    },
    auth: {
      subtitle: 'Đăng nhập để tiếp tục',
      usernameLabel: 'Tên đăng nhập',
      passwordLabel: 'Mật khẩu',
      loginBtn: 'Đăng nhập',
      demoHint: 'Tài khoản demo: admin1 / user1 / user2 — mật khẩu 123123',
      logoutBtn: 'Đăng xuất',
      sessionExpired: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
      missingFields: 'Nhập đủ tên đăng nhập và mật khẩu.',
      connectError: (base) => `Không kết nối được tới auth server tại ${base}. Kiểm tra đã chạy "npm start" trong thư mục auth-server chưa.`,
      resultLocked: 'Đăng nhập để xem lịch trình đầy đủ và mời người khác cùng xem.'
    },
    admin: {
      tabLabel: '🛡️ Quản trị',
      title: '🛡️ Quản lý người dùng',
      addUserTitle: 'Thêm người dùng mới',
      usernameLabel: 'Tên đăng nhập',
      passwordLabel: 'Mật khẩu',
      roleLabel: 'Vai trò',
      roleUser: 'Người dùng',
      roleAdmin: 'Quản trị viên',
      addUserBtn: 'Thêm người dùng',
      deleteBtn: 'Xoá',
      confirmDelete: (name) => `Xoá tài khoản "${name}"? Không thể hoàn tác.`,
      addSuccess: (name) => `✅ Đã thêm "${name}".`,
      deleteSuccess: (name) => `✅ Đã xoá "${name}".`,
      missingFields: 'Nhập đủ tên đăng nhập và mật khẩu.',
      loadError: 'Không tải được danh sách người dùng — kiểm tra auth server đã chạy chưa.'
    },
    invite: {
      sectionTitle: '✉️ Mời người khác cùng xem lịch trình này',
      noOthers: 'Chưa có tài khoản nào khác để mời.',
      sendBtn: 'Gửi lời mời',
      sentSuccess: (names) => `✅ Đã gửi lời mời tới: ${names}.`,
      selectAtLeastOne: 'Chọn ít nhất 1 người để mời.',
      panelTitle: '✉️ Lời mời của bạn',
      empty: 'Chưa có lời mời nào.',
      from: (name) => `Từ: ${name}`,
      tripLine: (dest, days) => `${dest} — ${days} ngày`,
      useBtn: 'Dùng lịch trình này',
      dismissBtn: 'Bỏ qua',
      loadError: 'Không tải được lời mời — kiểm tra auth server đã chạy chưa.',
      usedSuccess: '✅ Đã áp dụng lịch trình từ lời mời vào tab Lịch trình.'
    },
    risk: {
      title: '🚦 Kiểm tra rủi ro chuyến đi',
      level: { low: 'Thấp', medium: 'Vừa', high: 'Cao' },
      type: { walking: 'Đi bộ nhiều', budget: 'Rủi ro ngân sách', transport: 'Di chuyển', weather: 'Thời tiết', geography: 'Khoảng cách di chuyển' },
      walkingHigh: (count) => `${count} hoạt động ngoài trời liên tiếp — nhóm có thể mệt, nên xen kẽ hoạt động trong nhà hoặc thêm thời gian nghỉ.`,
      walkingMedium: (count) => `${count} hoạt động ngoài trời trong danh sách — cân nhắc xen kẽ nghỉ ngơi.`,
      budgetHigh: (perDay) => `Ngân sách chỉ khoảng ${perDay} yên/ngày — khá eo hẹp so với chi phí du lịch Nhật Bản, dễ vượt ngân sách.`,
      budgetMedium: (perDay) => `Ngân sách khoảng ${perDay} yên/ngày — vừa đủ, nên ưu tiên các lựa chọn giá hợp lý.`,
      transportMedium: 'Nhiều hoạt động nhưng không có phương tiện di chuyển rõ ràng trong lịch trình — cân nhắc thuê xe hoặc đặt taxi trước.',
      weatherHigh: 'Thời tiết xấu nghiêm trọng — nhiều khả năng phải đổi kế hoạch giữa chừng.',
      weatherMedium: 'Thời tiết không thuận lợi — nên chuẩn bị phương án dự phòng trong nhà.',
      geographyHigh: (day, km) => `Ngày ${day}: có 2 điểm liên tiếp cách nhau tới ~${km}km — lịch trình có thể đang di chuyển vòng vèo không hợp lý, nên sắp xếp lại các hoạt động theo khu vực gần nhau.`,
      geographyMedium: (day, km) => `Ngày ${day}: có 2 điểm liên tiếp cách nhau ~${km}km — kiểm tra lại thời gian di chuyển thực tế giữa 2 điểm này trước khi đi.`
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
    appSubtitle: 'グループ全員で決める旅行をAIがサポート · 専用プロキシ経由でClaude APIを使用 · 同じネットワーク内ならスマホからも利用可',
    checkConnBtn: '接続確認',
    connect: {
      defaultHint: '先に <code>claude-server</code> を起動してください（README参照）：<code>claude-server/config.example.json</code> を <code>config.json</code> にコピーし、Anthropicの APIキーを貼り付けてから、そのフォルダで <code>npm install && npm start</code>。起動後「接続確認」を押してください。スマホから使う場合：スマホは同じWi-Fiに接続し、Server欄の <code>localhost</code> をこの端末のLAN IPアドレスに置き換え（例：<code>http://192.168.3.23:8901</code>）、スマホでは <code>http://192.168.3.23:8765/app.html</code> を開いてください。',
      connecting: 'claude-serverに接続中...',
      noApiKey: '⚠️ claude-serverには接続できましたが、APIキーが未設定です。<code>claude-server/config.json</code> を開き、「apiKey」欄にAnthropicのAPIキーを貼り付けてからサーバーを再起動してください。',
      ready: (model) => `✅ 接続済み、モデル「${model}」がClaude API経由で使用可能です。`,
      failed: (base, err) => `⚠️ ${base} に接続できません。claude-serverが起動しているか（<code>claude-server/</code> フォルダで <code>npm start</code>）、アドレスが正しいか確認してください。エラー内容：${err}`
    },
    tabs: { planner: '🗺️ 旅程', group: '👥 グループ決定', voice: '🎙️ 音声アシスタント', heal: '🌧️ 自動リカバリー', camera: '📷 カメラAI', diff: '🆚 TravelAIの違い' },
    common: {
      mapLink: '📍 地図を見る',
      dayRouteLink: '🗺️ 1日のルートを見る',
      venueWarning: '⚠️ 営業時間未確認',
      dayLabel: (n) => `${n}日目`,
      noResult: '結果がありません。',
      noChange: '変更はありません。',
      dayCountMismatch: (actual, requested) => `⚠️ ${requested}日間を指定しましたが、AIは${actual}日分しか作成しませんでした。もう一度「旅程を作成」を試してください。`,
      aiFinal: '🤖 AIの結論：',
      copied: '✅ 旅程をクリップボードにコピーしました！',
      shareFailed: '⚠️ 自動コピーできませんでした — 下のテキストを選択してコピーしてください。',
      shareFallback: 'このLAN HTTP/モバイル環境ではネイティブ共有が使えないため、アプリが旅程をクリップボードに自動コピーしました。',
      sharedVia: 'AI Travel Companionで作成 🗺️',
      criteriaHeader: '項目',
      scoreHeader: 'スコア',
      changesHeader: '変更点',
      newItineraryHeader: '新しい旅程',
      plannerDisclaimer: '📍 「地図を見る」で実際の住所・営業時間・電話番号（掲載があれば）を確認できます。⚠️ このAIはリアルタイム情報を持たないため、<strong>実際の営業時間は保証できません</strong>。また移動順序や距離はAIの一般的な推測であり、<strong>実際の交通・地図データには基づいていません</strong>。出発前に必ずMapsで確認してください。',
      unlimitedBudget: '無制限',
      soloTraveler: '一人旅',
      close: '閉じる',
      yen: '円',
      free: '無料'
    },
    errors: {
      timeout: 'AIが60秒以内に応答しませんでした — モデルの初回読み込みに時間がかかっているか、端末の負荷が高い可能性があります。再試行するか、より軽量なモデルに変更してください。',
      cannotConnect: (base) => `${base} に接続できませんでした。右上の「接続確認」で診断してください。`,
      visionCannotConnect: (base) => `${base} に接続できませんでした。claude-serverが起動しているか確認してください（claude-server/ で npm start）。`,
      noJson: 'AIが要求されたJSON形式でデータを返しませんでした — モデルが小さすぎて形式に従えない可能性があります。再試行するか、別のモデルに変更してください。',
      malformedJson: 'AIが返したJSONが不正な形式です（途中で構文エラー）。再試行するか、別のモデルに変更してください。'
    },
    planner: {
      title: '旅程を自動作成',
      destLabel: '目的地',
      daysLabel: '日数',
      startDateLabel: '開始日',
      budgetLabel: '予算（円・合計）',
      budgetPlaceholder: '80000',
      groupLabel: 'メンバー構成',
      groupPlaceholder: '夫婦 + 5歳の子供1人',
      notesLabel: '補足（交通手段・好みなど）',
      notesPlaceholder: 'レンタカー希望、魚介類が好き、海が好き',
      runBtn: '旅程を作成',
      shareBtn: '📤 共有',
      loading: '旅程を作成中...',
      systemPrompt: 'あなたはAI Travel Companion、パーソナライズされた旅行プランニングアシスタントです。日数について重要：「days」配列には、ユーザーが要求した日数と必ず同じ数の要素を含めてください — ユーザーが複数日を要求した場合に1日分だけ返すことは禁止です。「day」は要求された日数の分だけ1から連番で振ってください（配列の要素ごとに1日）。下に「メンバーごとの好み」の一覧がある場合は、できるだけ多くのメンバーに合うようバランス良くアクティビティを選んでください — 1人の好みだけに偏らせず、日ごとに優先するメンバーを変えても構いません。各アクティビティは"text"（Googleマップで検索できる具体的な店名・施設名。例：「昼食はランチのみ」ではなく「Yunangi Okinawan Cuisineで昼食」）と"price"（整数。そのアクティビティの1人あたりの概算費用を円で — 入場料や食事代など。0にしてよいのは徒歩移動や無料の屋外観光など本当に費用が発生しない場合のみ — 特定の店・レストラン・バーでの飲食は、朝食であっても0にせず、必ず妥当な金額を見積もってください）を持つオブジェクトにしてください。下に「参考データ」があり、目的地周辺の実在するレストラン・観光スポットが列挙されている場合は、そこにある実際の店名・施設名を該当する食事・観光アクティビティに優先して使ってください——実名が使える場合に「近くで昼食」や「地元のレストラン」のような曖昧な表現を書くことは絶対に避けてください。これは一般的な知識に基づくおおよその目安であり、確認済みの実価格ではありません。あなたはリアルタイム情報を持たないため、営業時間・住所・電話番号・実際の交通状況や移動距離を断定してはいけません — アクティビティの順序は一般的な妥当性（例：午後はビーチ、1日の終わりに夕日鑑賞）に基づく推測に留め、経路が最適化されている、または渋滞を確認したとは主張しないでください。必ずJSONのみで回答し（スキーマの英語フィールド名はそのまま維持し、内容は日本語で記述）、それ以外のテキストやMarkdownのコードフェンスは付けないでください。2日間の旅行のスキーマ例（「days」の要素数は必ずユーザーが実際に要求した日数に合わせること。この例の日数に固定しないこと）：\n{"days":[{"day":1,"activities":[{"text":"那覇空港","price":0},{"text":"Yunangi Okinawan Cuisineで昼食","price":1500},{"text":"American Village","price":0},{"text":"サンセットビーチ","price":0},{"text":"Steak House 88で夕食","price":3000}]},{"day":2,"activities":[{"text":"美ら海水族館","price":2180},{"text":"Motobu Umi Cafeで昼食","price":1200},{"text":"万座毛","price":0},{"text":"American Village Seafood Houseで海鮮の夕食","price":3500}]}],"summary":"概算費用と主な注意点についての1〜2文。出発前に実際の営業時間を確認するよう促すこと"}',
      userPrompt: (dest, days, startDate, budget, group, notes, members, context) => `${dest}への旅行プランを作成してください。開始日は${startDate || '未指定'}、日数は必ず${days}日間 — 「days」配列には${days}個の要素を含め、dayは1から${days}まで振ってください。欠けている日があってはいけません。予算：${budget}円。メンバー：${group}。${notes ? '補足：' + notes : ''}\n開始日${startDate || '未指定'}を踏まえて、連休・週末・祝日などの影響も考慮し、1日の中で時間帯（朝/昼/午後/夜）ごとに妥当な順序でアクティビティを配置し、目的地の一般的な気候、費用、グループ全員に合う体験を考慮してください。リアルタイム情報がないため、営業時間や正確な移動距離は保証しなくて構いません。念のため繰り返しますが、結果には必ず${days}日分すべてを含めてください。${(members && members.length) ? `\n\nメンバーごとの好み（できるだけ多くのメンバーに合うようバランス良く配置してください。1人だけに偏らないように）：\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}` : ''}${context ? `\n\n${dest}周辺の実在するレストラン・観光スポットの参考データ（RAG、実際のナレッジベースより — 曖昧な表現の代わりにここにある実名を優先して使ってください）：\n${context}` : ''}`,
      costSummaryTitle: '💰 概算費用',
      costPerPersonLabel: '一人あたり',
      costTotalLabel: (count) => `${count}人分の合計`,
      costDisclaimer: '一般的な知識に基づくAIの概算であり、確認済みの実価格ではありません — 予算準備の目安として。航空券・宿泊費は含みません。',
      priceInferredTooltip: 'AIは当初この項目を無料としていましたが、飲食を伴う内容のため不自然と判断し、より妥当な最低額に自動修正しました。'
    },
    group: {
      title: 'グループ全員向けにスポットを採点',
      placeLabel: '評価するスポット',
      placeEmptyOption: '-- 旅程からスポットを選択 --',
      placeNoItinerary: '-- 旅程がまだありません。先に旅程タブで作成してください --',
      placeRequiredError: '「適合度を採点」を押す前に、採点するスポットを選択してください。',
      scoreHint: '👆「適合度を採点」を押すと、このスポットについてのAIコメントが見られます。',
      swapBtn: '🔄 スポットを変更',
      swapLoading: '代わりのスポットを探して再採点中...',
      swapNoCandidates: '先に「適合度を採点」を押して参考データを取得してから、スポットを変更してください。',
      swapNoAlternative: '現在の参考データの中に、代わりになりそうなスポットが見つかりませんでした。',
      swapSuccess: (oldPlace, newPlace) => `✅「${oldPlace}」を「${newPlace}」に変更し、旅程を更新しました。`,
      membersLabel: 'メンバーと好み',
      addMemberBtn: '+ メンバーを追加',
      runBtn: '適合度を採点',
      loading: '採点中...',
      memberNamePlaceholder: '名前（例：A）',
      memberPrefPlaceholder: '好み（例：魚介類、写真撮影が好き）',
      defaultMembers: [['A', '魚介類'], ['B', '写真映え・チェックイン重視'], ['C', 'ショッピング'], ['D', '子供連れ'], ['E', 'オリオンビール']],
      systemPrompt: 'あなたはAI Group Matching Engineです。ある旅行スポットが、グループの各メンバーの好みにどれだけ合っているかを評価し、実際の議論のように各メンバーの視点を短くシミュレートしてから、AIとしての提案をまとめてください。下に「参考データ」があれば（営業時間・料金・実際のレビューなど）、推測より優先して使ってください。必ずJSONのみで回答してください（スキーマの英語フィールド名はそのまま維持し、内容は日本語で記述）。スキーマ：\n{"criteria":[{"name":"Food","score":9}],"debate":[{"name":"A","comment":"このスポットについてのこの人の視点・懸念を1文で、本人の立場で述べる"}],"recommendation":"グループ全員が納得できる落としどころをAIとして1〜2文で提案し、簡潔に理由も述べる"}\nスコアは1〜10段階で、各メンバーの好みから項目を推測してください。"debate"内の各メンバーは、それぞれの好みを反映した異なる意見を持つようにしてください（好みに応じて肯定的にも否定的にもなり得ます）。',
      userPrompt: (place, members, context) => `スポット：${place}\nメンバーと好み：\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}${context ? `\n\n参考データ（RAG、実際のナレッジベースより）：\n${context}` : ''}`,
      ragUsed: (sources) => `📚 使用したデータ元：${sources}`,
      ragNone: '📚 ナレッジベースに関連データが見つかりませんでした（RAGサーバーが停止しているか未インデックス）— AIが推測して回答します。',
      satisfactionTitle: '📊 グループ満足度スコア',
      overallLabel: '全体',
      lowestWhy: (name) => `${name}のスコアが最も低い — 理由は下の「衝突」で確認できます。`,
      conflictTitle: '⚠️ 好みの衝突を検出',
      severity: { low: '軽度', moderate: '中程度', high: '高い' },
      likeLabel: '好き',
      dislikeLabel: '苦手',
      reasonKeys: {
        conflictVegetarian: (name) => `${name}はベジタリアン — このスポットは海鮮・肉料理中心`,
        matchBudget: (name) => `${name}は節約志向 — 価格が合っている`,
        overBudget: (name) => `${name}は節約志向 — 価格がやや高い`,
        matchLuxury: (name) => `${name}は高級志向 — 価格が合っている`,
        tooBasic: (name) => `${name}は高級志向 — ここはややカジュアル`,
        matchKids: (name) => `${name}は子供連れ — ここは子供に優しい`,
        notKidFriendly: (name) => `${name}は子供連れ — ここは子供向けではない`,
        matchTag: (name) => `${name}の好みとこのスポットが合っている`
      },
      compromiseTitle: '💡 平均化した1案ではなく、3つの選択肢',
      aiPick: '✓ AIのおすすめ',
      optionLabel: (label) => `オプション${label}`,
      optionPro: (name, score) => `${name}が最も満足（${score}%）`,
      optionCon: (name, score) => `${name}が最も不満（${score}%）`,
      whyPicked: '誰も置き去りにしない — このオプションはグループ内の最低スコアが他の案より高い。',
      whyAlt: '平均は高いかもしれないが、著しく満足度が低いメンバーがいる。',
      strategy: {
        safest: '最も安全',
        balanced: '全体満足度が最も高い',
        delight: '誰かが一番気に入る'
      },
      blandCaveat: (maxScore) => `安全ですが、まだ誰も本当に気に入っていません — このオプションのグループ内最高スコアは${maxScore}%です。`,
      chooseBtn: 'このオプションを選ぶ',
      chosenLabel: '✓ 選択済み',
      needPlanFirst: 'グループ決定を使う前に、「旅程」タブで旅程を作成してください。',
      costPerPerson: (perPerson) => `≈ ${perPerson}円/人`,
      costTotal: (total, count) => `合計 ≈ ${total}円（${count}人分）`,
      whyTitle: (name) => `🧾 なぜ「${name}」を選んだのか？`,
      reasonPrefMatch: (count, total) => `${total}人中${count}人の好みがこのスポットと一致`,
      reasonBudget: (price) => `価格帯：${price}`,
      reasonKidFriendly: '子供連れに優しい',
      reasonRating: (rating) => `実際の評価：${rating}/5`,
      reasonAddress: (address) => `住所：${address}`
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
      systemPrompt: 'あなたはフレンドリーな音声旅行アシスタントです。簡潔（2〜4文）かつ実用的に、近くにいるユーザーに直接おすすめするように答えてください（レストラン、景勝地など）。日本語で、Markdownを使わずに答えてください。',
      buildBtn: '📅 会話から旅程を作成',
      buildHint: '旅程を作る前に、目的地や日数など情報が足りなければアシスタントが聞き返します。',
      needConversation: 'まずは旅行について少し話してください（どこに行きたいか、何日間かなど）。その後このボタンを押すと旅程を作成します。',
      extracting: '会話から旅行情報をまとめています...',
      buildingItinerary: '情報が揃いました — 旅程を作成中...',
      itineraryReady: (dest, days) => `✅ 完成しました！${dest}（${days}日間）の旅程が下に表示されています。「旅程」タブにも反映しました。`,
      askDestination: 'どこに行きたいか教えてもらえますか？旅程を作りますね。',
      askDays: 'この旅行は何日間の予定ですか？',
      askBoth: '旅程を作るために、行き先と日数を教えてください。',
      extractSystemPrompt: 'あなたは会話から旅行計画に必要な情報を抽出するツールです。以下の会話（User=ユーザー、Assistant=アシスタント）を読み、旅程作成に必要な情報を抽出してください。ユーザーが明確に述べた内容のみを埋め、推測や創作はしないでください — まだ触れられていない項目は空文字""（"days"はnull）にしてください。必ずJSONのみで回答してください（フィールド名は英語のまま）。スキーマ：\n{"destination":"","days":null,"startDate":"","budget":"","group":"","notes":""}',
      extractUserPrompt: (transcript) => `会話：\n${transcript}\n\n上記のスキーマ通りにJSONで情報を抽出してください。`,
      buildTriggers: ['旅程を作って', 'スケジュールを作って', 'プランを作って', '旅程作成', '旅程を作成'],
      checklistTitle: '取得済みの情報',
      checklistCaptured: (n, total) => `${n}/${total}`,
      checklistDest: '目的地',
      checklistDays: '日数',
      checklistStart: '開始日',
      checklistBudget: '予算',
      checklistGroup: '同行者',
      checklistNotes: 'メモ・好み',
      forceBuildBtn: 'このまま旅程を作成する（足りない部分はAIが補います）',
      autoDestinationFallback: 'AIが選ぶ人気の旅行先'
    },
    heal: {
      title: '旅程の自動リカバリー',
      itinLabel: '現在の旅程（1行に1つのアクティビティ）',
      itinPlaceholder: 'Day 1 | 朝 | Beach\nDay 1 | 夜 | Outdoor BBQ\nDay 2 | 午後 | Museum',
      itinFormatHint: '詳細入力にも対応: Day/日 + 時間帯 + アクティビティ（例: "Day 2 | 午後 | Museum"）。未指定の場合は従来通り1行1アクティビティとして扱います。',
      destLabel: '目的地（実際の天気を取得するため）',
      eventLabel: '突発的な状況',
      eventPlaceholder: '朝から大雨',
      weatherBtn: '🌦️ 実際の天気を取得',
      runBtn: '旅程を更新',
      acceptBtn: 'この計画をTab 1へ反映',
      acceptDisabledNoUpdate: '反映できる更新済みプランがありません。先に「旅程を更新」を実行してください。',
      acceptDisabledAccepted: 'このプランはすでにTab 1へ反映済みです。',
      acceptReady: '更新済みプランがあります。AcceptでTab 1の旅程を上書きします。',
      acceptDone: '✅ 新しいプランをTab 1の旅程に反映しました。',
      loading: '旅程を更新中...',
      defaultItinerary: 'ビーチ\n夕日鑑賞\n屋外バーベキュー\n屋外ディナー',
      defaultEvent: '朝から大雨',
      needDest: '⚠️ まず目的地を入力してください。',
      lookingUp: '位置情報と実際の天気を取得中...',
      notFound: (dest) => `⚠️ 「${dest}」の位置が見つかりません。`,
      weatherText: (place, country, desc, temp, precip) => `${place}${country ? '、' + country : ''}は現在${desc}、${temp}°C${precip > 0 ? `、降水量${precip}mm` : ''}です。`,
      weatherForecastText: (date, desc, tempMax, precip) => `予報: ${desc}、最高気温${tempMax}°C${precip > 0 ? `、降水量${precip}mm` : ''}。`,
      weatherReady: (time) => `✅ Open-Meteoの実データ、${time}時点。`,
      weatherReadyForecast: (startDate, days) => `✅ ${startDate}開始の${days}日間の予報を取得しました。`,
      weatherFallbackCurrent: 'ℹ️ 開始日または日数が不足しているため、現在の天気を使用しています。',
      weatherError: (msg) => `⚠️ 天気を取得できませんでした：${msg}`,
      incidentLabel: '状況：',
      planLabel: 'Tab 1 の計画に沿う：',
      reasonPrefix: '理由：',
      severityLabel: '重要度：',
      satisfactionImpact: '📉 グループ満足度への影響',
      reasonStorm: '大雨・強風・雷雨のため、屋内で近い場所を優先する',
      reasonRain: '雨が強く、屋外アクティビティが適さない',
      reasonHeat: '猛暑のため、冷房のある場所に切り替える',
      reasonWind: '風が強く、屋外の予定を変更する必要がある',
      reasonClosure: '施設の休業により、営業中の近い代替案に置き換える必要がある',
      reasonStrike: 'ストライキで計画が不安定なため、影響を受けにくい活動へ変更する',
      reasonTraffic: '深刻な渋滞のため、近距離で移動しやすい活動を優先する',
      reasonOverbook: '満席・予約不可のため、同等の代替先に変更する',
      reasonHealth: '体調を考慮し、負荷の低い活動へ切り替える',
      reasonDefault: '悪天候のため、屋外の予定を変更する必要がある',
      summaryDefault: '具体的な状況の説明はありません。',
      summaryStorm: (text) => `重大な状況: ${text}`,
      summaryRain: (text) => `雨天: ${text}`,
      summaryHeat: (text) => `猛暑: ${text}`,
      summaryWind: (text) => `強風: ${text}`,
      summaryClosure: (text) => `施設クローズ: ${text}`,
      summaryStrike: (text) => `ストライキによる影響: ${text}`,
      summaryTraffic: (text) => `渋滞・交通障害: ${text}`,
      summaryOverbook: (text) => `満席・予約不可: ${text}`,
      summaryHealth: (text) => `体調トラブル: ${text}`,
      impactAiTitle: '🧠 メンバー別の影響をAI分析',
      impactAiSummary: '総合評価:',
      impactAiReason: '理由:',
      impactAiAdvice: '調整提案:',
      impactAiChange: (before, after, diff) => `${before}% → ${after}% (${diff > 0 ? '+' : ''}${diff}%)`,
      impactAiTag: { positive: 'プラス', neutral: '中立', negative: 'マイナス' },
      systemPrompt: 'あなたはAI Self-Healing Itinerary Engineです。必ず有効なJSONのみを返してください（説明文禁止）。内容は日本語、フィールド名は英語のまま。Schema: {"updated_itinerary":["..."],"replacements":[{"original":"...","replacement":"...","reason":"..."}]}. ルール: 影響を受ける活動だけ置換し、問題ない活動は維持。活動名に日付や時刻を付けない。',
      userPrompt: (itin, event) => `Itinerary:\n${itin.map(i => '- ' + i).join('\n')}\nSituation: ${event}`
    },
    camera: {
      title: 'カメラでAI認識',
      modeLabel: 'モード',
      modeFood: '🍜 料理',
      modeLandmark: '🏯 観光地',
      fileLabel: '写真を撮影または選択',
      runBtn: '画像を分析',
      step1: '画像を確認中（ステップ1/2）...',
      step2: '分析して回答を作成中（ステップ2/2）...',
      noCaption: (model) => `${model}がこの画像の説明を返しませんでした — 別の画像を試してください。`,
      fallbackUnknown: (model) => `${model}はこの画像の中身をはっきり認識できませんでした。これは安全側のフォールバックです。画像がぼやけている、または暗すぎる可能性があります。明るい場所で再撮影し、看板やメニューの文字が隠れないようにしてください。`,
      fallbackFood: (guess) => `Vision AIは料理の細部を十分に読み取れず、断定はできませんでした。現時点の情報からすると、これは${guess || '料理'}の可能性が高いです。より近くで、角度を変えて、明るく撮影した画像を試してください。`,
      fallbackLandmark: (guess) => `Vision AIはこの場所を確実に識別できませんでした。現時点の情報からすると、これは${guess || '観光地・建造物'}の可能性が高いです。看板や全景を入れて再撮影してください。`,
      fallbackAdvice: '画像がうまく読めない場合は、曖昧な画角を避け、建物名・看板・食べ物の輪郭がはっきり見える写真を選びましょう。',
      disclaimer: (model) => `⚠️ Vision AI（${model}）は誤認識しやすく、特に画像内の文字（メニューや看板）やマイナーな料理・観光地では精度が落ちます。参考程度に留め、断定的な結論とはみなさないでください。`,
      systemPromptFood: '英語で書かれた画像の説明（Vision AIによるもの）を受け取ります。それをもとに日本語で次を書いてください：1) これは何の料理と考えられるか。2) 見える材料。3) 似ていて試す価値のある料理を1〜2つ提案。価格やカロリーを正確に断定しないでください — 触れる場合は概算であることを明記してください。説明が曖昧すぎて判断できない場合は、正直に「確信が持てない」と伝えてください。簡潔に、Markdownなしで。',
      systemPromptLandmark: '英語で書かれた画像の説明（Vision AIによるもの）を受け取ります。それをもとに日本語で次を書いてください：1) これは何の観光地・建造物と考えられるか。2) 確かな情報があれば歴史・文化的背景を少し。3) 近くにありそうな似た種類の観光スポット。説明が曖昧すぎて識別できない場合は、当てずっぽうで答えず正直に「確信が持てない」と伝えてください。簡潔に、Markdownなしで。',
      userPrompt: (caption) => `Vision AIによる説明：「${caption}」`
    },
    diff: {
      title: '従来のAI旅行プランナー vs. TravelAI',
      subtitle: '旅程を作るだけでなく、グループ全員が一緒に決断できるよう、その理由まで見せます。',
      tradTitle: '従来のAI Travel Planner',
      tradItems: [
        '入力した1人のユーザーの好みだけを最適化',
        '旅程は1つだけ — 受け入れるか諦めるか',
        'グループ内で意見が割れても何も示さない',
        '「AIが決めました」— 理由の説明がない'
      ],
      usTitle: 'TravelAI',
      usItems: [
        'グループ全員の満足度の合計を最適化',
        '好みの衝突を検出し、実際のトレードオフを提示',
        'すべてのスコアと変更に明確な理由が付く',
        '旅行中も誰かを置き去りにせず調整し続ける'
      ],
      mission: '「TravelAIは旅程を作るだけのツールではありません。旅行グループがより良い決断を一緒に下せるよう支援し、一人ひとりの声が結果にどう反映されたかを明確に示します。」',
      exampleTitle: '📊 実際のスコアリングエンジンによる実例',
      exampleOldTag: '従来型の個人最適化AI',
      exampleOldText: '那覇で食事場所を探す3人（海鮮好き／ベジタリアン／こだわりなし）— 従来のAIは「無難な平均」を選び、3人とも満足度はわずか60%。誰も不満はないが、誰も本当に満足していない。',
      exampleNewTag: 'TravelAI',
      exampleNewText: '同じデータでTravelAIは、海鮮好きのメンバーが78%の満足度を得られる選択肢を見つけ出し、同時にベジタリアンのメンバーは35%であることも明示する — AIが勝手にグループの代わりに決めるのではなく、グループ自身がトレードオフを判断できるようにする。'
    },
    auth: {
      subtitle: '続けるにはログインしてください',
      usernameLabel: 'ユーザー名',
      passwordLabel: 'パスワード',
      loginBtn: 'ログイン',
      demoHint: 'デモ用アカウント：admin1 / user1 / user2 — パスワード 123123',
      logoutBtn: 'ログアウト',
      sessionExpired: 'セッションの有効期限が切れました。もう一度ログインしてください。',
      missingFields: 'ユーザー名とパスワードを入力してください。',
      connectError: (base) => `認証サーバー（${base}）に接続できません。auth-server フォルダで "npm start" を実行したか確認してください。`,
      resultLocked: '旅程を全部見る、他の人を招待するにはログインしてください。'
    },
    admin: {
      tabLabel: '🛡️ 管理',
      title: '🛡️ ユーザー管理',
      addUserTitle: '新しいユーザーを追加',
      usernameLabel: 'ユーザー名',
      passwordLabel: 'パスワード',
      roleLabel: '権限',
      roleUser: '一般ユーザー',
      roleAdmin: '管理者',
      addUserBtn: 'ユーザーを追加',
      deleteBtn: '削除',
      confirmDelete: (name) => `アカウント「${name}」を削除しますか？元に戻せません。`,
      addSuccess: (name) => `✅「${name}」を追加しました。`,
      deleteSuccess: (name) => `✅「${name}」を削除しました。`,
      missingFields: 'ユーザー名とパスワードを入力してください。',
      loadError: 'ユーザー一覧を取得できません — auth server が起動しているか確認してください。'
    },
    invite: {
      sectionTitle: '✉️ この旅程を他の人にも見てもらう',
      noOthers: '招待できる他のアカウントがまだありません。',
      sendBtn: '招待を送る',
      sentSuccess: (names) => `✅ 招待を送りました：${names}`,
      selectAtLeastOne: '招待する相手を1人以上選んでください。',
      panelTitle: '✉️ あなた宛ての招待',
      empty: '招待はまだありません。',
      from: (name) => `送信者：${name}`,
      tripLine: (dest, days) => `${dest} — ${days}日間`,
      useBtn: 'この旅程を使う',
      dismissBtn: '無視する',
      loadError: '招待を取得できません — auth server が起動しているか確認してください。',
      usedSuccess: '✅ 招待の旅程を「旅程」タブに反映しました。'
    },
    risk: {
      title: '🚦 旅程のリスクチェック',
      level: { low: '低い', medium: '中程度', high: '高い' },
      type: { walking: '徒歩が多い', budget: '予算リスク', transport: '移動手段', weather: '天候', geography: '移動距離' },
      walkingHigh: (count) => `屋外アクティビティが${count}件連続しています — グループが疲れる可能性があるため、屋内アクティビティや休憩を挟むことをおすすめします。`,
      walkingMedium: (count) => `旅程に屋外アクティビティが${count}件あります — 休憩を挟むことを検討してください。`,
      budgetHigh: (perDay) => `予算が1日あたり約${perDay}円と、日本旅行の費用としてはやや厳しめです。予算オーバーに注意してください。`,
      budgetMedium: (perDay) => `予算は1日あたり約${perDay}円 — ちょうど良い水準です。コストパフォーマンスの良い選択を優先してください。`,
      transportMedium: 'アクティビティは多いですが、旅程に明確な移動手段がありません — レンタカーやタクシーの事前手配を検討してください。',
      weatherHigh: '深刻な悪天候です — 旅程の途中変更が必要になる可能性が高いです。',
      weatherMedium: '天候が良くありません — 屋内の代替プランを準備しておくとよいでしょう。',
      geographyHigh: (day, km) => `${day}日目：連続する2つのスポットが約${km}km離れています — 旅程が非効率な移動ルートになっている可能性があります。近い場所同士でまとめ直すことをおすすめします。`,
      geographyMedium: (day, km) => `${day}日目：連続する2つのスポットが約${km}km離れています — 出発前に実際の移動時間を確認してください。`
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
    appSubtitle: 'The AI that helps your group decide together · runs on Claude API via a local proxy · usable from your phone on the same network',
    checkConnBtn: 'Check connection',
    connect: {
      defaultHint: 'You need <code>claude-server</code> running first (see README): copy <code>claude-server/config.example.json</code> to <code>config.json</code>, paste in an Anthropic API key, then run <code>npm install && npm start</code> in that folder. Then click "Check connection". To use it from your phone: your phone must be on the same Wi-Fi, replace <code>localhost</code> in the Server field with this machine\'s LAN IP address (e.g. <code>http://192.168.3.23:8901</code>), and open this page on your phone via <code>http://192.168.3.23:8765/app.html</code>.',
      connecting: 'Connecting to claude-server...',
      noApiKey: '⚠️ Connected to claude-server, but no API key is set yet — open <code>claude-server/config.json</code>, paste an Anthropic API key into the "apiKey" field, then restart the server.',
      ready: (model) => `✅ Connected, model "${model}" is ready via the Claude API.`,
      failed: (base, err) => `⚠️ Couldn't connect to ${base}. Check that claude-server is running (<code>npm start</code> in the <code>claude-server/</code> folder) and the address is correct. Error: ${err}`
    },
    tabs: { planner: '🗺️ Itinerary', group: '👥 Group Decision', voice: '🎙️ Voice Assistant', heal: '🌧️ Self-Healing', camera: '📷 Camera AI', diff: '🆚 Why TravelAI' },
    common: {
      mapLink: '📍 View map',
      dayRouteLink: '🗺️ View full-day route',
      venueWarning: '⚠️ hours not verified',
      dayLabel: (n) => `Day ${n}`,
      noResult: 'No results.',
      noChange: 'No changes.',
      dayCountMismatch: (actual, requested) => `⚠️ You asked for ${requested} days but the AI only generated ${actual}. Try clicking "Create itinerary" again.`,
      aiFinal: '🤖 AI\'s call:',
      copied: '✅ Itinerary copied to clipboard!',
      shareFailed: '⚠️ Could not auto-copy — select and copy the text below manually.',
      shareFallback: 'Native sharing is not supported on this LAN HTTP/mobile browser, so the app copied the itinerary to the clipboard instead.',
      sharedVia: 'Made with AI Travel Companion 🗺️',
      criteriaHeader: 'Criteria',
      scoreHeader: 'Score',
      changesHeader: 'Changes',
      newItineraryHeader: 'Updated itinerary',
      plannerDisclaimer: '📍 Click "View map" to see the real address, opening hours, and phone number (if listed). ⚠️ This AI has no real-time data, so it <strong>cannot confirm whether a place is actually open at that time</strong>, and the ordering/distance between stops is just the AI\'s general guess — <strong>not based on real traffic or map data</strong>. Always double-check on Maps before you go.',
      unlimitedBudget: 'unlimited',
      soloTraveler: 'solo',
      close: 'Close',
      yen: 'JPY',
      free: 'Free'
    },
    errors: {
      timeout: "The AI didn't respond within 60 seconds — the model might be loading for the first time (slower than usual), or the machine is under heavy load. Try again, or switch to a lighter model.",
      cannotConnect: (base) => `Couldn't reach ${base}. Click "Check connection" up top to diagnose.`,
      visionCannotConnect: (base) => `Couldn't reach ${base}. Check that claude-server is running (npm start in the claude-server/ folder).`,
      noJson: "The AI didn't return the JSON it was asked for — the model might be too small to follow the format. Try again or switch to a different model.",
      malformedJson: 'The AI returned invalid JSON (a syntax error partway through). Try again or switch to a different model.'
    },
    planner: {
      title: 'Create an itinerary',
      destLabel: 'Destination',
      daysLabel: 'Number of days',
      startDateLabel: 'Start date',
      budgetLabel: 'Budget (JPY / total)',
      budgetPlaceholder: '80000',
      groupLabel: 'Group composition',
      groupPlaceholder: 'Couple + 1 child (age 5)',
      notesLabel: 'Notes (transport, preferences...)',
      notesPlaceholder: 'Renting a car, love seafood, love the beach',
      runBtn: 'Create itinerary',
      shareBtn: '📤 Share',
      loading: 'Creating itinerary...',
      systemPrompt: 'You are AI Travel Companion, a personalized trip-planning assistant. IMPORTANT ABOUT DAY COUNT: the "days" array MUST contain exactly as many elements as the number of days the user asked for — never collapse a multi-day trip down to just 1 day. Number "day" consecutively from 1 through the requested number of days, one array element per day. If a "Per-member preferences" list is given below, try to balance activities across as many members as possible — you can favor a different member on different days rather than optimizing for just one person. Every activity should be an object with "text" (a specific place/venue that can be looked up on Google Maps, e.g. "Lunch at Yunangi Okinawan Cuisine" instead of just "Lunch") and "price" (an integer — the rough per-person cost of that activity in JPY: entry ticket, meal, etc.; only use 0 when the activity truly costs nothing, like walking between stops or free outdoor sightseeing — eating or drinking at a specific restaurant/bar should almost never be 0, even breakfast, always estimate a reasonable amount). If a "Reference data" section is given below listing real restaurants/attractions near the destination, PREFER using the actual names from it for the matching meal/sightseeing activities — never write a vague placeholder like "lunch nearby" or "a local restaurant" when a real name is available. This is only a reasonable estimate from general knowledge, not a verified real price. You have NO real-time data, so you must NOT assert opening hours, addresses, phone numbers, or real traffic conditions/travel distances for any place — the order of activities should only reflect general reasonable judgment (e.g. beach in the afternoon, sunset viewing at the end of the day), and you must not claim the route is optimized or that you checked real traffic. Reply with ONLY valid JSON (keep the English field names exactly as in the schema, write the CONTENT in English), with no other text or markdown code fences. Example schema for a 2-day trip (the number of elements in "days" must match whatever number of days the user actually asked for, not this example\'s count):\n{"days":[{"day":1,"activities":[{"text":"Naha Airport","price":0},{"text":"Lunch at Yunangi Okinawan Cuisine","price":1500},{"text":"American Village","price":0},{"text":"Sunset Beach","price":0},{"text":"Dinner at Steak House 88","price":3000}]},{"day":2,"activities":[{"text":"Churaumi Aquarium","price":2180},{"text":"Lunch at Motobu Umi Cafe","price":1200},{"text":"Cape Manzamo","price":0},{"text":"Seafood dinner at American Village Seafood House","price":3500}]}],"summary":"1-2 sentences summarizing estimated cost and key notes, reminding the user to verify real opening hours before going"}',
      userPrompt: (dest, days, startDate, budget, group, notes, members, context) => `Plan a trip to ${dest} starting on ${startDate || 'an unspecified date'} for EXACTLY ${days} days — the "days" array must contain ${days} elements, numbered day 1 through ${days}, with no day missing. Budget: ${budget} JPY. Group: ${group}. ${notes ? 'Notes: ' + notes : ''}\nConsider holidays, weekends, and the time of year represented by ${startDate || 'the chosen trip start date'} when ordering activities through the day (morning/midday/afternoon/evening), fitting the destination's general climate, cost, and group-friendly experiences. Since you do not have real-time data, you do not need to guarantee opening hours or exact travel distances. To be clear: the result must include all ${days} days.${(members && members.length) ? `\n\nPer-member preferences (balance activities to fit as many members as possible, don't optimize for just one person):\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}` : ''}${context ? `\n\nReference data on real restaurants/attractions near ${dest} (RAG, from the real knowledge base — prefer the actual names in it over a vague placeholder):\n${context}` : ''}`,
      costSummaryTitle: '💰 Estimated cost',
      costPerPersonLabel: 'Per person',
      costTotalLabel: (count) => `Total for ${count} people`,
      costDisclaimer: "AI estimate from general knowledge, not a verified real price — just to help you prepare a budget. Doesn't include flights or accommodation.",
      priceInferredTooltip: "The AI originally marked this as free, but that didn't seem realistic for something food/drink-related, so a more reasonable minimum was substituted automatically."
    },
    group: {
      title: 'Score a place for the whole group',
      placeLabel: 'Place to evaluate',
      placeEmptyOption: '-- Select a place from the itinerary --',
      placeNoItinerary: '-- No itinerary yet, create one in the Itinerary tab first --',
      placeRequiredError: 'Please select a place to score before clicking "Score fit".',
      scoreHint: '👆 Click "Score fit" to see the AI\'s take on this place.',
      swapBtn: '🔄 Swap place',
      swapLoading: 'Finding a replacement place & re-scoring...',
      swapNoCandidates: 'Click "Score fit" first to load reference data, then swap the place.',
      swapNoAlternative: 'No suitable replacement place found in the current reference data.',
      swapSuccess: (oldPlace, newPlace) => `✅ Swapped "${oldPlace}" for "${newPlace}" and updated the itinerary.`,
      membersLabel: 'Members & preferences',
      addMemberBtn: '+ Add member',
      runBtn: 'Score fit',
      loading: 'Scoring...',
      memberNamePlaceholder: 'Name (e.g. A)',
      memberPrefPlaceholder: 'Preference (e.g. seafood, loves photos)',
      defaultMembers: [['A', 'Seafood'], ['B', 'Check-ins, photos'], ['C', 'Shopping'], ['D', 'Traveling with kids'], ['E', 'Orion Beer']],
      systemPrompt: 'You are the AI Group Matching Engine. Assess how well a travel spot fits each group member\'s preferences, then briefly simulate each person\'s perspective like a real discussion before the AI settles on a recommendation. If "Reference data" is given below (real opening hours, prices, reviews), prefer it over guessing. Reply with ONLY valid JSON (keep the English field names exactly as in the schema, write the CONTENT in English) matching this schema:\n{"criteria":[{"name":"Food","score":9}],"debate":[{"name":"A","comment":"One sentence giving this person\'s perspective/concern about the place, in their own voice"}],"recommendation":"1-2 sentences where the AI settles on a compromise that works for the whole group, with a brief reason"}\nScore on a 1-10 scale, inferring criteria from each member\'s preferences. Each person in "debate" should have a different opinion reflecting their own preference (can be positive or negative depending on their taste).',
      userPrompt: (place, members, context) => `Place: ${place}\nMembers and preferences:\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}${context ? `\n\nReference data (RAG, from the real knowledge base):\n${context}` : ''}`,
      ragUsed: (sources) => `📚 Used data from: ${sources}`,
      ragNone: '📚 No related data found in the knowledge base (RAG server is off or not indexed yet) — the AI will guess instead.',
      satisfactionTitle: '📊 Group satisfaction score',
      overallLabel: 'Overall',
      lowestWhy: (name) => `${name} has the lowest score — see why in the conflict below.`,
      conflictTitle: '⚠️ Preference conflict detected',
      severity: { low: 'Low', moderate: 'Moderate', high: 'High' },
      likeLabel: 'Like',
      dislikeLabel: 'Dislike',
      reasonKeys: {
        conflictVegetarian: (name) => `${name} is vegetarian — this place leans seafood/meat`,
        matchBudget: (name) => `${name} wants to save money — price fits`,
        overBudget: (name) => `${name} wants to save money — price runs a bit high`,
        matchLuxury: (name) => `${name} prefers upscale — price fits`,
        tooBasic: (name) => `${name} prefers upscale — this place is a bit casual`,
        matchKids: (name) => `${name} is traveling with kids — this place is kid-friendly`,
        notKidFriendly: (name) => `${name} is traveling with kids — this place isn't kid-friendly`,
        matchTag: (name) => `${name}'s preference matches this place`
      },
      compromiseTitle: '💡 Three options instead of one averaged pick',
      aiPick: '✓ AI pick',
      optionLabel: (label) => `Option ${label}`,
      optionPro: (name, score) => `${name} is most satisfied (${score}%)`,
      optionCon: (name, score) => `${name} is least satisfied (${score}%)`,
      whyPicked: 'Nobody is left behind — this option\'s lowest member score beats every other option\'s.',
      whyAlt: 'The average may be higher, but at least one member scores notably lower.',
      strategy: {
        safest: 'Safest pick',
        balanced: 'Best overall fit',
        delight: "Someone's favorite"
      },
      blandCaveat: (maxScore) => `Safe, but nobody is genuinely excited yet — the highest score in the group for this option is only ${maxScore}%.`,
      chooseBtn: 'Choose this option',
      chosenLabel: '✓ Chosen',
      needPlanFirst: 'Build an itinerary on the "Itinerary" tab before using Group Decision.',
      costPerPerson: (perPerson) => `≈ ¥${perPerson}/person`,
      costTotal: (total, count) => `≈ ¥${total} total for ${count} people`,
      whyTitle: (name) => `🧾 Why "${name}"?`,
      reasonPrefMatch: (count, total) => `${count} of ${total} members' preferences match this place`,
      reasonBudget: (price) => `Price range: ${price}`,
      reasonKidFriendly: 'Kid-friendly',
      reasonRating: (rating) => `Real rating: ${rating}/5`,
      reasonAddress: (address) => `Address: ${address}`
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
      systemPrompt: 'You are a friendly AI voice travel assistant. Answer briefly (2-4 sentences) and practically, as if recommending something directly to a user nearby (a restaurant, a scenic spot...). Reply in English, without markdown.',
      buildBtn: '📅 Build itinerary from this conversation',
      buildHint: 'The assistant will ask follow-up questions first if the conversation is missing details (destination, number of days...) before building the itinerary.',
      needConversation: "Tell me a bit about the trip first (where you want to go, how many days...), then tap this button and I'll build the itinerary.",
      extracting: 'Gathering trip details from the conversation...',
      buildingItinerary: 'Got everything needed — building the itinerary...',
      itineraryReady: (dest, days) => `✅ Done! The ${dest} itinerary (${days} days) is ready below, and has also been added to the "Itinerary" tab.`,
      askDestination: 'Where would you like to go? I can put together an itinerary for you.',
      askDays: 'How many days is this trip?',
      askBoth: 'To build an itinerary, tell me: where do you want to go, and for how many days?',
      extractSystemPrompt: 'You extract trip-planning details from a conversation. Read the conversation below (User = the traveler, Assistant = the assistant), then extract the information needed to build an itinerary. ONLY fill in a value when the user has clearly stated it — do NOT guess or invent anything; leave unmentioned fields as an empty string "" (or null for "days"). Reply with ONLY valid JSON (keep the English field names) matching this schema:\n{"destination":"","days":null,"startDate":"","budget":"","group":"","notes":""}',
      extractUserPrompt: (transcript) => `Conversation:\n${transcript}\n\nExtract the information as JSON matching the schema.`,
      buildTriggers: ['build the itinerary', 'create the itinerary', 'make an itinerary', 'plan my trip', 'generate itinerary', 'build my itinerary'],
      checklistTitle: 'Captured so far',
      checklistCaptured: (n, total) => `${n}/${total}`,
      checklistDest: 'Destination',
      checklistDays: 'Days',
      checklistStart: 'Start date',
      checklistBudget: 'Budget',
      checklistGroup: 'Travel group',
      checklistNotes: 'Notes/preferences',
      forceBuildBtn: "Build it anyway (AI fills in what's missing)",
      autoDestinationFallback: "a popular destination of the AI's choosing"
    },
    heal: {
      title: 'Self-healing itinerary',
      itinLabel: 'Current itinerary (one activity per line)',
      itinPlaceholder: 'Day 1 | morning | Beach\nDay 1 | evening | Outdoor BBQ\nDay 2 | afternoon | Museum',
      itinFormatHint: 'Advanced format is supported: Day + time slot + activity (e.g. "Day 2 | afternoon | Museum"). If omitted, each line is still treated as one activity as before.',
      destLabel: 'Destination (to fetch real weather)',
      eventLabel: 'Unexpected situation',
      eventPlaceholder: 'Heavy rain in the morning',
      weatherBtn: '🌦️ Fetch real weather',
      runBtn: 'Update itinerary',
      acceptBtn: 'Accept Plan to Tab 1',
      acceptDisabledNoUpdate: 'No updated plan is available to apply. Run "Update itinerary" first.',
      acceptDisabledAccepted: 'This plan has already been applied to Tab 1.',
      acceptReady: 'An updated plan is ready. Click Accept to overwrite Tab 1 itinerary.',
      acceptDone: '✅ Updated plan applied to Tab 1 itinerary.',
      loading: 'Updating itinerary...',
      defaultItinerary: 'Beach\nSunset viewing\nOutdoor BBQ\nOutdoor dinner',
      defaultEvent: 'Heavy rain in the morning',
      needDest: '⚠️ Enter a destination first.',
      lookingUp: 'Looking up location and real weather...',
      notFound: (dest) => `⚠️ Couldn't find a location for "${dest}".`,
      weatherText: (place, country, desc, temp, precip) => `${place}${country ? ', ' + country : ''} currently has ${desc}, ${temp}°C${precip > 0 ? `, ${precip}mm of precipitation` : ''}.`,
      weatherForecastText: (date, desc, tempMax, precip) => `Forecast: ${desc}, max ${tempMax}°C${precip > 0 ? `, precipitation ${precip}mm` : ''}.`,
      weatherReady: (time) => `✅ Real data from Open-Meteo, updated at ${time}.`,
      weatherReadyForecast: (startDate, days) => `✅ Pulled forecast for the trip window starting ${startDate} (${days} days).`,
      weatherFallbackCurrent: 'ℹ️ Missing trip start date/day count, so current weather is used instead.',
      weatherError: (msg) => `⚠️ Couldn't fetch weather: ${msg}`,
      incidentLabel: 'Situation:',
      planLabel: 'Based on Tab 1 plan:',
      reasonPrefix: 'Reason:',
      severityLabel: 'Severity:',
      satisfactionImpact: '📉 Impact on group satisfaction',
      reasonStorm: 'Heavy rain / strong wind / thunderstorm means indoor and compact alternatives are preferred',
      reasonRain: 'Heavy rain makes the outdoor activity unsuitable',
      reasonHeat: 'Extreme heat means moving to air-conditioned places',
      reasonWind: 'Strong wind makes the outdoor activity unsuitable',
      reasonClosure: 'The venue is closed, so it should be swapped for a similar open option',
      reasonStrike: 'A strike disruption makes this plan unreliable, so switch to less-affected options',
      reasonTraffic: 'Severe traffic disruption means preferring closer and easier-to-reach activities',
      reasonOverbook: 'The venue is fully booked, so replace it with an equivalent available option',
      reasonHealth: 'The health condition makes high-intensity activities unsuitable, so use gentler options',
      reasonDefault: 'Bad weather means the outdoor activity should be replaced',
      summaryDefault: 'There is no specific incident description.',
      summaryStorm: (text) => `Severe incident: ${text}`,
      summaryRain: (text) => `Rainy conditions: ${text}`,
      summaryHeat: (text) => `Heatwave: ${text}`,
      summaryWind: (text) => `Strong wind: ${text}`,
      summaryClosure: (text) => `Venue closure: ${text}`,
      summaryStrike: (text) => `Strike disruption: ${text}`,
      summaryTraffic: (text) => `Traffic disruption: ${text}`,
      summaryOverbook: (text) => `Venue overbooked: ${text}`,
      summaryHealth: (text) => `Health issue during the trip: ${text}`,
      impactAiTitle: '🧠 AI impact analysis by member',
      impactAiSummary: 'Overall assessment:',
      impactAiReason: 'Reason:',
      impactAiAdvice: 'Adjustment advice:',
      impactAiChange: (before, after, diff) => `${before}% → ${after}% (${diff > 0 ? '+' : ''}${diff}%)`,
      impactAiTag: { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' },
      systemPrompt: 'You are the AI Self-Healing Itinerary Engine. Return valid JSON only, no prose. Keep English field names. Schema: {"updated_itinerary":["..."],"replacements":[{"original":"...","replacement":"...","reason":"..."}]}. Rules: replace only affected activities, keep unaffected ones unchanged, and do not prepend dates/times to activity text.',
      userPrompt: (itin, event) => `Itinerary:\n${itin.map(i => '- ' + i).join('\n')}\nSituation: ${event}`
    },
    camera: {
      title: 'AI understands via camera',
      modeLabel: 'Mode',
      modeFood: '🍜 Food',
      modeLandmark: '🏯 Landmark',
      fileLabel: 'Take or choose a photo',
      runBtn: 'Analyze image',
      step1: 'Looking at the image (step 1/2)...',
      step2: 'Analyzing and writing a reply (step 2/2)...',
      noCaption: (model) => `${model} returned no description for this image — try a different image.`,
      fallbackUnknown: (model) => `${model} could not confidently identify the image. This is a safe fallback: the photo may be blurry or poorly lit. Try taking a sharper photo with better lighting, and avoid blocking any text.`,
      fallbackFood: (guess) => `The vision model could not read enough detail to be certain. Based on the current description, this is likely ${guess || 'a dish'} — try a closer, brighter shot and avoid glare or dark corners for better recognition.`,
      fallbackLandmark: (guess) => `The vision model could not confidently identify this place. Based on the current description, this is likely ${guess || 'a landmark/building'} — try a wider shot with visible signage.`,
      fallbackAdvice: 'If the image is still unclear, capture a cleaner photo with more contrast, visible signage, and better lighting.',
      disclaimer: (model) => `⚠️ The vision AI (${model}) can misidentify things easily, especially text in the image (menus, signs) and less common dishes/landmarks. Treat this as a reference suggestion, not a firm conclusion.`,
      systemPromptFood: "You receive an English description (from a vision AI) of a photo of a dish. Based on it, write in English: 1) What this dish might be. 2) Visible ingredients. 3) 1-2 similar dishes worth trying. Do NOT make up exact prices/calories — if you mention them, clearly label them as estimates. If the description is too vague to guess, say plainly that you're not sure. Keep it brief, no markdown.",
      systemPromptLandmark: "You receive an English description (from a vision AI) of a photo of a landmark/structure. Based on it, write in English: 1) What this landmark might be. 2) A bit of history/culture if you're confident about it. 3) Similar types of attractions likely nearby. If the description is too vague to identify, say plainly that you're not sure instead of guessing. Keep it brief, no markdown.",
      userPrompt: (caption) => `Description from vision AI: "${caption}"`
    },
    diff: {
      title: 'Traditional AI Travel Planner vs. TravelAI',
      subtitle: "It's not just about building an itinerary — TravelAI helps the whole group decide together, and shows you why.",
      tradTitle: 'Traditional AI Travel Planner',
      tradItems: [
        "Optimizes for one traveler's stated preferences",
        'One itinerary — take it or leave it',
        'Stays silent when the group disagrees',
        '"AI decided" — no reasoning shown'
      ],
      usTitle: 'TravelAI',
      usItems: [
        "Optimizes for the whole group's combined satisfaction",
        'Surfaces conflicts, then offers real trade-offs',
        'Every score and swap ships with its reasoning',
        "Adapts mid-trip without silently losing anyone's fit"
      ],
      mission: '"TravelAI doesn\'t plan trips — it helps travel groups make better decisions together, and shows every member exactly how their voice shaped the result."',
      exampleTitle: '📊 A real example from the actual scoring engine',
      exampleOldTag: 'Traditional personalized AI',
      exampleOldText: "3 people looking for a place to eat in Naha (a seafood lover / a vegetarian / no strong preference) — a typical AI picks the \"safe average\": all 3 land at just 60% satisfaction. Nobody's unhappy, but nobody's genuinely happy either.",
      exampleNewTag: 'TravelAI',
      exampleNewText: "With the same data, TravelAI surfaces an option where the seafood lover reaches 78% satisfaction — while clearly showing the vegetarian member only reaches 35%, so the group decides the trade-off themselves instead of the AI quietly deciding for them."
    },
    auth: {
      subtitle: 'Log in to continue',
      usernameLabel: 'Username',
      passwordLabel: 'Password',
      loginBtn: 'Log in',
      demoHint: 'Demo accounts: admin1 / user1 / user2 — password 123123',
      logoutBtn: 'Log out',
      sessionExpired: 'Your session has expired — please log in again.',
      missingFields: 'Enter both a username and a password.',
      connectError: (base) => `Could not reach the auth server at ${base}. Check that you ran "npm start" in the auth-server folder.`,
      resultLocked: 'Log in to see the full itinerary and invite others to view it.'
    },
    admin: {
      tabLabel: '🛡️ Admin',
      title: '🛡️ Manage users',
      addUserTitle: 'Add a new user',
      usernameLabel: 'Username',
      passwordLabel: 'Password',
      roleLabel: 'Role',
      roleUser: 'User',
      roleAdmin: 'Admin',
      addUserBtn: 'Add user',
      deleteBtn: 'Delete',
      confirmDelete: (name) => `Delete account "${name}"? This can't be undone.`,
      addSuccess: (name) => `✅ Added "${name}".`,
      deleteSuccess: (name) => `✅ Deleted "${name}".`,
      missingFields: 'Enter both a username and a password.',
      loadError: "Couldn't load the user list — check that the auth server is running."
    },
    invite: {
      sectionTitle: '✉️ Invite others to see this itinerary',
      noOthers: 'No other accounts to invite yet.',
      sendBtn: 'Send invite',
      sentSuccess: (names) => `✅ Invite sent to: ${names}.`,
      selectAtLeastOne: 'Pick at least one person to invite.',
      panelTitle: '✉️ Your invites',
      empty: 'No invites yet.',
      from: (name) => `From: ${name}`,
      tripLine: (dest, days) => `${dest} — ${days} days`,
      useBtn: 'Use this itinerary',
      dismissBtn: 'Dismiss',
      loadError: "Couldn't load invites — check that the auth server is running.",
      usedSuccess: '✅ Applied the itinerary from that invite to the Itinerary tab.'
    },
    risk: {
      title: '🚦 Travel risk check',
      level: { low: 'Low', medium: 'Medium', high: 'High' },
      type: { walking: 'Excessive walking', budget: 'Budget risk', transport: 'Transportation', weather: 'Weather', geography: 'Travel distance' },
      walkingHigh: (count) => `${count} outdoor activities back to back — the group may get tired, consider mixing in indoor activities or extra rest.`,
      walkingMedium: (count) => `${count} outdoor activities in this itinerary — consider spacing them with breaks.`,
      budgetHigh: (perDay) => `Budget is only about ¥${perDay}/day — tight for travel costs in Japan, easy to go over.`,
      budgetMedium: (perDay) => `Budget is about ¥${perDay}/day — reasonable, prioritize good-value options.`,
      transportMedium: 'Many activities but no clear transportation in the itinerary — consider arranging a rental car or taxi ahead of time.',
      weatherHigh: 'Severe bad weather — the plan will likely need a mid-trip change.',
      weatherMedium: "Weather isn't great — prepare an indoor backup plan.",
      geographyHigh: (day, km) => `Day ${day}: two consecutive stops are ~${km}km apart — the itinerary may be zigzagging inefficiently; consider grouping nearby activities together instead.`,
      geographyMedium: (day, km) => `Day ${day}: two consecutive stops are ~${km}km apart — double-check the real travel time between them before you go.`
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

// Google's public "Universal URL" directions scheme reliably renders up to ~10 total stops
// (origin + destination + waypoints) without an API key; a day with more stops than that still gets
// a route, just capped to the first 10 — better than the link silently failing to render at all.
const MAX_DAY_ROUTE_STOPS = 10;

/**
 * Builds a single Google Maps "get directions" URL chaining every activity of one day in order —
 * the day-by-day route view, as opposed to mapLink()'s one-place-at-a-time search link. Returns null
 * when there are fewer than 2 named stops (no meaningful route to draw for a single-activity day).
 */
function buildDayRouteMapUrl(activities, context) {
  const names = (activities || []).map(a => plannerActivityText(a)).filter(Boolean).slice(0, MAX_DAY_ROUTE_STOPS);
  if (names.length < 2) return null;
  const withContext = n => (context ? `${n}, ${context}` : n);
  const origin = encodeURIComponent(withContext(names[0]));
  const destination = encodeURIComponent(withContext(names[names.length - 1]));
  const middle = names.slice(1, -1).map(n => encodeURIComponent(withContext(n))).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (middle) url += `&waypoints=${middle}`;
  return url;
}

function venueWarning(text, lang) {
  const keywords = tr(lang, 'venueKeywords');
  const t = String(text).toLowerCase();
  if (Array.isArray(keywords) && keywords.some(k => t.includes(k.toLowerCase()))) {
    return ` <span class="warn-badge" title="${escapeHtml(tr(lang, 'common.venueWarning'))}">${tr(lang, 'common.venueWarning')}</span>`;
  }
  return '';
}

// Leading "8:00-9:00、" / "午後4:00-6:00、" / "早 morning 8:00-9:00、"-style time-range prefixes some
// itineraries embed directly in the activity string, ahead of the actual place/venue name.
const TIME_RANGE_PREFIX_RE = /^.*?\d{1,2}:\d{2}\s*[-~〜]\s*\d{1,2}:\d{2}[、,，]?\s*/;

// Bare meal/generic placeholders with no actual venue name attached (e.g. just "昼食" / "lunch") —
// as opposed to "Yunangi Okinawan Cuisineで昼食", which names a real place and should stay listed.
const GENERIC_PLACEHOLDER_WORDS = [
  'ăn trưa', 'ăn tối', 'ăn sáng', 'bữa trưa', 'bữa tối', 'bữa sáng', 'bữa ăn',
  '昼食', '夕食', '朝食', 'ランチ', '夕飯', '朝ご飯', '昼ご飯', '食事',
  'lunch', 'dinner', 'breakfast', 'meal'
];

/** True when an itinerary activity is just a generic meal/placeholder mention with no actual place name to look up. */
function isGenericPlaceholderActivity(text) {
  const stripped = String(text || '').replace(TIME_RANGE_PREFIX_RE, '').trim().toLowerCase();
  if (!stripped) return true;
  return GENERIC_PLACEHOLDER_WORDS.some(w => stripped === w.toLowerCase());
}

// Per-meal-type keyword groups — a superset of GENERIC_PLACEHOLDER_WORDS split by which meal it is,
// so a vague mention can be turned into "Lunch at <real venue>" instead of just "<real venue>".
const MEAL_TYPE_KEYWORDS = {
  breakfast: ['ăn sáng', 'bữa sáng', 'breakfast', '朝食', '朝ご飯'],
  lunch: ['ăn trưa', 'bữa trưa', 'lunch', '昼食', 'ランチ', '昼ご飯'],
  dinner: ['ăn tối', 'bữa tối', 'dinner', '夕食', '夕飯']
};

/** Which meal an activity mentions ('breakfast'/'lunch'/'dinner'), or the 'meal' fallback for a bare "ăn uống"/"food"/"meal" mention. */
function detectMealType(text) {
  const t = String(text || '').toLowerCase();
  for (const type of ['breakfast', 'lunch', 'dinner']) {
    if (MEAL_TYPE_KEYWORDS[type].some(w => t.includes(w))) return type;
  }
  return 'meal';
}

// Qualifiers that signal "some restaurant, unnamed" rather than an actual venue — "nhà hàng gần đó"
// (a restaurant nearby), "quán nào đó" (some place or other). Deliberately narrow/unambiguous ones
// only (unlike, say, "địa phương"/"local", which legitimately shows up describing a real venue's
// cuisine, e.g. "món địa phương tại Yunangi") to avoid mistaking a real, specific venue for a vague one.
const VAGUE_VENUE_QUALIFIERS = [
  'gần đó', 'gần đây', 'gần khu vực', 'quán ăn nào đó', 'nhà hàng nào đó', 'nào đó',
  'nearby', 'a local restaurant', 'a nearby restaurant', 'local eatery', 'somewhere nearby',
  '近く', '近所', 'どこかの'
];

/**
 * True for a meal activity that names no real venue — either a bare mention ("ăn trưa"/"lunch", per
 * isGenericPlaceholderActivity) or a meal + a vague qualifier ("Ăn trưa tại nhà hàng gần đó" / "Lunch
 * nearby" / "近くで昼食"). A small local model reliably falls back to this pattern instead of naming
 * an actual restaurant, even when explicitly told to — see resolvePlannerVenues, which uses this to
 * decide which activities to fill in with a real RAG-sourced venue name.
 */
function isVagueVenueMention(text) {
  if (isGenericPlaceholderActivity(text)) return true;
  const stripped = String(text || '').replace(TIME_RANGE_PREFIX_RE, '').trim().toLowerCase();
  if (!stripped) return false;
  const hasMealWord = Object.values(MEAL_TYPE_KEYWORDS).some(words => words.some(w => stripped.includes(w)));
  if (!hasMealWord) return false;
  return VAGUE_VENUE_QUALIFIERS.some(q => stripped.includes(q.toLowerCase()));
}

const MEAL_TYPE_LABEL = {
  vi: { breakfast: 'Ăn sáng', lunch: 'Ăn trưa', dinner: 'Ăn tối', meal: 'Ăn uống' },
  ja: { breakfast: '朝食', lunch: '昼食', dinner: '夕食', meal: '食事' },
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', meal: 'Meal' }
};

// Typical serving window for each meal type (minutes since midnight) — used to sanity-check a
// venue's opening_hours before picking it, so a breakfast slot doesn't get filled with a place
// that opens at 17:00. Deliberately generous (wider than any single restaurant's real hours) since
// this is a coarse sanity check, not a booking system.
const MEAL_TIME_WINDOW = {
  breakfast: [6 * 60, 10 * 60 + 30],
  lunch: [11 * 60, 14 * 60 + 30],
  dinner: [17 * 60 + 30, 21 * 60 + 30]
};

const ALWAYS_OPEN_RE = /24\s*\/\s*7|24h|24時間|終日|24 giờ|cả ngày/i;
const TIME_RANGE_GLOBAL_RE = /(\d{1,2}):(\d{2})\s*[-~〜]\s*(\d{1,2}):(\d{2})/g;

/** Extracts every "HH:MM-HH:MM" range in an opening-hours string, in minutes since midnight; handles a range that wraps past midnight (e.g. "18:00-02:00"). Empty array if the text has no parseable range. */
function parseOpeningHoursRanges(hoursText) {
  const ranges = [];
  for (const m of String(hoursText || '').matchAll(TIME_RANGE_GLOBAL_RE)) {
    const open = Number(m[1]) * 60 + Number(m[2]);
    let close = Number(m[3]) * 60 + Number(m[4]);
    if (close <= open) close += 24 * 60;
    ranges.push([open, close]);
  }
  return ranges;
}

/**
 * True when a venue's opening_hours plausibly covers a given meal's typical serving window —
 * "plausibly" because this is a coarse sanity check, not a live lookup: an entry with no hours
 * field at all, or hours text this can't parse (e.g. day-of-week-only OSM syntax with no time
 * range), returns true rather than false — missing/unparseable information should never block a
 * pick that might well be fine, only a genuine mismatch (breakfast slot, dinner-only venue) should.
 */
function isVenueOpenForMealType(hoursText, mealType) {
  const window = MEAL_TIME_WINDOW[mealType];
  if (!window) return true; // generic 'meal' type has no specific time to check against
  if (!hoursText) return true;
  if (ALWAYS_OPEN_RE.test(hoursText)) return true;
  const ranges = parseOpeningHoursRanges(hoursText);
  if (!ranges.length) return true;
  const [wantOpen, wantClose] = window;
  return ranges.some(([open, close]) => open < wantClose && close > wantOpen);
}

/** Composes "<meal> at <venue>" in the given language's natural phrasing. */
function buildVenueActivityText(mealType, venueName, lang) {
  const label = (MEAL_TYPE_LABEL[lang] || MEAL_TYPE_LABEL.vi)[mealType] || MEAL_TYPE_LABEL.vi.meal;
  if (lang === 'ja') return `${venueName}で${label}`;
  if (lang === 'en') return `${label} at ${venueName}`;
  return `${label} tại ${venueName}`;
}

/**
 * Deterministically fills in a real restaurant name (from the RAG knowledge base — see
 * fetchPlannerRagContext in initApp) for every vague meal mention in a generated itinerary, e.g.
 * turning "Ăn trưa tại nhà hàng gần đó" into "Ăn trưa tại Yunangi (ゆうなんぎい)" with that venue's
 * real price attached. This is a belt-and-suspenders fix alongside the RAG context now added to the
 * planner prompt itself: the prompt nudges the LLM toward real names, but a small local model isn't
 * reliable enough to trust for that alone (same reasoning as the food-price floor in
 * correctedActivityPrice). Picks the best-fitting *unused* candidate for each vague slot (by group
 * satisfaction, then rating) so the same restaurant isn't named for both lunch and dinner unless the
 * candidate pool is too small to avoid it. No-op (returns planData unchanged) when there are no food
 * candidates to draw from — e.g. a destination outside this demo's indexed knowledge base.
 *
 * Also cross-checks each candidate's opening_hours (when the entry has one) against the meal
 * being filled — see isVenueOpenForMealType — so a breakfast slot doesn't get filled with a venue
 * that's only open for dinner. Falls back to the unfiltered pool when the hours check would leave
 * nothing to pick from (an imperfect pick beats none — same trade-off as the "used" fallback above).
 */
function resolvePlannerVenues(planData, foodCandidates, members, lang) {
  const foodPool = (foodCandidates || []).filter(c => c && c.name && isFoodKnowledgeEntry(c));
  if (!planData || !Array.isArray(planData.days) || !foodPool.length) return planData;
  const used = new Set();
  const days = planData.days.map(day => {
    if (!day || !Array.isArray(day.activities)) return day;
    const activities = day.activities.map(activity => {
      const text = plannerActivityText(activity);
      if (!text || !isVagueVenueMention(text)) return activity;
      const mealType = detectMealType(text);
      const available = foodPool.filter(c => !used.has(c.name));
      let pool = available.length ? available : foodPool;
      const openNow = pool.filter(c => isVenueOpenForMealType(c.hours, mealType));
      if (openNow.length) pool = openNow;
      const scored = pool
        .map(entry => ({ entry, group: computeGroupSatisfaction(members || [], entry, lang) }))
        .sort((a, b) => (b.group.overall - a.group.overall) || ((parseFloat(b.entry.rating) || 0) - (parseFloat(a.entry.rating) || 0)));
      const best = scored[0].entry;
      used.add(best.name);
      const newText = buildVenueActivityText(mealType, best.name, lang);
      const slot = plannerActivitySlot(activity);
      const price = estimateEntryCostPerPerson(best);
      return { text: newText, slot, ...(price != null ? { price } : {}) };
    });
    return Object.assign({}, day, { activities });
  });
  return Object.assign({}, planData, { days });
}

function weatherDescription(code, lang) {
  const codes = tr(lang, 'weatherCodes');
  return (codes && codes[code]) || tr(lang, 'weatherCodes.unknown');
}

function buildGeoLookupCandidates(dest) {
  const raw = String(dest || '').trim();
  if (!raw) return [];
  const cleaned = raw.replace(/[()（）]/g, '').replace(/\s+/g, ' ').trim();
  const candidates = [];
  const seen = new Set();
  const add = (value) => {
    const v = String(value || '').trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    candidates.push(v);
  };
  add(cleaned);
  add(cleaned.replace(/[都道府県]/g, ''));
  add(cleaned.replace(/[都道府県市区町村]/g, ''));
  add(`${cleaned} Japan`);
  add(`${cleaned.replace(/[都道府県]/g, '')} Japan`);
  if (/^[\u3040-\u30ff\u4e00-\u9fff]/.test(cleaned)) {
    add(cleaned.replace(/県$/, ''));
    add(cleaned.replace(/市$/, ''));
  }
  if (/^(?:okinawa|okinawa city|naha|naha city|沖縄|那覇)/i.test(cleaned)) {
    add('Okinawa');
    add('Naha');
    add('沖縄');
    add('那覇');
  }
  return candidates.slice(0, 8);
}

function toIsoDateOnly(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function addDaysIso(isoDate, offset) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function classifyForecastSeverity(code, precip, tMax) {
  const c = Number(code);
  const p = Number(precip) || 0;
  const t = Number(tMax);
  const stormCodes = [65, 75, 82, 95, 96, 99];
  const rainCodes = [51, 53, 55, 61, 63, 80, 81];
  const high = stormCodes.includes(c) || p >= 15 || (!Number.isNaN(t) && t >= 35);
  const medium = rainCodes.includes(c) || p >= 3 || (!Number.isNaN(t) && t >= 31) || c === 45 || c === 48;
  if (high) {
    const type = !Number.isNaN(t) && t >= 35 ? 'heat' : (stormCodes.includes(c) || p >= 15 ? 'storm' : 'rain');
    return { type, severity: 'high' };
  }
  if (medium) {
    const type = !Number.isNaN(t) && t >= 31 ? 'heat' : (c === 45 || c === 48 ? 'wind' : 'rain');
    return { type, severity: 'medium' };
  }
  return { type: 'default', severity: 'low' };
}

function buildForecastEventFromDaily(daily, startDate, days, lang = DEFAULT_LANG) {
  const startIso = toIsoDateOnly(startDate);
  const totalDays = Math.max(1, Number(days) || 0);
  if (!startIso || !totalDays) return null;
  if (!daily || !Array.isArray(daily.time) || !daily.time.length) return null;

  const endIso = addDaysIso(startIso, totalDays - 1);
  if (!endIso) return null;
  const bucket = [];
  daily.time.forEach((date, i) => {
    if (date < startIso || date > endIso) return;
    const weatherCode = Array.isArray(daily.weather_code) ? daily.weather_code[i] : null;
    const precip = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum[i] : 0;
    const tMax = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[i] : null;
    const info = classifyForecastSeverity(weatherCode, precip, tMax);
    bucket.push({ date, weatherCode, precip, tMax, type: info.type, severity: info.severity });
  });
  if (!bucket.length) return null;

  const rank = { low: 1, medium: 2, high: 3 };
  bucket.sort((a, b) => (rank[b.severity] - rank[a.severity]) || ((Number(b.precip) || 0) - (Number(a.precip) || 0)));
  const worst = bucket[0];
  const desc = weatherDescription(worst.weatherCode, lang);
  const tempMax = Number.isFinite(Number(worst.tMax)) ? Math.round(Number(worst.tMax)) : 0;
  const precip = Math.round(Number(worst.precip) || 0);
  const text = tr(lang, 'heal.weatherForecastText', worst.date, desc, tempMax, precip);
  return {
    text,
    severity: worst.severity,
    type: worst.type,
    startDate: startIso,
    days: totalDays,
    date: worst.date,
    weatherCode: Number(worst.weatherCode),
    tempMax,
    precip
  };
}

function relocalizeWeatherIncidentText(data, lang = DEFAULT_LANG) {
  if (!data || !data.meta || !data.meta.forecastEvent) return data;
  const forecast = data.meta.forecastEvent;
  if (!forecast || !forecast.date) return data;
  const desc = weatherDescription(forecast.weatherCode, lang);
  const rebuilt = tr(lang, 'heal.weatherForecastText', forecast.date, desc, forecast.tempMax, forecast.precip);
  return {
    ...data,
    incident_summary: summarizeIncident(rebuilt, { type: forecast.type || 'default', severity: forecast.severity || 'low', text: rebuilt }, lang),
    meta: {
      ...data.meta,
      forecastEvent: {
        ...forecast,
        text: rebuilt
      }
    }
  };
}

function rebuildLocalizedPlannerContextSummary(context, lang = DEFAULT_LANG) {
  const ctx = context || {};
  const parts = [];
  if (ctx.days) parts.push(`${ctx.days} ${lang === 'ja' ? '日間' : lang === 'en' ? 'days' : 'ngày'}`);
  if (ctx.budget) {
    if (lang === 'ja') parts.push(`予算 ${ctx.budget} 円`);
    else if (lang === 'en') parts.push(`budget ${ctx.budget} yen`);
    else parts.push(`ngân sách ${ctx.budget} yên`);
  }
  if (ctx.group) {
    if (lang === 'ja') parts.push(`グループ: ${ctx.group}`);
    else if (lang === 'en') parts.push(`group: ${ctx.group}`);
    else parts.push(`nhóm: ${ctx.group}`);
  }
  if (ctx.notes) {
    if (lang === 'ja') parts.push(`メモ: ${ctx.notes}`);
    else if (lang === 'en') parts.push(`notes: ${ctx.notes}`);
    else parts.push(`ghi chú: ${ctx.notes}`);
  }
  return parts.join(' • ');
}

function relocalizeHealedData(data, lang = DEFAULT_LANG) {
  if (!data || typeof data !== 'object') return data;
  const next = { ...data };
  if (next.meta && next.meta.plannerContext) {
    next.context_summary = rebuildLocalizedPlannerContextSummary(next.meta.plannerContext, lang);
  }
  if (next.meta && next.meta.rawIncidentText) {
    const incident = classifyIncident(next.meta.rawIncidentText);
    next.incident_summary = summarizeIncident(next.meta.rawIncidentText, incident, lang);
    next.severity = incident.severity;
    next.notes = incidentReasonText(incident, lang);
  }
  if (next.satisfactionDelta) {
    const rawImpact = next.meta && next.meta.impactAiRaw;
    const rawLang = next.meta && next.meta.impactAiLang;
    next.impactAi = rawImpact && rawLang === lang
      ? normalizeMemberImpactAi(rawImpact, next.satisfactionDelta, lang)
      : buildMemberImpactFallback(next.satisfactionDelta, lang);
  }
  const weatherRelocalized = relocalizeWeatherIncidentText(next, lang);
  return weatherRelocalized;
}

function buildMemberImpactFallback(delta, lang = DEFAULT_LANG) {
  if (!delta || !Array.isArray(delta.perMember)) return null;
  const rows = delta.perMember.map(m => {
    const diff = (m.after || 0) - (m.before || 0);
    const impact = diff >= 3 ? 'positive' : diff <= -3 ? 'negative' : 'neutral';
    return {
      name: m.name,
      before: m.before,
      after: m.after,
      diff,
      impact,
      reason: impact === 'positive'
        ? (lang === 'ja' ? '置換後の活動がこのメンバーの好みにより近くなりました。' : lang === 'en' ? 'The replacement activities align better with this member\'s preferences.' : 'Các hoạt động thay thế phù hợp sở thích của thành viên này hơn.')
        : impact === 'negative'
          ? (lang === 'ja' ? '一部の置換により、このメンバーの好みとの一致が下がりました。' : lang === 'en' ? 'Some replacements reduced alignment with this member\'s preferences.' : 'Một số thay thế làm giảm độ phù hợp với sở thích của thành viên này.')
          : (lang === 'ja' ? '変更前後で満足度はほぼ同等です。' : lang === 'en' ? 'Satisfaction is largely unchanged after the swap.' : 'Mức độ hài lòng gần như không đổi sau khi thay đổi.'),
      advice: impact === 'negative'
        ? (lang === 'ja' ? '次の置換ではこのメンバーの優先項目を1つ追加してください。' : lang === 'en' ? 'For the next swap, add one activity tailored to this member.' : 'Ở lượt điều chỉnh tiếp theo, nên thêm 1 hoạt động ưu tiên cho thành viên này.')
        : ''
    };
  });
  const overallDiff = (delta.after || 0) - (delta.before || 0);
  const summary = overallDiff >= 3
    ? (lang === 'ja' ? 'グループ全体の満足度は改善しました。' : lang === 'en' ? 'Overall group satisfaction improved.' : 'Mức hài lòng chung của nhóm đã tăng.')
    : overallDiff <= -3
      ? (lang === 'ja' ? 'グループ全体の満足度は低下しました。' : lang === 'en' ? 'Overall group satisfaction dropped.' : 'Mức hài lòng chung của nhóm đã giảm.')
      : (lang === 'ja' ? 'グループ全体の満足度は概ね維持されています。' : lang === 'en' ? 'Overall group satisfaction is mostly preserved.' : 'Mức hài lòng chung của nhóm nhìn chung được giữ ổn định.');
  return { summary, members: rows };
}

function normalizeMemberImpactAi(raw, delta, lang = DEFAULT_LANG) {
  const fallback = buildMemberImpactFallback(delta, lang);
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.members)) return fallback;

  const byName = new Map((delta && Array.isArray(delta.perMember) ? delta.perMember : []).map(m => [String(m.name || ''), m]));
  const members = [];

  raw.members.forEach(row => {
    const name = String(row && row.name || '').trim();
    if (!name || !byName.has(name)) return;
    const original = byName.get(name);
    const before = Number(original.before) || 0;
    const after = Number(original.after) || 0;
    const diff = after - before;
    let impact = String(row && row.impact || '').trim().toLowerCase();
    if (!['positive', 'neutral', 'negative'].includes(impact)) {
      impact = diff >= 3 ? 'positive' : diff <= -3 ? 'negative' : 'neutral';
    }
    members.push({
      name,
      before,
      after,
      diff,
      impact,
      reason: String(row && row.reason || '').trim() || (fallback && fallback.members.find(m => m.name === name)?.reason) || '',
      advice: String(row && row.advice || '').trim() || ''
    });
  });

  if (!members.length) return fallback;
  return {
    summary: String(raw.summary || '').trim() || (fallback && fallback.summary) || '',
    members
  };
}

function renderImpactAiHtml(impactAi, lang = DEFAULT_LANG) {
  if (!impactAi || !Array.isArray(impactAi.members) || !impactAi.members.length) return '';
  let html = `<div class="impact-ai"><div class="sat-score-label">${escapeHtml(tr(lang, 'heal.impactAiTitle'))}</div>`;
  if (impactAi.summary) {
    html += `<div class="impact-summary"><strong>${escapeHtml(tr(lang, 'heal.impactAiSummary'))}</strong> ${escapeHtml(impactAi.summary)}</div>`;
  }
  impactAi.members.forEach(row => {
    const tag = tr(lang, `heal.impactAiTag.${row.impact}`);
    const diff = Number(row.diff) || 0;
    const tone = diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'neu';
    html += `<div class="impact-row ${tone}"><div class="impact-top"><span class="impact-name">${escapeHtml(row.name)}</span><span class="impact-tag ${tone}">${escapeHtml(tag)}</span></div>`;
    html += `<div class="impact-score">${escapeHtml(tr(lang, 'heal.impactAiChange', row.before, row.after, diff))}</div>`;
    if (row.reason) html += `<div class="impact-reason"><strong>${escapeHtml(tr(lang, 'heal.impactAiReason'))}</strong> ${escapeHtml(row.reason)}</div>`;
    if (row.advice) html += `<div class="impact-advice"><strong>${escapeHtml(tr(lang, 'heal.impactAiAdvice'))}</strong> ${escapeHtml(row.advice)}</div>`;
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

function impactOutputLanguageName(lang = DEFAULT_LANG) {
  if (lang === 'ja') return 'Japanese';
  if (lang === 'en') return 'English';
  return 'Vietnamese';
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
 * Parses one line of claude-server's streaming NDJSON /chat response and returns
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

function plannerActivityText(activity) {
  if (typeof activity === 'string') return activity.trim();
  if (activity && typeof activity === 'object') return String(activity.text || '').trim();
  return String(activity || '').trim();
}

function plannerActivitySlot(activity) {
  if (!activity || typeof activity !== 'object') return '';
  return normalizeTimeSlot(activity.slot);
}

/** Per-person cost estimate (yen) the planner LLM attached to one activity — null for a plain-string activity (older/self-healed data, or a model that ignored the price field) rather than a false 0. */
function plannerActivityPrice(activity) {
  if (!activity || typeof activity !== 'object') return null;
  const n = Number(activity.price);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Cheapest plausible casual meal in this app's own reference data (Kokusai Dori Ramen,
// 800-1200 yên/người in knowledge/restaurants.json) — used as a floor, not a guess out of thin air.
const FOOD_ACTIVITY_MIN_PRICE = 800;

/**
 * Loose food/drink detector for the price safety-net below — deliberately broader than
 * classifyActivity()'s "food" category (which risk detection also depends on, so changing it
 * there could have wider side effects) so it also catches bars/izakaya-style activities, not
 * just meals.
 */
function looksLikeFoodOrDrinkActivity(text) {
  return /ăn\s|lunch|dinner|breakfast|restaurant|café|cafe|izakaya|sushi|ramen|bbq|barbecue|\bfood\b|beer|\bbar\b|pub|nhậu|bia|drink|昼食|夕食|朝食|レストラン|居酒屋|バー|ビール|ランチ|ディナー/i.test(String(text || '').toLowerCase());
}

/**
 * A small local model sometimes marks an obviously food/drink activity (e.g. "Ăn sáng tại nhà
 * hàng Okinawan", "Tiếng vang tại Orion Beer Hall") as free — a real estimation slip, not an
 * actual free meal, and it silently makes the whole trip's cost estimate look implausibly cheap.
 * When price is exactly 0 on something that reads as food/drink, substitute a conservative floor
 * instead of trusting it, and mark the number as inferred (shown with a "~") rather than the AI's
 * own confident estimate. Anything else — a genuinely free viewpoint, a walk, transit — passes
 * through untouched.
 */
function correctedActivityPrice(activity) {
  const price = plannerActivityPrice(activity);
  if (price === 0 && looksLikeFoodOrDrinkActivity(plannerActivityText(activity))) {
    return { price: FOOD_ACTIVITY_MIN_PRICE, inferred: true };
  }
  return { price, inferred: false };
}

/** Sums every activity's price estimate across the whole itinerary. `hasData` is false when nothing carried a price at all (older data, or a model that skipped the field) — callers use it to hide the cost summary instead of showing a misleading "0 yên". */
function sumItineraryCost(planData) {
  let total = 0;
  let hasData = false;
  (planData && planData.days || []).forEach(day => {
    (day && day.activities || []).forEach(activity => {
      const { price } = correctedActivityPrice(activity);
      if (price != null) { total += price; hasData = true; }
    });
  });
  return { total, hasData };
}

/** Renders the trip's total estimated cost, and — once there's more than 1 traveler — the even per-person split so the group can prepare their budget. Returns '' when the itinerary carries no price data at all. */
function renderItineraryCostSummaryHtml(planData, memberCount, lang) {
  // sumItineraryCost() adds up each activity's PRICE PER PERSON (that's what the planner LLM was
  // asked for — a meal costs the same per head, it isn't a shared bill to split). So `total` here
  // already IS the per-person cost; the group total is total × headcount, never total ÷ headcount.
  const { total: perPerson, hasData } = sumItineraryCost(planData);
  if (!hasData) return '';
  const count = Math.max(1, Number(memberCount) || 1);
  let html = `<div class="cost-summary"><div class="cost-summary-title">${escapeHtml(tr(lang, 'planner.costSummaryTitle'))}</div>`;
  html += `<div class="cost-summary-row"><span>${escapeHtml(tr(lang, 'planner.costPerPersonLabel'))}</span><strong>${formatYen(perPerson)}</strong></div>`;
  if (count > 1) {
    html += `<div class="cost-summary-row"><span>${escapeHtml(tr(lang, 'planner.costTotalLabel', count))}</span><strong>${formatYen(perPerson * count)}</strong></div>`;
  }
  html += `<p class="cost-summary-note">${escapeHtml(tr(lang, 'planner.costDisclaimer'))}</p></div>`;
  return html;
}

function renderPlannerHtml(data, dest, lang, requestedDays) {
  let dayHtml = '';
  let renderedDays = 0;
  (data.days || []).forEach((d, i) => {
    if (!d || !Array.isArray(d.activities) || d.activities.length === 0) return;
    const entries = d.activities.map(activity => {
      const text = plannerActivityText(activity);
      if (!text) return '';
      const slot = plannerActivitySlot(activity);
      const slotHtml = slot ? `<span class="slot-badge">${escapeHtml(formatSlotLabel(slot, lang))}</span>` : '';
      const { price, inferred } = correctedActivityPrice(activity);
      const priceLabel = price > 0 ? (inferred ? '~' : '') + formatYen(price) + ' ' + tr(lang, 'common.yen') : tr(lang, 'common.free');
      const priceTitle = inferred ? ` title="${escapeHtml(tr(lang, 'planner.priceInferredTooltip'))}"` : '';
      const priceHtml = price != null ? `<span class="activity-price${inferred ? ' inferred' : ''}"${priceTitle}>${priceLabel}</span>` : '';
      return `<li>${slotHtml}${escapeHtml(text)}${priceHtml} ${mapLink(text, dest, lang)}${venueWarning(text, lang)}</li>`;
    }).filter(Boolean);
    if (!entries.length) return;
    renderedDays++;
    const items = entries.join('');
    const routeUrl = buildDayRouteMapUrl(d.activities, dest);
    const routeLinkHtml = routeUrl ? ` <a href="${routeUrl}" target="_blank" rel="noopener" class="day-route-link">${tr(lang, 'common.dayRouteLink')}</a>` : '';
    dayHtml += `<div class="day-block"><h4>${tr(lang, 'common.dayLabel', d.day || (i + 1))}${routeLinkHtml}</h4><ul>${items}</ul></div>`;
  });
  if (!dayHtml) return tr(lang, 'common.noResult');
  let html = '';
  if (requestedDays && renderedDays < Number(requestedDays)) {
    html += `<div class="error-box">${tr(lang, 'common.dayCountMismatch', renderedDays, requestedDays)}</div>`;
  }
  html += dayHtml;
  if (data.summary) html += `<div class="summary-note">${escapeHtml(data.summary)}</div>`;
  html += `<div class="summary-note">${tr(lang, 'common.plannerDisclaimer')}</div>`;
  return html;
}

/** Plain-text version of a planner itinerary, for sharing/copying (no HTML markup). */
function formatPlannerShareText(data, dest, lang) {
  const lines = [`🗺️ ${dest}`];
  (data.days || []).forEach((d, i) => {
    if (!d || !Array.isArray(d.activities) || d.activities.length === 0) return;
    lines.push('');
    lines.push(String(tr(lang, 'common.dayLabel', d.day || (i + 1))));
    d.activities.forEach(activity => {
      const text = plannerActivityText(activity);
      if (!text) return;
      const slot = plannerActivitySlot(activity);
      const slotLabel = slot ? `[${formatSlotLabel(slot, lang)}] ` : '';
      lines.push(`- ${slotLabel}${text}`);
    });
  });
  if (data.summary) {
    lines.push('');
    lines.push(data.summary);
  }
  lines.push('');
  lines.push(tr(lang, 'common.sharedVia'));
  return lines.join('\n');
}

function renderGroupScoreTableHtml(data, lang) {
  let html = `<table class="score-table"><thead><tr><th>${tr(lang, 'common.criteriaHeader')}</th><th>${tr(lang, 'common.scoreHeader')}</th></tr></thead><tbody>`;
  (data.criteria || []).forEach(c => { html += `<tr><td>${escapeHtml(c.name)}</td><td>${c.score}/10</td></tr>`; });
  html += `</tbody></table>`;
  return html;
}

// ================================================================
// Group Decision engine — deterministic, local, no LLM call.
// Turns a RAG knowledge-base chunk + free-text member preferences into a
// per-member satisfaction score, detected conflicts, and ranked compromise
// options. Kept entirely rule-based on purpose: a local model is not
// reliable enough to emit trustworthy per-member percentages live on stage.
// ================================================================

/** Parses one RAG chunk ("key: value" per line, see rag-server/shared.js) into a plain object. */
function parseKnowledgeChunk(text) {
  const obj = {};
  String(text || '').split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) obj[key] = value;
  });
  return obj;
}

/** Rule-based keyword → preference-tag dictionary, one list per supported language. */
const PREFERENCE_TAG_KEYWORDS = {
  seafood: { vi: ['hải sản', 'tôm', 'cá ', 'sò', 'hàu', 'mực'], en: ['seafood', 'fish', 'shrimp', 'crab', 'oyster'], ja: ['海鮮', '魚', 'エビ', 'カニ', '寿司', '刺身'] },
  meat: { vi: ['thịt nướng', 'bbq', 'nướng', 'thịt bò', 'yakiniku'], en: ['bbq', 'grill', 'meat', 'beef', 'yakiniku'], ja: ['焼肉', '肉', 'バーベキュー', '牛'] },
  vegetarian: { vi: ['chay', 'ăn chay'], en: ['vegetarian', 'vegan'], ja: ['ベジタリアン', '菜食', 'ヴィーガン'] },
  budget: { vi: ['tiết kiệm', 'giá rẻ', 'rẻ'], en: ['budget', 'cheap', 'affordable'], ja: ['安い', '格安', '予算重視'] },
  luxury: { vi: ['sang trọng', 'cao cấp'], en: ['luxury', 'fine dining', 'upscale'], ja: ['高級', '贅沢'] },
  photo: { vi: ['chụp ảnh', 'check-in', 'sống ảo', 'view đẹp'], en: ['photo', 'instagram', 'check-in', 'checkin', 'rooftop', 'view'], ja: ['写真', 'インスタ', '映え', '絶景'] },
  shopping: { vi: ['mua sắm', 'shopping'], en: ['shopping', 'shop'], ja: ['ショッピング', '買い物'] },
  kids: { vi: ['trẻ em', 'có con', 'em bé', 'gia đình', 'vòng quay', 'sở thú', 'công viên giải trí', 'khu vui chơi'], en: ['kid', 'child', 'family', 'aquarium', 'zoo', 'ferris wheel', 'playground', 'amusement park'], ja: ['子供', '子連れ', 'ファミリー', '水族館', '動物園', '観覧車', '遊園地'] },
  nightlife: { vi: ['bia', 'nhậu', 'tiệc'], en: ['beer', 'nightlife', 'bar', 'party', 'pub', 'rooftop bar'], ja: ['ビール', 'ナイトライフ', '飲み'] },
  nature: { vi: ['thiên nhiên', 'biển', 'núi', 'ngoài trời'], en: ['nature', 'beach', 'outdoor', 'hiking'], ja: ['自然', 'ビーチ', 'アウトドア'] },
  culture: { vi: ['văn hóa', 'lịch sử', 'bảo tàng', 'đền', 'lâu đài', 'thành cổ'], en: ['culture', 'history', 'museum', 'temple', 'castle'], ja: ['文化', '歴史', '博物館', '城'] },
  quiet: { vi: ['yên tĩnh', 'thư giãn'], en: ['quiet', 'relax', 'peaceful'], ja: ['静か', 'リラックス'] },
  adventure: { vi: ['mạo hiểm', 'phiêu lưu'], en: ['adventure', 'extreme'], ja: ['冒険', 'アドベンチャー'] }
};

/** Extracts preference tags from one member's free-text preference string. */
function extractPreferenceTags(prefText, lang) {
  const t = String(prefText || '').toLowerCase();
  const tags = [];
  for (const tag in PREFERENCE_TAG_KEYWORDS) {
    const dict = PREFERENCE_TAG_KEYWORDS[tag];
    const words = (dict[lang] || []).concat(dict.en || []); // English keywords always checked too — mixed-language input is common
    if (words.some(w => t.includes(w.toLowerCase()))) tags.push(tag);
  }
  return tags;
}

function parsePriceYen(value) {
  const nums = String(value || '').match(/\d[\d,]*/g);
  if (!nums) return null;
  return Math.max(...nums.map(n => parseInt(n.replace(/,/g, ''), 10)));
}

/** Comma-groups a number for display ("1,234") without depending on the runtime's locale (Intl/toLocaleString output isn't guaranteed the same across environments). */
function formatYen(n) {
  if (n == null || !Number.isFinite(n)) return '';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Rough per-person cost (yen) for a knowledge entry, from its priceRange ("2000-3000 yên/người") or ticketPrice field — both already per-person in this app's data. Takes the high end of a range so it helps a group over-prepare rather than under-budget. Null when the entry has no parseable price (free entry, or price not listed). */
function estimateEntryCostPerPerson(entry) {
  return parsePriceYen(entry && (entry.priceRange || entry.ticketPrice));
}

/** True when a RAG knowledge entry is a restaurant/food venue rather than an attraction — restaurants.json entries always carry a `cuisine` field, attractions.json entries never do (they have `type`/`ticketPrice` instead). Used to keep "alternative place" suggestions in the same category as what they're replacing (never swap a park visit for a restaurant just because it scores well on a preference tag). */
function isFoodKnowledgeEntry(entry) {
  return !!(entry && entry.cuisine);
}

/** Scores one knowledge entry (restaurant/attraction) against one member's tags. Returns {score 0-100, reasons[]}. */
function scoreEntryForMember(entry, tags, lang) {
  let score = 60;
  const reasons = [];
  const haystack = [entry.name, entry.cuisine, entry.type, entry.notes].filter(Boolean).join(' ').toLowerCase();
  const price = parsePriceYen(entry.priceRange || entry.ticketPrice);
  const kidFriendly = String(entry.kidFriendly).toLowerCase() === 'true';

  tags.forEach(tag => {
    const words = (PREFERENCE_TAG_KEYWORDS[tag].vi || []).concat(PREFERENCE_TAG_KEYWORDS[tag].en || []);
    const matches = words.some(w => haystack.includes(w.toLowerCase()));
    if (tag === 'vegetarian' && (haystack.includes('hải sản') || haystack.includes('seafood') || haystack.includes('thịt') || haystack.includes('meat') || haystack.includes('bbq'))) {
      score -= 25; reasons.push({ tag, delta: -25, key: 'conflictVegetarian' });
    } else if (tag === 'budget' && price != null) {
      if (price <= 1500) { score += 15; reasons.push({ tag, delta: 15, key: 'matchBudget' }); }
      else if (price >= 4000) { score -= 15; reasons.push({ tag, delta: -15, key: 'overBudget' }); }
    } else if (tag === 'luxury' && price != null) {
      if (price >= 4000) { score += 15; reasons.push({ tag, delta: 15, key: 'matchLuxury' }); }
      else if (price <= 1500) { score -= 10; reasons.push({ tag, delta: -10, key: 'tooBasic' }); }
    } else if (tag === 'kids') {
      if (kidFriendly) { score += 15; reasons.push({ tag, delta: 15, key: 'matchKids' }); }
      else if (String(entry.kidFriendly).toLowerCase() === 'false') { score -= 15; reasons.push({ tag, delta: -15, key: 'notKidFriendly' }); }
    } else if (matches) {
      score += 18; reasons.push({ tag, delta: 18, key: 'matchTag' });
    }
  });

  const rating = parseFloat(entry.rating);
  if (!isNaN(rating)) {
    if (rating >= 4.5) { score += 5; } else if (rating < 4) { score -= 5; }
  }

  score = Math.max(5, Math.min(100, Math.round(score)));
  return { score, reasons };
}

/** Per-member + overall satisfaction for one knowledge entry. members: [{name, pref}]. */
function computeGroupSatisfaction(members, entry, lang) {
  const perMember = (members || []).map(m => {
    const tags = extractPreferenceTags(m.pref, lang);
    const { score, reasons } = scoreEntryForMember(entry || {}, tags, lang);
    return { name: m.name, score, tags, reasons };
  });
  const overall = perMember.length ? Math.round(perMember.reduce((s, m) => s + m.score, 0) / perMember.length) : 0;
  const sorted = [...perMember].sort((a, b) => a.score - b.score);
  return { overall, perMember, lowest: sorted[0] || null, highest: sorted[sorted.length - 1] || null };
}

/** Detects a visible preference conflict for one entry: some members score high, others score low. */
function detectPreferenceConflicts(members, entry, lang) {
  const { perMember } = computeGroupSatisfaction(members, entry, lang);
  const high = perMember.filter(m => m.score >= 70);
  const low = perMember.filter(m => m.score <= 45);
  if (!high.length || !low.length) return [];
  const gap = (high.reduce((s, m) => s + m.score, 0) / high.length) - (low.reduce((s, m) => s + m.score, 0) / low.length);
  const severity = gap >= 45 ? 'high' : gap >= 25 ? 'moderate' : 'low';
  const topReasonKey = (m) => (m.reasons[0] && m.reasons[0].key) || null;
  return [{
    topic: entry.name || '',
    like: high.map(m => m.name),
    dislike: low.map(m => m.name),
    severity,
    score: Math.round(gap),
    likeReasonKey: topReasonKey(high[0]),
    dislikeReasonKey: topReasonKey(low[0])
  }];
}

/** Picks the RAG candidate that best matches the place the user typed in (exact, then substring, then first-available). */
function pickPrimaryKnowledgeEntry(candidates, place) {
  const named = (candidates || []).filter(c => c && c.name);
  const p = String(place || '').trim().toLowerCase();
  if (!p) return named[0] || { name: place || '' };
  const exact = named.find(c => c.name.toLowerCase() === p);
  if (exact) return exact;
  const partial = named.find(c => p.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(p));
  if (partial) return partial;
  return named[0] || { name: place || '' };
}

// Below this score, no one in the group is genuinely excited about an option — it may still
// clear the "floor" bar (nobody hates it) without anyone actually loving it either.
const COMPROMISE_DELIGHT_THRESHOLD = 75;

/**
 * Ranks knowledge-entry candidates into up to 3 compromise options — but NOT by the same
 * criterion three times. Sorting all three by "worst member score" (the floor) alone reliably
 * produces the "averaged plan nobody loves" failure mode from the other direction: three
 * flavors of the same safe, lukewarm middle, because a candidate that would thrill one person
 * but only be "fine" for another never wins on floor score alone. Each option here comes from a
 * different strategy, so a genuinely exciting pick for someone can surface even when it isn't
 * the safest:
 *   A = safest (highest floor — "no one is left behind", still the AI's default pick)
 *   B = best overall fit (highest average across the group)
 *   C = most delight (highest peak score for whoever likes it most)
 * If the resulting pool of named candidates is too small for 3 distinct picks, the same venue
 * can appear more than once under different strategies — genuinely winning on multiple axes is
 * itself a signal worth showing, not a bug to hide.
 *
 * `place` (optional) is the activity text currently being evaluated/replaced. When given, options
 * are restricted to RAG candidates of the same category (food vs. attraction) as `place` — without
 * this, a restaurant that happens to match a member's preference tag (e.g. "seafood") could win a
 * ranking slot as an "alternative" to a leisure activity that isn't a meal at all, which isn't a
 * real choice between two ways to spend that moment and reads as nonsensical ("swap this park
 * visit for lunch, scored 92%"). When nothing in the RAG results matches the category, this
 * returns no options at all — a missing "3 options" panel (or a declined swap) is honest; a
 * cross-category one scored as if it were a real alternative is not, and this is the deliberate
 * fix for exactly that complaint, so don't reintroduce a same-category fallback here. Skipped
 * entirely when `place` isn't given (backward-compatible).
 */
function generateCompromiseOptions(candidates, members, lang, place) {
  let named = (candidates || []).filter(c => c && c.name);
  if (!named.length) return [];
  if (place) {
    const wantFood = classifyActivity(place).category === 'food';
    named = named.filter(c => isFoodKnowledgeEntry(c) === wantFood);
    if (!named.length) return [];
  }
  const scored = named.map(entry => {
    const group = computeGroupSatisfaction(members, entry, lang);
    const scores = group.perMember.map(m => m.score);
    const minScore = scores.length ? Math.min(...scores) : group.overall;
    const maxScore = scores.length ? Math.max(...scores) : group.overall;
    return { entry, group, minScore, maxScore };
  });

  const strategies = [
    { key: 'safest', sort: (a, b) => (b.minScore - a.minScore) || (b.group.overall - a.group.overall) },
    { key: 'balanced', sort: (a, b) => (b.group.overall - a.group.overall) || (b.minScore - a.minScore) },
    { key: 'delight', sort: (a, b) => (b.maxScore - a.maxScore) || (b.group.overall - a.group.overall) }
  ];
  const labels = ['A', 'B', 'C'];
  const used = new Set();
  const memberCount = (members || []).filter(m => m && m.name).length || 1;

  const count = Math.min(3, named.length);
  return strategies.slice(0, count).map((strat, i) => {
    const ranked = [...scored].sort(strat.sort);
    const s = ranked.find(c => !used.has(c.entry.name)) || ranked[0];
    used.add(s.entry.name);
    const costPerPerson = estimateEntryCostPerPerson(s.entry);
    return {
      label: labels[i],
      strategy: strat.key,
      name: s.entry.name,
      overall: s.group.overall,
      minScore: s.minScore,
      maxScore: s.maxScore,
      best: s.group.highest,
      worst: s.group.lowest,
      bland: s.maxScore < COMPROMISE_DELIGHT_THRESHOLD,
      picked: strat.key === 'safest',
      // Chuẩn bị chi phí (F: cost transparency) — null when the venue's price isn't listed.
      costPerPerson,
      totalCost: costPerPerson != null ? costPerPerson * memberCount : null,
      memberCount
    };
  });
}

/** Structured reasoning bullets for Explainable AI (Feature 4) — built from real RAG fields, not the LLM. */
function buildReasoningReceipt(entry, group, members, lang) {
  const lines = [];
  const strongCount = group.perMember.filter(m => m.score >= 70).length;
  if (members && members.length) lines.push(tr(lang, 'group.reasonPrefMatch', strongCount, members.length));
  const price = entry.priceRange || entry.ticketPrice;
  if (price) lines.push(tr(lang, 'group.reasonBudget', price));
  if (String(entry.kidFriendly).toLowerCase() === 'true') lines.push(tr(lang, 'group.reasonKidFriendly'));
  if (entry.rating) lines.push(tr(lang, 'group.reasonRating', entry.rating));
  if (entry.address) lines.push(tr(lang, 'group.reasonAddress', entry.address));
  return lines;
}

function scoreBarColor(score) {
  return score >= 70 ? 'good' : score >= 45 ? 'warn' : 'crit';
}

function renderSatisfactionScoreHtml(group, lang) {
  if (!group || !group.perMember.length) return '';
  const bar = (label, score, overall) => `<div class="sat-row${overall ? ' overall' : ''}"><span class="sat-who">${escapeHtml(label)}</span><div class="sat-track"><div class="sat-fill ${scoreBarColor(score)}" style="width:${score}%;"></div></div><span class="sat-pct">${score}%</span></div>`;
  let html = `<div class="sat-score"><div class="sat-score-label">${tr(lang, 'group.satisfactionTitle')}</div>`;
  html += bar(tr(lang, 'group.overallLabel'), group.overall, true);
  group.perMember.forEach(m => { html += bar(m.name, m.score, false); });
  if (group.lowest && group.lowest.score < 70) {
    html += `<div class="sat-why">${escapeHtml(tr(lang, 'group.lowestWhy', group.lowest.name))}</div>`;
  }
  html += `</div>`;
  return html;
}

function renderConflictCardsHtml(conflicts, lang) {
  if (!conflicts || !conflicts.length) return '';
  return conflicts.map(c => {
    const reason = [c.likeReasonKey && tr(lang, 'group.reasonKeys.' + c.likeReasonKey, c.like[0]), c.dislikeReasonKey && tr(lang, 'group.reasonKeys.' + c.dislikeReasonKey, c.dislike[0])]
      .filter(Boolean).join(' · ');
    return `<div class="conflict-card sev-${c.severity}">
      <div class="conflict-top"><span class="conflict-topic">${escapeHtml(tr(lang, 'group.conflictTitle'))}${c.topic ? ': ' + escapeHtml(c.topic) : ''}</span><span class="sev-pill sev-${c.severity}">${tr(lang, 'group.severity.' + c.severity)} · ${c.score}</span></div>
      <div class="conflict-sides">
        <div class="c-side c-like"><div class="c-side-lbl">${tr(lang, 'group.likeLabel')}</div><div class="pill-row">${c.like.map(n => `<span class="person-pill like">${escapeHtml(n)}</span>`).join('')}</div></div>
        <div class="c-side c-dislike"><div class="c-side-lbl">${tr(lang, 'group.dislikeLabel')}</div><div class="pill-row">${c.dislike.map(n => `<span class="person-pill dislike">${escapeHtml(n)}</span>`).join('')}</div></div>
      </div>
      ${reason ? `<div class="conflict-reason">${escapeHtml(reason)}</div>` : ''}
    </div>`;
  }).join('');
}

function renderCompromiseOptionsHtml(options, lang, chosenName) {
  if (!options || !options.length) return '';
  let html = `<div class="opt-heading">${escapeHtml(tr(lang, 'group.compromiseTitle'))}</div><div class="opt-grid">`;
  // Kept deliberately compact — this card already carries a pick tag, score, name, trade-offs
  // and sometimes a caveat, so the label and the pro/con lines are each merged into one row
  // instead of stacking every signal on its own line.
  html += options.map(o => {
    const isChosen = !!chosenName && o.name === chosenName;
    return `
    <div class="opt-card${o.picked ? ' picked' : ''}">
      ${o.picked ? `<div class="opt-pick-tag">${escapeHtml(tr(lang, 'group.aiPick'))}</div>` : ''}
      <div class="opt-top">
        <span class="opt-label">${tr(lang, 'group.optionLabel', o.label)}${o.strategy ? ' · ' + escapeHtml(tr(lang, 'group.strategy.' + o.strategy)) : ''}</span>
        <span class="opt-score">${o.overall}%</span>
      </div>
      <div class="opt-name">${escapeHtml(o.name)}</div>
      ${o.costPerPerson != null ? `<div class="opt-cost">💰 ${escapeHtml(tr(lang, 'group.costPerPerson', formatYen(o.costPerPerson)))}${o.memberCount > 1 ? ' · ' + escapeHtml(tr(lang, 'group.costTotal', formatYen(o.totalCost), o.memberCount)) : ''}</div>` : ''}
      <div class="opt-prosandcons">
        ${o.best ? `<span class="opt-pro">+ ${escapeHtml(tr(lang, 'group.optionPro', o.best.name, o.best.score))}</span>` : ''}
        ${o.worst ? `<span class="opt-con">− ${escapeHtml(tr(lang, 'group.optionCon', o.worst.name, o.worst.score))}</span>` : ''}
      </div>
      ${o.bland ? `<div class="opt-caveat">⚠️ ${escapeHtml(tr(lang, 'group.blandCaveat', o.maxScore))}</div>` : ''}
      <div class="opt-why">${escapeHtml(o.picked ? tr(lang, 'group.whyPicked') : tr(lang, 'group.whyAlt'))}</div>
      <button type="button" class="opt-choose-btn${isChosen ? ' chosen' : ''}" data-opt-name="${escapeHtml(o.name)}">${escapeHtml(isChosen ? tr(lang, 'group.chosenLabel') : tr(lang, 'group.chooseBtn'))}</button>
    </div>`;
  }).join('');
  html += `</div>`;
  return html;
}

function renderReasoningReceiptHtml(entry, group, members, lang) {
  const lines = buildReasoningReceipt(entry, group, members, lang);
  if (!lines.length) return '';
  return `<div class="receipt"><div class="receipt-head">${escapeHtml(tr(lang, 'group.whyTitle', entry.name || ''))}</div><ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></div>`;
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

// ---------- Voice Assistant: build itinerary from conversation ----------

/** Joins the Voice Assistant chat log into one transcript for the slot-extraction prompt. Role labels stay in English — they're structural markers for the LLM, not user-facing text. */
function buildConversationTranscript(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter(m => m && m.text)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');
}

/** Coerces the LLM's raw slot-extraction JSON into a clean, typed shape. Never guesses a value the LLM left blank. */
function normalizeExtractedSlots(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const days = parseInt(obj.days, 10);
  return {
    destination: String(obj.destination || '').trim(),
    days: Number.isFinite(days) && days > 0 ? days : null,
    startDate: String(obj.startDate || '').trim(),
    budget: String(obj.budget || '').trim(),
    group: String(obj.group || '').trim(),
    notes: String(obj.notes || '').trim()
  };
}

/** Destination and day count are the only fields an itinerary truly can't be built without — everything else (budget, group, notes) already has a sensible default. */
function missingTripSlots(slots) {
  const missing = [];
  if (!slots || !slots.destination) missing.push('destination');
  if (!slots || !slots.days) missing.push('days');
  return missing;
}

/** Picks the right proactive follow-up question so the assistant asks for exactly what's missing, instead of silently failing to build an itinerary. */
function buildVoiceFollowUpQuestion(missing, lang) {
  const list = Array.isArray(missing) ? missing : [];
  const needsDest = list.includes('destination');
  const needsDays = list.includes('days');
  if (needsDest && needsDays) return tr(lang, 'voice.askBoth');
  if (needsDest) return tr(lang, 'voice.askDestination');
  if (needsDays) return tr(lang, 'voice.askDays');
  return '';
}

/** True if the user's message asks the assistant to build/finalize an itinerary now (so it can happen from voice alone, without a button press). */
function detectItineraryIntent(text, triggers) {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  return (Array.isArray(triggers) ? triggers : []).some(t => t && lower.includes(String(t).toLowerCase()));
}

/** Which of the 6 trip-planning slots have actually been captured from the conversation so far — feeds the visible progress checklist (Layla-style "3/6 captured" instead of a silent black box). */
function computeChecklistStatus(slots) {
  const s = slots || {};
  const days = parseInt(s.days, 10);
  return {
    destination: !!(s.destination && String(s.destination).trim()),
    days: Number.isFinite(days) && days > 0,
    startDate: !!(s.startDate && String(s.startDate).trim()),
    budget: !!(s.budget && String(s.budget).trim()),
    group: !!(s.group && String(s.group).trim()),
    notes: !!(s.notes && String(s.notes).trim())
  };
}

const CHECKLIST_FIELDS = [
  ['destination', 'voice.checklistDest'],
  ['days', 'voice.checklistDays'],
  ['startDate', 'voice.checklistStart'],
  ['budget', 'voice.checklistBudget'],
  ['group', 'voice.checklistGroup'],
  ['notes', 'voice.checklistNotes']
];

/** Renders the trip-planning checklist — which slots are captured vs. still open — as a small always-visible progress panel rather than only a one-shot follow-up question. */
function renderTripChecklistHtml(slots, lang) {
  const status = computeChecklistStatus(slots);
  const doneCount = CHECKLIST_FIELDS.filter(([key]) => status[key]).length;
  const rows = CHECKLIST_FIELDS.map(([key, labelKey]) => `<div class="checklist-item${status[key] ? ' done' : ''}"><span class="checklist-mark">${status[key] ? '✓' : '—'}</span><span>${escapeHtml(tr(lang, labelKey))}</span></div>`).join('');
  return `<div class="voice-checklist"><div class="checklist-head"><span>${escapeHtml(tr(lang, 'voice.checklistTitle'))}</span><span class="checklist-count">${tr(lang, 'voice.checklistCaptured', doneCount, CHECKLIST_FIELDS.length)}</span></div><div class="checklist-body">${rows}</div></div>`;
}

/** Fills whatever's still missing with a sensible, clearly-labeled default instead of blocking — mirrors Layla's "generate now, fill the gaps" button rather than a hard wall waiting on every slot. */
function fillMissingSlotsWithDefaults(slots, lang) {
  const s = slots || {};
  const days = parseInt(s.days, 10);
  return {
    destination: (s.destination && String(s.destination).trim()) || tr(lang, 'voice.autoDestinationFallback'),
    days: Number.isFinite(days) && days > 0 ? days : 3,
    startDate: s.startDate || '',
    budget: s.budget || '',
    group: s.group || '',
    notes: s.notes || ''
  };
}

function flattenActivities(planData) {
  if (!planData || !Array.isArray(planData.days)) return [];
  const flat = [];
  planData.days.forEach(day => {
    if (!day || !Array.isArray(day.activities)) return;
    day.activities.forEach(activity => {
      if (typeof activity === 'string' && activity.trim()) {
        flat.push(activity.trim());
        return;
      }
      const text = String(activity && activity.text || '').trim();
      if (text) flat.push(text);
    });
  });
  return dedupePlanItems(flat);
}

function normalizeTimeSlot(slotRaw) {
  const slot = normalizeHealedText(slotRaw).replace(/\./g, '').trim();
  if (!slot) return '';
  if (/^(morning|am|sáng|sang|朝)$/.test(slot)) return 'morning';
  if (/^(midday|noon|trưa|trua|昼)$/.test(slot)) return 'midday';
  if (/^(afternoon|chiều|chieu|午後)$/.test(slot)) return 'afternoon';
  if (/^(evening|tối|toi|夕方)$/.test(slot)) return 'evening';
  if (/^(night|đêm|dem|夜|pm)$/.test(slot)) return 'night';
  return slot;
}

function formatSlotLabel(slot, lang = DEFAULT_LANG) {
  const key = normalizeTimeSlot(slot);
  if (!key) return '';
  const map = {
    vi: { morning: 'SANG', midday: 'TRUA', afternoon: 'CHIEU', evening: 'TOI', night: 'DEM' },
    ja: { morning: 'ASA', midday: 'HIRU', afternoon: 'GOGO', evening: 'YUGATA', night: 'YORU' },
    en: { morning: 'MORNING', midday: 'MIDDAY', afternoon: 'AFTERNOON', evening: 'EVENING', night: 'NIGHT' }
  };
  return (map[lang] && map[lang][key]) || key.toUpperCase();
}

function parseSelfHealingLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return null;

  const full = raw.match(/^(?:day|d|ngay|ngày|第)?\s*(\d{1,2})(?:\s*日)?\s*(?:[|,:\-]\s*)?(morning|midday|afternoon|evening|night|am|pm|sáng|trưa|chiều|tối|đêm|朝|昼|午後|夕方|夜)\s*[|:\-]\s*(.+)$/i);
  if (full) {
    return {
      day: parseInt(full[1], 10),
      slot: normalizeTimeSlot(full[2]),
      text: String(full[3] || '').trim(),
      structured: true
    };
  }

  const dayOnly = raw.match(/^(?:day|d|ngay|ngày|第)?\s*(\d{1,2})(?:\s*日)?\s*[|:\-]\s*(.+)$/i);
  if (dayOnly) {
    return {
      day: parseInt(dayOnly[1], 10),
      slot: '',
      text: String(dayOnly[2] || '').trim(),
      structured: true
    };
  }

  return { day: null, slot: '', text: raw, structured: false };
}

function parseSelfHealingInput(text) {
  const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
  const parsed = lines.map(parseSelfHealingLine).filter(Boolean);
  const hasStructured = parsed.some(p => p.structured);
  const grouped = new Map();
  let currentDay = 1;

  parsed.forEach(row => {
    const day = hasStructured ? (row.day || currentDay || 1) : 1;
    currentDay = day;
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push({
      original: row.text,
      text: row.text,
      changed: false,
      reason: '',
      slot: normalizeTimeSlot(row.slot)
    });
  });

  const days = [...grouped.keys()].sort((a, b) => a - b).map(day => ({ day, activities: grouped.get(day) }));
  const flatActivities = dedupePlanItems(days.flatMap(d => d.activities.map(a => a.text)));
  return {
    hasStructured,
    days: days.length ? days : [{ day: 1, activities: flatActivities.map(item => ({ original: item, text: item, changed: false, reason: '', slot: '' })) }],
    flatActivities
  };
}

function cleanSelfHealingActivityText(value) {
  let text = String(value || '').trim();
  if (!text) return '';
  text = text
    .replace(/^\d{4}-\d{2}-\d{2}\s*[|｜]\s*/i, '')
    .replace(/^(?:day|d|ngay|ngày|第)\s*\d{1,2}(?:\s*日)?\s*[|｜:]\s*/i, '')
    .replace(/^(?:morning|midday|afternoon|evening|night|am|pm|sáng|trưa|chiều|tối|đêm|朝|昼|午後|夕方|夜)\s*[|｜:]\s*/i, '');
  return text.trim();
}

function buildSelfHealingPromptLines(days, lang = DEFAULT_LANG) {
  const lines = [];
  cloneSelfHealingDays(days).forEach((day, idx) => {
    day.activities.forEach(activity => {
      const slot = formatSlotLabel(activity.slot, lang);
      const dayLabel = tr(lang, 'common.dayLabel', day.day || (idx + 1));
      const prefix = slot ? `${dayLabel} | ${slot}` : `${dayLabel}`;
      lines.push(`${prefix} | ${activity.text}`);
    });
  });
  return lines.length ? lines : [];
}

function normalizeHealedText(text) {
  return String(text || '').trim().toLowerCase();
}

function classifyIncident(eventText) {
  const text = normalizeHealedText(eventText);
  const rainy = /mưa|rain|drizzle|bão|giông|typhoon|lụt|flood|雨|嵐|台風/.test(text);
  const hot = /nắng|nóng|heat|heatwave|extreme heat|猛暑|酷暑|暑/.test(text);
  const windy = /gió|wind|gust|強風|風が強/.test(text);
  const closure = /đóng cửa|closed|closure|休業|臨時休業|closed today/.test(text);
  const strike = /đình công|strike|ストライキ|walkout/.test(text);
  const traffic = /kẹt xe|tắc đường|traffic jam|road block|road closed|渋滞|通行止め/.test(text);
  const overbook = /hết chỗ|full booked|fully booked|overbook|sold out|満席|予約不可/.test(text);
  const health = /ốm|mệt|say nắng|injury|sick|ill|food poisoning|体調不良|発熱/.test(text);
  let type = 'default';
  let severity = 'low';

  if (closure) {
    type = 'closure';
    severity = /(cả ngày|all day|entire day|終日)/.test(text) ? 'high' : 'medium';
  } else if (strike) {
    type = 'strike';
    severity = /(toàn tuyến|all lines|citywide|全面|全線)/.test(text) ? 'high' : 'medium';
  } else if (traffic) {
    type = 'traffic';
    severity = /(severe|nghiêm trọng|rất nặng|全域|major)/.test(text) ? 'high' : 'medium';
  } else if (overbook) {
    type = 'overbook';
    severity = /(all|mọi|all day|hết toàn bộ|full day)/.test(text) ? 'high' : 'medium';
  } else if (health) {
    type = 'health';
    severity = /(sốt|fever|hospital|nhập viện|救急)/.test(text) ? 'high' : 'medium';
  } else if (/bão|giông|typhoon|lụt|flood|hurricane|台風|暴風雨|雷雨/.test(text) || (rainy && windy && /(mưa to|mưa lớn|heavy rain|rainstorm|torrential|豪雨|大雨|gió lớn|gió mạnh|strong wind|暴風|強風)/.test(text))) {
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
  } else if (hot) {
    type = 'heat';
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

function incidentReasonText(incident, lang = DEFAULT_LANG) {
  if (!incident) return tr(lang, 'heal.reasonDefault');
  if (incident.type === 'storm') return tr(lang, 'heal.reasonStorm');
  if (incident.type === 'heat') return tr(lang, 'heal.reasonHeat');
  if (incident.type === 'rain') return tr(lang, 'heal.reasonRain');
  if (incident.type === 'wind') return tr(lang, 'heal.reasonWind');
  if (incident.type === 'closure') return tr(lang, 'heal.reasonClosure');
  if (incident.type === 'strike') return tr(lang, 'heal.reasonStrike');
  if (incident.type === 'traffic') return tr(lang, 'heal.reasonTraffic');
  if (incident.type === 'overbook') return tr(lang, 'heal.reasonOverbook');
  if (incident.type === 'health') return tr(lang, 'heal.reasonHealth');
  return tr(lang, 'heal.reasonDefault');
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
  if (!incident || incident.severity === 'low') return false;
  const text = normalizeHealedText(item);
  const incidentText = normalizeHealedText(incident.text);
  const seaTransit = /boat|cruise|ferry|港|船/.test(text);
  const hasIndoorFoodCue = /nhà hàng|quán|restaurant|café|cafe|izakaya|food hall|indoor/.test(text);
  const outdoorFood = /bbq|barbecue|picnic|outdoor dining|grill/.test(text) && !hasIndoorFoodCue;
  const exposedOutdoor = /beach|sunset|outdoor|park|hike|trail|garden|boat|cruise|snorkel|surf|bbq|barbecue|bay|picnic|viewpoint|biển|bãi biển|ngắm hoàng hôn|海|ビーチ|公園|散策|ハイキング/.test(text);
  const strenuous = /hike|trail|trek|climb|surf|snorkel|run|adventure|ハイキング|登山|トレッキング|leo núi/.test(text);
  const nightlife = /bar|beer|pub|club|izakaya|karaoke|nhậu|bia|バー|居酒屋/.test(text);
  const incidentMentionsThis = text.length >= 4 && incidentText.includes(text);

  if (incident.type === 'closure') {
    if (incidentMentionsThis) return true;
    return incident.severity === 'high' ? (info.category !== 'transit') : (info.category === 'food' || info.category === 'indoor' || info.category === 'outdoor');
  }
  if (incident.type === 'strike') {
    return info.category === 'transit' || seaTransit;
  }
  if (incident.type === 'traffic') {
    return info.category === 'transit' || /airport|station|transfer|drive|bus|train|taxi|空港|駅|移動/.test(text);
  }
  if (incident.type === 'overbook') {
    if (incidentMentionsThis) return true;
    return info.category === 'food' || /booking|reservation|tour|ticket|予約|book/.test(text);
  }
  if (incident.type === 'health') {
    return strenuous || exposedOutdoor || nightlife;
  }

  if (incident.severity === 'medium') {
    if (info.category === 'transit') return seaTransit;
    if (info.category === 'food') return outdoorFood;
    return exposedOutdoor || seaTransit || outdoorFood;
  }

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
    if (incidentType === 'traffic' || incidentType === 'strike') score += /food hall|café|cafe|indoor market|museum/.test(key) ? 2 : 0;
    if (incidentType === 'overbook') score += /food hall|restaurant|café|cafe|indoor market/.test(key) ? 2 : 0;
    if (incidentType === 'health') {
      if (/spa|café|cafe|museum|aquarium|cinema/.test(key)) score += 3;
      if (/arcade/.test(key)) score -= 1;
    }
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

function formatReplacementActivity(original, replacement, lang = DEFAULT_LANG) {
  const source = String(original || '').trim();
  const target = String(replacement || '').trim();
  const lower = normalizeHealedText(source);
  if (!source || !target) return target || source;
  if (lang === 'ja') {
    if (/^.*(visit|tham quan|trải nghiệm|観光|散策)/i.test(source)) return `${target}に変更`;
    if (/ăn|lunch|dinner|breakfast|restaurant|quán|nhà hàng|レストラン|食事/.test(lower)) return `${target}で食事に変更`;
    return `${target}に変更`;
  }
  if (lang === 'en') {
    if (/^visit\s+/i.test(source)) return source.replace(/^visit\s+/i, `Visit ${target} instead of `);
    if (/ăn|lunch|dinner|breakfast|restaurant|quán|nhà hàng/.test(lower)) return `Eat at ${target}`;
    if (/ngắm|sunset|view|beach|biển/.test(lower)) return `Move indoors to ${target}`;
    return `${target}`;
  }
  if (/^đi đến\s+/i.test(source)) return source.replace(/^đi đến\s+/i, `Đi đến ${target} (thay thế cho) `);
  if (/^visit\s+/i.test(source)) return source.replace(/^visit\s+/i, `Visit ${target} (instead of) `);
  if (/^tham quan\s+/i.test(source)) return `Tham quan ${target}`;
  if (/ăn|lunch|dinner|breakfast|restaurant|quán|nhà hàng/.test(lower)) return `Ăn tại ${target}`;
  if (/ngắm|sunset|view|beach|biển/.test(lower)) return `Tham quan trong nhà tại ${target}`;
  return `${target}`;
}

function summarizeIncident(eventText, incident, lang = DEFAULT_LANG) {
  const text = String(eventText || '').trim();
  if (!text) return tr(lang, 'heal.summaryDefault');
  if (incident.type === 'closure') return tr(lang, 'heal.summaryClosure', text);
  if (incident.type === 'strike') return tr(lang, 'heal.summaryStrike', text);
  if (incident.type === 'traffic') return tr(lang, 'heal.summaryTraffic', text);
  if (incident.type === 'overbook') return tr(lang, 'heal.summaryOverbook', text);
  if (incident.type === 'health') return tr(lang, 'heal.summaryHealth', text);
  if (incident.type === 'storm') return tr(lang, 'heal.summaryStorm', text);
  if (incident.type === 'rain') return tr(lang, 'heal.summaryRain', text);
  if (incident.type === 'heat') return tr(lang, 'heal.summaryHeat', text);
  if (incident.type === 'wind') return tr(lang, 'heal.summaryWind', text);
  return text;
}

function normalizeSelfHealingActivity(activity) {
  const fromString = typeof activity === 'string' ? activity : '';
  const original = cleanSelfHealingActivityText((activity && activity.original) || fromString || '');
  const text = cleanSelfHealingActivityText((activity && activity.text) || original);
  if (!text) return null;
  const changed = !!(activity && activity.changed) || normalizeHealedText(original) !== normalizeHealedText(text);
  const reason = changed ? String((activity && activity.reason) || '').trim() : '';
  const slot = normalizeTimeSlot(activity && activity.slot);
  return { original: original || text, text, changed, reason, slot };
}

function cloneSelfHealingDays(days) {
  return (Array.isArray(days) ? days : []).map((day, idx) => ({
    day: Number(day && day.day) || (idx + 1),
    activities: (Array.isArray(day && day.activities) ? day.activities : [])
      .map(normalizeSelfHealingActivity)
      .filter(Boolean)
  }));
}

// NOT deduped: a plan legitimately repeating the same activity text across days (e.g. "Ăn sáng tại
// khách sạn" every morning) is two distinct real occurrences, not one — every caller here needs the
// true count/list (baselineCount and candidateCount below compare against each other to catch a
// dropped day, and canonicalHealedActivities uses this as the actual flat itinerary shown to the
// user and fed into satisfaction/risk scoring). Silently collapsing a legitimate repeat used to
// undercount baselineCount, which then rejected a well-formed AI response for no real reason.
function flattenSelfHealingActivitiesFromDays(days) {
  const flat = [];
  cloneSelfHealingDays(days).forEach(day => {
    day.activities.forEach(activity => {
      if (activity && activity.text) flat.push(activity.text);
    });
  });
  return flat;
}

// NOT deduped: this maps activityList onto templateDays purely by position (list[cursor], one
// entry per original activity slot in order) — deduping it first would desync that mapping the
// moment the plan has a real repeated activity, shifting every activity after the repeat onto the
// wrong day/slot instead of just leaving the repeat itself alone.
function buildDaysFromActivityList(templateDays, activityList) {
  const list = Array.isArray(activityList) ? activityList : [];
  if (!list.length) return [];

  const template = cloneSelfHealingDays(templateDays);
  if (!template.length) {
    return [{
      day: 1,
      activities: list.map(item => ({ original: item, text: item, changed: false, reason: '', slot: '' }))
    }];
  }

  const flatOriginals = [];
  template.forEach(day => day.activities.forEach(activity => flatOriginals.push(activity.original || activity.text)));
  let cursor = 0;
  const rebuilt = template.map(day => {
    const activities = day.activities.map(activity => {
      const next = list[cursor] || activity.text || activity.original;
      cursor += 1;
      const normalized = normalizeSelfHealingActivity({
        original: activity.original || activity.text,
        text: next,
        changed: normalizeHealedText(next) !== normalizeHealedText(activity.original || activity.text),
        reason: activity.reason || '',
        slot: activity.slot || ''
      });
      return normalized;
    }).filter(Boolean);
    return { day: day.day, activities };
  });

  if (cursor < list.length) {
    const tail = list.slice(cursor).map(item => ({ original: item, text: item, changed: false, reason: '', slot: '' }));
    const last = rebuilt[rebuilt.length - 1];
    last.activities = last.activities.concat(tail);
  }

  // Keep this deterministic: if the template has no usable activities, fall back to a flat one-day list.
  if (!flatOriginals.length) {
    return [{
      day: 1,
      activities: list.map(item => ({ original: item, text: item, changed: false, reason: '', slot: '' }))
    }];
  }
  return rebuilt;
}

function normalizeAiReplacementHints(replacements) {
  const out = [];
  const seen = new Set();
  (Array.isArray(replacements) ? replacements : []).forEach(row => {
    const original = String(row && row.original || '').trim();
    const replacement = String(row && row.replacement || '').trim();
    if (!original || !replacement) return;
    const key = `${normalizeHealedText(original)}=>${normalizeHealedText(replacement)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ original, replacement, reason: String(row && row.reason || '').trim() });
  });
  return out;
}

/**
 * Applies the AI's {original, replacement} hints onto the day-structured plan. The AI's hint
 * schema carries only a name pair, no day/position — so when a plan legitimately repeats the same
 * activity text across days (e.g. "Ăn sáng tại khách sạn" every morning), there is genuinely no
 * information in the hint to say which occurrence it means (and no, checking whether the incident
 * "applies" to that activity doesn't help disambiguate either — two occurrences with the exact same
 * text always classify identically, so a text-based relevance check can only ever accept or reject
 * BOTH of them together, never pick one over the other).
 *
 * Given that real ambiguity, this applies the hint to every currently-unclaimed activity matching
 * `original`, not just the first one in day order. Previously it took only the first match, which
 * wasn't actually more correct — it was arbitrary, and looked like a deliberate choice while quietly
 * leaving the same-named activity on every other day (possibly the one the incident actually meant)
 * unfixed. Applying to all of them is at least a predictable, explainable rule instead of a silent
 * day-order coin flip.
 */
function applyReplacementHintsToDays(days, replacementHints) {
  const hints = normalizeAiReplacementHints(replacementHints);
  if (!hints.length) return cloneSelfHealingDays(days);

  const used = new Set();
  const normalizedDays = cloneSelfHealingDays(days).map(day => ({
    day: day.day,
    activities: day.activities.map(activity => ({ ...activity }))
  }));

  hints.forEach(hint => {
    const sourceKey = normalizeHealedText(hint.original);
    const hintKey = `${sourceKey}=>${normalizeHealedText(hint.replacement)}`;
    if (used.has(hintKey)) return;

    const matches = [];
    normalizedDays.forEach(day => {
      day.activities.forEach(activity => {
        if (activity.changed) return; // already claimed by an earlier hint this pass
        if (normalizeHealedText(activity.original) === sourceKey) matches.push(activity);
      });
    });
    if (!matches.length) return;

    matches.forEach(activity => {
      activity.text = hint.replacement;
      activity.changed = normalizeHealedText(activity.text) !== normalizeHealedText(activity.original);
      activity.reason = hint.reason || activity.reason || '';
    });
    used.add(hintKey);
  });

  return normalizedDays;
}

function deriveReplacementsFromDays(days) {
  const out = [];
  cloneSelfHealingDays(days).forEach(day => {
    day.activities.forEach(activity => {
      if (!activity.changed) return;
      out.push({ original: activity.original, replacement: activity.text, reason: activity.reason || '' });
    });
  });
  return out;
}

function canonicalHealedActivities(data) {
  if (Array.isArray(data && data.updated_days) && data.updated_days.length) {
    const fromDays = flattenSelfHealingActivitiesFromDays(data.updated_days);
    if (fromDays.length) return fromDays;
  }
  return dedupePlanItems(Array.isArray(data && data.updated_itinerary) ? data.updated_itinerary : []);
}

function buildPlannerDataFromHealedData(healedData, plannerData) {
  const normalizedDays = cloneSelfHealingDays(healedData && healedData.updated_days);
  let days = normalizedDays.map((day, idx) => ({
    day: Number(day && day.day) || (idx + 1),
    activities: (Array.isArray(day && day.activities) ? day.activities : [])
      .map(activity => ({
        text: String(activity && activity.text || '').trim(),
        slot: normalizeTimeSlot(activity && activity.slot)
      }))
      .filter(activity => activity.text)
  })).filter(day => day.activities.length);

  if (!days.length) {
    const flat = canonicalHealedActivities(healedData);
    if (flat.length) {
      days = [{
        day: 1,
        activities: flat.map(text => ({ text, slot: '' }))
      }];
    }
  }

  return {
    ...(plannerData && typeof plannerData === 'object' ? plannerData : {}),
    days
  };
}

function normalizeSelfHealingAiResult(baseData, aiData) {
  const fallback = {
    ...baseData,
    updated_days: cloneSelfHealingDays(baseData && baseData.updated_days),
    updated_itinerary: canonicalHealedActivities(baseData),
    replacements: deriveReplacementsFromDays(baseData && baseData.updated_days)
  };

  if (!aiData || typeof aiData !== 'object') return fallback;

  let updatedDays = [];
  const baselineCount = flattenSelfHealingActivitiesFromDays(fallback.updated_days).length;
  if (Array.isArray(aiData.updated_days) && aiData.updated_days.length) {
    const candidateDays = cloneSelfHealingDays(aiData.updated_days);
    const candidateCount = flattenSelfHealingActivitiesFromDays(candidateDays).length;
    // Same safeguard the updated_itinerary branch below already has — don't silently accept a
    // day-structured response covering a different number of activities than the original
    // itinerary (e.g. the model dropped a whole day), which would otherwise delete part of the
    // trip with no warning. If it doesn't match, fall through to try replacements/updated_itinerary
    // instead of trusting this one.
    if (baselineCount === 0 || candidateCount === baselineCount) updatedDays = candidateDays;
  }
  if (!updatedDays.length && Array.isArray(aiData.replacements) && aiData.replacements.length) {
    updatedDays = applyReplacementHintsToDays(fallback.updated_days, aiData.replacements);
  }
  if (!updatedDays.length && Array.isArray(aiData.updated_itinerary) && aiData.updated_itinerary.length) {
    // NOT deduped: buildDaysFromActivityList maps this list onto the original days purely by
    // position (list[cursor]), so it never needed unique text — but a plan legitimately repeating
    // the same activity across days (e.g. "Ăn sáng tại khách sạn" every morning) would otherwise
    // get collapsed to one entry here, undercounting against baselineCount and rejecting a
    // perfectly good AI response for no reason other than the original itinerary having a repeat.
    const normalizedList = aiData.updated_itinerary.map(cleanSelfHealingActivityText).filter(Boolean);
    // Keep day mapping stable: only map by position when the LLM keeps the exact activity count.
    if (baselineCount > 0 && normalizedList.length === baselineCount) {
      updatedDays = buildDaysFromActivityList(fallback.updated_days, normalizedList);
    }
  }

  if (!updatedDays.length) return fallback;

  const replacements = deriveReplacementsFromDays(updatedDays);
  const updatedItinerary = flattenSelfHealingActivitiesFromDays(updatedDays);
  if (!updatedItinerary.length) return fallback;

  return {
    ...fallback,
    updated_days: updatedDays,
    updated_itinerary: updatedItinerary,
    replacements
  };
}

function buildSelfHealingPlan(planData, itin, eventText, context, lang = DEFAULT_LANG) {
  const incident = classifyIncident(eventText);
  const sourceDays = Array.isArray(planData && planData.days) && planData.days.length
    ? planData.days
    : [{ day: 1, activities: dedupePlanItems(itin).map(item => ({ text: item, slot: '' })) }];

  const updatedDays = [];
  const replacements = [];
  const used = new Set();

  sourceDays.forEach((day, index) => {
    const activities = [];
    const rawActivities = Array.isArray(day && day.activities) ? day.activities : [];
    const normalizedItems = dedupePlanItems(rawActivities.map(activity => {
      if (typeof activity === 'string') return activity;
      return String(activity && activity.text || '').trim();
    })).map(itemText => {
      const source = rawActivities.find(activity => {
        const text = typeof activity === 'string' ? activity : String(activity && activity.text || '');
        return normalizeHealedText(text) === normalizeHealedText(itemText);
      });
      return {
        text: itemText,
        slot: normalizeTimeSlot(source && source.slot)
      };
    });

    normalizedItems.forEach(itemObj => {
      const item = itemObj.text;
      const info = classifyActivity(item);
      const key = normalizeHealedText(item);
      used.add(key);

      if (!shouldReplaceActivity(item, info, incident)) {
        activities.push({ original: item, text: item, changed: false, reason: '', slot: itemObj.slot || '' });
        return;
      }

      const replacement = getReplacementCandidates(item, context || {}, incident.type, info)
        .find(candidate => !used.has(normalizeHealedText(candidate)) && normalizeHealedText(candidate) !== key);

      if (!replacement) {
        activities.push({ original: item, text: item, changed: false, reason: '', slot: itemObj.slot || '' });
        return;
      }

      used.add(normalizeHealedText(replacement));
      const reason = incidentReasonText(incident, lang);

      const replacementText = formatReplacementActivity(item, replacement, lang);
      activities.push({ original: item, text: replacementText, changed: true, reason, slot: itemObj.slot || '' });
      replacements.push({ original: item, replacement: replacementText, reason });
    });
    updatedDays.push({ day: day.day || (index + 1), activities });
  });

  if (incident.severity === 'low') {
    return {
      incident_summary: summarizeIncident(eventText, incident, lang),
      severity: incident.severity,
      replacements: [],
      updated_days: updatedDays.map(day => ({
        day: day.day,
        activities: day.activities.map(a => ({ original: a.original, text: a.original, changed: false, reason: '', slot: a.slot || '' }))
      })),
      updated_itinerary: dedupePlanItems(sourceDays.flatMap(d => (Array.isArray(d.activities) ? d.activities : []).map(a => typeof a === 'string' ? a : String(a && a.text || '').trim()))),
      context_summary: buildPlannerContextSummary(context || {}),
      notes: tr(lang, 'heal.reasonDefault')
    };
  }

  return {
    incident_summary: summarizeIncident(eventText, incident, lang),
    severity: incident.severity,
    replacements,
    updated_days: updatedDays,
    updated_itinerary: updatedDays.flatMap(day => day.activities.map(a => a.text)),
    context_summary: buildPlannerContextSummary(context || {}),
    notes: incidentReasonText(incident, lang)
  };
}

function renderHealHtml(data, lang) {
  let html = '';
  if (data.incident_summary) {
    html += `<div class="summary-note"><strong>${tr(lang, 'heal.incidentLabel')}</strong> ${escapeHtml(data.incident_summary)}${data.severity ? ` · ${tr(lang, 'heal.severityLabel')} ${escapeHtml(data.severity)}` : ''}</div>`;
  }
  if (data.context_summary) {
    html += `<div class="summary-note"><strong>${tr(lang, 'heal.planLabel')}</strong> ${escapeHtml(data.context_summary)}</div>`;
  }
  if (Array.isArray(data.updated_days) && data.updated_days.length) {
    html += `<div class="day-block"><h4>${tr(lang, 'common.newItineraryHeader')}</h4>${data.updated_days.map((day, idx) => {
      const activities = Array.isArray(day.activities) ? day.activities : [];
      return `<div class="day-block"><h4>${tr(lang, 'common.dayLabel', day.day || (idx + 1))}</h4><ul>${activities.map(activity => {
        const changed = !!activity.changed;
        const original = String(activity.original || '');
        const text = String(activity.text || original);
        const slot = formatSlotLabel(activity.slot, lang);
        const reason = changed && activity.reason ? `<span class="reason-tag">${tr(lang, 'heal.reasonPrefix')} ${escapeHtml(activity.reason)}</span>` : '';
        const before = changed && original && original !== text ? `<del>${escapeHtml(original)}</del> → ` : '';
        const slotHtml = slot ? `<span class="slot-badge">${escapeHtml(slot)}</span>` : '';
        return `<li class="${changed ? 'changed-item' : ''}">${slotHtml}${before}<strong>${escapeHtml(text)}</strong>${reason} ${mapLink(text, undefined, lang)}${venueWarning(text, lang)}</li>`;
      }).join('')}</ul></div>`;
    }).join('')}</div>`;
  } else if ((data.updated_itinerary || []).length) {
    html += `<div class="day-block"><h4>${tr(lang, 'common.newItineraryHeader')}</h4><ul>${data.updated_itinerary.map(a => `<li>${escapeHtml(a)} ${mapLink(a, undefined, lang)}${venueWarning(a, lang)}</li>`).join('')}</ul></div>`;
  }
  if (data.notes) html += `<div class="summary-note">${escapeHtml(data.notes)}</div>`;
  html += renderImpactAiHtml(data.impactAi, lang);
  html += renderRiskPanelHtml(data.risks, lang);
  return html || tr(lang, 'common.noChange');
}

// ================================================================
// Explainable Self-Healing (Feature 5) + Travel Risk Detection (Feature 6).
// Both reuse the Group Decision scoring primitives — still no LLM call.
// ================================================================

/** Average group satisfaction across a whole list of activities (not just one venue). */
function computeItinerarySatisfaction(members, activities, lang) {
  const list = (activities || []).filter(Boolean);
  if (!members || !members.length || !list.length) return null;
  const perMember = members.map(m => {
    const tags = extractPreferenceTags(m.pref, lang);
    const total = list.reduce((sum, activityText) => sum + scoreEntryForMember({ name: activityText }, tags, lang).score, 0);
    return { name: m.name, score: Math.round(total / list.length) };
  });
  const overall = Math.round(perMember.reduce((s, m) => s + m.score, 0) / perMember.length);
  return { overall, perMember };
}

/** Before/after group satisfaction across a self-healing swap. Returns null when there are no members to score against. */
function computeSatisfactionDelta(members, beforeActivities, afterActivities, lang) {
  const before = computeItinerarySatisfaction(members, beforeActivities, lang);
  const after = computeItinerarySatisfaction(members, afterActivities, lang);
  if (!before || !after) return null;
  const perMember = after.perMember.map((m, i) => ({ name: m.name, before: before.perMember[i].score, after: m.score }));
  return { before: before.overall, after: after.overall, perMember };
}

/** Great-circle distance in km between two lat/lon points. Null if any coordinate is missing/non-numeric. */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds the knowledge-base entry (curated or OSM) matching an activity's text by name, exact then
 * substring — same matching pickPrimaryKnowledgeEntry uses, but WITHOUT its "nothing matched, just
 * take the first candidate" fallback. That fallback is fine for pickPrimaryKnowledgeEntry's use
 * case (scoring the one place a user explicitly typed), but here it would silently attach a
 * random venue's coordinates to an unrelated activity and manufacture a fake distance — so no
 * match here correctly means "location unknown", not "assume it's this one".
 */
// Generic qualifiers stripped out when comparing an activity's text against a knowledge-base
// name's significant words — "Okinawa Churaumi Aquarium" should still match "Đi tham quan
// Churaumi Aquarium" even though the activity text never repeats the prefecture name.
const NAME_MATCH_STOPWORDS = new Set(['okinawa', 'the', 'a', 'an']);

function coreNameTokens(name) {
  return String(name || '').toLowerCase().split(/[\s,()]+/).filter(t => t && !NAME_MATCH_STOPWORDS.has(t));
}

function findKnowledgeEntryForActivity(activityText, candidates) {
  const text = String(activityText || '').trim().toLowerCase();
  if (!text) return null;
  const named = (candidates || []).filter(c => c && c.name);
  const exact = named.find(c => c.name.trim().toLowerCase() === text);
  if (exact) return exact;
  const substring = named.find(c => text.includes(c.name.trim().toLowerCase()) || c.name.trim().toLowerCase().includes(text));
  if (substring) return substring;
  // Fallback: every one of the venue name's significant words shows up somewhere in the activity
  // text, ignoring generic qualifiers like "Okinawa" — catches a verb-phrase wrapper ("Đi tham
  // quan ...", "Thăm dò ...") the substring check above doesn't tolerate. Requires at least 2
  // matching tokens so a single common word (e.g. just "cafe") can't cause a loose mismatch.
  return named.find(c => {
    const tokens = coreNameTokens(c.name);
    return tokens.length >= 2 && tokens.every(t => text.includes(t));
  }) || null;
}

// Consecutive-stop distance thresholds (km) for detectGeographicRisks — Okinawa's main island is
// roughly 100km end to end, so a ~15-30km hop between back-to-back stops already means real
// driving time the itinerary's ordering gave no indication of.
const GEO_JUMP_MEDIUM_KM = 15;
const GEO_JUMP_HIGH_KM = 30;

/**
 * Flags a day whose consecutive activities are geographically far apart from each other — a
 * zigzag or simply unrealistic itinerary the planner LLM has no way to catch on its own (it only
 * ever sees place names, never real coordinates). Deterministic, using whatever coordinates the
 * RAG knowledge base happens to have (curated entries geocoded via rag-server/geocode-curated.js,
 * OSM entries via rag-server/fetch-osm-restaurants.js) — an activity that doesn't match a
 * coordinate-bearing entry is simply skipped rather than guessed at, so this only ever warns about
 * jumps it can actually verify, never invents one from a bad match.
 * Returns risk objects in the same {type, level, detail} shape as detectTravelRisks, meant to be
 * concatenated with its output before rendering (see renderRiskPanelHtml).
 */
function detectGeographicRisks(planData, candidates, lang) {
  if (!planData || !Array.isArray(planData.days) || !candidates || !candidates.length) return [];
  const risks = [];
  planData.days.forEach((day, i) => {
    if (!day || !Array.isArray(day.activities)) return;
    const dayLabel = day.day || (i + 1);
    let prevCoords = null;
    let maxJumpKm = 0;
    day.activities.forEach(activity => {
      const text = plannerActivityText(activity);
      if (!text) return;
      const entry = findKnowledgeEntryForActivity(text, candidates);
      const lat = entry && parseFloat(entry.lat);
      const lon = entry && parseFloat(entry.lon);
      // An unmatched activity is simply invisible to the chain — never breaks it, never
      // contributes to it — so the two nearest activities that DO have coordinates on either
      // side of it still get compared directly. That's the whole point: most days interleave
      // known attractions with restaurant picks that don't resolve to a coordinate, and a
      // "Naha -> [some unresolved lunch spot] -> Motobu" day is exactly the itinerary this
      // function exists to flag, not a case to silently give a pass.
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      if (prevCoords) {
        const dist = haversineDistanceKm(prevCoords.lat, prevCoords.lon, lat, lon);
        if (dist != null) maxJumpKm = Math.max(maxJumpKm, dist);
      }
      prevCoords = { lat, lon };
    });
    if (maxJumpKm >= GEO_JUMP_HIGH_KM) {
      risks.push({ type: 'geography', level: 'high', detail: tr(lang, 'risk.geographyHigh', dayLabel, Math.round(maxJumpKm)) });
    } else if (maxJumpKm >= GEO_JUMP_MEDIUM_KM) {
      risks.push({ type: 'geography', level: 'medium', detail: tr(lang, 'risk.geographyMedium', dayLabel, Math.round(maxJumpKm)) });
    }
  });
  return risks;
}

/**
 * Rule-based travel risk scan: excessive walking, budget, transportation, weather.
 * Entirely deterministic — reuses classifyActivity()/classifyIncident() already
 * built for self-healing, so no new AI call and no new data source.
 */
function detectTravelRisks(activities, context, weatherIncident, lang) {
  const list = (activities || []).filter(Boolean);
  const risks = [];

  // The `.outdoor` boolean, not `.category === 'outdoor'` — classifyActivity's category is
  // mutually exclusive (food is checked before outdoor), so a beach BBQ or garden BBQ becomes
  // category:'food' and would be silently dropped from the walking/fatigue count even though
  // it's genuinely an outdoor activity. `.outdoor` is a separate, non-exclusive flag for exactly this.
  const outdoorCount = list.filter(a => classifyActivity(a).outdoor).length;
  if (outdoorCount >= 4) risks.push({ type: 'walking', level: 'high', detail: tr(lang, 'risk.walkingHigh', outdoorCount) });
  else if (outdoorCount >= 2) risks.push({ type: 'walking', level: 'medium', detail: tr(lang, 'risk.walkingMedium', outdoorCount) });

  const budgetNum = parseBudgetNumber(context && context.budget);
  const days = Math.max(1, Number(context && context.days) || 1);
  if (budgetNum) {
    const perDay = Math.round(budgetNum / days);
    if (perDay < 5000) risks.push({ type: 'budget', level: 'high', detail: tr(lang, 'risk.budgetHigh', perDay) });
    else if (perDay < 8000) risks.push({ type: 'budget', level: 'medium', detail: tr(lang, 'risk.budgetMedium', perDay) });
  }

  const notes = String((context && (context.notes + ' ' + (context.group || ''))) || '');
  const hasCarMention = /(thuê xe|rent a car|rental car|có xe|レンタカー|drive)/i.test(notes);
  const transitCount = list.filter(a => classifyActivity(a).category === 'transit').length;
  if (!hasCarMention && list.length >= 5 && transitCount === 0) {
    risks.push({ type: 'transport', level: 'medium', detail: tr(lang, 'risk.transportMedium') });
  }

  if (weatherIncident) {
    if (isSevereWeatherIncident(weatherIncident)) {
      risks.push({ type: 'weather', level: 'high', detail: tr(lang, 'risk.weatherHigh') });
    } else if (weatherIncident.severity === 'medium') {
      risks.push({ type: 'weather', level: 'medium', detail: tr(lang, 'risk.weatherMedium') });
    }
  }

  return risks;
}

function deltaClass(before, after) {
  return after > before ? 'delta-pos' : after < before ? 'delta-neg' : '';
}
function formatDelta(before, after) {
  const diff = after - before;
  return diff > 0 ? `+${diff}%` : `${diff}%`;
}

function renderSatisfactionDeltaHtml(delta, lang) {
  if (!delta) return '';
  let html = `<div class="sat-delta"><div class="sat-score-label">${escapeHtml(tr(lang, 'heal.satisfactionImpact'))}</div>`;
  html += `<div class="sat-delta-row overall"><span class="sat-who">${escapeHtml(tr(lang, 'group.overallLabel'))}</span><span class="sat-delta-value">${delta.before}% <span class="delta-arrow">→</span> ${delta.after}% <span class="${deltaClass(delta.before, delta.after)}">(${formatDelta(delta.before, delta.after)})</span></span></div>`;
  delta.perMember.forEach(m => {
    html += `<div class="sat-delta-row"><span class="sat-who">${escapeHtml(m.name)}</span><span class="sat-delta-value ${deltaClass(m.before, m.after)}">${formatDelta(m.before, m.after)}</span></div>`;
  });
  html += `</div>`;
  return html;
}

function renderRiskPanelHtml(risks, lang) {
  if (!risks || !risks.length) return '';
  let html = `<div class="risk-panel"><div class="sat-score-label">${escapeHtml(tr(lang, 'risk.title'))}</div>`;
  risks.forEach(r => {
    html += `<div class="risk-row"><span class="risk-level ${r.level}">${escapeHtml(tr(lang, 'risk.level.' + r.level))}</span><div class="risk-body"><div class="risk-type">${escapeHtml(tr(lang, 'risk.type.' + r.type))}</div><div class="risk-detail">${escapeHtml(r.detail)}</div></div></div>`;
  });
  html += `</div>`;
  return html;
}

function buildCameraFallback(mode, caption, model, lang = DEFAULT_LANG) {
  const clean = String(caption || '').trim();
  const lower = clean.toLowerCase();
  const tastyWords = ['ramen', 'noodle', 'soup', 'rice', 'bowl', 'sushi', 'udon', 'soba', 'curry', 'burger', 'steak', 'dish', 'food', 'pizza', 'pasta', 'tempura', 'bbq', 'grill'];
  const landmarkWords = ['temple', 'castle', 'tower', 'bridge', 'building', 'street', 'landmark', 'sign', 'statue', 'museum', 'market', 'station', 'pagoda'];
  const detect = (words) => words.some(word => lower.includes(word));
  const guess = mode === 'food'
    ? (detect(tastyWords) ? (lower.includes('ramen') ? 'món mì ramen' : lower.includes('sushi') ? 'món sushi' : lower.includes('rice') || lower.includes('bowl') ? 'món cơm/bát' : 'một món ăn') : 'một món ăn')
    : (detect(landmarkWords) ? (lower.includes('castle') ? 'một lâu đài' : lower.includes('temple') ? 'một ngôi chùa' : lower.includes('tower') ? 'một tòa tháp' : lower.includes('bridge') ? 'một cây cầu' : 'một địa danh/công trình') : 'một địa danh/công trình');

  if (!clean || clean === '(no response)') {
    return tr(lang, 'camera.fallbackUnknown', model || 'moondream');
  }
  return mode === 'food'
    ? tr(lang, 'camera.fallbackFood', guess)
    : tr(lang, 'camera.fallbackLandmark', guess);
}

// ---------- localStorage persistence (guarded — private mode can throw) ----------

const STORAGE_KEYS = {
  url: 'claude_proxy_url',
  ragUrl: 'rag_url',
  voiceName: 'voice_name',
  lang: 'app_lang',
  planner: 'planner_state_v1',
  group: 'group_state_v1',
  heal: 'heal_state_v1',
  voiceLog: 'voice_log_v1',
  auth: 'auth_session_v1',
  authUrl: 'auth_url'
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
  escapeHtml, mapLink, venueWarning, isGenericPlaceholderActivity, buildDayRouteMapUrl,
  detectMealType, isVagueVenueMention, buildVenueActivityText, resolvePlannerVenues,
  parseOpeningHoursRanges, isVenueOpenForMealType,
  weatherDescription,
  buildForecastEventFromDaily,
  findFirstJsonObject, extractJson, extractChunkContent,
  renderPlannerHtml, renderGroupScoreTableHtml, renderHealHtml, formatPlannerShareText,
  plannerActivityPrice, sumItineraryCost, renderItineraryCostSummaryHtml,
  looksLikeFoodOrDrinkActivity, correctedActivityPrice,
  formatYen, estimateEntryCostPerPerson, isFoodKnowledgeEntry,
  parseKnowledgeChunk, extractPreferenceTags, scoreEntryForMember, computeGroupSatisfaction,
  detectPreferenceConflicts, generateCompromiseOptions, buildReasoningReceipt, pickPrimaryKnowledgeEntry,
  renderSatisfactionScoreHtml, renderConflictCardsHtml, renderCompromiseOptionsHtml, renderReasoningReceiptHtml,
  dedupePlanItems, flattenActivities, normalizeHealedText,
  normalizeTimeSlot, formatSlotLabel, parseSelfHealingInput, buildSelfHealingPromptLines,
  buildConversationTranscript, normalizeExtractedSlots, missingTripSlots, buildVoiceFollowUpQuestion, detectItineraryIntent,
  computeChecklistStatus, renderTripChecklistHtml, fillMissingSlotsWithDefaults,
  classifyIncident, isSevereWeatherIncident, classifyActivity,
  buildCameraFallback,
  parseBudgetNumber, buildPlannerContextSummary, buildSelfHealingPlan,
  canonicalHealedActivities, buildPlannerDataFromHealedData, normalizeSelfHealingAiResult,
  relocalizeHealedData, normalizeMemberImpactAi, renderImpactAiHtml,
  computeItinerarySatisfaction, computeSatisfactionDelta, detectTravelRisks,
  haversineDistanceKm, findKnowledgeEntryForActivity, detectGeographicRisks,
  renderSatisfactionDeltaHtml, renderRiskPanelHtml,
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
    plannerContext: null,
    // The compromise option (A/B/C) the group has actually chosen on the Group Decision tab —
    // null until chosen. Purely a recorded decision (shown as "✓ Đã chọn"); it doesn't gate
    // anything else — the itinerary itself is the prerequisite (see updateGroupDecisionGate()).
    groupDecision: null
  };

  // ---------- Auth (login, admin user management, trip invites) ----------
  // Talks to auth-server/ (Express + JSON file, see that folder) — a separate optional local
  // server, same pattern as the RAG server. Session token kept in memory + localStorage only;
  // there is no real security here (plaintext-in-transit over local HTTP, server-side hashing
  // only) — this is a demo login for a hackathon prototype, not a production auth system.
  function authBase() {
    return (safeLoadString(STORAGE_KEYS.authUrl) || 'http://localhost:8900').replace(/\/+$/, '');
  }

  let authToken = null;
  let currentUser = null; // { username, role }

  function loadAuthFromStorage() {
    const saved = safeLoad(STORAGE_KEYS.auth);
    if (saved && saved.token && saved.user) {
      authToken = saved.token;
      currentUser = saved.user;
    }
  }
  function persistAuth() {
    if (authToken && currentUser) safeSave(STORAGE_KEYS.auth, { token: authToken, user: currentUser });
    else { try { localStorage.removeItem(STORAGE_KEYS.auth); } catch (e) { /* ignore */ } }
  }
  loadAuthFromStorage();

  /** Thin fetch wrapper for auth-server: adds the bearer token, throws with the server's own error message, and forces re-login on a 401 (session expired or server restarted since). */
  async function authApi(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    let res;
    try {
      res = await fetch(`${authBase()}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (err) {
      throw new Error(T('auth.connectError', authBase()));
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body, e.g. some 204s */ }
    if (res.status === 401 && path !== '/login') {
      authToken = null;
      currentUser = null;
      persistAuth();
      applyAuthUI(T('auth.sessionExpired'));
    }
    if (!res.ok) throw new Error((data && data.error) || (res.status + ' ' + res.statusText));
    return data;
  }

  const loginOverlay = document.getElementById('login-overlay');
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  const loginSubmitBtn = document.getElementById('login-submit');
  const loginErrorEl = document.getElementById('login-error');
  const loginCloseBtn = document.getElementById('login-close');
  const headerLoginBtn = document.getElementById('header-login-btn');
  const userInfoEl = document.getElementById('user-info');
  const userNameBadge = document.getElementById('user-name-badge');
  const logoutBtn = document.getElementById('logout-btn');
  const adminTabBtn = document.getElementById('admin-tab-btn');
  const invitesBtn = document.getElementById('invites-btn');
  const invitesCountEl = document.getElementById('invites-count');
  const invitesPanel = document.getElementById('invites-panel');
  const invitesPanelList = document.getElementById('invites-panel-list');
  const invitesCloseBtn = document.getElementById('invites-close');

  /**
   * Wraps a generated itinerary's inner HTML in a blur + lock overlay when nobody is logged in,
   * instead of blocking the whole app up front. The content is real (already generated), just
   * obscured — a "there's something here, log in to see it" nudge rather than a hard wall.
   */
  function withLoginGateHtml(innerHtml) {
    if (currentUser) return innerHtml;
    return `<div class="blur-wrap"><div class="blur-content">${innerHtml}</div><div class="blur-lock"><div class="blur-lock-icon">🔒</div><p>${escapeHtml(T('auth.resultLocked'))}</p><button type="button" class="result-login-btn">${escapeHtml(T('auth.loginBtn'))}</button></div></div>`;
  }
  // Clicking the lock button inside any blurred result opens the login modal — delegated on
  // <body> since these buttons are injected dynamically into different tabs' result areas.
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('.result-login-btn')) openLoginModal();
  });

  function openLoginModal() {
    loginErrorEl.style.display = 'none';
    loginOverlay.style.display = 'flex';
    loginUsername.focus();
  }
  function closeLoginModal() {
    loginOverlay.style.display = 'none';
  }
  headerLoginBtn.addEventListener('click', openLoginModal);
  loginCloseBtn.addEventListener('click', closeLoginModal);
  loginOverlay.addEventListener('click', (e) => { if (e.target === loginOverlay) closeLoginModal(); });

  /** Re-renders the last generated itinerary without the blur, now that we're logged in — the content itself never changed, only whether it's obscured. */
  function unlockLastPlannerResult() {
    if (!lastGeneratedTrip || !lastGeneratedTrip.data) return;
    const { destination, days, data } = lastGeneratedTrip;
    const risks = detectTravelRisks(flattenActivities(data), lastGeneratedTrip, null, currentLang);
    const pResultEl = document.getElementById('p-result');
    if (pResultEl) pResultEl.innerHTML = `<div class="result-box">${renderPlannerHtml(data, destination, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}</div>`;
    showInviteBox(lastGeneratedTrip);
  }

  /** Shows/hides the logged-in header bits based on current auth state; the login modal itself is opened on demand (header button, a blurred result's lock button, or a forced session-expired prompt) rather than blocking the app up front. Pass a message to force the modal open with that error (e.g. session expired). */
  function applyAuthUI(loginMessage) {
    if (currentUser) {
      closeLoginModal();
      userInfoEl.style.display = 'flex';
      headerLoginBtn.style.display = 'none';
      userNameBadge.textContent = currentUser.username + (currentUser.role === 'admin' ? ' · admin' : '');
      adminTabBtn.style.display = currentUser.role === 'admin' ? '' : 'none';
      if (currentUser.role !== 'admin') {
        const adminPanel = document.getElementById('panel-admin');
        if (adminPanel && adminPanel.classList.contains('active')) {
          const plannerTabBtn = document.querySelector('.tab-btn[data-tab="planner"]');
          if (plannerTabBtn) plannerTabBtn.click();
        }
      }
      refreshInvitesBadge();
      unlockLastPlannerResult();
    } else {
      userInfoEl.style.display = 'none';
      headerLoginBtn.style.display = '';
      adminTabBtn.style.display = 'none';
      invitesPanel.style.display = 'none';
      // Inviting others requires being someone yourself — hide the send-invite box on logout
      // rather than leave it showing checkboxes for a session that can no longer send anything.
      const pInviteEl = document.getElementById('p-invite');
      if (pInviteEl) pInviteEl.style.display = 'none';
      // Re-blur whatever itinerary was on screen — logging out should put the gate back, not
      // leave a previously-unlocked result visible after the session that unlocked it is gone.
      if (lastGeneratedTrip && lastGeneratedTrip.data) {
        const { destination, days, data } = lastGeneratedTrip;
        const risks = detectTravelRisks(flattenActivities(data), lastGeneratedTrip, null, currentLang);
        const innerHtml = `${renderPlannerHtml(data, destination, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}`;
        const pResultEl = document.getElementById('p-result');
        if (pResultEl) pResultEl.innerHTML = `<div class="result-box">${withLoginGateHtml(innerHtml)}</div>`;
      }
      if (loginMessage) openLoginModal();
      if (loginMessage) { loginErrorEl.textContent = loginMessage; loginErrorEl.style.display = 'block'; }
    }
  }

  async function handleLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;
    loginErrorEl.style.display = 'none';
    if (!username || !password) {
      loginErrorEl.textContent = T('auth.missingFields');
      loginErrorEl.style.display = 'block';
      return;
    }
    loginSubmitBtn.disabled = true;
    try {
      const data = await authApi('/login', { method: 'POST', body: { username, password } });
      authToken = data.token;
      currentUser = data.user;
      persistAuth();
      loginPassword.value = '';
      applyAuthUI();
    } catch (err) {
      loginErrorEl.textContent = err.message;
      loginErrorEl.style.display = 'block';
    } finally {
      loginSubmitBtn.disabled = false;
    }
  }
  loginSubmitBtn.addEventListener('click', handleLogin);
  [loginUsername, loginPassword].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); }));

  logoutBtn.addEventListener('click', async () => {
    try { await authApi('/logout', { method: 'POST' }); } catch (e) { /* logging out locally regardless */ }
    authToken = null;
    currentUser = null;
    persistAuth();
    applyAuthUI();
  });

  // ---------- Invites received ----------
  let lastFetchedInvites = [];

  async function refreshInvitesBadge() {
    if (!currentUser) return;
    try {
      const data = await authApi('/invites');
      lastFetchedInvites = data.invites || [];
      invitesCountEl.textContent = lastFetchedInvites.length ? String(lastFetchedInvites.length) : '';
    } catch (e) { /* auth server optional/offline — invites just silently stay unavailable */ }
  }

  function renderInvitesPanel() {
    if (!lastFetchedInvites.length) {
      invitesPanelList.innerHTML = `<div class="invite-empty">${escapeHtml(T('invite.empty'))}</div>`;
      return;
    }
    invitesPanelList.innerHTML = lastFetchedInvites.map((inv) => `
      <div class="invite-item">
        <div class="invite-item-top">${escapeHtml(tr(currentLang, 'invite.tripLine', (inv.trip && inv.trip.destination) || '', (inv.trip && inv.trip.days) || ''))}</div>
        <div class="invite-item-meta">${escapeHtml(tr(currentLang, 'invite.from', inv.from))}</div>
        <div class="invite-item-actions">
          <button type="button" class="invite-use-btn" data-invite-id="${escapeHtml(inv.id)}">${escapeHtml(T('invite.useBtn'))}</button>
          <button type="button" class="secondary invite-dismiss-btn" data-invite-id="${escapeHtml(inv.id)}">${escapeHtml(T('invite.dismissBtn'))}</button>
        </div>
      </div>`).join('');
  }

  invitesBtn.addEventListener('click', async () => {
    invitesPanel.style.display = 'flex';
    await refreshInvitesBadge();
    renderInvitesPanel();
  });
  invitesCloseBtn.addEventListener('click', () => { invitesPanel.style.display = 'none'; });

  /** Loads an invited itinerary straight into the Itinerary tab — looked up fresh via getElementById (not closed-over consts) since this can be triggered before TAB 1's own script section has necessarily run, same TDZ concern as elsewhere in this file. */
  function applyInviteToPlanner(invite) {
    const trip = invite.trip || {};
    const dest = trip.destination || '';
    const days = trip.days || '';
    const fields = { 'p-dest': dest, 'p-days': days, 'p-start': trip.startDate || '', 'p-budget': trip.budget || '', 'p-group': trip.group || '', 'p-notes': trip.notes || '' };
    Object.entries(fields).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
    if (trip.data) {
      const context = { destination: dest, days, startDate: trip.startDate || '', budget: trip.budget || '', group: trip.group || '', notes: trip.notes || '' };
      updateTripStateFromPlannerData(trip.data, context);
      const members = currentMembers();
      const risks = detectTravelRisks(flattenActivities(trip.data), context, null, currentLang);
      renderPlannerSatisfaction(members, flattenActivities(trip.data));
      renderPlannerCostSummary(trip.data, members.length);
      const pResultEl = document.getElementById('p-result');
      if (pResultEl) pResultEl.innerHTML = `<div class="result-box">${renderPlannerHtml(trip.data, dest, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}</div>`;
      updatePlannerShareState(trip.data, dest);
      savePlannerState({ data: trip.data });
    }
    const plannerTabBtn = document.querySelector('.tab-btn[data-tab="planner"]');
    if (plannerTabBtn) plannerTabBtn.click();
    const feedbackEl = document.getElementById('p-shareFeedback');
    if (feedbackEl) feedbackEl.textContent = T('invite.usedSuccess');
  }

  invitesPanelList.addEventListener('click', async (e) => {
    const useBtn = e.target.closest('.invite-use-btn');
    const dismissBtn = e.target.closest('.invite-dismiss-btn');
    if (useBtn) {
      const invite = lastFetchedInvites.find((i) => i.id === useBtn.dataset.inviteId);
      if (!invite) return;
      applyInviteToPlanner(invite);
      invitesPanel.style.display = 'none';
    } else if (dismissBtn) {
      const id = dismissBtn.dataset.inviteId;
      try { await authApi(`/invites/${id}`, { method: 'DELETE' }); } catch (err) { /* still remove locally */ }
      lastFetchedInvites = lastFetchedInvites.filter((i) => i.id !== id);
      invitesCountEl.textContent = lastFetchedInvites.length ? String(lastFetchedInvites.length) : '';
      renderInvitesPanel();
    }
  });

  // ---------- Admin: manage users ----------
  const adminUsersList = document.getElementById('admin-users-list');
  const adminNewUsername = document.getElementById('admin-new-username');
  const adminNewPassword = document.getElementById('admin-new-password');
  const adminNewRole = document.getElementById('admin-new-role');
  const adminAddUserBtn = document.getElementById('admin-add-user-btn');
  const adminFeedback = document.getElementById('admin-feedback');

  // Doesn't touch adminFeedback on success — callers set their own success/error message
  // *after* this resolves (add/delete), so a refresh never wipes out the message it was
  // just asked to show. Only clobbers it on a genuine load failure.
  async function loadAdminUsers() {
    try {
      const data = await authApi('/users');
      renderAdminUsers(data.users || []);
    } catch (err) {
      adminUsersList.innerHTML = '';
      adminFeedback.textContent = '⚠️ ' + (err.message || T('admin.loadError'));
    }
  }

  function renderAdminUsers(users) {
    adminUsersList.innerHTML = users.map((u) => `
      <div class="admin-user-row">
        <span><span class="admin-user-name">${escapeHtml(u.username)}</span><span class="admin-user-role">${escapeHtml(u.role === 'admin' ? T('admin.roleAdmin') : T('admin.roleUser'))}</span></span>
        ${u.username === (currentUser && currentUser.username) ? '' : `<button type="button" class="secondary admin-delete-btn" data-username="${escapeHtml(u.username)}">${escapeHtml(T('admin.deleteBtn'))}</button>`}
      </div>`).join('');
  }

  adminUsersList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.admin-delete-btn');
    if (!btn) return;
    const username = btn.dataset.username;
    if (!window.confirm(T('admin.confirmDelete', username))) return;
    try {
      await authApi(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
      adminFeedback.textContent = T('admin.deleteSuccess', username);
      loadAdminUsers();
    } catch (err) {
      adminFeedback.textContent = '⚠️ ' + err.message;
    }
  });

  adminAddUserBtn.addEventListener('click', async () => {
    const username = adminNewUsername.value.trim();
    const password = adminNewPassword.value;
    const role = adminNewRole.value;
    if (!username || !password) { adminFeedback.textContent = T('admin.missingFields'); return; }
    try {
      await authApi('/users', { method: 'POST', body: { username, password, role } });
      adminFeedback.textContent = T('admin.addSuccess', username);
      adminNewUsername.value = '';
      adminNewPassword.value = '';
      loadAdminUsers();
    } catch (err) {
      adminFeedback.textContent = '⚠️ ' + err.message;
    }
  });

  // Load the Admin tab's user list right when it's opened, not on every app load — it's admin-only and rarely visited.
  document.querySelector('.tab-btn[data-tab="admin"]').addEventListener('click', () => {
    adminFeedback.textContent = '';
    loadAdminUsers();
  });

  // Tracks fields still showing the built-in example content (not user-typed/saved),
  // so switching language can re-translate them instead of leaving stale text behind.
  let healUsesDefaultItin = false;
  let groupUsesDefaultMembers = false;
  // RAG candidates for the currently selected Group Decision place. Declared this early (rather than
  // next to the rest of the Group Decision tab code) so populateGroupPlaceOptions() can safely reset
  // it — that function can run during the Itinerary tab's own restore-from-storage, before the Group
  // Decision tab's script section has executed, which would otherwise be a TDZ error.
  let lastRagCandidates = [];

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
    populateGroupPlaceOptions();
    renderDiffLists();
    const savedHeal = safeLoad(STORAGE_KEYS.heal);
    const weatherStatusEl = document.getElementById('h-weatherStatus');
    if (savedHeal && savedHeal.forecastEvent && savedHeal.forecastEvent.date) {
      const desc = weatherDescription(savedHeal.forecastEvent.weatherCode, currentLang);
      hEvent.value = tr(currentLang, 'heal.weatherForecastText', savedHeal.forecastEvent.date, desc, savedHeal.forecastEvent.tempMax, savedHeal.forecastEvent.precip);
      if (weatherStatusEl) weatherStatusEl.textContent = T('heal.weatherReadyForecast', savedHeal.forecastEvent.startDate, savedHeal.forecastEvent.days);
    } else if (weatherStatusEl) {
      weatherStatusEl.textContent = '';
    }
    if (savedHeal && savedHeal.data) {
      const localized = relocalizeHealedData(savedHeal.data, currentLang);
      hResult.innerHTML = `<div class="result-box">${renderHealHtml(localized, currentLang)}</div>`;
      safeSave(STORAGE_KEYS.heal, { ...savedHeal, data: localized, event: hEvent.value });
    }
    updateHealAcceptState();
  }

  /** Fills the Differentiation screen's two comparison lists — arrays can't be set via a plain [data-i18n] text swap. */
  function renderDiffLists() {
    const tradList = document.getElementById('diff-trad-list');
    const usList = document.getElementById('diff-us-list');
    if (tradList) tradList.innerHTML = T('diff.tradItems').map(item => `<li>${escapeHtml(item)}</li>`).join('');
    if (usList) usList.innerHTML = T('diff.usItems').map(item => `<li>${escapeHtml(item)}</li>`).join('');
  }

  // ---------- Claude proxy connection (see claude-server/ — holds the Anthropic API key
  // server-side, the browser never sees it) ----------
  const serverUrlInput = document.getElementById('serverUrl');
  const statusDot = document.getElementById('statusDot');
  const loadProgress = document.getElementById('loadProgress');
  const loadModelBtn = document.getElementById('loadModelBtn');

  serverUrlInput.value = safeLoadString(STORAGE_KEYS.url) || 'http://localhost:8901';

  function aiProxyBase() {
    return (serverUrlInput.value.trim() || 'http://localhost:8901').replace(/\/+$/, '');
  }

  // ---------- RAG server (reads indexed docs from knowledge/, see rag-server/) ----------
  function ragBase() {
    return (safeLoadString(STORAGE_KEYS.ragUrl) || 'http://localhost:8899').replace(/\/+$/, '');
  }

  /** Fetches the raw top-K matching chunks from the RAG server. Empty array if the server is off, unreachable, slow, or nothing is indexed. */
  async function ragSearchRaw(question) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // RAG is an optional enhancement — never let it stall the main AI call
    try {
      const res = await fetch(`${ragBase()}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    } catch (err) {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Same as ragSearchRaw, but merged into one text blob for the LLM prompt (existing callers). */
  async function ragSearch(question) {
    const results = await ragSearchRaw(question);
    if (results.length === 0) return { context: '', sources: [] };
    return {
      context: results.map(r => `[${r.source}]\n${r.text}`).join('\n\n'),
      sources: results.map(r => r.source)
    };
  }

  /**
   * One RAG lookup for the whole trip being generated (not per-activity) — real restaurants/
   * attractions near `dest`, used two ways: (1) folded into the planner prompt as "Reference data" so
   * the LLM is nudged toward real venue names instead of "a nearby restaurant", and (2) as the
   * candidate pool for resolvePlannerVenues()'s deterministic fill-in, which doesn't depend on the
   * (small, local) model actually following that nudge. Empty/best-effort when the RAG server has
   * nothing for this destination (e.g. anywhere outside this demo's Okinawa dataset) — the planner
   * still generates normally, just without real-venue substitution, same as before this feature.
   */
  async function fetchPlannerRagContext(dest, members) {
    const prefs = (members || []).map(m => m.pref).filter(Boolean).join(', ');
    const rawResults = await ragSearchRaw(`${dest} nhà hàng quán ăn địa điểm tham quan${prefs ? '. ' + prefs : ''}`);
    const candidates = rawResults.map(r => parseKnowledgeChunk(r.text));
    const context = rawResults.length ? rawResults.map(r => `[${r.source}]\n${r.text}`).join('\n\n') : '';
    return { candidates, context };
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
    loadModelBtn.disabled = true;
    setStatus('loading', T('connect.connecting'));
    try {
      const res = await fetch(`${aiProxyBase()}/health`);
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const data = await res.json();
      if (!data.ok) {
        setStatus('off', T('connect.noApiKey'));
      } else {
        setStatus('ready', T('connect.ready', data.model || 'claude-sonnet-5'));
      }
    } catch (err) {
      setStatus('off', T('connect.failed', aiProxyBase(), err.message));
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
      if (btn.dataset.tab === 'heal') syncPlannerToSelfHealing(true);
    });
  });

  // ---------- Claude API call (via claude-server/, the local proxy that holds the API key) ----------
  /**
   * Calls claude-server's /chat with streaming enabled so callers can show tokens as they arrive
   * instead of a spinner-then-everything-at-once. The proxy re-emits Claude's response as the same
   * newline-delimited {"message":{"content":"..."}} shape Ollama's /api/chat used to stream, so the
   * accumulation loop below (extractChunkContent) is unchanged from the local-Ollama version.
   * `json` is accepted for call-site compatibility but no longer sets any special request flag —
   * Claude follows the "reply with ONLY valid JSON" instructions already baked into every prompt
   * reliably enough that extractJson()'s own balanced-brace fallback is sufficient on top.
   * The 60s timeout is a rolling "no new data" idle timeout (reset on every chunk), not a total-
   * request cap — a response that's steadily streaming shouldn't be killed just because it's long.
   */
  async function callClaude(system, userText, { json = false, onChunk } = {}) {
    const body = {
      system,
      user: userText
    };

    const controller = new AbortController();
    let timeoutId;
    const resetIdleTimeout = () => { clearTimeout(timeoutId); timeoutId = setTimeout(() => controller.abort(), 60000); };
    resetIdleTimeout();

    let res;
    try {
      res = await fetch(`${aiProxyBase()}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error(T('errors.timeout'));
      throw new Error(T('errors.cannotConnect', aiProxyBase()));
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

  /**
   * Copies text to the clipboard. Tries the modern async Clipboard API first, but that
   * API only works in a "secure context" (HTTPS, or http://localhost) — it's unavailable
   * when this app is opened from a phone via a plain-http LAN IP, which the README lists
   * as a supported way to use the app. document.execCommand('copy') via a hidden textarea
   * is deprecated but has no such restriction, so it's kept as the fallback.
   */
  async function copyTextRobust(text) {
    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall through */ }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) return true;
    } catch (e) { /* fall through */ }
    return false;
  }

  /** Tries the native share sheet first (great on phones), falls back to copying. */
  async function shareOrCopy(text, title) {
    if (navigator.share) {
      try {
        await navigator.share({ text, title });
        return 'shared';
      } catch (err) {
        if (err.name === 'AbortError') return 'cancelled';
        // any other share error (e.g. no share target) — fall through to copy
      }
    }
    return (await copyTextRobust(text)) ? 'copied' : 'failed';
  }

  /** Last-resort fallback: show the text in a selected, read-only textarea for manual copy. */
  function showManualCopyBox(container, text, message) {
    container.innerHTML = `<div>${escapeHtml(message)}</div>`;
    const ta = document.createElement('textarea');
    ta.readOnly = true;
    ta.value = text;
    ta.style.width = '100%';
    ta.style.minHeight = '120px';
    ta.style.marginTop = '6px';
    container.appendChild(ta);
    ta.focus();
    ta.select();
  }

  // ---------- TAB 1: Trip Planner ----------
  const pDest = document.getElementById('p-dest');
  const pDays = document.getElementById('p-days');
  const pStart = document.getElementById('p-start');
  const pBudget = document.getElementById('p-budget');
  const pGroup = document.getElementById('p-group');
  const pNotes = document.getElementById('p-notes');
  const pResult = document.getElementById('p-result');
  const pShare = document.getElementById('p-share');
  const pShareFeedback = document.getElementById('p-shareFeedback');
  const pSatisfaction = document.getElementById('p-satisfaction');
  const pCostSummary = document.getElementById('p-costSummary');
  const pInvite = document.getElementById('p-invite');
  const pInviteList = document.getElementById('p-invite-list');
  const pInviteSendBtn = document.getElementById('p-invite-send');
  const pInviteFeedback = document.getElementById('p-invite-feedback');
  let lastPlannerShare = null;
  let lastGeneratedTrip = null;

  /** Fetches who's available to invite and shows the invite box under the just-generated itinerary. Silently hides it if the auth server is offline or nobody else to invite — inviting is a bonus on top of the itinerary, not something that should block it. */
  async function showInviteBox(trip) {
    lastGeneratedTrip = trip;
    if (!pInvite || !currentUser) return;
    pInviteFeedback.textContent = '';
    try {
      const dir = await authApi('/directory');
      const others = dir.users || [];
      if (!others.length) { pInvite.style.display = 'none'; return; }
      pInviteList.innerHTML = others.map((u) => `<label><input type="checkbox" class="invite-checkbox" value="${escapeHtml(u.username)}"> ${escapeHtml(u.username)}</label>`).join('');
      pInvite.style.display = 'block';
    } catch (e) {
      pInvite.style.display = 'none';
    }
  }

  if (pInviteSendBtn) {
    pInviteSendBtn.addEventListener('click', async () => {
      const checked = [...pInviteList.querySelectorAll('.invite-checkbox:checked')].map((cb) => cb.value);
      if (!checked.length) { pInviteFeedback.textContent = T('invite.selectAtLeastOne'); return; }
      if (!lastGeneratedTrip) return;
      pInviteSendBtn.disabled = true;
      try {
        await authApi('/invites', { method: 'POST', body: { trip: lastGeneratedTrip, invitees: checked } });
        pInviteFeedback.textContent = T('invite.sentSuccess', checked.join(', '));
      } catch (err) {
        pInviteFeedback.textContent = '⚠️ ' + err.message;
      } finally {
        pInviteSendBtn.disabled = false;
      }
    });
  }

  /** Group Satisfaction Score for the actual generated itinerary (not just one venue) — reuses the same deterministic engine as the Group Decision tab, no LLM call. */
  function computePlannerSatisfactionHtml(members, activities) {
    const list = Array.isArray(members) ? members.filter(m => m.name) : [];
    if (!list.length || !activities || !activities.length) return '';
    const group = computeItinerarySatisfaction(list, activities, currentLang);
    return group ? renderSatisfactionScoreHtml(group, currentLang) : '';
  }
  function renderPlannerSatisfaction(members, activities) {
    if (pSatisfaction) pSatisfaction.innerHTML = computePlannerSatisfactionHtml(members, activities);
  }
  /** Re-scores the last generated itinerary against whatever the group members currently say — instant, no re-plan needed, mirroring refreshGroupDecisionLive(). */
  function refreshPlannerSatisfactionLive() {
    renderPlannerSatisfaction(currentMembers(), flattenActivities(tripState.plannerData));
  }

  /** Total estimated cost + even per-person split for the actual generated itinerary — from the price the planner LLM attached to each activity, not a new AI call. */
  function renderPlannerCostSummary(planData, memberCount) {
    if (pCostSummary) pCostSummary.innerHTML = renderItineraryCostSummaryHtml(planData, memberCount, currentLang);
  }
  /** Re-splits the last generated itinerary's cost across however many members there are right now — instant, mirroring refreshPlannerSatisfactionLive(). */
  function refreshPlannerCostSummaryLive() {
    renderPlannerCostSummary(tripState.plannerData, currentMembers().length);
  }

  function updatePlannerShareState(data, dest) {
    const hasContent = (data.days || []).some(d => d && Array.isArray(d.activities) && d.activities.length);
    lastPlannerShare = hasContent ? { data, dest } : null;
    pShare.style.display = hasContent ? '' : 'none';
    pShareFeedback.innerHTML = '';
  }

  pShare.addEventListener('click', async () => {
    if (!lastPlannerShare) return;
    const text = formatPlannerShareText(lastPlannerShare.data, lastPlannerShare.dest, currentLang);
    pShareFeedback.innerHTML = '';
    const result = await shareOrCopy(text, T('planner.title'));
    if (result === 'copied') {
      pShareFeedback.textContent = T('common.copied');
    } else if (result === 'failed') {
    pShareFeedback.innerHTML = `<div>${escapeHtml(T('common.shareFallback'))}</div>`;
    showManualCopyBox(pShareFeedback, text, T('common.shareFailed'));
  }
  // 'shared' (native share sheet handled it) and 'cancelled' (user dismissed it) need no feedback.
  });

  function getPlannerContext() {
    const fallback = tripState.plannerContext || {};
    return {
      destination: pDest.value.trim() || fallback.destination || tripState.destination || '',
      days: pDays.value || fallback.days || '',
      startDate: pStart.value || fallback.startDate || '',
      budget: pBudget.value || fallback.budget || T('common.unlimitedBudget'),
      group: pGroup.value.trim() || fallback.group || T('common.soloTraveler'),
      notes: pNotes.value.trim() || fallback.notes || ''
    };
  }

  function plannerToHealText(plannerData) {
    const days = Array.isArray(plannerData && plannerData.days) ? plannerData.days : [];
    const lines = [];
    days.forEach((day, idx) => {
      const dayNumber = Number(day && day.day) || (idx + 1);
      const activities = Array.isArray(day && day.activities) ? day.activities : [];
      activities.forEach(activity => {
        const text = typeof activity === 'string' ? activity.trim() : String(activity && activity.text || '').trim();
        if (!text) return;
        lines.push(`Day ${dayNumber} | ${text}`);
      });
    });
    return lines.join('\n');
  }

  function syncPlannerToSelfHealing(forceRefresh = false) {
    const hDestEl = document.getElementById('h-dest');
    const hItinEl = document.getElementById('h-itin');
    if (hDestEl) hDestEl.value = tripState.destination || hDestEl.value || '';
    if (!hItinEl) return;

    const fromPlanner = plannerToHealText(tripState.plannerData);
    if (fromPlanner && (forceRefresh || !hItinEl.value.trim() || healUsesDefaultItin)) {
      hItinEl.value = fromPlanner;
      healUsesDefaultItin = false;
      return;
    }
    if (!fromPlanner) {
      hItinEl.value = Array.isArray(tripState.itinerary) ? tripState.itinerary.join('\n') : '';
    }
  }

  /**
   * Fills the Group Decision "評価するスポット" dropdown with the activities from the current
   * itinerary, each labeled with its day (e.g. "1日目 - American Village") — looked up fresh via
   * getElementById (not a closed-over const) because this can run before the Group Decision tab's
   * own script section has executed (e.g. while restoring saved planner state on page load).
   */
  function populateGroupPlaceOptions() {
    const select = document.getElementById('g-place');
    if (!select) return;
    const days = (tripState.plannerData && Array.isArray(tripState.plannerData.days)) ? tripState.plannerData.days : [];
    const previous = select.value;
    const hadSelection = !!previous;
    const seen = new Set();
    const rows = [];
    days.forEach((day, idx) => {
      if (!day || !Array.isArray(day.activities)) return;
      const dayNumber = Number(day.day) || (idx + 1); // Number(...) first: the AI-generated JSON sometimes has "day" as a numeric string, which would break the strict-equality day match in replacePlaceInItinerary otherwise.
      day.activities.forEach(activity => {
        // plannerActivityText, not a bare String(activity) — the planner LLM now returns each
        // activity as an object ({text, price}), which would otherwise stringify to "[object Object]".
        const text = plannerActivityText(activity);
        if (!text || isGenericPlaceholderActivity(text)) return;
        const key = `${dayNumber}::${text.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({ dayNumber, text });
      });
    });
    select.innerHTML = '';
    if (!rows.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = T('group.placeNoItinerary');
      select.appendChild(opt);
      if (hadSelection) clearStaleGroupDecisionDisplay();
      return;
    }
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = T('group.placeEmptyOption');
    select.appendChild(placeholder);
    rows.forEach(({ dayNumber, text }) => {
      const opt = document.createElement('option');
      opt.value = text;
      opt.dataset.day = String(dayNumber);
      opt.textContent = `${T('common.dayLabel', dayNumber)} - ${text}`;
      select.appendChild(opt);
    });
    if (previous && rows.some(r => r.text === previous)) select.value = previous;
    // The itinerary changed (new plan, or an activity was renamed/removed) and the previously
    // selected place fell out of the list — its cached score/debate is for a place that's no longer
    // an option, so clear it instead of leaving mismatched results on screen.
    if (hadSelection && select.value !== previous) clearStaleGroupDecisionDisplay();
  }

  /** Clears Group Decision result panels tied to a place selection that no longer exists (itinerary changed underneath it). Looked up fresh via getElementById for the same reason as populateGroupPlaceOptions. */
  function clearStaleGroupDecisionDisplay() {
    const result = document.getElementById('g-result');
    const decision = document.getElementById('g-decision');
    const debate = document.getElementById('g-debate');
    const ragHint = document.getElementById('g-ragHint');
    if (result) result.innerHTML = '';
    if (decision) decision.innerHTML = '';
    if (debate) debate.innerHTML = '';
    if (ragHint) ragHint.textContent = '';
    lastRagCandidates = [];
    tripState.groupDecision = null;
    saveGroupState({ data: null, ragSources: [], candidates: [] });
  }

  function updateTripStateFromPlannerData(data, context) {
    const itinerary = flattenActivities(data);
    tripState.destination = context.destination || tripState.destination || '';
    tripState.itinerary = itinerary;
    tripState.plannerData = data || null;
    tripState.plannerContext = {
      destination: context.destination || tripState.destination || '',
      days: context.days || '',
      startDate: context.startDate || '',
      budget: context.budget || T('common.unlimitedBudget'),
      group: context.group || T('common.soloTraveler'),
      notes: context.notes || ''
    };
    syncPlannerToSelfHealing();
    populateGroupPlaceOptions();
    updateGroupDecisionGate();
  }

  /** Re-renders the Itinerary tab (Tab 1) from tripState.plannerData — used after Group Decision swaps an activity in place, so the itinerary display stays in sync without a new AI call. */
  function refreshPlannerDisplay() {
    const data = tripState.plannerData;
    if (!data) return;
    const dest = pDest.value.trim() || 'Okinawa';
    const days = pDays.value || 4;
    const budget = pBudget.value || T('common.unlimitedBudget');
    const group = pGroup.value.trim() || T('common.soloTraveler');
    const notes = pNotes.value.trim();
    const activities = flattenActivities(data);
    const risks = detectTravelRisks(activities, { budget, days, group, notes }, null, currentLang);
    const members = currentMembers();
    renderPlannerSatisfaction(members, activities);
    renderPlannerCostSummary(data, members.length);
    pResult.innerHTML = `<div class="result-box">${renderPlannerHtml(data, dest, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}</div>`;
    updatePlannerShareState(data, dest);
    savePlannerState({ data });
  }

  /**
   * Replaces one activity's text in tripState.plannerData in place (matched by day number when
   * known, else by exact text) and keeps tripState.itinerary in sync. Returns false if no match
   * was found.
   *
   * `oldText` is always a plain string (it comes from gPlace.value, itself populated via
   * plannerActivityText() in populateGroupPlaceOptions), but day.activities holds {text, price}
   * objects since the planner schema change — comparing with indexOf()/includes() (strict
   * equality) against a string can never match an object, so this used to always return false
   * and silently break the "Đổi địa điểm" swap feature entirely. Matching now goes through
   * plannerActivityText() so it works for either shape.
   */
  function replacePlaceInItinerary(oldText, newText, dayNumber, newPrice) {
    const data = tripState.plannerData;
    if (!data || !Array.isArray(data.days)) return false;
    const matchesOld = (activity) => plannerActivityText(activity) === oldText;
    const day = dayNumber != null
      ? data.days.find((d, idx) => d && (Number(d.day) || (idx + 1)) === Number(dayNumber))
      : data.days.find(d => d && Array.isArray(d.activities) && d.activities.some(matchesOld));
    if (!day || !Array.isArray(day.activities)) return false;
    const idx = day.activities.findIndex(matchesOld);
    if (idx === -1) return false;
    const original = day.activities[idx];
    const slot = plannerActivitySlot(original);
    // Keep the {text, slot, price} object shape rather than collapsing to a bare string — but only
    // carry a price over when the caller actually knows the NEW venue's cost (newPrice); otherwise
    // leaving it unpriced is more honest than silently keeping the old venue's price on a new name.
    day.activities[idx] = { text: newText, slot, ...(Number.isFinite(newPrice) ? { price: newPrice } : {}) };
    tripState.itinerary = flattenActivities(data);
    return true;
  }

  function plannerInputs() {
    return { dest: pDest.value, days: pDays.value, startDate: pStart.value, budget: pBudget.value, group: pGroup.value, notes: pNotes.value };
  }
  function savePlannerState(extra) {
    safeSave(STORAGE_KEYS.planner, Object.assign(plannerInputs(), extra));
  }
  [pDest, pDays, pStart, pBudget, pGroup, pNotes].forEach(el => el.addEventListener('input', () => savePlannerState({})));

  (function restorePlanner() {
    const saved = safeLoad(STORAGE_KEYS.planner);
    if (!saved) return;
    if (saved.dest) pDest.value = saved.dest;
    if (saved.days) pDays.value = saved.days;
    if (saved.startDate) pStart.value = saved.startDate;
    if (saved.budget) pBudget.value = saved.budget;
    if (saved.group) pGroup.value = saved.group;
    if (saved.notes) pNotes.value = saved.notes;
    if (saved.data) {
      updateTripStateFromPlannerData(saved.data, {
        destination: saved.dest || '',
        days: saved.days || '',
        startDate: saved.startDate || '',
        budget: saved.budget || '',
        group: saved.group || '',
        notes: saved.notes || ''
      });
      // Prefer the risks saved alongside the plan (includes geographic-distance checks, which need
      // the RAG candidate pool from generation time and can't be recomputed from storage alone) —
      // falls back to a fresh flat-list scan for older saved state from before that was added.
      const savedRisks = saved.risks || detectTravelRisks(flattenActivities(saved.data), { budget: saved.budget, days: saved.days, group: saved.group, notes: saved.notes }, null, currentLang);
      const savedInnerHtml = `${renderPlannerHtml(saved.data, saved.dest || '', currentLang, saved.days)}${renderRiskPanelHtml(savedRisks, currentLang)}`;
      lastGeneratedTrip = { destination: saved.dest || '', days: saved.days || '', startDate: saved.startDate || '', budget: saved.budget || '', group: saved.group || '', notes: saved.notes || '', data: saved.data };
      pResult.innerHTML = `<div class="result-box">${withLoginGateHtml(savedInnerHtml)}</div>`;
      updatePlannerShareState(saved.data, saved.dest || '');
    }
  })();

  document.getElementById('p-run').addEventListener('click', async () => {
    const dest = pDest.value.trim() || 'Okinawa';
    const days = pDays.value || 4;
    const startDate = pStart.value || '';
    const budget = pBudget.value || T('common.unlimitedBudget');
    const group = pGroup.value.trim() || T('common.soloTraveler');
    const notes = pNotes.value.trim();
    const members = currentMembers();
    setLoading(pResult, true, T('planner.loading'));
    if (pSatisfaction) pSatisfaction.innerHTML = '';

    const { candidates: ragCandidates, context: ragContext } = await fetchPlannerRagContext(dest, members);
    const system = T('planner.systemPrompt');
    const user = tr(currentLang, 'planner.userPrompt', dest, days, startDate, budget, group, notes, members, ragContext);

    try {
      const rawData = await callClaude(system, user, { json: true, onChunk: streamPreview(pResult, T('planner.loading')) });
      const data = resolvePlannerVenues(rawData, ragCandidates, members, currentLang);
      updateTripStateFromPlannerData(data, { destination: dest, days, startDate, budget, group, notes });
      const risks = detectTravelRisks(flattenActivities(data), { budget, days, group, notes }, null, currentLang)
        .concat(detectGeographicRisks(data, ragCandidates, currentLang));
      renderPlannerSatisfaction(members, flattenActivities(data));
      renderPlannerCostSummary(data, members.length);
      const innerHtml = `${renderPlannerHtml(data, dest, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}`;
      pResult.innerHTML = `<div class="result-box">${withLoginGateHtml(innerHtml)}</div>`;
      updatePlannerShareState(data, dest);
      savePlannerState({ data, risks });
      showInviteBox({ destination: dest, days, startDate, budget, group, notes, data });
    } catch (err) { showError(pResult, err); pShare.style.display = 'none'; }
  });

  // ---------- TAB 2: Group Decision (was "Group Matching") ----------
  const membersDiv = document.getElementById('g-members');
  const gPlace = document.getElementById('g-place');
  const gRunBtn = document.getElementById('g-run');
  const gSwapBtn = document.getElementById('g-swap');
  const gResult = document.getElementById('g-result');
  const gDebate = document.getElementById('g-debate');
  const gRagHint = document.getElementById('g-ragHint');
  const gDecision = document.getElementById('g-decision');

  let lastCompromiseOptions = [];

  /** True once an itinerary exists to make a group decision about — Group Decision only makes sense once there's a trip on the table. */
  function hasItinerary() {
    return !!(tripState.plannerData && Array.isArray(tripState.plannerData.days) && tripState.plannerData.days.length);
  }

  /**
   * Enables/disables the Group Decision "Chấm điểm phù hợp" action based on whether an itinerary has
   * been generated yet, and updates the hint text next to it. Looked up fresh via getElementById
   * (not the closed-over gRunBtn/gSwapBtn/gGateHint consts) because this can run — via
   * updateTripStateFromPlannerData(), during restorePlanner()'s restore-from-storage — before the
   * Group Decision tab's own script section (where those consts are declared) has executed yet;
   * referencing them that early would throw a TDZ ReferenceError and abort all of initApp().
   */
  function updateGroupDecisionGate() {
    const ready = hasItinerary();
    const runBtn = document.getElementById('g-run');
    const swapBtn = document.getElementById('g-swap');
    const gateHint = document.getElementById('g-gateHint');
    if (runBtn) runBtn.disabled = !ready;
    if (swapBtn) swapBtn.disabled = !ready;
    if (gateHint) {
      gateHint.textContent = ready ? '' : ('🔒 ' + T('group.needPlanFirst'));
      gateHint.classList.toggle('locked', !ready);
    }
  }

  /** Call at the top of the Group Decision action; shows the lock message in `resultEl` and returns false if there's no itinerary yet. */
  function requireItineraryOrWarn(resultEl) {
    if (hasItinerary()) return true;
    resultEl.innerHTML = `<div class="error-box">🔒 ${escapeHtml(T('group.needPlanFirst'))}</div>`;
    return false;
  }

  /** Computes + renders Group Decision (Satisfaction Score, Conflicts, Compromise Options, Explainable AI receipt) — all deterministic, no LLM call. */
  function renderGroupDecision(candidates, place, members) {
    const entry = pickPrimaryKnowledgeEntry(candidates, place);
    const group = computeGroupSatisfaction(members, entry, currentLang);
    const conflicts = detectPreferenceConflicts(members, entry, currentLang);
    const options = generateCompromiseOptions(candidates, members, currentLang, place);
    lastCompromiseOptions = options;
    // If place/members changed enough that the group's earlier pick no longer appears among the
    // freshly generated options, the decision no longer applies to what's on screen — clear it
    // instead of silently keeping a choice that doesn't match anything shown.
    if (tripState.groupDecision && !options.some(o => o.name === tripState.groupDecision.name)) {
      tripState.groupDecision = null;
      saveGroupState({});
    }
    gDecision.innerHTML = renderSatisfactionScoreHtml(group, currentLang)
      + renderConflictCardsHtml(conflicts, currentLang)
      + renderCompromiseOptionsHtml(options, currentLang, tripState.groupDecision ? tripState.groupDecision.name : null)
      + renderReasoningReceiptHtml(entry, group, members, currentLang);
    return { entry, candidates };
  }

  /** Event delegation: option cards are re-rendered on every score refresh, so listeners are attached once on the container rather than per-card. */
  gDecision.addEventListener('click', (e) => {
    const btn = e.target.closest('.opt-choose-btn');
    if (!btn || btn.classList.contains('chosen')) return;
    const chosen = lastCompromiseOptions.find(o => o.name === btn.dataset.optName);
    if (!chosen) return;
    tripState.groupDecision = { name: chosen.name, label: chosen.label, strategy: chosen.strategy, overall: chosen.overall };
    saveGroupState({});
    refreshGroupDecisionLive(); // re-renders with the "✓ Đã chọn" state
  });

  /** Re-runs the deterministic Group Decision engine against the last RAG candidates — no LLM call, so this is instant. Lets a member's preference change re-score live without re-fetching anything. Also re-scores the already-generated itinerary in the Planner tab, since both read the same member list. */
  function refreshGroupDecisionLive() {
    refreshPlannerSatisfactionLive();
    refreshPlannerCostSummaryLive();
    if (!lastRagCandidates.length) return;
    renderGroupDecision(lastRagCandidates, gPlace.value.trim(), currentMembers());
  }

  function addMemberRow(name = '', pref = '') {
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `<input type="text" placeholder="${escapeHtml(T('group.memberNamePlaceholder'))}" class="g-name" value="${escapeHtml(name)}">
      <input type="text" placeholder="${escapeHtml(T('group.memberPrefPlaceholder'))}" class="g-pref" value="${escapeHtml(pref)}">
      <button type="button" class="secondary small g-remove">✕</button>`;
    row.querySelector('.g-remove').addEventListener('click', () => { row.remove(); groupUsesDefaultMembers = false; saveGroupState({}); refreshGroupDecisionLive(); });
    row.querySelector('.g-name').addEventListener('input', () => { groupUsesDefaultMembers = false; saveGroupState({}); refreshGroupDecisionLive(); });
    row.querySelector('.g-pref').addEventListener('input', () => { groupUsesDefaultMembers = false; saveGroupState({}); refreshGroupDecisionLive(); });
    membersDiv.appendChild(row);
  }

  function currentMembers() {
    return [...membersDiv.querySelectorAll('.member-row')].map(row => ({
      name: row.querySelector('.g-name').value.trim(),
      pref: row.querySelector('.g-pref').value.trim()
    })).filter(m => m.name);
  }
  // Merges onto whatever is already saved (rather than replacing it outright) so a bare
  // saveGroupState({}) — e.g. from a member-preference edit — doesn't wipe out the last scored
  // data/ragSources/candidates, which are still valid for the same place.
  function saveGroupState(extra) {
    const prev = safeLoad(STORAGE_KEYS.group) || {};
    safeSave(STORAGE_KEYS.group, Object.assign({}, prev, { place: gPlace.value, members: currentMembers(), chosenOption: tripState.groupDecision }, extra));
  }

  populateGroupPlaceOptions();

  const savedGroup = safeLoad(STORAGE_KEYS.group);
  if (savedGroup && Array.isArray(savedGroup.members) && savedGroup.members.length) {
    savedGroup.members.forEach(m => addMemberRow(m.name, m.pref));
  } else {
    groupUsesDefaultMembers = true;
    T('group.defaultMembers').forEach(([n, p]) => addMemberRow(n, p));
  }
  if (savedGroup && savedGroup.place) gPlace.value = savedGroup.place;
  if (savedGroup && savedGroup.chosenOption && savedGroup.chosenOption.name) tripState.groupDecision = savedGroup.chosenOption;
  if (savedGroup && savedGroup.data) {
    gResult.innerHTML = `<div class="result-box">${renderGroupScoreTableHtml(savedGroup.data, currentLang)}</div>`;
    renderDebate(savedGroup.data);
  }
  if (savedGroup && savedGroup.ragSources && savedGroup.ragSources.length) {
    gRagHint.textContent = T('group.ragUsed', savedGroup.ragSources.join(', '));
  }
  if (savedGroup && Array.isArray(savedGroup.candidates) && savedGroup.candidates.length) {
    lastRagCandidates = savedGroup.candidates;
    renderGroupDecision(savedGroup.candidates, savedGroup.place || '', currentMembers());
  }
  // A place change needs fresh reference data (a different venue has different attributes to score
  // against) — unlike a member-preference edit, which can cheaply rescore the same lastRagCandidates
  // via refreshGroupDecisionLive() below.
  gPlace.addEventListener('change', () => {
    saveGroupState({});
    const place = gPlace.value.trim();
    gResult.innerHTML = place ? `<div class="hint">${escapeHtml(T('group.scoreHint'))}</div>` : '';
    gDebate.innerHTML = '';
    refreshGroupDecisionForPlace(place, currentMembers());
  });

  document.getElementById('g-addMember').addEventListener('click', () => { groupUsesDefaultMembers = false; addMemberRow(); saveGroupState({}); refreshGroupDecisionLive(); });

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

  /**
   * Fresh RAG lookup + deterministic Group Decision engine (satisfaction score, conflicts, compromise
   * options, reasoning) for one place — no LLM call, so it's fast. This is the piece that MUST re-run
   * whenever the selected place itself changes (a different place needs different reference data);
   * member-preference edits alone can skip it and just rescore lastRagCandidates via refreshGroupDecisionLive.
   */
  async function refreshGroupDecisionForPlace(place, members) {
    if (!place) {
      gDecision.innerHTML = '';
      gRagHint.textContent = '';
      lastRagCandidates = [];
      tripState.groupDecision = null;
      saveGroupState({ data: null, ragSources: [], candidates: [] });
      return { candidates: [], sources: [], context: '' };
    }
    setLoading(gDecision, true, T('group.loading'));
    const rawResults = await ragSearchRaw(`${place}. ${members.map(m => m.pref).join(', ')}`);
    const sources = rawResults.map(r => r.source);
    const context = rawResults.length ? rawResults.map(r => `[${r.source}]\n${r.text}`).join('\n\n') : '';
    gRagHint.textContent = sources.length > 0 ? T('group.ragUsed', sources.join(', ')) : T('group.ragNone');
    const candidates = rawResults.map(r => parseKnowledgeChunk(r.text));
    lastRagCandidates = candidates;
    if (members.length) renderGroupDecision(candidates, place, members);
    else gDecision.innerHTML = '';
    // Persisted right away (with data:null, since no fresh AI debate has run yet for this place) so
    // that reloading the page — or an AI call below failing — never leaves storage holding this
    // place's name next to a stale data/candidates pair scored for whatever place came before it.
    saveGroupState({ data: null, ragSources: sources, candidates });
    return { candidates, sources, context };
  }

  /** Runs the deterministic Group Decision engine + AI debate for one place. Shared by the "Score fit" button and the "Swap place" flow (which re-scores the newly picked place the same way). */
  async function runGroupScoring(place, members, loadingLabel) {
    setLoading(gResult, true, loadingLabel || T('group.loading'));
    gDebate.innerHTML = '';

    const { candidates, sources, context } = await refreshGroupDecisionForPlace(place, members);

    const system = T('group.systemPrompt');
    const user = tr(currentLang, 'group.userPrompt', place, members, context);

    try {
      const data = await callClaude(system, user, { json: true });
      gResult.innerHTML = `<div class="result-box">${renderGroupScoreTableHtml(data, currentLang)}</div>`;
      renderDebate(data);
      saveGroupState({ data, ragSources: sources, candidates });
    } catch (err) { showError(gResult, err); }
  }

  gRunBtn.addEventListener('click', () => {
    if (!requireItineraryOrWarn(gResult)) return;
    const place = gPlace.value.trim();
    if (!place) {
      showError(gResult, new Error(T('group.placeRequiredError')));
      return;
    }
    runGroupScoring(place, currentMembers());
  });

  /**
   * "Đổi địa điểm" — swaps the currently selected place for a better (or at least equally good)
   * alternative, picked from the same RAG candidates already used for scoring (ranked by worst-member
   * satisfaction via generateCompromiseOptions, no extra LLM call needed for the pick itself), writes
   * it back into tripState.plannerData at the exact day it came from, refreshes the Itinerary tab
   * display, and re-scores the new place the same way "Score fit" would.
   */
  gSwapBtn.addEventListener('click', async () => {
    if (!requireItineraryOrWarn(gResult)) return;
    const place = gPlace.value.trim();
    if (!place) {
      showError(gResult, new Error(T('group.placeRequiredError')));
      return;
    }
    if (!lastRagCandidates.length) {
      showError(gResult, new Error(T('group.swapNoCandidates')));
      return;
    }
    const members = currentMembers();
    const entry = pickPrimaryKnowledgeEntry(lastRagCandidates, place);
    const currentName = String((entry && entry.name) || place).trim().toLowerCase();
    const options = generateCompromiseOptions(lastRagCandidates, members, currentLang, place);
    const alternative = options.find(o => o.name && o.name.trim().toLowerCase() !== currentName);
    if (!alternative) {
      showError(gResult, new Error(T('group.swapNoAlternative')));
      return;
    }

    const selectedOpt = gPlace.selectedOptions && gPlace.selectedOptions[0];
    const dayNumber = selectedOpt && selectedOpt.dataset.day ? parseInt(selectedOpt.dataset.day, 10) : null;
    if (!replacePlaceInItinerary(place, alternative.name, dayNumber, alternative.costPerPerson)) {
      showError(gResult, new Error(T('group.swapNoAlternative')));
      return;
    }

    refreshPlannerDisplay();
    populateGroupPlaceOptions();
    gPlace.value = alternative.name;
    saveGroupState({});
    await runGroupScoring(alternative.name, members, T('group.swapLoading'));
    gRagHint.textContent = `${tr(currentLang, 'group.swapSuccess', place, alternative.name)} ${gRagHint.textContent}`;
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
    const wantsItinerary = detectItineraryIntent(text, T('voice.buildTriggers'));
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
      // If the user's own words asked for the itinerary ("tạo lịch trình cho tôi"...), build it
      // right after the normal reply — no need to also hunt down the button.
      if (wantsItinerary) await buildItineraryFromConversation();
    } catch (err) {
      clearInterval(tickId);
      thinking.textContent = '⚠️ ' + err.message;
      saveVoiceLog();
    }
  }

  // ---------- Voice Assistant: "Build itinerary from this conversation" ----------
  const vBuildBtn = document.getElementById('v-build');
  const vForceBuildBtn = document.getElementById('v-force-build');
  const vChecklist = document.getElementById('v-checklist');
  const vItinResult = document.getElementById('v-itinResult');

  function collectVoiceMessages() {
    return [...vLog.querySelectorAll('.msg')].map(el => ({
      role: el.classList.contains('user') ? 'user' : 'ai',
      text: el.textContent
    }));
  }

  /** Asks the LLM to read the conversation so far and pull out trip-planning slots (destination, days, budget...) as JSON — a dedicated extraction call, kept separate from the normal chat reply so casual Q&A never has to be forced into JSON. */
  async function extractTripSlotsFromConversation() {
    const transcript = buildConversationTranscript(collectVoiceMessages());
    const raw = await callClaude(T('voice.extractSystemPrompt'), tr(currentLang, 'voice.extractUserPrompt', transcript), { json: true });
    return normalizeExtractedSlots(raw);
  }

  /**
   * Turns the Voice Assistant conversation into an actual itinerary: extracts what's been said
   * so far and shows a live checklist of what's captured (destination/days/start date/budget/
   * group/notes), Layla-style, instead of a silent black box. If destination/day-count are still
   * missing, it asks exactly for that AND reveals a "Build it anyway" button — the follow-up
   * question is never a hard wall, since `forceGenerate` (or that button) proceeds regardless,
   * filling any gaps with a clearly-labeled default. Once complete, it calls the same planner
   * prompt as TAB 1 and mirrors the result into the Itinerary tab too.
   */
  async function buildItineraryFromConversation(forceGenerate = false) {
    if (!collectVoiceMessages().some(m => m.role === 'user')) {
      const msg = T('voice.needConversation');
      addMsg('ai', msg);
      speak(msg);
      return;
    }
    vBuildBtn.disabled = true;
    vForceBuildBtn.disabled = true;
    const thinking = addMsg('ai', T('voice.extracting'));
    try {
      const slots = await extractTripSlotsFromConversation();
      if (vChecklist) vChecklist.innerHTML = renderTripChecklistHtml(slots, currentLang);
      const missing = missingTripSlots(slots);
      if (missing.length && !forceGenerate) {
        const question = buildVoiceFollowUpQuestion(missing, currentLang);
        thinking.textContent = question;
        speak(question);
        vForceBuildBtn.style.display = '';
        saveVoiceLog();
        return;
      }
      vForceBuildBtn.style.display = 'none';

      thinking.textContent = T('voice.buildingItinerary');
      const finalSlots = missing.length ? fillMissingSlotsWithDefaults(slots, currentLang) : slots;
      const dest = finalSlots.destination;
      const days = finalSlots.days;
      const startDate = finalSlots.startDate || '';
      const budget = finalSlots.budget || T('common.unlimitedBudget');
      const group = finalSlots.group || T('common.soloTraveler');
      const notes = finalSlots.notes || '';
      // Shares whatever member list is already set up in the Group Decision / Itinerary tabs,
      // same as a normal "Tạo lịch trình" click — the voice flow doesn't collect its own.
      const members = currentMembers();

      const { candidates: ragCandidates, context: ragContext } = await fetchPlannerRagContext(dest, members);
      const system = T('planner.systemPrompt');
      const user = tr(currentLang, 'planner.userPrompt', dest, days, startDate, budget, group, notes, members, ragContext);
      const rawData = await callClaude(system, user, { json: true });
      const data = resolvePlannerVenues(rawData, ragCandidates, members, currentLang);

      updateTripStateFromPlannerData(data, { destination: dest, days, startDate, budget, group, notes });
      const risks = detectTravelRisks(flattenActivities(data), { budget, days, group, notes }, null, currentLang)
        .concat(detectGeographicRisks(data, ragCandidates, currentLang));
      const satisfactionHtml = computePlannerSatisfactionHtml(members, flattenActivities(data));
      const costSummaryHtml = renderItineraryCostSummaryHtml(data, members.length, currentLang);
      const innerHtml = `${satisfactionHtml}${costSummaryHtml}${renderPlannerHtml(data, dest, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}`;
      vItinResult.innerHTML = `<div class="result-box">${withLoginGateHtml(innerHtml)}</div>`;

      // Mirror into the Itinerary tab too, so it's there to review/edit/share, not stranded in the chat
      // log — using the same finalSlots the generation itself ran on (including any auto-filled
      // defaults), so the Itinerary tab's fields always match what's actually in the rendered plan.
      pDest.value = dest; pDays.value = days; pStart.value = startDate; pBudget.value = finalSlots.budget; pGroup.value = finalSlots.group; pNotes.value = notes;
      renderPlannerSatisfaction(members, flattenActivities(data));
      renderPlannerCostSummary(data, members.length);
      const plannerInnerHtml = `${renderPlannerHtml(data, dest, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}`;
      pResult.innerHTML = `<div class="result-box">${withLoginGateHtml(plannerInnerHtml)}</div>`;
      updatePlannerShareState(data, dest);
      savePlannerState({ data, risks });
      showInviteBox({ destination: dest, days, startDate, budget: finalSlots.budget, group: finalSlots.group, notes, data });

      const readyMsg = tr(currentLang, 'voice.itineraryReady', dest, days);
      thinking.textContent = readyMsg;
      speak(readyMsg);
      saveVoiceLog();
    } catch (err) {
      thinking.textContent = '⚠️ ' + err.message;
      saveVoiceLog();
    } finally {
      vBuildBtn.disabled = false;
      vForceBuildBtn.disabled = false;
    }
  }

  vForceBuildBtn.addEventListener('click', () => buildItineraryFromConversation(true));

  // Wrapped in an arrow function, not passed directly — addEventListener would otherwise hand the
  // click Event itself as the first argument, which is truthy and would silently force-generate
  // (skip the missing-info follow-up) on every ordinary click.
  vBuildBtn.addEventListener('click', () => buildItineraryFromConversation());

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
  const hAccept = document.getElementById('h-accept');
  const hAcceptStatus = document.getElementById('h-acceptStatus');

  function healedPlanSignature(data) {
    const activities = canonicalHealedActivities(data);
    return activities.length ? JSON.stringify(activities) : '';
  }

  function updateHealAcceptState() {
    if (!hAccept || !hAcceptStatus) return;
    const saved = safeLoad(STORAGE_KEYS.heal) || {};
    const signature = healedPlanSignature(saved.data);

    if (!signature) {
      hAccept.disabled = true;
      hAcceptStatus.textContent = T('heal.acceptDisabledNoUpdate');
      return;
    }
    if (saved.acceptedSignature && saved.acceptedSignature === signature) {
      hAccept.disabled = true;
      hAcceptStatus.textContent = T('heal.acceptDisabledAccepted');
      return;
    }

    hAccept.disabled = false;
    hAcceptStatus.textContent = T('heal.acceptReady');
  }

  function saveHealState(extra) {
    const prev = safeLoad(STORAGE_KEYS.heal) || {};
    safeSave(STORAGE_KEYS.heal, Object.assign({}, prev, { itin: hItin.value, dest: hDest.value, event: hEvent.value }, extra));
  }
  hItin.addEventListener('input', () => {
    healUsesDefaultItin = false;
    saveHealState({});
    updateHealAcceptState();
  });
  [hDest, hEvent].forEach(el => el.addEventListener('input', () => {
    saveHealState({});
    updateHealAcceptState();
  }));

  (function restoreHeal() {
    const statusEl = document.getElementById('h-weatherStatus');
    const saved = safeLoad(STORAGE_KEYS.heal);
    if (saved) {
      if (saved.itin) hItin.value = saved.itin;
      if (saved.dest) hDest.value = saved.dest;
      if (saved.forecastEvent && saved.forecastEvent.date) {
        const desc = weatherDescription(saved.forecastEvent.weatherCode, currentLang);
        hEvent.value = tr(currentLang, 'heal.weatherForecastText', saved.forecastEvent.date, desc, saved.forecastEvent.tempMax, saved.forecastEvent.precip);
        if (statusEl) statusEl.textContent = T('heal.weatherReadyForecast', saved.forecastEvent.startDate, saved.forecastEvent.days);
      } else if (saved.event) {
        hEvent.value = saved.event;
        if (statusEl) statusEl.textContent = '';
      }
      if (saved.data) {
        const localized = relocalizeHealedData(saved.data, currentLang);
        hResult.innerHTML = `<div class="result-box">${renderHealHtml(localized, currentLang)}</div>`;
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
    updateHealAcceptState();
  })();

  document.getElementById('h-weather').addEventListener('click', async () => {
    const dest = hDest.value.trim();
    const statusEl = document.getElementById('h-weatherStatus');
    const plannerContext = getPlannerContext();
    if (!dest) { statusEl.textContent = T('heal.needDest'); return; }
    statusEl.textContent = T('heal.lookingUp');
    try {
      let place = null;
      const searchQueries = buildGeoLookupCandidates(dest);
      for (const query of searchQueries) {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=${encodeURIComponent(T('geocodeLang'))}&name=${encodeURIComponent(query)}`);
        if (!geoRes.ok) continue;
        const geo = await geoRes.json();
        const candidate = geo.results && geo.results[0];
        if (candidate) { place = candidate; break; }
      }
      if (!place) { statusEl.textContent = T('heal.notFound', dest); return; }

      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,precipitation&daily=weather_code,temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=16`);
      const w = await wRes.json();

      const forecast = buildForecastEventFromDaily(w.daily, plannerContext.startDate, plannerContext.days, currentLang);
      if (forecast) {
        hEvent.value = forecast.text;
        statusEl.textContent = T('heal.weatherReadyForecast', forecast.startDate, forecast.days);
        saveHealState({ forecastEvent: forecast });
        updateHealAcceptState();
      } else {
        const c = w.current;
        const desc = weatherDescription(c.weather_code, currentLang);
        hEvent.value = tr(currentLang, 'heal.weatherText', place.name, place.country, desc, c.temperature_2m, c.precipitation);
        const timeText = String(c.time || '').slice(11, 16);
        statusEl.textContent = `${T('heal.weatherReady', timeText)} ${T('heal.weatherFallbackCurrent')}`;
        saveHealState({ forecastEvent: null });
        updateHealAcceptState();
      }
    } catch (err) {
      statusEl.textContent = T('heal.weatherError', err.message);
    }
  });

  hAccept.addEventListener('click', () => {
    const saved = safeLoad(STORAGE_KEYS.heal) || {};
    const data = saved.data;
    const signature = healedPlanSignature(data);
    if (!data || !signature || (saved.acceptedSignature && saved.acceptedSignature === signature)) {
      updateHealAcceptState();
      return;
    }

    const plannerContext = getPlannerContext();
    const nextPlannerData = buildPlannerDataFromHealedData(data, tripState.plannerData);
    if (!Array.isArray(nextPlannerData.days) || !nextPlannerData.days.length) {
      updateHealAcceptState();
      return;
    }

    const destination = hDest.value.trim() || plannerContext.destination || tripState.destination || 'Okinawa';
    const days = plannerContext.days || String(nextPlannerData.days.length);
    const startDate = plannerContext.startDate || '';
    const budget = plannerContext.budget || T('common.unlimitedBudget');
    const group = plannerContext.group || T('common.soloTraveler');
    const notes = plannerContext.notes || '';

    pDest.value = destination;
    pDays.value = days;
    pStart.value = startDate;
    pBudget.value = budget;
    pGroup.value = group;
    pNotes.value = notes;

    updateTripStateFromPlannerData(nextPlannerData, { destination, days, startDate, budget, group, notes });

    const weatherIncident = classifyIncident((data.meta && data.meta.rawIncidentText) || hEvent.value.trim());
    const risks = detectTravelRisks(flattenActivities(nextPlannerData), { budget, days, group, notes }, weatherIncident, currentLang);
    const members = currentMembers();
    renderPlannerSatisfaction(members, flattenActivities(nextPlannerData));
    renderPlannerCostSummary(nextPlannerData, members.length);
    const innerHtml = `${renderPlannerHtml(nextPlannerData, destination, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}`;
    pResult.innerHTML = `<div class="result-box">${withLoginGateHtml(innerHtml)}</div>`;
    updatePlannerShareState(nextPlannerData, destination);
    savePlannerState({ data: nextPlannerData });
    lastGeneratedTrip = { destination, days, startDate, budget, group, notes, data: nextPlannerData };
    saveHealState({ acceptedSignature: signature });

    hAccept.disabled = true;
    hAcceptStatus.textContent = T('heal.acceptDone');
    syncPlannerToSelfHealing(true);
  });

  async function analyzeMemberImpactWithAi(members, beforeActivities, afterActivities, eventText, delta, lang = DEFAULT_LANG) {
    if (!delta || !Array.isArray(delta.perMember) || !delta.perMember.length) return null;
    const before = Array.isArray(beforeActivities) ? beforeActivities : [];
    const after = Array.isArray(afterActivities) ? afterActivities : [];
    const maxPreviewItems = 10;
    const payload = {
      language: impactOutputLanguageName(lang),
      incident: String(eventText || '').slice(0, 180),
      changedCount: Math.max(before.length, after.length),
      beforePreview: before.slice(0, maxPreviewItems),
      afterPreview: after.slice(0, maxPreviewItems),
      members: (members || []).map(m => ({ name: m.name, preference: m.pref || '' })),
      numericDelta: delta
    };
    const systemPrompt = `Analyze member impact for a self-healing itinerary. Return valid JSON only: {"summary":"","members":[{"name":"","impact":"positive|neutral|negative","reason":"","advice":""}]}. Keep names exact. Base judgments on numericDelta. Write in ${impactOutputLanguageName(lang)}. Keep each reason/advice short.`;
    const userPrompt = `Impact payload: ${JSON.stringify(payload)}`;
    try {
      const raw = await callClaude(systemPrompt, userPrompt, { json: true });
      return {
        normalized: normalizeMemberImpactAi(raw, delta, lang),
        raw
      };
    } catch (err) {
      return {
        normalized: buildMemberImpactFallback(delta, lang),
        raw: null
      };
    }
  }

  document.getElementById('h-run').addEventListener('click', async () => {
    syncPlannerToSelfHealing(true);
    const parsedInput = parseSelfHealingInput(hItin.value);
    const itin = parsedInput.flatActivities;
    const event = hEvent.value.trim() || T('heal.defaultEvent');
    const plannerContext = getPlannerContext();
    const plannerData = {
      ...(tripState.plannerData || {}),
      days: parsedInput.days,
      summary: (tripState.plannerData && tripState.plannerData.summary) || ''
    };
    const fallbackPlannerData = {
      days: [{ day: 1, activities: dedupePlanItems(itin).map(item => ({ text: item, slot: '' })) }],
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

    const weatherIncident = classifyIncident(event);
    const effectivePlannerData = plannerData.days && plannerData.days.length ? plannerData : fallbackPlannerData;
    const baseData = buildSelfHealingPlan(effectivePlannerData, itin, event, plannerContext, currentLang);
    let data = baseData;
    try {
      const system = T('heal.systemPrompt');
      const promptLines = buildSelfHealingPromptLines(parsedInput.days, currentLang);
      const promptInput = promptLines.length ? promptLines : itin;
      const user = tr(currentLang, 'heal.userPrompt', promptInput, event);
      const ai = await callClaude(system, user, { json: true, onChunk: streamPreview(hResult, T('heal.loading')) });
      data = normalizeSelfHealingAiResult(baseData, ai);
    } catch (err) {
      data = baseData;
    }

    if (!data) data = baseData;

    // Feature 5 (Explainable Self-Healing) + Feature 6 (Travel Risk Detection) — both
    // deterministic, reusing the Group Decision tab's members if any were entered there.
    const members = currentMembers();
    const healedActivities = canonicalHealedActivities(data);
    const scoredActivities = healedActivities.length ? healedActivities : itin;
    data.satisfactionDelta = computeSatisfactionDelta(members, itin, scoredActivities, currentLang);
    data.risks = detectTravelRisks(scoredActivities, plannerContext, weatherIncident, currentLang);

    if (members.length && data.satisfactionDelta) {
      data.impactAi = buildMemberImpactFallback(data.satisfactionDelta, currentLang);
    }

    data.meta = {
      ...(data.meta || {}),
      rawIncidentText: event,
      plannerContext,
      forecastEvent: (safeLoad(STORAGE_KEYS.heal) || {}).forecastEvent || null
    };

    hResult.innerHTML = `<div class="result-box">${renderHealHtml(data, currentLang)}</div>`;
    const savedHeal = safeLoad(STORAGE_KEYS.heal) || {};
    const signature = healedPlanSignature(data);
    const keepAccepted = savedHeal.acceptedSignature && savedHeal.acceptedSignature === signature;
    saveHealState({ data, acceptedSignature: keepAccepted ? savedHeal.acceptedSignature : null });
    updateHealAcceptState();

    if (members.length && data.satisfactionDelta) {
      const signatureAtRequest = signature;
      const langAtRequest = currentLang;
      analyzeMemberImpactWithAi(members, itin, scoredActivities, event, data.satisfactionDelta, langAtRequest)
        .then(aiImpact => {
          if (!aiImpact || !aiImpact.normalized) return;
          const latest = safeLoad(STORAGE_KEYS.heal) || {};
          if (!latest.data) return;
          if (healedPlanSignature(latest.data) !== signatureAtRequest) return;

          const enriched = {
            ...latest.data,
            impactAi: aiImpact.normalized,
            meta: {
              ...(latest.data.meta || {}),
              impactAiRaw: aiImpact.raw,
              impactAiLang: langAtRequest
            }
          };
          const localized = relocalizeHealedData(enriched, currentLang);
          hResult.innerHTML = `<div class="result-box">${renderHealHtml(localized, currentLang)}</div>`;
          saveHealState({ data: localized });
          updateHealAcceptState();
        })
        .catch(() => {
          // Keep deterministic fallback already rendered.
        });
    }
  });

  // ---------- TAB 5: Camera AI ----------
  const cFile = document.getElementById('c-file');
  const cPreview = document.getElementById('c-preview');
  const cRun = document.getElementById('c-run');
  let cImageBase64 = null;
  let cImageMediaType = 'image/jpeg';

  cFile.addEventListener('change', () => {
    const file = cFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const [prefix, base64] = reader.result.split(',');
      cImageBase64 = base64;
      // e.g. "data:image/png;base64" -> "image/png"; falls back to jpeg if the browser/file
      // gave something Claude's API doesn't accept (only jpeg/png/gif/webp are valid).
      const match = /^data:([^;]+);base64$/.exec(prefix);
      cImageMediaType = (match && /^image\/(jpeg|png|gif|webp)$/.test(match[1])) ? match[1] : 'image/jpeg';
      cPreview.src = reader.result;
      cPreview.style.display = 'block';
      cRun.disabled = false;
    };
    reader.readAsDataURL(file);
  });

  const CAMERA_MODEL_LABEL = 'Claude';

  cRun.addEventListener('click', async () => {
    if (!cImageBase64) return;
    const mode = document.getElementById('c-mode').value;
    const resultEl = document.getElementById('c-result');
    let caption = '';

    try {
      setLoading(resultEl, true, T('camera.step1'));
      const captionPrompt = 'Describe this image in detail, mentioning any text you can see.';
      caption = await callVision(captionPrompt, cImageBase64, cImageMediaType);
      const normalized = typeof caption === 'string' ? caption.trim() : '';
      if (!normalized || normalized === '(no response)') {
        throw new Error(T('camera.noCaption', CAMERA_MODEL_LABEL));
      }

      const system = mode === 'food' ? T('camera.systemPromptFood') : T('camera.systemPromptLandmark');
      const text = await callClaude(system, tr(currentLang, 'camera.userPrompt', caption), {
        onChunk: streamPreview(resultEl, T('camera.step2'))
      });
      resultEl.innerHTML = `<div class="result-box">${escapeHtml(text)}</div><div class="summary-note">${T('camera.disclaimer', escapeHtml(CAMERA_MODEL_LABEL))}</div>`;
    } catch (err) {
      const fallbackText = buildCameraFallback(mode, caption, CAMERA_MODEL_LABEL, currentLang);
      resultEl.innerHTML = `<div class="error-box">⚠️ ${escapeHtml(err.message)}</div><div class="result-box">${escapeHtml(fallbackText)}</div><div class="summary-note">${T('camera.fallbackAdvice')}</div><div class="summary-note">${T('camera.disclaimer', escapeHtml(CAMERA_MODEL_LABEL))}</div>`;
    }
  });

  /** Calls claude-server's /vision (one-shot image caption, not streamed — captions are short). */
  async function callVision(prompt, imageBase64, mediaType) {
    let res;
    try {
      res = await fetch(`${aiProxyBase()}/vision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, imageBase64, mediaType })
      });
    } catch (err) {
      throw new Error(T('errors.visionCannotConnect', aiProxyBase()));
    }
    if (!res.ok) {
      let msg = res.status + ' ' + res.statusText;
      try { const errJson = await res.json(); msg = errJson.error || msg; } catch (e) {}
      throw new Error(msg);
    }
    const data = await res.json();
    return data.message?.content || '(no response)';
  }

  applyStaticTranslations();
  // Members restore (TAB 2) runs before this line, so this picks up any cached itinerary
  // (TAB 1's own restore ran earlier, before members existed yet) with the correct group.
  refreshPlannerSatisfactionLive();
  refreshPlannerCostSummaryLive();
  // Locks/unlocks Group Decision based on whether an itinerary exists — already set as a side
  // effect of updateTripStateFromPlannerData() when there IS one; this covers the fresh-session
  // case where that function is never called at all.
  updateGroupDecisionGate();
  applyAuthUI();
}

})(typeof globalThis !== 'undefined' ? globalThis : this);
