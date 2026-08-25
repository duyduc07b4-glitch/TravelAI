/**
 * AI Travel Companion — app logic.
 * Pure/testable functions are exported via module.exports for Node (see tests/app.test.js).
 * DOM wiring only runs when a `document` is present (browser).
 */
(function (root) {
'use strict';

// ---------- Pure utils (no DOM, safe to unit test) ----------

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function mapLink(place, context) {
  const q = encodeURIComponent(context ? `${place}, ${context}` : place);
  return `<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener" class="map-link">📍 Xem bản đồ</a>`;
}

const VENUE_KEYWORDS = ['ăn trưa','ăn tối','ăn sáng','nhà hàng','quán ','café','cafe','lunch','dinner','breakfast','restaurant','bar','beer','izakaya','shop','store','mall','shopping'];
function venueWarning(text) {
  const t = String(text).toLowerCase();
  if (VENUE_KEYWORDS.some(k => t.includes(k))) {
    return ' <span class="warn-badge" title="AI không có dữ liệu thời gian thực, giờ mở cửa có thể sai">⚠️ chưa xác minh giờ mở cửa</span>';
  }
  return '';
}

const WEATHER_CODE_VI = {
  0: 'trời quang', 1: 'quang, ít mây', 2: 'có mây rải rác', 3: 'nhiều mây',
  45: 'sương mù', 48: 'sương mù đóng băng',
  51: 'mưa phùn nhẹ', 53: 'mưa phùn vừa', 55: 'mưa phùn dày',
  61: 'mưa nhẹ', 63: 'mưa vừa', 65: 'mưa to',
  71: 'tuyết nhẹ', 73: 'tuyết vừa', 75: 'tuyết to',
  80: 'mưa rào nhẹ', 81: 'mưa rào vừa', 82: 'mưa rào dữ dội',
  95: 'giông bão', 96: 'giông kèm mưa đá nhẹ', 99: 'giông kèm mưa đá to'
};
function weatherDescription(code) {
  return WEATHER_CODE_VI[code] || 'thời tiết không xác định';
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
 * Extracts and parses a JSON object from an LLM text response.
 * Throws a Vietnamese, user-facing Error (not a raw JSON.parse error) on failure.
 */
function extractJson(text) {
  const stripped = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  let candidate = stripped;
  try {
    return JSON.parse(candidate);
  } catch (e) { /* fall through to balanced-brace extraction */ }

  const found = findFirstJsonObject(stripped);
  if (!found) {
    throw new Error('AI không trả về dữ liệu dạng JSON như yêu cầu — model có thể quá nhỏ để tuân theo định dạng. Thử lại hoặc đổi sang model khác.');
  }
  try {
    return JSON.parse(found);
  } catch (e) {
    throw new Error('AI trả về JSON không hợp lệ (bị lỗi cú pháp giữa chừng). Thử lại hoặc đổi sang model khác.');
  }
}

// ---------- Render helpers (return HTML strings; pure given data) ----------

function renderPlannerHtml(data, dest) {
  let dayHtml = '';
  (data.days || []).forEach((d, i) => {
    if (!d || !Array.isArray(d.activities) || d.activities.length === 0) return;
    const items = d.activities.map(a => `<li>${escapeHtml(a)} ${mapLink(a, dest)}${venueWarning(a)}</li>`).join('');
    dayHtml += `<div class="day-block"><h4>Day ${d.day || (i + 1)}</h4><ul>${items}</ul></div>`;
  });
  if (!dayHtml) return 'Không có kết quả.';
  let html = dayHtml;
  if (data.summary) html += `<div class="summary-note">${escapeHtml(data.summary)}</div>`;
  html += `<div class="summary-note">📍 Bấm "Xem bản đồ" để xem địa chỉ, giờ mở cửa thật và số điện thoại (nếu quán có đăng). ⚠️ AI chạy local không có dữ liệu thời gian thực nên <strong>không biết chắc quán có mở cửa vào giờ đó không</strong>, và thứ tự/khoảng cách di chuyển giữa các điểm chỉ là suy đoán chung của AI — <strong>không dựa trên dữ liệu giao thông hay bản đồ thời gian thực</strong>. Luôn kiểm tra qua Maps trước khi đến.</div>`;
  return html;
}

function renderGroupScoreTableHtml(data) {
  let html = `<table class="score-table"><thead><tr><th>Tiêu chí</th><th>Điểm</th></tr></thead><tbody>`;
  (data.criteria || []).forEach(c => { html += `<tr><td>${escapeHtml(c.name)}</td><td>${c.score}/10</td></tr>`; });
  html += `</tbody></table>`;
  return html;
}

function renderHealHtml(data) {
  let html = '';
  if ((data.replacements || []).length) {
    html += `<div class="day-block"><h4>Thay đổi</h4><ul>`;
    data.replacements.forEach(r => {
      html += `<li><strong>${escapeHtml(r.original)}</strong> → <strong>${escapeHtml(r.replacement)}</strong> — ${escapeHtml(r.reason || '')}</li>`;
    });
    html += `</ul></div>`;
  }
  if ((data.updated_itinerary || []).length) {
    html += `<div class="day-block"><h4>Lịch trình mới</h4><ul>${data.updated_itinerary.map(a => `<li>${escapeHtml(a)} ${mapLink(a)}${venueWarning(a)}</li>`).join('')}</ul></div>`;
  }
  return html || 'Không có thay đổi.';
}

// ---------- localStorage persistence (guarded — private mode can throw) ----------

const STORAGE_KEYS = {
  url: 'ollama_url',
  model: 'ollama_model',
  voiceName: 'voice_name',
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
  escapeHtml, mapLink, venueWarning, VENUE_KEYWORDS,
  WEATHER_CODE_VI, weatherDescription,
  findFirstJsonObject, extractJson,
  renderPlannerHtml, renderGroupScoreTableHtml, renderHealHtml,
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
  // ---------- Ollama connection ----------
  const serverUrlInput = document.getElementById('serverUrl');
  const modelSelect = document.getElementById('modelSelect');
  const statusDot = document.getElementById('statusDot');
  const loadProgress = document.getElementById('loadProgress');
  const loadModelBtn = document.getElementById('loadModelBtn');
  const defaultHint = loadProgress.innerHTML;

  serverUrlInput.value = safeLoadString(STORAGE_KEYS.url) || 'http://localhost:11434';
  modelSelect.value = safeLoadString(STORAGE_KEYS.model) || 'llama3.2';

  function ollamaBase() {
    return (serverUrlInput.value.trim() || 'http://localhost:11434').replace(/\/+$/, '');
  }

  function setStatus(state, text) {
    statusDot.className = 'status-dot ' + (state === 'ready' ? 'status-ok' : state === 'loading' ? 'status-warn' : 'status-off');
    if (text) loadProgress.innerHTML = text; else loadProgress.innerHTML = defaultHint;
  }

  loadModelBtn.addEventListener('click', checkConnection);

  async function checkConnection() {
    safeSaveString(STORAGE_KEYS.url, serverUrlInput.value.trim());
    safeSaveString(STORAGE_KEYS.model, modelSelect.value.trim());
    loadModelBtn.disabled = true;
    setStatus('loading', 'Đang kết nối tới Ollama...');
    try {
      const res = await fetch(`${ollamaBase()}/api/tags`);
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const data = await res.json();
      const names = (data.models || []).map(m => m.name);
      const model = modelSelect.value.trim();
      if (names.length === 0) {
        setStatus('off', '⚠️ Kết nối được nhưng chưa có model nào. Chạy: <code>ollama pull ' + (model || 'llama3.2') + '</code> rồi thử lại.');
      } else if (!names.some(n => n === model || n.startsWith(model + ':'))) {
        setStatus('off', `⚠️ Server có các model: ${names.join(', ')} — không thấy "${model}". Sửa lại tên model hoặc chạy <code>ollama pull ${model}</code>.`);
      } else {
        setStatus('ready', `✅ Đã kết nối Ollama, model "${model}" sẵn sàng — AI chạy trên máy này, hoàn toàn offline/miễn phí.`);
      }
    } catch (err) {
      setStatus('off', `⚠️ Không kết nối được tới ${ollamaBase()}. Kiểm tra: Ollama đã chạy chưa, đúng địa chỉ IP chưa, và nếu gọi từ điện thoại/máy khác thì đã bật <code>OLLAMA_HOST=0.0.0.0</code> và <code>OLLAMA_ORIGINS=*</code> chưa. Lỗi: ${err.message}`);
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
  async function callClaude(system, userText, { json = false } = {}) {
    const model = modelSelect.value.trim() || 'llama3.2';
    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText }
      ],
      stream: false
    };
    if (json) body.format = 'json';

    let res;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      res = await fetch(`${ollamaBase()}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('AI không phản hồi sau 60 giây — model có thể đang tải lần đầu (chậm hơn bình thường) hoặc máy đang quá tải. Thử lại, hoặc đổi model nhẹ hơn.');
      }
      throw new Error(`Không gọi được tới ${ollamaBase()}. Bấm "Kiểm tra kết nối" ở góc trên để chẩn đoán.`);
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) {
      let msg = res.status + ' ' + res.statusText;
      try { const errJson = await res.json(); msg = errJson.error || msg; } catch (e) {}
      throw new Error(msg);
    }
    const data = await res.json();
    const text = data.message?.content || '';
    if (json) return extractJson(text);
    return text;
  }

  function setLoading(el, on, label = 'Đang hỏi AI...') {
    if (on) el.innerHTML = `<div class="loading"><div class="spinner"></div>${label}</div>`;
  }
  function showError(el, err) {
    el.innerHTML = `<div class="error-box">⚠️ ${err.message}</div>`;
  }

  // ---------- TAB 1: Trip Planner ----------
  const pDest = document.getElementById('p-dest');
  const pDays = document.getElementById('p-days');
  const pBudget = document.getElementById('p-budget');
  const pGroup = document.getElementById('p-group');
  const pNotes = document.getElementById('p-notes');
  const pResult = document.getElementById('p-result');

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
      pResult.innerHTML = `<div class="result-box">${renderPlannerHtml(saved.data, saved.dest || '')}</div>`;
    }
  })();

  document.getElementById('p-run').addEventListener('click', async () => {
    const dest = pDest.value.trim() || 'Okinawa';
    const days = pDays.value || 4;
    const budget = pBudget.value || 'không giới hạn';
    const group = pGroup.value.trim() || 'một mình';
    const notes = pNotes.value.trim();
    setLoading(pResult, true, 'Đang tạo lịch trình...');

    const system = `Bạn là AI Travel Companion, trợ lý lập kế hoạch du lịch cá nhân hóa. Mỗi hoạt động nên nêu tên địa điểm/quán cụ thể có thể tìm trên Google Maps (VD: "Ăn trưa tại Yunangi Okinawan Cuisine" thay vì chỉ "Lunch"). Bạn KHÔNG có dữ liệu thời gian thực nên KHÔNG được khẳng định giờ mở cửa, địa chỉ, số điện thoại, hay tình trạng giao thông/khoảng cách di chuyển thực tế của bất kỳ địa điểm nào — thứ tự hoạt động chỉ nên dựa trên suy luận hợp lý chung (VD: bãi biển buổi chiều, ngắm hoàng hôn cuối ngày), không khẳng định là tối ưu về đường đi hay đã kiểm tra kẹt xe thật. Trả lời DUY NHẤT bằng JSON hợp lệ, không kèm text hay markdown code fence nào khác, theo đúng schema:
{"days":[{"day":1,"activities":["Naha Airport","Ăn trưa tại nhà hàng Yunangi","American Village","Sunset Beach","Ăn tối tại Steak House 88"]}],"summary":"1-2 câu tổng kết về chi phí ước tính và lưu ý chính, nhắc người dùng kiểm tra giờ mở cửa thật trước khi đi"}`;
    const user = `Lên lịch trình du lịch ${dest}, ${days} ngày. Ngân sách: ${budget} yên. Nhóm: ${group}. ${notes ? 'Ghi chú: ' + notes : ''}
Sắp xếp hoạt động theo thứ tự hợp lý trong ngày (sáng/trưa/chiều/tối), phù hợp thời tiết chung của điểm đến, chi phí, và trải nghiệm phù hợp cả nhóm. Không cần đảm bảo giờ mở cửa hay khoảng cách di chuyển chính xác vì bạn không có dữ liệu thời gian thực.`;

    try {
      const data = await callClaude(system, user, { json: true });
      pResult.innerHTML = `<div class="result-box">${renderPlannerHtml(data, dest)}</div>`;
      savePlannerState({ data });
    } catch (err) { showError(pResult, err); }
  });

  // ---------- TAB 2: Group Matching ----------
  const membersDiv = document.getElementById('g-members');
  const gPlace = document.getElementById('g-place');
  const gResult = document.getElementById('g-result');
  const gDebate = document.getElementById('g-debate');
  const DEFAULT_MEMBERS = [['A','Hải sản'], ['B','Check-in, chụp ảnh'], ['C','Shopping'], ['D','Có trẻ em'], ['E','Orion Beer']];

  function addMemberRow(name = '', pref = '') {
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `<input type="text" placeholder="Tên (VD: A)" class="g-name" value="${escapeHtml(name)}">
      <input type="text" placeholder="Sở thích (VD: Hải sản, thích chụp ảnh)" class="g-pref" value="${escapeHtml(pref)}">
      <button type="button" class="secondary small g-remove">✕</button>`;
    row.querySelector('.g-remove').addEventListener('click', () => { row.remove(); saveGroupState({}); });
    row.querySelector('.g-name').addEventListener('input', () => saveGroupState({}));
    row.querySelector('.g-pref').addEventListener('input', () => saveGroupState({}));
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
    DEFAULT_MEMBERS.forEach(([n, p]) => addMemberRow(n, p));
  }
  if (savedGroup && savedGroup.place) gPlace.value = savedGroup.place;
  if (savedGroup && savedGroup.data) {
    gResult.innerHTML = `<div class="result-box">${renderGroupScoreTableHtml(savedGroup.data)}</div>`;
    renderDebate(savedGroup.data);
  }
  gPlace.addEventListener('input', () => saveGroupState({}));

  document.getElementById('g-addMember').addEventListener('click', () => { addMemberRow(); saveGroupState({}); });

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
      div.innerHTML = `<strong>🤖 AI chốt:</strong> ${escapeHtml(data.recommendation)}`;
      gDebate.appendChild(div);
    }
  }

  document.getElementById('g-run').addEventListener('click', async () => {
    const place = gPlace.value.trim() || 'American Village';
    const members = currentMembers();
    setLoading(gResult, true, 'Đang chấm điểm...');

    const system = `Bạn là AI Group Matching Engine, đánh giá mức độ phù hợp của một địa điểm du lịch với sở thích từng thành viên trong nhóm, rồi mô phỏng ngắn gọn góc nhìn của từng người như một cuộc tranh luận thật trước khi AI chốt đề xuất. Trả lời DUY NHẤT bằng JSON hợp lệ theo schema:
{"criteria":[{"name":"Food","score":9}],"debate":[{"name":"A","comment":"1 câu nêu góc nhìn/lo ngại của người này về địa điểm, xưng theo tên"}],"recommendation":"1-2 câu AI chốt phương án dung hòa cả nhóm, giải thích ngắn gọn vì sao"}
Điểm số theo thang 1-10, suy ra tiêu chí từ sở thích từng thành viên. Mỗi người trong "debate" phải có ý kiến khác nhau, phản ánh đúng sở thích riêng của họ (có thể khen hoặc chê tùy sở thích).`;
    const user = `Địa điểm: ${place}\nThành viên và sở thích:\n${members.map(m => `- ${m.name}: ${m.pref}`).join('\n')}`;
    gDebate.innerHTML = '';

    try {
      const data = await callClaude(system, user, { json: true });
      gResult.innerHTML = `<div class="result-box">${renderGroupScoreTableHtml(data)}</div>`;
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

  const RECOGNITION_ERROR_VI = {
    'not-allowed': 'Trình duyệt chưa được cấp quyền micro — vào Cài đặt trình duyệt cho phép micro cho trang này.',
    'no-speech': 'Không nghe thấy giọng nói — thử nói to hơn hoặc gần mic hơn.',
    'audio-capture': 'Không tìm thấy micro trên máy này.',
    'network': 'Lỗi mạng — nhận diện giọng nói của Chrome cần internet để hoạt động, kiểm tra kết nối mạng.',
    'aborted': 'Đã dừng nghe.'
  };

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    document.getElementById('voiceSupport').textContent = 'hỗ trợ trong trình duyệt này (cần internet để nhận diện giọng nói)';
    recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
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
      vHint.textContent = isFinal ? 'Đã nghe: "' + transcript + '"' : '🎤 ' + transcript + ' …';
      if (isFinal && transcript.trim()) sendVoiceQuery(transcript.trim());
    };
    recognition.onnomatch = () => { vHint.textContent = 'Không nhận ra câu nói — thử lại, nói rõ và chậm hơn.'; };
    recognition.onend = () => { recording = false; micBtn.classList.remove('recording'); if (!vHint.textContent.startsWith('Đã nghe')) vHint.textContent = 'Nhấn để nói (VD: "Tôi muốn ăn sushi gần đây")'; };
    recognition.onerror = (e) => {
      recording = false;
      micBtn.classList.remove('recording');
      vHint.textContent = '⚠️ ' + (RECOGNITION_ERROR_VI[e.error] || ('Lỗi mic: ' + e.error));
    };
  } else {
    document.getElementById('voiceSupport').textContent = 'trình duyệt không hỗ trợ — hãy gõ câu hỏi bên dưới';
    micBtn.disabled = true;
  }

  // ---------- Chọn giọng đọc ----------
  const voiceSelect = document.getElementById('v-voice');
  const voiceHint = document.getElementById('v-voiceHint');
  let availableVoices = [];

  function populateVoices() {
    availableVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const viVoices = availableVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith('vi'));
    const list = viVoices.length ? viVoices : availableVoices;
    const savedVoiceName = safeLoadString(STORAGE_KEYS.voiceName);

    voiceSelect.innerHTML = '';
    if (list.length === 0) {
      voiceSelect.innerHTML = '<option value="">(không có giọng đọc nào)</option>';
      voiceHint.textContent = 'Trình duyệt chưa nạp xong danh sách giọng đọc, hoặc máy chưa cài giọng tiếng Việt nào.';
      return;
    }
    list.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.name === savedVoiceName) opt.selected = true;
      voiceSelect.appendChild(opt);
    });
    if (!viVoices.length) {
      voiceHint.innerHTML = 'Máy chưa có giọng tiếng Việt nào ngoài giọng mặc định, nên đang phát toàn bộ giọng có sẵn (có thể không đọc đúng tiếng Việt). Trên macOS: vào System Settings → Accessibility → Spoken Content → System Voice → tải thêm giọng tiếng Việt (chọn bản "Enhanced/Premium" để nghe tự nhiên hơn nhiều so với giọng mặc định).';
    } else {
      voiceHint.textContent = `Tìm thấy ${viVoices.length} giọng tiếng Việt. Nếu vẫn thấy robot, thử cài thêm giọng "Enhanced/Premium" trong Cài đặt hệ thống để có giọng tự nhiên hơn.`;
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
    vHint.textContent = 'Đang nghe...';
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
    const thinking = addMsg('ai', 'Đang nghĩ...');
    const startedAt = Date.now();
    const tickId = setInterval(() => {
      thinking.textContent = `Đang nghĩ... (${Math.round((Date.now() - startedAt) / 1000)}s)`;
    }, 1000);
    const system = `Bạn là trợ lý du lịch AI bằng giọng nói, thân thiện, trả lời ngắn gọn (2-4 câu), thực tế, như đang đề xuất trực tiếp cho người dùng đang ở gần đó (nhà hàng, địa điểm ngắm cảnh...). Trả lời bằng tiếng Việt, không dùng markdown.`;
    try {
      const reply = await callClaude(system, text);
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
    else { utter.lang = 'vi-VN'; }
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
  [hItin, hDest, hEvent].forEach(el => el.addEventListener('input', () => saveHealState({})));

  (function restoreHeal() {
    const saved = safeLoad(STORAGE_KEYS.heal);
    if (!saved) return;
    if (saved.itin) hItin.value = saved.itin;
    if (saved.dest) hDest.value = saved.dest;
    if (saved.event) hEvent.value = saved.event;
    if (saved.data) {
      hResult.innerHTML = `<div class="result-box">${renderHealHtml(saved.data)}</div>`;
    }
  })();

  document.getElementById('h-weather').addEventListener('click', async () => {
    const dest = hDest.value.trim();
    const statusEl = document.getElementById('h-weatherStatus');
    if (!dest) { statusEl.textContent = '⚠️ Nhập điểm đến trước.'; return; }
    statusEl.textContent = 'Đang tra vị trí và thời tiết thật...';
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=vi&name=${encodeURIComponent(dest)}`);
      const geo = await geoRes.json();
      const place = geo.results && geo.results[0];
      if (!place) { statusEl.textContent = `⚠️ Không tìm thấy vị trí "${dest}".`; return; }

      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,precipitation`);
      const w = await wRes.json();
      const c = w.current;
      const desc = weatherDescription(c.weather_code);
      const text = `Tại ${place.name}${place.country ? ', ' + place.country : ''} hiện đang ${desc}, ${c.temperature_2m}°C${c.precipitation > 0 ? `, lượng mưa ${c.precipitation}mm` : ''}.`;
      hEvent.value = text;
      statusEl.textContent = `✅ Dữ liệu thật từ Open-Meteo, cập nhật lúc ${c.time?.slice(11,16) || ''}.`;
      saveHealState({});
    } catch (err) {
      statusEl.textContent = '⚠️ Không lấy được thời tiết: ' + err.message;
    }
  });

  document.getElementById('h-run').addEventListener('click', async () => {
    const itin = hItin.value.split('\n').map(s => s.trim()).filter(Boolean);
    const event = hEvent.value.trim() || 'Buổi sáng mưa lớn';
    setLoading(hResult, true, 'Đang cập nhật lịch trình...');

    const system = `Bạn là AI Self-Healing Itinerary Engine. Khi có tình huống bất ngờ, tự động thay thế các hoạt động không còn phù hợp bằng lựa chọn thay thế hợp lý, giữ nguyên các hoạt động không bị ảnh hưởng. Trả lời DUY NHẤT bằng JSON theo schema:
{"replacements":[{"original":"Beach","replacement":"Aquarium","reason":"..."}],"updated_itinerary":["Aquarium","Sunset viewing", "..."]}`;
    const user = `Lịch trình hiện tại:\n${itin.map(i => '- ' + i).join('\n')}\n\nTình huống: ${event}`;

    try {
      const data = await callClaude(system, user, { json: true });
      hResult.innerHTML = `<div class="result-box">${renderHealHtml(data)}</div>`;
      saveHealState({ data });
    } catch (err) { showError(hResult, err); }
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
      setLoading(resultEl, true, 'Đang nhìn ảnh (bước 1/2)...');
      const captionPrompt = 'Describe this image in detail, mentioning any text you can see.';
      const caption = await callVision(captionPrompt, cImageBase64, visionModel);
      if (!caption || !caption.trim()) throw new Error(`Model vision "${visionModel}" không trả về mô tả nào cho ảnh này — thử ảnh khác hoặc đổi model.`);

      setLoading(resultEl, true, 'Đang phân tích & viết câu trả lời (bước 2/2)...');
      const system = mode === 'food'
        ? `Bạn nhận được mô tả bằng tiếng Anh (từ 1 AI vision) về ảnh 1 món ăn. Dựa vào đó, viết bằng tiếng Việt: 1) Đây có thể là món gì. 2) Thành phần nhìn thấy. 3) Gợi ý 1-2 món tương tự đáng thử. KHÔNG bịa giá tiền/calories chính xác — nếu nhắc tới phải ghi rõ là ước tính. Nếu mô tả quá mơ hồ để đoán món, hãy nói thẳng là không chắc. Ngắn gọn, không markdown.`
        : `Bạn nhận được mô tả bằng tiếng Anh (từ 1 AI vision) về ảnh 1 địa danh/công trình. Dựa vào đó, viết bằng tiếng Việt: 1) Đây có thể là địa danh gì. 2) Vài nét lịch sử/văn hóa nếu bạn biết chắc. 3) Loại điểm tham quan tương tự gần đó. Nếu mô tả quá mơ hồ để nhận diện, nói thẳng là không chắc thay vì đoán bừa. Ngắn gọn, không markdown.`;
      const text = await callClaude(system, `Mô tả từ AI vision: "${caption}"`);
      resultEl.innerHTML = `<div class="result-box">${escapeHtml(text)}</div><div class="summary-note">⚠️ AI vision chạy local (${escapeHtml(visionModel)}) dễ nhận diện sai, đặc biệt với chữ trên ảnh (menu, biển hiệu) và món/địa danh ít phổ biến. Coi đây là gợi ý tham khảo, không phải kết luận chắc chắn.</div>`;
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
      throw new Error(`Không gọi được tới ${ollamaBase()}. Kiểm tra Ollama đang chạy chưa.`);
    }
    if (!res.ok) {
      let msg = res.status + ' ' + res.statusText;
      try { const errJson = await res.json(); msg = errJson.error || msg; } catch (e) {}
      if (/not found/i.test(msg)) msg += ` — có thể chưa tải model. Chạy: ollama pull ${model}`;
      throw new Error(msg);
    }
    const data = await res.json();
    return data.message?.content || '(không có phản hồi)';
  }
}

})(typeof globalThis !== 'undefined' ? globalThis : this);
