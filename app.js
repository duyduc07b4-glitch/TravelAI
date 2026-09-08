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
    appSubtitle: 'AI giúp cả nhóm quyết định cùng nhau · chạy local qua Ollama · dùng được cả từ điện thoại trong cùng mạng',
    checkConnBtn: 'Kiểm tra kết nối',
    connect: {
      defaultHint: 'Cần cài <a href="https://ollama.com/download" target="_blank" style="color:var(--accent)">Ollama</a> trên máy này trước (miễn phí, chạy hoàn toàn offline). Sau khi cài: mở Terminal chạy <code>ollama pull llama3.2</code> để tải model, rồi bấm "Kiểm tra kết nối". Muốn dùng từ điện thoại: điện thoại phải cùng Wi-Fi với máy này, thay <code>localhost</code> ở ô Server bằng địa chỉ IP LAN của máy (VD: <code>http://192.168.3.23:11434</code>), và mở trang này trên điện thoại qua <code>http://192.168.3.23:8765/app.html</code>.',
      connecting: 'Đang kết nối tới Ollama...',
      noModel: (model) => `⚠️ Kết nối được nhưng chưa có model nào. Chạy: <code>ollama pull ${model}</code> rồi thử lại.`,
      modelMissing: (names, model) => `⚠️ Server có các model: ${names} — không thấy "${model}". Sửa lại tên model hoặc chạy <code>ollama pull ${model}</code>.`,
      ready: (model) => `✅ Đã kết nối Ollama, model "${model}" sẵn sàng — AI chạy trên máy này, hoàn toàn offline/miễn phí.`,
      failed: (base, err) => `⚠️ Không kết nối được tới ${base}. Kiểm tra: Ollama đã chạy chưa, đúng địa chỉ IP chưa, và nếu gọi từ điện thoại/máy khác thì đã bật <code>OLLAMA_HOST=0.0.0.0</code> và <code>OLLAMA_ORIGINS=*</code> chưa. Lỗi: ${err}`
    },
    tabs: { planner: '🗺️ Lịch trình', group: '👥 Quyết định nhóm', voice: '🎙️ Trợ lý giọng nói', heal: '🌧️ Self-Healing', camera: '📷 Camera AI', diff: '🆚 Vì sao TravelAI' },
    common: {
      mapLink: '📍 Xem bản đồ',
      venueWarning: '⚠️ chưa xác minh giờ mở cửa',
      dayLabel: (n) => `Day ${n}`,
      noResult: 'Không có kết quả.',
      noChange: 'Không có thay đổi.',
      dayCountMismatch: (actual, requested) => `⚠️ Bạn yêu cầu ${requested} ngày nhưng AI chỉ tạo được ${actual} ngày — model có thể quá nhỏ để giữ đúng số ngày dài. Thử bấm "Tạo lịch trình" lại lần nữa, hoặc đổi sang model mạnh hơn (VD: llama3.1, qwen2.5).`,
      aiFinal: '🤖 AI chốt:',
      copied: '✅ Đã copy lịch trình vào clipboard!',
      shareFailed: '⚠️ Không tự copy được — hãy chọn và copy đoạn văn bản dưới đây.',
      shareFallback: 'Chia sẻ native không được hỗ trợ trên http LAN/điện thoại này, nên app đã tự sao chép lịch trình vào clipboard.',
      sharedVia: 'Tạo bằng AI Travel Companion 🗺️',
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
      systemPrompt: 'Bạn là AI Travel Companion, trợ lý lập kế hoạch du lịch cá nhân hóa. QUAN TRỌNG VỀ SỐ NGÀY: mảng "days" PHẢI có ĐỦ và ĐÚNG số ngày người dùng yêu cầu — không được rút gọn hay chỉ trả về 1 ngày nếu người dùng yêu cầu nhiều ngày hơn. Đánh số "day" liên tục từ 1 đến hết số ngày được yêu cầu, mỗi ngày một phần tử riêng trong mảng. Nếu có danh sách "Sở thích riêng từng thành viên" bên dưới, hãy cố gắng chọn hoạt động cân bằng, phù hợp với nhiều người trong nhóm nhất có thể — có thể xen kẽ hoạt động ưu tiên từng người qua các ngày khác nhau, không dồn hết vào sở thích của một người. Mỗi hoạt động nên nêu tên địa điểm/quán cụ thể có thể tìm trên Google Maps (VD: "Ăn trưa tại Yunangi Okinawan Cuisine" thay vì chỉ "Lunch"). Bạn KHÔNG có dữ liệu thời gian thực nên KHÔNG được khẳng định giờ mở cửa, địa chỉ, số điện thoại, hay tình trạng giao thông/khoảng cách di chuyển thực tế của bất kỳ địa điểm nào — thứ tự hoạt động chỉ nên dựa trên suy luận hợp lý chung (VD: bãi biển buổi chiều, ngắm hoàng hôn cuối ngày), không khẳng định là tối ưu về đường đi hay đã kiểm tra kẹt xe thật. Trả lời DUY NHẤT bằng JSON hợp lệ (giữ nguyên tên field tiếng Anh như trong schema, chỉ viết NỘI DUNG bằng tiếng Việt), không kèm text hay markdown code fence nào khác. Ví dụ schema cho chuyến 2 ngày (số phần tử trong "days" phải khớp đúng số ngày người dùng thực sự yêu cầu, không phải cố định theo ví dụ này):\n{"days":[{"day":1,"activities":["Naha Airport","Ăn trưa tại nhà hàng Yunangi","American Village","Sunset Beach","Ăn tối tại Steak House 88"]},{"day":2,"activities":["Churaumi Aquarium","Ăn trưa gần đó","Cape Manzamo","Ăn tối hải sản"]}],"summary":"1-2 câu tổng kết về chi phí ước tính và lưu ý chính, nhắc người dùng kiểm tra giờ mở cửa thật trước khi đi"}',
      userPrompt: (dest, days, startDate, budget, group, notes, members) => `Lên lịch trình du lịch ${dest}, bắt đầu từ ngày ${startDate || 'chưa xác định'}, ĐÚNG ${days} ngày — mảng "days" phải có đủ ${days} phần tử, đánh số day từ 1 đến ${days}, không được thiếu ngày nào. Ngân sách: ${budget} yên. Nhóm: ${group}. ${notes ? 'Ghi chú: ' + notes : ''}\nSắp xếp hoạt động theo thứ tự hợp lý trong ngày (sáng/trưa/chiều/tối), phù hợp thời tiết chung của điểm đến, chi phí, và trải nghiệm phù hợp cả nhóm. Nếu ${startDate} là ngày du lịch cụ thể, hãy tính đến ngày nghỉ lễ, cuối tuần hoặc thời điểm đi để chọn hoạt động phù hợp. Không cần đảm bảo giờ mở cửa hay khoảng cách di chuyển chính xác vì bạn không có dữ liệu thời gian thực. Nhắc lại: PHẢI có đủ ${days} ngày trong kết quả.${(members && members.length) ? `\n\nSở thích riêng từng thành viên (hãy cân đối hoạt động để phù hợp với nhiều người nhất có thể, không chỉ ưu tiên một người):\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}` : ''}`
    },
    group: {
      title: 'Chấm điểm địa điểm cho cả nhóm',
      placeLabel: 'Địa điểm cần đánh giá',
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
      buildTriggers: ['tạo lịch trình', 'lên lịch trình', 'lập lịch trình', 'chốt lịch trình', 'xây lịch trình', 'làm lịch trình', 'plan giúp tôi']
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
      incidentLabel: 'Tình huống:',
      planLabel: 'Bám theo plan Tab 1:',
      reasonPrefix: 'Lý do:',
      severityLabel: 'Mức độ:',
      satisfactionImpact: '📉 Tác động đến mức độ hài lòng nhóm',
      reasonStorm: 'Bão / gió lớn / mưa dông nên ưu tiên hoạt động trong nhà và gần nhau hơn',
      reasonRain: 'Mưa to khiến hoạt động ngoài trời không còn phù hợp',
      reasonHeat: 'Nắng nóng cực đoan, chuyển sang nơi có điều hòa',
      reasonWind: 'Thời tiết xấu khiến hoạt động ngoài trời nên được thay thế',
      reasonDefault: 'Thời tiết xấu khiến hoạt động ngoài trời nên được thay thế',
      summaryDefault: 'Không có mô tả tình huống cụ thể.',
      summaryStorm: (text) => `Sự cố nghiêm trọng: ${text}`,
      summaryRain: (text) => `Thời tiết mưa: ${text}`,
      summaryHeat: (text) => `Thời tiết nóng / nắng: ${text}`,
      summaryWind: (text) => `Thời tiết gió mạnh: ${text}`,
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
      fallbackUnknown: (model) => `AI vision "${model}" chưa xác định được nội dung ảnh rõ ràng. Đây là fallback an toàn: ảnh có thể quá mờ, thiếu sáng hoặc model hiện tại quá nhẹ. Hãy thử chụp lại với ánh sáng tốt hơn, không che chữ trên ảnh, hoặc đổi sang model vision mạnh hơn như llama3.2-vision / qwen2.5vl.`,
      fallbackFood: (guess) => `AI vision chưa đọc đủ chi tiết để khẳng định món ăn chắc chắn. Dựa trên mô tả hiện có, đây có thể là ${guess || 'một món ăn'} — thử chụp ảnh gần hơn, góc chụp rõ hơn và tránh ánh sáng quá tối để model nhận diện tốt hơn.`,
      fallbackLandmark: (guess) => `AI vision chưa nhận diện được địa danh này một cách chắc chắn. Dựa trên mô tả hiện có, đây có thể là ${guess || 'một địa danh/công trình'} — thử chụp hình rộng hơn, rõ biển tên hoặc đổi sang model mạnh hơn để phân tích chính xác hơn.`,
      fallbackAdvice: 'Nếu ảnh không ổn, hãy chụp lại ở góc sáng đủ, không che chữ trên biển hiệu/menu, và ưu tiên dùng ảnh rõ nét hơn.',
      disclaimer: (model) => `⚠️ AI vision chạy local (${model}) dễ nhận diện sai, đặc biệt với chữ trên ảnh (menu, biển hiệu) và món/địa danh ít phổ biến. Coi đây là gợi ý tham khảo, không phải kết luận chắc chắn.`,
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
    risk: {
      title: '🚦 Kiểm tra rủi ro chuyến đi',
      level: { low: 'Thấp', medium: 'Vừa', high: 'Cao' },
      type: { walking: 'Đi bộ nhiều', budget: 'Rủi ro ngân sách', transport: 'Di chuyển', weather: 'Thời tiết' },
      walkingHigh: (count) => `${count} hoạt động ngoài trời liên tiếp — nhóm có thể mệt, nên xen kẽ hoạt động trong nhà hoặc thêm thời gian nghỉ.`,
      walkingMedium: (count) => `${count} hoạt động ngoài trời trong danh sách — cân nhắc xen kẽ nghỉ ngơi.`,
      budgetHigh: (perDay) => `Ngân sách chỉ khoảng ${perDay} yên/ngày — khá eo hẹp so với chi phí du lịch Nhật Bản, dễ vượt ngân sách.`,
      budgetMedium: (perDay) => `Ngân sách khoảng ${perDay} yên/ngày — vừa đủ, nên ưu tiên các lựa chọn giá hợp lý.`,
      transportMedium: 'Nhiều hoạt động nhưng không có phương tiện di chuyển rõ ràng trong lịch trình — cân nhắc thuê xe hoặc đặt taxi trước.',
      weatherHigh: 'Thời tiết xấu nghiêm trọng — nhiều khả năng phải đổi kế hoạch giữa chừng.',
      weatherMedium: 'Thời tiết không thuận lợi — nên chuẩn bị phương án dự phòng trong nhà.'
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
    appSubtitle: 'グループ全員で決める旅行をAIがサポート · Ollamaでローカル動作 · 同じネットワーク内ならスマホからも利用可',
    checkConnBtn: '接続確認',
    connect: {
      defaultHint: 'まずこの端末に<a href="https://ollama.com/download" target="_blank" style="color:var(--accent)">Ollama</a>をインストールしてください（無料・完全オフライン動作）。インストール後、ターミナルで <code>ollama pull llama3.2</code> を実行してモデルを取得し、「接続確認」を押してください。スマホから使う場合：スマホは同じWi-Fiに接続し、Server欄の <code>localhost</code> をこの端末のLAN IPアドレスに置き換え（例：<code>http://192.168.3.23:11434</code>）、スマホでは <code>http://192.168.3.23:8765/app.html</code> を開いてください。',
      connecting: 'Ollamaに接続中...',
      noModel: (model) => `⚠️ 接続はできましたが、モデルがまだありません。<code>ollama pull ${model}</code> を実行してから再試行してください。`,
      modelMissing: (names, model) => `⚠️ サーバーにあるモデル：${names} — 「${model}」が見つかりません。モデル名を修正するか <code>ollama pull ${model}</code> を実行してください。`,
      ready: (model) => `✅ Ollamaに接続済み、モデル「${model}」使用可能 — この端末上で完全オフライン・無料で動作しています。`,
      failed: (base, err) => `⚠️ ${base} に接続できません。Ollamaが起動しているか、IPアドレスが正しいか確認してください。スマホ/他端末から接続する場合は <code>OLLAMA_HOST=0.0.0.0</code> と <code>OLLAMA_ORIGINS=*</code> を設定してください。エラー内容：${err}`
    },
    tabs: { planner: '🗺️ 旅程', group: '👥 グループ決定', voice: '🎙️ 音声アシスタント', heal: '🌧️ 自動リカバリー', camera: '📷 カメラAI', diff: '🆚 TravelAIの違い' },
    common: {
      mapLink: '📍 地図を見る',
      venueWarning: '⚠️ 営業時間未確認',
      dayLabel: (n) => `${n}日目`,
      noResult: '結果がありません。',
      noChange: '変更はありません。',
      dayCountMismatch: (actual, requested) => `⚠️ ${requested}日間を指定しましたが、AIは${actual}日分しか作成しませんでした — モデルが小さく、長い日数を正しく保持できない可能性があります。もう一度「旅程を作成」を試すか、より強力なモデル（例：llama3.1、qwen2.5）に変更してください。`,
      aiFinal: '🤖 AIの結論：',
      copied: '✅ 旅程をクリップボードにコピーしました！',
      shareFailed: '⚠️ 自動コピーできませんでした — 下のテキストを選択してコピーしてください。',
      shareFallback: 'このLAN HTTP/モバイル環境ではネイティブ共有が使えないため、アプリが旅程をクリップボードに自動コピーしました。',
      sharedVia: 'AI Travel Companionで作成 🗺️',
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
      systemPrompt: 'あなたはAI Travel Companion、パーソナライズされた旅行プランニングアシスタントです。日数について重要：「days」配列には、ユーザーが要求した日数と必ず同じ数の要素を含めてください — ユーザーが複数日を要求した場合に1日分だけ返すことは禁止です。「day」は要求された日数の分だけ1から連番で振ってください（配列の要素ごとに1日）。下に「メンバーごとの好み」の一覧がある場合は、できるだけ多くのメンバーに合うようバランス良くアクティビティを選んでください — 1人の好みだけに偏らせず、日ごとに優先するメンバーを変えても構いません。各アクティビティにはGoogleマップで検索できる具体的な店名・施設名を含めてください（例：「昼食はランチのみ」ではなく「Yunangi Okinawan Cuisineで昼食」）。あなたはリアルタイム情報を持たないため、営業時間・住所・電話番号・実際の交通状況や移動距離を断定してはいけません — アクティビティの順序は一般的な妥当性（例：午後はビーチ、1日の終わりに夕日鑑賞）に基づく推測に留め、経路が最適化されている、または渋滞を確認したとは主張しないでください。必ずJSONのみで回答し（スキーマの英語フィールド名はそのまま維持し、内容は日本語で記述）、それ以外のテキストやMarkdownのコードフェンスは付けないでください。2日間の旅行のスキーマ例（「days」の要素数は必ずユーザーが実際に要求した日数に合わせること。この例の日数に固定しないこと）：\n{"days":[{"day":1,"activities":["那覇空港","Yunangi Okinawan Cuisineで昼食","American Village","サンセットビーチ","Steak House 88で夕食"]},{"day":2,"activities":["美ら海水族館","近くで昼食","万座毛","海鮮の夕食"]}],"summary":"概算費用と主な注意点についての1〜2文。出発前に実際の営業時間を確認するよう促すこと"}',
      userPrompt: (dest, days, startDate, budget, group, notes, members) => `${dest}への旅行プランを作成してください。開始日は${startDate || '未指定'}、日数は必ず${days}日間 — 「days」配列には${days}個の要素を含め、dayは1から${days}まで振ってください。欠けている日があってはいけません。予算：${budget}円。メンバー：${group}。${notes ? '補足：' + notes : ''}\n開始日${startDate || '未指定'}を踏まえて、連休・週末・祝日などの影響も考慮し、1日の中で時間帯（朝/昼/午後/夜）ごとに妥当な順序でアクティビティを配置し、目的地の一般的な気候、費用、グループ全員に合う体験を考慮してください。リアルタイム情報がないため、営業時間や正確な移動距離は保証しなくて構いません。念のため繰り返しますが、結果には必ず${days}日分すべてを含めてください。${(members && members.length) ? `\n\nメンバーごとの好み（できるだけ多くのメンバーに合うようバランス良く配置してください。1人だけに偏らないように）：\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}` : ''}`
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
      buildTriggers: ['旅程を作って', 'スケジュールを作って', 'プランを作って', '旅程作成', '旅程を作成']
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
      incidentLabel: '状況：',
      planLabel: 'Tab 1 の計画に沿う：',
      reasonPrefix: '理由：',
      severityLabel: '重要度：',
      satisfactionImpact: '📉 グループ満足度への影響',
      reasonStorm: '大雨・強風・雷雨のため、屋内で近い場所を優先する',
      reasonRain: '雨が強く、屋外アクティビティが適さない',
      reasonHeat: '猛暑のため、冷房のある場所に切り替える',
      reasonWind: '風が強く、屋外の予定を変更する必要がある',
      reasonDefault: '悪天候のため、屋外の予定を変更する必要がある',
      summaryDefault: '具体的な状況の説明はありません。',
      summaryStorm: (text) => `重大な状況: ${text}`,
      summaryRain: (text) => `雨天: ${text}`,
      summaryHeat: (text) => `猛暑: ${text}`,
      summaryWind: (text) => `強風: ${text}`,
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
      fallbackUnknown: (model) => `Visionモデル「${model}」はこの画像の中身をはっきり認識できませんでした。これは安全側のフォールバックです。画像がぼやけている、暗すぎる、または現在のモデルが軽すぎる可能性があります。明るい場所で再撮影し、看板やメニューの文字が隠れないようにしてから、より強いvision modelに切り替えてください。`,
      fallbackFood: (guess) => `Vision AIは料理の細部を十分に読み取れず、断定はできませんでした。現時点の情報からすると、これは${guess || '料理'}の可能性が高いです。より近くで、角度を変えて、明るく撮影した画像を試してください。`,
      fallbackLandmark: (guess) => `Vision AIはこの場所を確実に識別できませんでした。現時点の情報からすると、これは${guess || '観光地・建造物'}の可能性が高いです。看板や全景を入れて再撮影するか、より強いモデルに切り替えると判定が安定します。`,
      fallbackAdvice: '画像がうまく読めない場合は、曖昧な画角を避け、建物名・看板・食べ物の輪郭がはっきり見える写真を選びましょう。',
      disclaimer: (model) => `⚠️ ローカル動作のVision AI（${model}）は誤認識しやすく、特に画像内の文字（メニューや看板）やマイナーな料理・観光地では精度が落ちます。参考程度に留め、断定的な結論とはみなさないでください。`,
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
    risk: {
      title: '🚦 旅程のリスクチェック',
      level: { low: '低い', medium: '中程度', high: '高い' },
      type: { walking: '徒歩が多い', budget: '予算リスク', transport: '移動手段', weather: '天候' },
      walkingHigh: (count) => `屋外アクティビティが${count}件連続しています — グループが疲れる可能性があるため、屋内アクティビティや休憩を挟むことをおすすめします。`,
      walkingMedium: (count) => `旅程に屋外アクティビティが${count}件あります — 休憩を挟むことを検討してください。`,
      budgetHigh: (perDay) => `予算が1日あたり約${perDay}円と、日本旅行の費用としてはやや厳しめです。予算オーバーに注意してください。`,
      budgetMedium: (perDay) => `予算は1日あたり約${perDay}円 — ちょうど良い水準です。コストパフォーマンスの良い選択を優先してください。`,
      transportMedium: 'アクティビティは多いですが、旅程に明確な移動手段がありません — レンタカーやタクシーの事前手配を検討してください。',
      weatherHigh: '深刻な悪天候です — 旅程の途中変更が必要になる可能性が高いです。',
      weatherMedium: '天候が良くありません — 屋内の代替プランを準備しておくとよいでしょう。'
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
    appSubtitle: 'The AI that helps your group decide together · runs locally via Ollama · usable from your phone on the same network',
    checkConnBtn: 'Check connection',
    connect: {
      defaultHint: 'You need <a href="https://ollama.com/download" target="_blank" style="color:var(--accent)">Ollama</a> installed on this machine first (free, fully offline). After installing: open a terminal and run <code>ollama pull llama3.2</code> to fetch the model, then click "Check connection". To use it from your phone: your phone must be on the same Wi-Fi, replace <code>localhost</code> in the Server field with this machine\'s LAN IP address (e.g. <code>http://192.168.3.23:11434</code>), and open this page on your phone via <code>http://192.168.3.23:8765/app.html</code>.',
      connecting: 'Connecting to Ollama...',
      noModel: (model) => `⚠️ Connected, but no model is available yet. Run: <code>ollama pull ${model}</code> and try again.`,
      modelMissing: (names, model) => `⚠️ The server has these models: ${names} — "${model}" wasn't found. Fix the model name or run <code>ollama pull ${model}</code>.`,
      ready: (model) => `✅ Connected to Ollama, model "${model}" is ready — running fully offline/free on this machine.`,
      failed: (base, err) => `⚠️ Couldn't connect to ${base}. Check that Ollama is running, the IP address is correct, and — if calling from a phone/other device — that <code>OLLAMA_HOST=0.0.0.0</code> and <code>OLLAMA_ORIGINS=*</code> are set. Error: ${err}`
    },
    tabs: { planner: '🗺️ Itinerary', group: '👥 Group Decision', voice: '🎙️ Voice Assistant', heal: '🌧️ Self-Healing', camera: '📷 Camera AI', diff: '🆚 Why TravelAI' },
    common: {
      mapLink: '📍 View map',
      venueWarning: '⚠️ hours not verified',
      dayLabel: (n) => `Day ${n}`,
      noResult: 'No results.',
      noChange: 'No changes.',
      dayCountMismatch: (actual, requested) => `⚠️ You asked for ${requested} days but the AI only generated ${actual} — the model might be too small to hold onto a long day count. Try clicking "Create itinerary" again, or switch to a stronger model (e.g. llama3.1, qwen2.5).`,
      aiFinal: '🤖 AI\'s call:',
      copied: '✅ Itinerary copied to clipboard!',
      shareFailed: '⚠️ Could not auto-copy — select and copy the text below manually.',
      shareFallback: 'Native sharing is not supported on this LAN HTTP/mobile browser, so the app copied the itinerary to the clipboard instead.',
      sharedVia: 'Made with AI Travel Companion 🗺️',
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
      systemPrompt: 'You are AI Travel Companion, a personalized trip-planning assistant. IMPORTANT ABOUT DAY COUNT: the "days" array MUST contain exactly as many elements as the number of days the user asked for — never collapse a multi-day trip down to just 1 day. Number "day" consecutively from 1 through the requested number of days, one array element per day. If a "Per-member preferences" list is given below, try to balance activities across as many members as possible — you can favor a different member on different days rather than optimizing for just one person. Every activity should name a specific place/venue that can be looked up on Google Maps (e.g. "Lunch at Yunangi Okinawan Cuisine" instead of just "Lunch"). You have NO real-time data, so you must NOT assert opening hours, addresses, phone numbers, or real traffic conditions/travel distances for any place — the order of activities should only reflect general reasonable judgment (e.g. beach in the afternoon, sunset viewing at the end of the day), and you must not claim the route is optimized or that you checked real traffic. Reply with ONLY valid JSON (keep the English field names exactly as in the schema, write the CONTENT in English), with no other text or markdown code fences. Example schema for a 2-day trip (the number of elements in "days" must match whatever number of days the user actually asked for, not this example\'s count):\n{"days":[{"day":1,"activities":["Naha Airport","Lunch at Yunangi Okinawan Cuisine","American Village","Sunset Beach","Dinner at Steak House 88"]},{"day":2,"activities":["Churaumi Aquarium","Lunch nearby","Cape Manzamo","Seafood dinner"]}],"summary":"1-2 sentences summarizing estimated cost and key notes, reminding the user to verify real opening hours before going"}',
      userPrompt: (dest, days, startDate, budget, group, notes, members) => `Plan a trip to ${dest} starting on ${startDate || 'an unspecified date'} for EXACTLY ${days} days — the "days" array must contain ${days} elements, numbered day 1 through ${days}, with no day missing. Budget: ${budget} JPY. Group: ${group}. ${notes ? 'Notes: ' + notes : ''}\nConsider holidays, weekends, and the time of year represented by ${startDate || 'the chosen trip start date'} when ordering activities through the day (morning/midday/afternoon/evening), fitting the destination's general climate, cost, and group-friendly experiences. Since you do not have real-time data, you do not need to guarantee opening hours or exact travel distances. To be clear: the result must include all ${days} days.${(members && members.length) ? `\n\nPer-member preferences (balance activities to fit as many members as possible, don't optimize for just one person):\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}` : ''}`
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
      buildTriggers: ['build the itinerary', 'create the itinerary', 'make an itinerary', 'plan my trip', 'generate itinerary', 'build my itinerary']
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
      incidentLabel: 'Situation:',
      planLabel: 'Based on Tab 1 plan:',
      reasonPrefix: 'Reason:',
      severityLabel: 'Severity:',
      satisfactionImpact: '📉 Impact on group satisfaction',
      reasonStorm: 'Heavy rain / strong wind / thunderstorm means indoor and compact alternatives are preferred',
      reasonRain: 'Heavy rain makes the outdoor activity unsuitable',
      reasonHeat: 'Extreme heat means moving to air-conditioned places',
      reasonWind: 'Strong wind makes the outdoor activity unsuitable',
      reasonDefault: 'Bad weather means the outdoor activity should be replaced',
      summaryDefault: 'There is no specific incident description.',
      summaryStorm: (text) => `Severe incident: ${text}`,
      summaryRain: (text) => `Rainy conditions: ${text}`,
      summaryHeat: (text) => `Heatwave: ${text}`,
      summaryWind: (text) => `Strong wind: ${text}`,
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
      fallbackUnknown: (model) => `The vision model "${model}" could not confidently identify the image. This is a safe fallback: the photo may be blurry, poorly lit, or the current model is too lightweight. Try taking a sharper photo with better lighting, avoid blocking text, or switch to a stronger vision model such as llama3.2-vision or qwen2.5vl.`,
      fallbackFood: (guess) => `The vision model could not read enough detail to be certain. Based on the current description, this is likely ${guess || 'a dish'} — try a closer, brighter shot and avoid glare or dark corners for better recognition.`,
      fallbackLandmark: (guess) => `The vision model could not confidently identify this place. Based on the current description, this is likely ${guess || 'a landmark/building'} — try a wider shot with visible signage or switch to a stronger model for more reliable results.`,
      fallbackAdvice: 'If the image is still unclear, capture a cleaner photo with more contrast, visible signage, and better lighting.',
      disclaimer: (model) => `⚠️ The local vision AI (${model}) can misidentify things easily, especially text in the image (menus, signs) and less common dishes/landmarks. Treat this as a reference suggestion, not a firm conclusion.`,
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
    risk: {
      title: '🚦 Travel risk check',
      level: { low: 'Low', medium: 'Medium', high: 'High' },
      type: { walking: 'Excessive walking', budget: 'Budget risk', transport: 'Transportation', weather: 'Weather' },
      walkingHigh: (count) => `${count} outdoor activities back to back — the group may get tired, consider mixing in indoor activities or extra rest.`,
      walkingMedium: (count) => `${count} outdoor activities in this itinerary — consider spacing them with breaks.`,
      budgetHigh: (perDay) => `Budget is only about ¥${perDay}/day — tight for travel costs in Japan, easy to go over.`,
      budgetMedium: (perDay) => `Budget is about ¥${perDay}/day — reasonable, prioritize good-value options.`,
      transportMedium: 'Many activities but no clear transportation in the itinerary — consider arranging a rental car or taxi ahead of time.',
      weatherHigh: 'Severe bad weather — the plan will likely need a mid-trip change.',
      weatherMedium: "Weather isn't great — prepare an indoor backup plan."
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

function renderPlannerHtml(data, dest, lang, requestedDays) {
  let dayHtml = '';
  let renderedDays = 0;
  (data.days || []).forEach((d, i) => {
    if (!d || !Array.isArray(d.activities) || d.activities.length === 0) return;
    renderedDays++;
    const items = d.activities.map(a => `<li>${escapeHtml(a)} ${mapLink(a, dest, lang)}${venueWarning(a, lang)}</li>`).join('');
    dayHtml += `<div class="day-block"><h4>${tr(lang, 'common.dayLabel', d.day || (i + 1))}</h4><ul>${items}</ul></div>`;
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
    d.activities.forEach(a => lines.push(`- ${a}`));
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
 */
function generateCompromiseOptions(candidates, members, lang) {
  const named = (candidates || []).filter(c => c && c.name);
  if (!named.length) return [];
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

  const count = Math.min(3, named.length);
  return strategies.slice(0, count).map((strat, i) => {
    const ranked = [...scored].sort(strat.sort);
    const s = ranked.find(c => !used.has(c.entry.name)) || ranked[0];
    used.add(s.entry.name);
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
      picked: strat.key === 'safest'
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

function renderCompromiseOptionsHtml(options, lang) {
  if (!options || !options.length) return '';
  let html = `<div class="opt-heading">${escapeHtml(tr(lang, 'group.compromiseTitle'))}</div><div class="opt-grid">`;
  // Kept deliberately compact — this card already carries a pick tag, score, name, trade-offs
  // and sometimes a caveat, so the label and the pro/con lines are each merged into one row
  // instead of stacking every signal on its own line.
  html += options.map(o => `
    <div class="opt-card${o.picked ? ' picked' : ''}">
      ${o.picked ? `<div class="opt-pick-tag">${escapeHtml(tr(lang, 'group.aiPick'))}</div>` : ''}
      <div class="opt-top">
        <span class="opt-label">${tr(lang, 'group.optionLabel', o.label)}${o.strategy ? ' · ' + escapeHtml(tr(lang, 'group.strategy.' + o.strategy)) : ''}</span>
        <span class="opt-score">${o.overall}%</span>
      </div>
      <div class="opt-name">${escapeHtml(o.name)}</div>
      <div class="opt-prosandcons">
        ${o.best ? `<span class="opt-pro">+ ${escapeHtml(tr(lang, 'group.optionPro', o.best.name, o.best.score))}</span>` : ''}
        ${o.worst ? `<span class="opt-con">− ${escapeHtml(tr(lang, 'group.optionCon', o.worst.name, o.worst.score))}</span>` : ''}
      </div>
      ${o.bland ? `<div class="opt-caveat">⚠️ ${escapeHtml(tr(lang, 'group.blandCaveat', o.maxScore))}</div>` : ''}
      <div class="opt-why">${escapeHtml(o.picked ? tr(lang, 'group.whyPicked') : tr(lang, 'group.whyAlt'))}</div>
    </div>`).join('');
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
  if (incident.type === 'storm') return tr(lang, 'heal.summaryStorm', text);
  if (incident.type === 'rain') return tr(lang, 'heal.summaryRain', text);
  if (incident.type === 'heat') return tr(lang, 'heal.summaryHeat', text);
  if (incident.type === 'wind') return tr(lang, 'heal.summaryWind', text);
  return text;
}

function buildSelfHealingPlan(planData, itin, eventText, context, lang = DEFAULT_LANG) {
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
        ? tr(lang, 'heal.reasonStorm')
        : incident.type === 'heat'
          ? tr(lang, 'heal.reasonHeat')
          : incident.type === 'rain'
            ? tr(lang, 'heal.reasonRain')
            : tr(lang, 'heal.reasonDefault');

      const replacementText = formatReplacementActivity(item, replacement, lang);
      activities.push({ original: item, text: replacementText, changed: true, reason });
      replacements.push({ original: item, replacement: replacementText, reason });
    });
    updatedDays.push({ day: day.day || (index + 1), activities });
  });

  if (!isSevereWeatherIncident(incident)) {
    return {
      incident_summary: summarizeIncident(eventText, incident, lang),
      severity: incident.severity,
      replacements: [],
      updated_days: updatedDays.map(day => ({
        day: day.day,
        activities: day.activities.map(a => ({ original: a.original, text: a.original, changed: false, reason: '' }))
      })),
      updated_itinerary: dedupePlanItems(sourceDays.flatMap(d => Array.isArray(d.activities) ? d.activities : [])),
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
    notes: incident.type === 'storm'
      ? tr(lang, 'heal.reasonStorm')
      : incident.type === 'heat'
        ? tr(lang, 'heal.reasonHeat')
        : incident.type === 'rain'
          ? tr(lang, 'heal.reasonRain')
          : tr(lang, 'heal.reasonDefault')
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
  html += renderSatisfactionDeltaHtml(data.satisfactionDelta, lang);
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
        const reason = changed && activity.reason ? `<span class="reason-tag">${tr(lang, 'heal.reasonPrefix')} ${escapeHtml(activity.reason)}</span>` : '';
        const before = changed && original && original !== text ? `<del>${escapeHtml(original)}</del> → ` : '';
        return `<li class="${changed ? 'changed-item' : ''}">${before}<strong>${escapeHtml(text)}</strong>${reason} ${mapLink(text, undefined, lang)}${venueWarning(text, lang)}</li>`;
      }).join('')}</ul></div>`;
    }).join('')}</div>`;
  } else if ((data.updated_itinerary || []).length) {
    html += `<div class="day-block"><h4>${tr(lang, 'common.newItineraryHeader')}</h4><ul>${data.updated_itinerary.map(a => `<li>${escapeHtml(a)} ${mapLink(a, undefined, lang)}${venueWarning(a, lang)}</li>`).join('')}</ul></div>`;
  }
  if (data.notes) html += `<div class="summary-note">${escapeHtml(data.notes)}</div>`;
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

/**
 * Rule-based travel risk scan: excessive walking, budget, transportation, weather.
 * Entirely deterministic — reuses classifyActivity()/classifyIncident() already
 * built for self-healing, so no new AI call and no new data source.
 */
function detectTravelRisks(activities, context, weatherIncident, lang) {
  const list = (activities || []).filter(Boolean);
  const risks = [];

  const outdoorCount = list.filter(a => classifyActivity(a).category === 'outdoor').length;
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
  url: 'ollama_url',
  model: 'ollama_model',
  ragUrl: 'rag_url',
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
  renderPlannerHtml, renderGroupScoreTableHtml, renderHealHtml, formatPlannerShareText,
  parseKnowledgeChunk, extractPreferenceTags, scoreEntryForMember, computeGroupSatisfaction,
  detectPreferenceConflicts, generateCompromiseOptions, buildReasoningReceipt, pickPrimaryKnowledgeEntry,
  renderSatisfactionScoreHtml, renderConflictCardsHtml, renderCompromiseOptionsHtml, renderReasoningReceiptHtml,
  dedupePlanItems, flattenActivities, normalizeHealedText,
  buildConversationTranscript, normalizeExtractedSlots, missingTripSlots, buildVoiceFollowUpQuestion, detectItineraryIntent,
  classifyIncident, isSevereWeatherIncident, classifyActivity,
  buildCameraFallback,
  parseBudgetNumber, buildPlannerContextSummary, buildSelfHealingPlan,
  computeItinerarySatisfaction, computeSatisfactionDelta, detectTravelRisks,
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
    renderDiffLists();
  }

  /** Fills the Differentiation screen's two comparison lists — arrays can't be set via a plain [data-i18n] text swap. */
  function renderDiffLists() {
    const tradList = document.getElementById('diff-trad-list');
    const usList = document.getElementById('diff-us-list');
    if (tradList) tradList.innerHTML = T('diff.tradItems').map(item => `<li>${escapeHtml(item)}</li>`).join('');
    if (usList) usList.innerHTML = T('diff.usItems').map(item => `<li>${escapeHtml(item)}</li>`).join('');
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
  let lastPlannerShare = null;

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
      startDate: context.startDate || '',
      budget: context.budget || T('common.unlimitedBudget'),
      group: context.group || T('common.soloTraveler'),
      notes: context.notes || ''
    };
    syncPlannerToSelfHealing();
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
      const savedRisks = detectTravelRisks(flattenActivities(saved.data), { budget: saved.budget, days: saved.days, group: saved.group, notes: saved.notes }, null, currentLang);
      pResult.innerHTML = `<div class="result-box">${renderPlannerHtml(saved.data, saved.dest || '', currentLang, saved.days)}${renderRiskPanelHtml(savedRisks, currentLang)}</div>`;
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

    const system = T('planner.systemPrompt');
    const user = tr(currentLang, 'planner.userPrompt', dest, days, startDate, budget, group, notes, members);

    try {
      const data = await callClaude(system, user, { json: true, onChunk: streamPreview(pResult, T('planner.loading')) });
      updateTripStateFromPlannerData(data, { destination: dest, days, startDate, budget, group, notes });
      const risks = detectTravelRisks(flattenActivities(data), { budget, days, group, notes }, null, currentLang);
      renderPlannerSatisfaction(members, flattenActivities(data));
      pResult.innerHTML = `<div class="result-box">${renderPlannerHtml(data, dest, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}</div>`;
      updatePlannerShareState(data, dest);
      savePlannerState({ data });
    } catch (err) { showError(pResult, err); pShare.style.display = 'none'; }
  });

  // ---------- TAB 2: Group Decision (was "Group Matching") ----------
  const membersDiv = document.getElementById('g-members');
  const gPlace = document.getElementById('g-place');
  const gResult = document.getElementById('g-result');
  const gDebate = document.getElementById('g-debate');
  const gRagHint = document.getElementById('g-ragHint');
  const gDecision = document.getElementById('g-decision');

  /** Computes + renders Group Decision (Satisfaction Score, Conflicts, Compromise Options, Explainable AI receipt) — all deterministic, no LLM call. */
  function renderGroupDecision(candidates, place, members) {
    const entry = pickPrimaryKnowledgeEntry(candidates, place);
    const group = computeGroupSatisfaction(members, entry, currentLang);
    const conflicts = detectPreferenceConflicts(members, entry, currentLang);
    const options = generateCompromiseOptions(candidates, members, currentLang);
    gDecision.innerHTML = renderSatisfactionScoreHtml(group, currentLang)
      + renderConflictCardsHtml(conflicts, currentLang)
      + renderCompromiseOptionsHtml(options, currentLang)
      + renderReasoningReceiptHtml(entry, group, members, currentLang);
    return { entry, candidates };
  }

  let lastRagCandidates = [];

  /** Re-runs the deterministic Group Decision engine against the last RAG candidates — no LLM call, so this is instant. Lets a member's preference change re-score live without re-fetching anything. Also re-scores the already-generated itinerary in the Planner tab, since both read the same member list. */
  function refreshGroupDecisionLive() {
    refreshPlannerSatisfactionLive();
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
  if (savedGroup && savedGroup.ragSources && savedGroup.ragSources.length) {
    gRagHint.textContent = T('group.ragUsed', savedGroup.ragSources.join(', '));
  }
  if (savedGroup && Array.isArray(savedGroup.candidates) && savedGroup.candidates.length) {
    lastRagCandidates = savedGroup.candidates;
    renderGroupDecision(savedGroup.candidates, savedGroup.place || '', currentMembers());
  }
  gPlace.addEventListener('input', () => { saveGroupState({}); refreshGroupDecisionLive(); });

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

  document.getElementById('g-run').addEventListener('click', async () => {
    const place = gPlace.value.trim() || 'American Village';
    const members = currentMembers();
    setLoading(gResult, true, T('group.loading'));
    gRagHint.textContent = '';
    gDebate.innerHTML = '';
    gDecision.innerHTML = '';

    const rawResults = await ragSearchRaw(`${place}. ${members.map(m => m.pref).join(', ')}`);
    const sources = rawResults.map(r => r.source);
    const context = rawResults.length ? rawResults.map(r => `[${r.source}]\n${r.text}`).join('\n\n') : '';
    gRagHint.textContent = sources.length > 0 ? T('group.ragUsed', sources.join(', ')) : T('group.ragNone');

    // Deterministic Group Decision engine (score, conflicts, compromise options, reasoning) needs
    // no LLM call, so it renders immediately — the AI debate/recommendation streams in underneath.
    const candidates = rawResults.map(r => parseKnowledgeChunk(r.text));
    lastRagCandidates = candidates;
    if (members.length) renderGroupDecision(candidates, place, members);

    const system = T('group.systemPrompt');
    const user = tr(currentLang, 'group.userPrompt', place, members, context);

    try {
      const data = await callClaude(system, user, { json: true, onChunk: streamPreview(gResult, T('group.loading')) });
      gResult.innerHTML = `<div class="result-box">${renderGroupScoreTableHtml(data, currentLang)}</div>`;
      renderDebate(data);
      saveGroupState({ data, ragSources: sources, candidates });
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
   * so far, and if destination/day-count are still missing, asks exactly for that instead of
   * failing silently — then re-runs once the user answers. Once complete, it calls the same
   * planner prompt as TAB 1 and mirrors the result into the Itinerary tab too.
   */
  async function buildItineraryFromConversation() {
    if (!collectVoiceMessages().some(m => m.role === 'user')) {
      const msg = T('voice.needConversation');
      addMsg('ai', msg);
      speak(msg);
      return;
    }
    vBuildBtn.disabled = true;
    const thinking = addMsg('ai', T('voice.extracting'));
    try {
      const slots = await extractTripSlotsFromConversation();
      const missing = missingTripSlots(slots);
      if (missing.length) {
        const question = buildVoiceFollowUpQuestion(missing, currentLang);
        thinking.textContent = question;
        speak(question);
        saveVoiceLog();
        return;
      }

      thinking.textContent = T('voice.buildingItinerary');
      const dest = slots.destination;
      const days = slots.days;
      const startDate = slots.startDate || '';
      const budget = slots.budget || T('common.unlimitedBudget');
      const group = slots.group || T('common.soloTraveler');
      const notes = slots.notes || '';
      // Shares whatever member list is already set up in the Group Decision / Itinerary tabs,
      // same as a normal "Tạo lịch trình" click — the voice flow doesn't collect its own.
      const members = currentMembers();

      const system = T('planner.systemPrompt');
      const user = tr(currentLang, 'planner.userPrompt', dest, days, startDate, budget, group, notes, members);
      const data = await callClaude(system, user, { json: true });

      updateTripStateFromPlannerData(data, { destination: dest, days, startDate, budget, group, notes });
      const risks = detectTravelRisks(flattenActivities(data), { budget, days, group, notes }, null, currentLang);
      const satisfactionHtml = computePlannerSatisfactionHtml(members, flattenActivities(data));
      const html = `<div class="result-box">${satisfactionHtml}${renderPlannerHtml(data, dest, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}</div>`;
      vItinResult.innerHTML = html;

      // Mirror into the Itinerary tab too, so it's there to review/edit/share, not stranded in the chat log.
      // Fields the user never actually mentioned stay blank here (matching how an untouched Itinerary
      // field behaves) — `budget`/`group` above already carry the applied default for the prompt/context.
      pDest.value = dest; pDays.value = days; pStart.value = slots.startDate; pBudget.value = slots.budget; pGroup.value = slots.group; pNotes.value = slots.notes;
      renderPlannerSatisfaction(members, flattenActivities(data));
      pResult.innerHTML = `<div class="result-box">${renderPlannerHtml(data, dest, currentLang, days)}${renderRiskPanelHtml(risks, currentLang)}</div>`;
      updatePlannerShareState(data, dest);
      savePlannerState({ data });

      const readyMsg = tr(currentLang, 'voice.itineraryReady', dest, days);
      thinking.textContent = readyMsg;
      speak(readyMsg);
      saveVoiceLog();
    } catch (err) {
      thinking.textContent = '⚠️ ' + err.message;
      saveVoiceLog();
    } finally {
      vBuildBtn.disabled = false;
    }
  }

  vBuildBtn.addEventListener('click', buildItineraryFromConversation);

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

      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,precipitation&timezone=auto`);
      const w = await wRes.json();
      const c = w.current;
      const desc = weatherDescription(c.weather_code, currentLang);
      hEvent.value = tr(currentLang, 'heal.weatherText', place.name, place.country, desc, c.temperature_2m, c.precipitation);
      const timeText = String(c.time || '').slice(11, 16);
      statusEl.textContent = T('heal.weatherReady', timeText);
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

    const weatherIncident = classifyIncident(event);
    let data = null;
    try {
      const system = T('heal.systemPrompt');
      const user = tr(currentLang, 'heal.userPrompt', itin, event);
      const ai = await callClaude(system, user, { json: true, onChunk: streamPreview(hResult, T('heal.loading')) });
      if (ai && Array.isArray(ai.replacements)) {
        data = {
          ...buildSelfHealingPlan(plannerData, itin, event, plannerContext, currentLang),
          ...ai,
          incident_summary: summarizeIncident(event, weatherIncident, currentLang),
          context_summary: buildPlannerContextSummary(plannerContext)
        };
      }
    } catch (err) {
      data = buildSelfHealingPlan(plannerData, itin, event, plannerContext, currentLang);
    }

    if (!data) data = buildSelfHealingPlan(plannerData, itin, event, plannerContext, currentLang);

    // Feature 5 (Explainable Self-Healing) + Feature 6 (Travel Risk Detection) — both
    // deterministic, reusing the Group Decision tab's members if any were entered there.
    const members = currentMembers();
    data.satisfactionDelta = computeSatisfactionDelta(members, itin, data.updated_itinerary || itin, currentLang);
    data.risks = detectTravelRisks(data.updated_itinerary || itin, plannerContext, weatherIncident, currentLang);

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
    let caption = '';

    try {
      setLoading(resultEl, true, T('camera.step1'));
      const captionPrompt = 'Describe this image in detail, mentioning any text you can see.';
      caption = await callVision(captionPrompt, cImageBase64, visionModel);
      const normalized = typeof caption === 'string' ? caption.trim() : '';
      if (!normalized || normalized === '(no response)') {
        throw new Error(T('camera.noCaption', visionModel));
      }

      const system = mode === 'food' ? T('camera.systemPromptFood') : T('camera.systemPromptLandmark');
      const text = await callClaude(system, tr(currentLang, 'camera.userPrompt', caption), {
        onChunk: streamPreview(resultEl, T('camera.step2'))
      });
      resultEl.innerHTML = `<div class="result-box">${escapeHtml(text)}</div><div class="summary-note">${T('camera.disclaimer', escapeHtml(visionModel))}</div>`;
    } catch (err) {
      const fallbackText = buildCameraFallback(mode, caption, visionModel, currentLang);
      resultEl.innerHTML = `<div class="error-box">⚠️ ${escapeHtml(err.message)}</div><div class="result-box">${escapeHtml(fallbackText)}</div><div class="summary-note">${T('camera.fallbackAdvice')}</div><div class="summary-note">${T('camera.disclaimer', escapeHtml(visionModel))}</div>`;
    }
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
  // Members restore (TAB 2) runs before this line, so this picks up any cached itinerary
  // (TAB 1's own restore ran earlier, before members existed yet) with the correct group.
  refreshPlannerSatisfactionLive();
}

})(typeof globalThis !== 'undefined' ? globalThis : this);
