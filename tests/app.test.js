const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeHtml, mapLink, venueWarning, weatherDescription,
  findFirstJsonObject, extractJson, extractChunkContent,
  renderPlannerHtml, renderGroupScoreTableHtml, renderHealHtml, checkPlaceButton,
  I18N, tr, normalizeLang, SUPPORTED_LANGS
} = require('../app.js');

describe('escapeHtml', () => {
  test('escapes HTML special characters', () => {
    assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });
  test('escapes ampersand and single quote', () => {
    assert.equal(escapeHtml(`Tom & Jerry's`), 'Tom &amp; Jerry&#39;s');
  });
  test('passes through plain text unchanged', () => {
    assert.equal(escapeHtml('American Village'), 'American Village');
  });
});

describe('normalizeLang', () => {
  test('accepts supported languages', () => {
    assert.equal(normalizeLang('vi'), 'vi');
    assert.equal(normalizeLang('ja'), 'ja');
  });
  test('falls back to vi for unknown/missing language', () => {
    assert.equal(normalizeLang('fr'), 'vi');
    assert.equal(normalizeLang(undefined), 'vi');
  });
});

function leafKeys(obj, prefix = '') {
  let out = [];
  for (const k in obj) {
    const v = obj[k];
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out = out.concat(leafKeys(v, path));
    else out.push(path);
  }
  return out.sort();
}

describe('i18n dictionary', () => {
  test('vi, ja, and en all expose the exact same set of leaf keys', () => {
    const viKeys = leafKeys(I18N.vi);
    assert.deepEqual(leafKeys(I18N.ja), viKeys);
    assert.deepEqual(leafKeys(I18N.en), viKeys);
  });
  test('SUPPORTED_LANGS matches the dictionary languages', () => {
    assert.deepEqual([...SUPPORTED_LANGS].sort(), Object.keys(I18N).sort());
  });
});

describe('tr', () => {
  test('resolves a plain string leaf', () => {
    assert.equal(tr('vi', 'planner.runBtn'), 'Tạo lịch trình');
    assert.equal(tr('ja', 'planner.runBtn'), '旅程を作成');
    assert.equal(tr('en', 'planner.runBtn'), 'Create itinerary');
  });
  test('calls a function leaf with the given arguments', () => {
    assert.equal(tr('vi', 'common.dayLabel', 3), 'Day 3');
    assert.equal(tr('ja', 'common.dayLabel', 3), '3日目');
    assert.equal(tr('en', 'common.dayLabel', 3), 'Day 3');
  });
  test('falls back to vi when the key is missing in the requested language', () => {
    // 'xx' is not a supported language, so normalizeLang() coerces it to 'vi'.
    assert.equal(tr('xx', 'planner.runBtn'), 'Tạo lịch trình');
  });
});

