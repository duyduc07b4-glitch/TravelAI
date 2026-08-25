const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeHtml, mapLink, venueWarning, weatherDescription,
  findFirstJsonObject, extractJson,
  renderPlannerHtml, renderGroupScoreTableHtml, renderHealHtml
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

describe('mapLink', () => {
  test('builds a Google Maps search link', () => {
    const html = mapLink('Sunset Beach', 'Okinawa');
    assert.match(html, /^<a href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.match(html, /Sunset%20Beach/);
    assert.match(html, /Okinawa/);
  });
  test('omits context when not given', () => {
    const html = mapLink('Sunset Beach');
    assert.doesNotMatch(html, /Okinawa/);
  });
});

describe('venueWarning', () => {
  test('flags known venue keywords', () => {
    assert.match(venueWarning('Ăn trưa tại nhà hàng Yunangi'), /chưa xác minh giờ mở cửa/);
  });
  test('is case-insensitive', () => {
    assert.match(venueWarning('LUNCH at some place'), /chưa xác minh giờ mở cửa/);
  });
  test('returns empty string for non-venue activities', () => {
    assert.equal(venueWarning('Sunset Beach'), '');
  });
});

describe('weatherDescription', () => {
  test('maps known weather codes to Vietnamese text', () => {
    assert.equal(weatherDescription(0), 'trời quang');
    assert.equal(weatherDescription(61), 'mưa nhẹ');
  });
  test('falls back for unknown codes', () => {
    assert.equal(weatherDescription(9999), 'thời tiết không xác định');
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
    assert.deepEqual(extractJson('{"days":[]}'), { days: [] });
  });
  test('strips markdown code fences', () => {
    assert.deepEqual(extractJson('```json\n{"ok":true}\n```'), { ok: true });
  });
  test('recovers JSON when the model adds prose around it', () => {
    assert.deepEqual(
      extractJson('Sure, here is the plan:\n{"ok":true}\nLet me know if you need changes.'),
      { ok: true }
    );
  });
  test('throws a friendly Vietnamese error when there is no JSON at all', () => {
    assert.throws(() => extractJson('I cannot help with that.'), /không trả về dữ liệu dạng JSON/);
  });
  test('throws a friendly Vietnamese error on malformed JSON', () => {
    assert.throws(() => extractJson('{"days": [1, 2,]}'), /JSON không hợp lệ/);
  });
});

describe('renderPlannerHtml', () => {
  test('renders day blocks with map links and a summary', () => {
    const html = renderPlannerHtml({
      days: [{ day: 1, activities: ['Naha Airport', 'Ăn trưa tại quán X'] }],
      summary: 'Chi phí ước tính 80000 yên.'
    }, 'Okinawa');
    assert.match(html, /Day 1/);
    assert.match(html, /Naha Airport/);
    assert.match(html, /Xem bản đồ/);
    assert.match(html, /chưa xác minh giờ mở cửa/);
    assert.match(html, /Chi phí ước tính 80000 yên\./);
  });
  test('falls back to a placeholder message when there are no days', () => {
    assert.equal(renderPlannerHtml({ days: [] }, 'Okinawa'), 'Không có kết quả.');
  });
  test('skips malformed day entries instead of throwing', () => {
    const html = renderPlannerHtml({ days: [null, { day: 2, activities: [] }, { day: 3, activities: ['Beach'] }] }, 'X');
    assert.doesNotMatch(html, /Day 2/);
    assert.match(html, /Day 3/);
  });
});

describe('renderGroupScoreTableHtml', () => {
  test('renders a score row per criterion', () => {
    const html = renderGroupScoreTableHtml({ criteria: [{ name: 'Food', score: 9 }, { name: 'Cost', score: 6 }] });
    assert.match(html, /Food/);
    assert.match(html, /9\/10/);
    assert.match(html, /Cost/);
  });
});

describe('renderHealHtml', () => {
  test('renders replacements and the updated itinerary', () => {
    const html = renderHealHtml({
      replacements: [{ original: 'Beach', replacement: 'Aquarium', reason: 'mưa to' }],
      updated_itinerary: ['Aquarium', 'Dinner ngoài trời']
    });
    assert.match(html, /Beach/);
    assert.match(html, /Aquarium/);
    assert.match(html, /mưa to/);
    assert.match(html, /chưa xác minh giờ mở cửa/);
  });
  test('falls back to a placeholder message when nothing changed', () => {
    assert.equal(renderHealHtml({}), 'Không có thay đổi.');
  });
});