describe('mapLink', () => {
  test('builds a Google Maps search link with a localized label', () => {
    const vi = mapLink('Sunset Beach', 'Okinawa', 'vi');
    assert.match(vi, /^<a href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.match(vi, /Sunset%20Beach/);
    assert.match(vi, /Xem bản đồ/);
    const ja = mapLink('Sunset Beach', 'Okinawa', 'ja');
    assert.match(ja, /地図を見る/);
  });
  test('omits context when not given', () => {
    const html = mapLink('Sunset Beach', undefined, 'vi');
    assert.doesNotMatch(html, /Okinawa/);
  });
});

describe('venueWarning', () => {
  test('flags known venue keywords in Vietnamese', () => {
    assert.match(venueWarning('Ăn trưa tại nhà hàng Yunangi', 'vi'), /chưa xác minh giờ mở cửa/);
  });
  test('flags known venue keywords in Japanese', () => {
    assert.match(venueWarning('ランチはYunangiで', 'ja'), /営業時間未確認/);
  });
  test('is case-insensitive', () => {
    assert.match(venueWarning('LUNCH at some place', 'vi'), /chưa xác minh giờ mở cửa/);
  });
  test('returns empty string for non-venue activities', () => {
    assert.equal(venueWarning('Sunset Beach', 'vi'), '');
    assert.equal(venueWarning('サンセットビーチ', 'ja'), '');
  });
});

describe('weatherDescription', () => {
  test('maps known weather codes per language', () => {
    assert.equal(weatherDescription(0, 'vi'), 'trời quang');
    assert.equal(weatherDescription(0, 'ja'), '快晴');
    assert.equal(weatherDescription(61, 'vi'), 'mưa nhẹ');
    assert.equal(weatherDescription(61, 'ja'), '弱い雨');
  });
  test('falls back for unknown codes', () => {
    assert.equal(weatherDescription(9999, 'vi'), 'thời tiết không xác định');
    assert.equal(weatherDescription(9999, 'ja'), '不明な天気');
  });
});

describe('findFirstJsonObject', () => {
  test('extracts a balanced object from surrounding prose', () => {
    const text = 'Here you go: {"a":1,"b":{"c":2}} — hope that helps!';
    assert.equal(findFirstJsonObject(text), '{"a":1,"b":{"c":2}}');
  });
  test('ignores braces inside string values', () => {
    const text = '{"note":"use {curly} braces carefully","n":1}';
    assert.equal(findFirstJsonObject(text), text);
  });
  test('ignores escaped quotes inside strings', () => {
    const text = '{"note":"she said \\"hi {there}\\"","n":1}';
    assert.equal(findFirstJsonObject(text), text);
  });
  test('returns null when there is no object', () => {
    assert.equal(findFirstJsonObject('no json here'), null);
  });
});

describe('extractJson', () => {
  test('parses clean JSON directly', () => {
    assert.deepEqual(extractJson('{"days":[]}', 'vi'), { days: [] });
  });
  test('strips markdown code fences', () => {
    assert.deepEqual(extractJson('```json\n{"ok":true}\n```', 'vi'), { ok: true });
  });
  test('recovers JSON when the model adds prose around it', () => {
    assert.deepEqual(
      extractJson('Sure, here is the plan:\n{"ok":true}\nLet me know if you need changes.', 'vi'),
      { ok: true }
    );
  });
  test('throws a Vietnamese error when there is no JSON at all', () => {
    assert.throws(() => extractJson('I cannot help with that.', 'vi'), /không trả về dữ liệu dạng JSON/);
  });
  test('throws a Japanese error when there is no JSON at all', () => {
    assert.throws(() => extractJson('I cannot help with that.', 'ja'), /JSON形式でデータを返しませんでした/);
  });
  test('throws an English error when there is no JSON at all', () => {
    // Regression test: this used to fall through to the Vietnamese message for any
    // lang !== 'ja', since the error strings were an inline ja/vi ternary instead of
    // going through the I18N dictionary — 'en' silently got Vietnamese text.
    assert.throws(() => extractJson('I cannot help with that.', 'en'), /didn't return the JSON/);
  });
  test('throws a localized error on malformed JSON', () => {
    assert.throws(() => extractJson('{"days": [1, 2,]}', 'vi'), /JSON không hợp lệ/);
    assert.throws(() => extractJson('{"days": [1, 2,]}', 'ja'), /JSONが不正な形式/);
    assert.throws(() => extractJson('{"days": [1, 2,]}', 'en'), /invalid JSON/);
  });
});

describe('renderPlannerHtml', () => {
  test('renders day blocks with map links and a summary (vi)', () => {
    const html = renderPlannerHtml({
      days: [{ day: 1, activities: ['Naha Airport', 'Ăn trưa tại quán X'] }],
      summary: 'Chi phí ước tính 80000 yên.'
    }, 'Okinawa', 'vi');
    assert.match(html, /Day 1/);
    assert.match(html, /Naha Airport/);
    assert.match(html, /Xem bản đồ/);
    assert.match(html, /chưa xác minh giờ mở cửa/);
    assert.match(html, /Chi phí ước tính 80000 yên\./);
  });
  test('renders day blocks in Japanese', () => {
    const html = renderPlannerHtml({
      days: [{ day: 1, activities: ['那覇空港', 'ランチ'] }],
      summary: '概算費用は8万円です。'
    }, 'Okinawa', 'ja');
    assert.match(html, /1日目/);
    assert.match(html, /地図を見る/);
    assert.match(html, /営業時間未確認/);
  });
  test('falls back to a placeholder message when there are no days', () => {
    assert.equal(renderPlannerHtml({ days: [] }, 'Okinawa', 'vi'), 'Không có kết quả.');
    assert.equal(renderPlannerHtml({ days: [] }, 'Okinawa', 'ja'), '結果がありません。');
  });
  test('skips malformed day entries instead of throwing', () => {
    const html = renderPlannerHtml({ days: [null, { day: 2, activities: [] }, { day: 3, activities: ['Beach'] }] }, 'X', 'vi');
    assert.doesNotMatch(html, /Day 2/);
    assert.match(html, /Day 3/);
  });
});

describe('renderGroupScoreTableHtml', () => {
  test('renders a score row per criterion with localized headers', () => {
    const vi = renderGroupScoreTableHtml({ criteria: [{ name: 'Food', score: 9 }] }, 'vi');
    assert.match(vi, /Tiêu chí/);
    assert.match(vi, /9\/10/);
    const ja = renderGroupScoreTableHtml({ criteria: [{ name: 'Food', score: 9 }] }, 'ja');
    assert.match(ja, /項目/);
  });
});

describe('renderHealHtml', () => {
  test('renders replacements and the updated itinerary (vi)', () => {
    const html = renderHealHtml({
      replacements: [{ original: 'Beach', replacement: 'Aquarium', reason: 'mưa to' }],
      updated_itinerary: ['Aquarium', 'Dinner ngoài trời']
    }, 'vi');
    assert.match(html, /Beach/);
    assert.match(html, /Aquarium/);
    assert.match(html, /mưa to/);
    assert.match(html, /chưa xác minh giờ mở cửa/);
  });
  test('renders replacements in Japanese', () => {
    const html = renderHealHtml({
      replacements: [{ original: 'Beach', replacement: 'Aquarium', reason: '大雨のため' }],
      updated_itinerary: ['Aquarium']
    }, 'ja');
    assert.match(html, /変更点/);
    assert.match(html, /大雨のため/);
  });
  test('falls back to a localized placeholder when nothing changed', () => {
    assert.equal(renderHealHtml({}, 'vi'), 'Không có thay đổi.');
    assert.equal(renderHealHtml({}, 'ja'), '変更はありません。');
  });
});

describe('checkPlaceButton', () => {
  test('embeds the place/context as data attributes and a localized label', () => {
    const html = checkPlaceButton('Yunangi Okinawan Cuisine', 'Okinawa', 'vi');
    assert.match(html, /class="check-real-btn/);
    assert.match(html, /data-place="Yunangi Okinawan Cuisine"/);
    assert.match(html, /data-context="Okinawa"/);
    assert.match(html, /Kiểm tra thật/);
  });
  test('escapes HTML in the place name to keep the attribute safe', () => {
    const html = checkPlaceButton('Café "Sunset" <bar>', undefined, 'en');
    assert.doesNotMatch(html, /<bar>/);
    assert.match(html, /data-place="Café &quot;Sunset&quot; &lt;bar&gt;"/);
  });
  test('includes an empty result slot for the click handler to fill in', () => {
    const html = checkPlaceButton('Beach', undefined, 'ja');
    assert.match(html, /<span class="real-data"><\/span>/);
    assert.match(html, /実際に確認/);
  });
});

describe('extractChunkContent', () => {
  test('extracts the content delta from one NDJSON streaming line', () => {
    assert.equal(extractChunkContent('{"message":{"content":"Hel"},"done":false}'), 'Hel');
    assert.equal(extractChunkContent('{"message":{"content":"lo"},"done":false}'), 'lo');
  });
  test('returns empty string for the final done-only line', () => {
    assert.equal(extractChunkContent('{"done":true,"total_duration":123}'), '');
  });
  test('returns empty string for blank or malformed lines instead of throwing', () => {
    assert.equal(extractChunkContent(''), '');
    assert.equal(extractChunkContent('   '), '');
    assert.equal(extractChunkContent('not json'), '');
    assert.equal(extractChunkContent(undefined), '');
  });
});
