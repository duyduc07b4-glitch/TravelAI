const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeHtml, mapLink, venueWarning, isGenericPlaceholderActivity, weatherDescription,
  findFirstJsonObject, extractJson, extractChunkContent,
  renderPlannerHtml, renderGroupScoreTableHtml, renderHealHtml, formatPlannerShareText,
  classifyIncident, buildSelfHealingPlan,
  parseKnowledgeChunk, extractPreferenceTags, scoreEntryForMember, computeGroupSatisfaction,
  detectPreferenceConflicts, generateCompromiseOptions, pickPrimaryKnowledgeEntry, buildReasoningReceipt,
  renderSatisfactionScoreHtml, renderConflictCardsHtml, renderCompromiseOptionsHtml, renderReasoningReceiptHtml,
  computeItinerarySatisfaction, computeSatisfactionDelta, detectTravelRisks,
  renderSatisfactionDeltaHtml, renderRiskPanelHtml,
  buildForecastEventFromDaily, parseSelfHealingInput,
  canonicalHealedActivities, buildPlannerDataFromHealedData, normalizeSelfHealingAiResult, relocalizeHealedData, normalizeMemberImpactAi,
  buildConversationTranscript, normalizeExtractedSlots, missingTripSlots, buildVoiceFollowUpQuestion, detectItineraryIntent,
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
  test('supports a localized start-date field in planner translations', () => {
    assert.equal(tr('vi', 'planner.startDateLabel'), 'Ngày bắt đầu');
    assert.equal(tr('ja', 'planner.startDateLabel'), '開始日');
    assert.equal(tr('en', 'planner.startDateLabel'), 'Start date');
    assert.match(tr('vi', 'planner.userPrompt', 'Okinawa', 4, '2026-08-31', '80000', 'Vợ chồng', 'Thuê xe'), /2026-08-31/);
  });
  test('falls back to vi when the key is missing in the requested language', () => {
    // 'xx' is not a supported language, so normalizeLang() coerces it to 'vi'.
    assert.equal(tr('xx', 'planner.runBtn'), 'Tạo lịch trình');
  });
  test('planner.userPrompt includes a per-member preferences block only when members are given', () => {
    const withMembers = tr('vi', 'planner.userPrompt', 'Đà Nẵng', 3, '', '', 'Gia đình', '', [{ name: 'A', pref: 'thích biển' }, { name: 'B', pref: 'mua sắm' }]);
    assert.match(withMembers, /A: thích biển/);
    assert.match(withMembers, /B: mua sắm/);
    const withoutMembers = tr('vi', 'planner.userPrompt', 'Đà Nẵng', 3, '', '', 'Gia đình', '', []);
    assert.doesNotMatch(withoutMembers, /thích biển/);
    const noArgAtAll = tr('vi', 'planner.userPrompt', 'Đà Nẵng', 3, '', '', 'Gia đình', '');
    assert.equal(noArgAtAll, withoutMembers);
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

describe('isGenericPlaceholderActivity', () => {
  test('flags a bare meal placeholder with no venue name', () => {
    assert.equal(isGenericPlaceholderActivity('昼食'), true);
    assert.equal(isGenericPlaceholderActivity('Lunch'), true);
    assert.equal(isGenericPlaceholderActivity('ăn trưa'), true);
  });
  test('flags a bare meal placeholder even behind a time-range prefix', () => {
    assert.equal(isGenericPlaceholderActivity('午後4:00-6:00、夕食'), true);
  });
  test('keeps an activity that names an actual place', () => {
    assert.equal(isGenericPlaceholderActivity('American Village'), false);
    assert.equal(isGenericPlaceholderActivity('Yunangi Okinawan Cuisineで昼食'), false);
  });
  test('strips a leading time-range prefix before checking the place name', () => {
    assert.equal(isGenericPlaceholderActivity('早 morning 8:00-9:00、那覇空港'), false);
    assert.equal(isGenericPlaceholderActivity('9:00-12:00、美ら海水族館'), false);
  });
  test('treats blank input as a placeholder', () => {
    assert.equal(isGenericPlaceholderActivity(''), true);
    assert.equal(isGenericPlaceholderActivity(null), true);
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
  test('warns when the model returns fewer days than requested', () => {
    // Regression test for a real bug report: user asked for a 4-day trip and the
    // (small, local) model only generated 1 day of activities.
    const html = renderPlannerHtml({ days: [{ day: 1, activities: ['Beach'] }] }, 'Okinawa', 'vi', 4);
    assert.match(html, /class="error-box"/);
    assert.match(html, /yêu cầu 4 ngày nhưng AI chỉ tạo được 1 ngày/);
  });
  test('does not warn when the day count matches what was requested', () => {
    const html = renderPlannerHtml({ days: [{ day: 1, activities: ['Beach'] }] }, 'Okinawa', 'vi', 1);
    assert.doesNotMatch(html, /error-box/);
  });
  test('does not warn when no requestedDays is given (e.g. restoring old saved state)', () => {
    const html = renderPlannerHtml({ days: [{ day: 1, activities: ['Beach'] }] }, 'Okinawa', 'vi');
    assert.doesNotMatch(html, /error-box/);
  });
  test('renders object activities safely (Accept flow) without [object Object]', () => {
    const html = renderPlannerHtml({
      days: [{ day: 1, activities: [{ text: 'Aquarium', slot: 'morning' }, { text: 'Food Hall' }] }]
    }, 'Okinawa', 'en');
    assert.match(html, /Aquarium/);
    assert.doesNotMatch(html, /\[object Object\]/);
  });
});

describe('formatPlannerShareText', () => {
  const data = {
    days: [
      { day: 1, activities: ['Naha Airport', 'Lunch at Yunangi'] },
      { day: 2, activities: ['Churaumi Aquarium'] }
    ],
    summary: 'Estimated cost: 80000 JPY.'
  };
  test('produces plain text with no HTML markup (vi)', () => {
    const text = formatPlannerShareText(data, 'Okinawa', 'vi');
    assert.doesNotMatch(text, /<[a-z]/i);
    assert.match(text, /Okinawa/);
    assert.match(text, /Naha Airport/);
    assert.match(text, /Churaumi Aquarium/);
    assert.match(text, /Estimated cost: 80000 JPY\./);
    assert.match(text, /Tạo bằng AI Travel Companion/);
  });
  test('localizes the day labels and attribution line (ja)', () => {
    const text = formatPlannerShareText(data, 'Okinawa', 'ja');
    assert.match(text, /1日目/);
    assert.match(text, /2日目/);
    assert.match(text, /AI Travel Companionで作成/);
  });
  test('skips malformed day entries instead of throwing', () => {
    const text = formatPlannerShareText({ days: [null, { day: 2, activities: [] }, { day: 3, activities: ['Beach'] }] }, 'X', 'en');
    assert.doesNotMatch(text, /Day 2/);
    assert.match(text, /Day 3/);
  });
  test('omits the summary line when there is no summary', () => {
    const text = formatPlannerShareText({ days: [{ day: 1, activities: ['Beach'] }] }, 'X', 'en');
    assert.match(text, /Beach/);
    assert.match(text, /Made with AI Travel Companion/);
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
  test('renders updated days with highlights and no separate changes list (vi)', () => {
    const html = renderHealHtml({
      incident_summary: 'Thời tiết mưa to ở Okinawa',
      severity: 'high',
      context_summary: '4 ngày • ngân sách 120000 yên • nhóm: gia đình',
      replacements: [{ original: 'Beach', replacement: 'Aquarium', reason: 'mưa to' }],
      updated_days: [{ day: 1, activities: [{ original: 'Beach', text: 'Aquarium', changed: true, reason: 'mưa to' }] }]
    }, 'vi');
    assert.match(html, /Tình huống/);
    assert.match(html, /Mức độ: high/);
    assert.match(html, /Bám theo plan Tab 1/);
    assert.match(html, /Beach/);
    assert.match(html, /Aquarium/);
    assert.match(html, /mưa to/);
    assert.match(html, /changed-item/);
    assert.match(html, /reason-tag/);
    assert.doesNotMatch(html, /Thay đổi/);
  });
  test('renders fallback updated_itinerary in Japanese without changes header', () => {
    const html = renderHealHtml({
      replacements: [{ original: 'Beach', replacement: 'Aquarium', reason: '大雨のため' }],
      updated_itinerary: ['Aquarium']
    }, 'ja');
    assert.doesNotMatch(html, /変更点/);
    assert.match(html, /新しい旅程|更新後の旅程/);
  });
  test('falls back to a localized placeholder when nothing changed', () => {
    assert.equal(renderHealHtml({}, 'vi'), 'Không có thay đổi.');
    assert.equal(renderHealHtml({}, 'ja'), '変更はありません。');
  });
});

describe('classifyIncident', () => {
  test('classifies severe weather as high', () => {
    assert.equal(classifyIncident('Mưa rất to và gió mạnh').severity, 'high');
    assert.equal(classifyIncident('Typhoon warning near coast').type, 'storm');
  });
  test('keeps mild weather below high', () => {
    assert.equal(classifyIncident('mưa nhẹ').severity, 'medium');
    assert.equal(classifyIncident('trời nóng').severity, 'medium');
    assert.equal(classifyIncident('trời nhiều mây').severity, 'low');
  });
  test('classifies non-weather operational disruptions', () => {
    assert.equal(classifyIncident('Nhà hàng bị đóng cửa cả ngày').type, 'closure');
    assert.equal(classifyIncident('Train strike all lines').type, 'strike');
    assert.equal(classifyIncident('Severe traffic jam around city center').type, 'traffic');
    assert.equal(classifyIncident('Restaurant fully booked tonight').type, 'overbook');
    assert.equal(classifyIncident('One traveler is sick').type, 'health');
  });
});

describe('parseSelfHealingInput', () => {
  test('parses day/slot format and keeps slot metadata', () => {
    const parsed = parseSelfHealingInput('Day 1 | morning | Beach\nDay 1 | evening | Outdoor BBQ\nDay 2 | afternoon | Museum');
    assert.equal(parsed.hasStructured, true);
    assert.equal(parsed.days.length, 2);
    assert.equal(parsed.days[0].activities[0].slot, 'morning');
    assert.equal(parsed.days[0].activities[1].slot, 'evening');
    assert.equal(parsed.days[1].activities[0].slot, 'afternoon');
  });
  test('falls back to legacy one-line-per-activity mode', () => {
    const parsed = parseSelfHealingInput('Beach\nMuseum');
    assert.equal(parsed.hasStructured, false);
    assert.equal(parsed.days.length, 1);
    assert.deepEqual(parsed.flatActivities, ['Beach', 'Museum']);
  });
});

describe('buildForecastEventFromDaily', () => {
  test('picks the worst day inside the trip window', () => {
    const daily = {
      time: ['2026-09-10', '2026-09-11', '2026-09-12'],
      weather_code: [2, 95, 1],
      temperature_2m_max: [29, 30, 28],
      precipitation_sum: [0, 22, 0]
    };
    const event = buildForecastEventFromDaily(daily, '2026-09-10', 3, 'en');
    assert.ok(event);
    assert.equal(event.severity, 'high');
    assert.equal(event.type, 'storm');
    assert.equal(event.date, '2026-09-11');
    assert.match(event.text, /^Forecast:/);
    assert.doesNotMatch(event.text, /2026-09-11/);
  });
  test('returns null when start date or daily data is missing', () => {
    assert.equal(buildForecastEventFromDaily(null, '2026-09-10', 2, 'en'), null);
    assert.equal(buildForecastEventFromDaily({ time: [] }, '', 2, 'en'), null);
  });
});

describe('buildSelfHealingPlan', () => {
  test('keeps indoor/transit activities and only replaces weather-sensitive ones', () => {
    const plan = buildSelfHealingPlan(
      {
        days: [
          { day: 1, activities: ['Đi đến Naha Airport', 'Đi biển Sunset Beach', 'Ăn trưa tại nhà hàng Yunangi'] }
        ]
      },
      ['Đi đến Naha Airport', 'Đi biển Sunset Beach', 'Ăn trưa tại nhà hàng Yunangi'],
      'Mưa to kèm gió mạnh',
      { days: 4, budget: '120000', group: 'gia đình có trẻ em', notes: 'thích biển' }
    );

    const day1 = plan.updated_days[0].activities;
    assert.equal(day1[0].text, 'Đi đến Naha Airport');
    assert.equal(day1[0].changed, false);
    assert.equal(day1[2].text, 'Ăn trưa tại nhà hàng Yunangi');
    assert.equal(day1[2].changed, false);
    assert.equal(day1[1].changed, true);
    assert.ok(plan.replacements.length >= 1);
  });

  test('returns unchanged plan when weather is not severe', () => {
    const plan = buildSelfHealingPlan(
      { days: [{ day: 1, activities: ['Sunset Beach', 'Museum'] }] },
      ['Sunset Beach', 'Museum'],
      'mưa nhẹ',
      { days: 2, budget: '90000', group: '2 người', notes: '' }
    );
    assert.ok(plan.replacements.length >= 1);
    assert.equal(plan.updated_days[0].activities[1].changed, false);
    assert.equal(plan.updated_days[0].activities[1].text, 'Museum');
  });

  test('keeps plan unchanged for low-severity incidents', () => {
    const plan = buildSelfHealingPlan(
      { days: [{ day: 1, activities: ['Sunset Beach', 'Museum'] }] },
      ['Sunset Beach', 'Museum'],
      'trời nhiều mây',
      { days: 2, budget: '90000', group: '2 người', notes: '' }
    );
    assert.equal(plan.replacements.length, 0);
    assert.equal(plan.updated_days[0].activities[0].changed, false);
    assert.equal(plan.updated_days[0].activities[0].text, 'Sunset Beach');
  });
});

describe('normalizeSelfHealingAiResult', () => {
  test('falls back to deterministic plan when AI payload is malformed', () => {
    const base = buildSelfHealingPlan(
      { days: [{ day: 1, activities: ['Sunset Beach', 'Museum'] }] },
      ['Sunset Beach', 'Museum'],
      'Bão lớn kèm gió mạnh',
      { days: 2, budget: '90000', group: '2 người', notes: '' }
    );
    const normalized = normalizeSelfHealingAiResult(base, { replacements: 'not-an-array', updated_itinerary: '' });
    assert.deepEqual(normalized.updated_itinerary, canonicalHealedActivities(base));
    assert.deepEqual(normalized.replacements, base.replacements);
  });

  test('rebuilds day-structure from AI flat itinerary and keeps canonical consistency', () => {
    const base = buildSelfHealingPlan(
      {
        days: [
          { day: 1, activities: ['Beach', 'Lunch'] },
          { day: 2, activities: ['Museum', 'Dinner'] }
        ]
      },
      ['Beach', 'Lunch', 'Museum', 'Dinner'],
      'Mưa to kèm gió mạnh',
      { days: 2, budget: '120000', group: 'gia đình', notes: '' }
    );
    const normalized = normalizeSelfHealingAiResult(base, {
      updated_itinerary: ['Aquarium', 'Food Hall', 'Museum', 'Dinner']
    });

    assert.equal(normalized.updated_days.length, 2);
    assert.deepEqual(canonicalHealedActivities(normalized), normalized.updated_itinerary);
    assert.ok(normalized.replacements.length >= 1);
  });

  test('keeps day mapping stable when AI flat itinerary has extra noisy entries', () => {
    const base = buildSelfHealingPlan(
      {
        days: [
          { day: 1, activities: ['Naha Airport', 'Kyara'] },
          { day: 2, activities: ['Churaumi Aquarium', 'Cape Manzamo'] }
        ]
      },
      ['Naha Airport', 'Kyara', 'Churaumi Aquarium', 'Cape Manzamo'],
      'Mưa to kèm gió mạnh',
      { days: 2, budget: '120000', group: 'gia đình', notes: '' }
    );
    const normalized = normalizeSelfHealingAiResult(base, {
      updated_itinerary: [
        '2026-09-10 | Naha Airport',
        '2026-09-10 | Kyara',
        '2026-09-11 | Churaumi Aquarium',
        '2026-09-11 | Cape Manzamo',
        '2026-09-11 | Extra item that should invalidate positional remap'
      ]
    });
    assert.equal(normalized.updated_days.length, 2);
    assert.equal(normalized.updated_days[0].activities.length, 2);
    assert.equal(normalized.updated_days[1].activities.length, 2);
  });
});

describe('buildPlannerDataFromHealedData', () => {
  test('maps updated_days into planner day/activity objects', () => {
    const planner = buildPlannerDataFromHealedData({
      updated_days: [
        { day: 1, activities: [{ text: 'Aquarium', slot: 'morning' }, { text: 'Food Hall', slot: 'afternoon' }] },
        { day: 2, activities: [{ text: 'Museum', slot: 'evening' }] }
      ]
    }, { summary: 'original summary' });

    assert.equal(planner.summary, 'original summary');
    assert.equal(planner.days.length, 2);
    assert.equal(planner.days[0].activities[0].text, 'Aquarium');
    assert.equal(planner.days[0].activities[0].slot, 'morning');
    assert.equal(planner.days[1].day, 2);
  });

  test('falls back to a one-day plan when only updated_itinerary exists', () => {
    const planner = buildPlannerDataFromHealedData({
      updated_itinerary: ['Aquarium', 'Market']
    }, {});

    assert.equal(planner.days.length, 1);
    assert.equal(planner.days[0].day, 1);
    assert.deepEqual(planner.days[0].activities.map(a => a.text), ['Aquarium', 'Market']);
  });
});

describe('relocalizeHealedData', () => {
  test('rebuilds forecast-based incident summary in target language', () => {
    const source = {
      incident_summary: 'Dự báo: giông bão, nhiệt độ cao nhất 30°C, lượng mưa 20mm.',
      severity: 'high',
      context_summary: '3 ngày • ngân sách 100000 yên',
      updated_days: [{ day: 1, activities: [{ original: 'Beach', text: 'Museum', changed: true, reason: 'x', slot: 'morning' }] }],
      updated_itinerary: ['Museum'],
      satisfactionDelta: { before: 60, after: 58, perMember: [{ name: 'A', before: 70, after: 60 }] },
      meta: {
        rawIncidentText: 'Forecast: thunderstorm, max 30°C, precipitation 20mm.',
        plannerContext: { days: 3, budget: '100000', group: 'family', notes: 'car rental' },
        forecastEvent: { date: '2026-09-11', weatherCode: 95, tempMax: 30, precip: 20, severity: 'high', type: 'storm' }
      }
    };
    const ja = relocalizeHealedData(source, 'ja');
    assert.match(ja.incident_summary, /重大な状況|雷雨/);
    assert.match(ja.context_summary, /日間/);
    assert.match(ja.meta.forecastEvent.text, /予報|雷雨/);
  });
});

describe('normalizeMemberImpactAi', () => {
  test('keeps only valid members and enforces impact labels', () => {
    const delta = {
      before: 66,
      after: 63,
      perMember: [
        { name: 'A', before: 70, after: 60 },
        { name: 'B', before: 62, after: 66 }
      ]
    };
    const normalized = normalizeMemberImpactAi({
      summary: 'custom',
      members: [
        { name: 'A', impact: 'negative', reason: 'r1', advice: 'a1' },
        { name: 'X', impact: 'positive', reason: 'ignored', advice: 'ignored' },
        { name: 'B', impact: 'weird-value', reason: 'r2', advice: '' }
      ]
    }, delta, 'en');

    assert.equal(normalized.members.length, 2);
    assert.equal(normalized.members[0].name, 'A');
    assert.equal(normalized.members[0].impact, 'negative');
    assert.equal(normalized.members[1].name, 'B');
    assert.equal(normalized.members[1].impact, 'positive');
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

// ================================================================
// Group Decision engine — deterministic scoring/conflict/compromise logic.
// Fully rule-based (no LLM call), so every case here is exact and repeatable.
// ================================================================

describe('parseKnowledgeChunk', () => {
  test('parses "key: value" lines from a RAG chunk into an object', () => {
    const text = 'name: BBQ Naha Grill\ncuisine: Đồ nướng, Orion Beer\npriceRange: 2000-3000 yên/người\nkidFriendly: true\nrating: 4.8';
    assert.deepEqual(parseKnowledgeChunk(text), {
      name: 'BBQ Naha Grill', cuisine: 'Đồ nướng, Orion Beer', priceRange: '2000-3000 yên/người', kidFriendly: 'true', rating: '4.8'
    });
  });
  test('ignores lines with no colon and tolerates values that contain a colon', () => {
    const text = 'name: Naha Soba\nhours: 07:00-20:30\nnot a key-value line';
    const parsed = parseKnowledgeChunk(text);
    assert.equal(parsed.name, 'Naha Soba');
    assert.equal(parsed.hours, '07:00-20:30');
  });
  test('returns an empty object for blank input', () => {
    assert.deepEqual(parseKnowledgeChunk(''), {});
    assert.deepEqual(parseKnowledgeChunk(undefined), {});
  });
});

describe('extractPreferenceTags', () => {
  test('matches Vietnamese keywords', () => {
    assert.deepEqual(extractPreferenceTags('Hải sản, thích chụp ảnh', 'vi').sort(), ['photo', 'seafood']);
  });
  test('matches Japanese keywords', () => {
    assert.deepEqual(extractPreferenceTags('海鮮と写真が好き', 'ja').sort(), ['photo', 'seafood']);
  });
  test('matches English keywords regardless of the active language', () => {
    // Mixed-language input is common (e.g. Vietnamese sentence, English preference word) — English is always checked.
    assert.deepEqual(extractPreferenceTags('I love seafood', 'vi'), ['seafood']);
  });
  test('returns an empty list when nothing matches', () => {
    assert.deepEqual(extractPreferenceTags('xyz123', 'vi'), []);
  });
});

describe('scoreEntryForMember', () => {
  const seafoodPlace = { name: 'American Village Seafood House', cuisine: 'Hải sản', priceRange: '3000-5000 yên/người', kidFriendly: 'true', rating: '4.5' };
  test('boosts the score when a tag matches the venue', () => {
    const { score, reasons } = scoreEntryForMember(seafoodPlace, ['seafood'], 'vi');
    assert.ok(score > 60);
    assert.equal(reasons[0].key, 'matchTag');
  });
  test('penalizes a vegetarian member at a seafood/meat-heavy venue', () => {
    const { score, reasons } = scoreEntryForMember(seafoodPlace, ['vegetarian'], 'vi');
    assert.ok(score < 60);
    assert.equal(reasons[0].key, 'conflictVegetarian');
  });
  test('rewards a budget-conscious member when the price is low', () => {
    const cheap = { name: 'Naha Airport Soba House', priceRange: '700-1000 yên/người' };
    const { score, reasons } = scoreEntryForMember(cheap, ['budget'], 'vi');
    assert.ok(score > 60);
    assert.equal(reasons[0].key, 'matchBudget');
  });
  test('flags a kid-traveling member down at a non-kid-friendly venue', () => {
    const adultOnly = { name: 'Orion Beer Hall', kidFriendly: 'false' };
    const { reasons } = scoreEntryForMember(adultOnly, ['kids'], 'vi');
    assert.equal(reasons[0].key, 'notKidFriendly');
  });
  test('clamps the score to the 5-100 range', () => {
    const { score } = scoreEntryForMember(seafoodPlace, ['vegetarian', 'budget', 'kids'], 'vi');
    assert.ok(score >= 5 && score <= 100);
  });
});

describe('computeGroupSatisfaction', () => {
  const members = [{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }];
  const seafoodPlace = { name: 'Seafood House', cuisine: 'Hải sản' };
  test('returns one score per member plus an overall figure', () => {
    const g = computeGroupSatisfaction(members, seafoodPlace, 'vi');
    assert.equal(g.perMember.length, 2);
    assert.equal(typeof g.overall, 'number');
  });
  test('identifies the lowest and highest scoring member', () => {
    const g = computeGroupSatisfaction(members, seafoodPlace, 'vi');
    assert.equal(g.lowest.name, 'C');
    assert.equal(g.highest.name, 'A');
  });
  test('handles an empty member list without throwing', () => {
    const g = computeGroupSatisfaction([], seafoodPlace, 'vi');
    assert.equal(g.overall, 0);
    assert.equal(g.lowest, null);
  });
});

describe('detectPreferenceConflicts', () => {
  test('detects a conflict when some members score high and others score low', () => {
    const members = [{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }];
    const conflicts = detectPreferenceConflicts(members, { name: 'Seafood House', cuisine: 'Hải sản' }, 'vi');
    assert.equal(conflicts.length, 1);
    assert.deepEqual(conflicts[0].like, ['A']);
    assert.deepEqual(conflicts[0].dislike, ['C']);
    assert.ok(['low', 'moderate', 'high'].includes(conflicts[0].severity));
  });
  test('reports no conflict when everyone scores similarly', () => {
    const members = [{ name: 'A', pref: 'thích du lịch' }, { name: 'B', pref: 'thích tham quan' }];
    const conflicts = detectPreferenceConflicts(members, { name: 'Generic Park' }, 'vi');
    assert.deepEqual(conflicts, []);
  });
});

describe('generateCompromiseOptions', () => {
  const members = [{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }];
  const candidates = [
    { name: 'Seafood House', cuisine: 'Hải sản' },
    { name: 'Generic Park' },
    { name: 'Vegetarian Cafe', notes: 'chay' },
    { source: 'okinawa-notes.md', notes: 'General travel notes with no name field' } // simulates an unstructured .md chunk — must be dropped
  ];
  test('ranks candidates by their worst member score, not the average', () => {
    const options = generateCompromiseOptions(candidates, members, 'vi');
    // The seafood-only venue has a low floor (C dislikes it); a neutral/vegetarian-friendly
    // venue should be ranked above it even if its average isn't the single highest.
    const seafoodOption = options.find(o => o.name === 'Seafood House');
    const topOption = options[0];
    assert.notEqual(topOption.name, 'Seafood House');
    if (seafoodOption) assert.ok(topOption.minScore >= seafoodOption.minScore);
  });
  test('drops candidates with no name (unstructured knowledge chunks)', () => {
    const options = generateCompromiseOptions(candidates, members, 'vi');
    assert.equal(options.length, 3); // only the 3 named candidates are eligible
    assert.ok(options.every(o => o.name));
  });
  test('returns at most 3 options, labeled A/B/C, with exactly one picked', () => {
    const options = generateCompromiseOptions(candidates, members, 'vi');
    assert.ok(options.length <= 3);
    assert.deepEqual(options.map(o => o.label), options.slice(0, options.length).map((_, i) => ['A', 'B', 'C'][i]));
    assert.equal(options.filter(o => o.picked).length, 1);
    assert.equal(options[0].picked, true);
  });
  test('each option carries its strategy (safest/balanced/delight), matching the picked one', () => {
    const options = generateCompromiseOptions(candidates, members, 'vi');
    assert.deepEqual(options.map(o => o.strategy), ['safest', 'balanced', 'delight']);
    assert.equal(options.find(o => o.picked).strategy, 'safest');
  });
});

describe('generateCompromiseOptions — avoiding the "nobody loves it" compromise', () => {
  // A: loves seafood. B: vegetarian (actively conflicts with seafood places). C: no strong preference.
  const members = [
    { name: 'A', pref: 'Hải sản' },
    { name: 'B', pref: 'Ăn chay' },
    { name: 'C', pref: 'Không quan trọng' }
  ];
  // Two interchangeable, nobody-excited venues plus one A loves and one B loves.
  const candidates = [
    { name: 'Neutral Cafe 1' },
    { name: 'Neutral Cafe 2' },
    { name: 'Vegetarian Cafe', notes: 'chay' },
    { name: 'Seafood House', cuisine: 'Hải sản' }
  ];

  test('surfaces a high-peak option via the "delight" strategy instead of dropping it for a bland duplicate', () => {
    const options = generateCompromiseOptions(candidates, members, 'vi');
    // Seafood House has the worst floor (B dislikes it), so floor-only ranking alone would drop it
    // in favor of the two "Neutral Cafe" duplicates that nobody dislikes — but nobody loves either.
    const delightOption = options.find(o => o.strategy === 'delight');
    assert.equal(delightOption.name, 'Seafood House');
    assert.notEqual(delightOption.strategy, 'safest');
  });
  test('flags an option as bland when it clears the floor but excites nobody', () => {
    const options = generateCompromiseOptions(candidates, members, 'vi');
    const balancedOption = options.find(o => o.strategy === 'balanced'); // a Neutral Cafe: everyone lands around the same middling score
    assert.equal(balancedOption.bland, true);
    const delightOption = options.find(o => o.strategy === 'delight'); // Seafood House: A is thrilled
    assert.equal(delightOption.bland, false);
  });
  test('renderCompromiseOptionsHtml shows the bland caveat only on options nobody is excited about', () => {
    const options = generateCompromiseOptions(candidates, members, 'vi');
    const html = renderCompromiseOptionsHtml(options, 'vi');
    const caveatCount = (html.match(/opt-caveat/g) || []).length;
    assert.equal(caveatCount, options.filter(o => o.bland).length);
    assert.ok(caveatCount >= 1);
  });
});

describe('pickPrimaryKnowledgeEntry', () => {
  const candidates = [{ name: 'American Village Seafood House' }, { name: 'American Village' }];
  test('prefers an exact name match', () => {
    assert.equal(pickPrimaryKnowledgeEntry(candidates, 'American Village').name, 'American Village');
  });
  test('falls back to a substring match', () => {
    // Neither candidate name is an exact match for the full query string; the shorter
    // "American Village" is found as a substring of it first, in candidate order.
    assert.equal(pickPrimaryKnowledgeEntry(candidates, 'American Village, Okinawa').name, 'American Village');
  });
  test('falls back to a synthetic entry when nothing matches', () => {
    assert.deepEqual(pickPrimaryKnowledgeEntry([], 'Some New Place'), { name: 'Some New Place' });
  });
});

describe('buildReasoningReceipt', () => {
  test('builds bullet reasons from real RAG fields', () => {
    const entry = { name: 'Umi Seafood Table', priceRange: '3000-4000 yên', kidFriendly: 'true', rating: '4.7', address: 'Naha' };
    const members = [{ name: 'A', pref: 'Hải sản' }];
    const group = computeGroupSatisfaction(members, entry, 'vi');
    const lines = buildReasoningReceipt(entry, group, members, 'vi');
    assert.ok(lines.some(l => l.includes('3000-4000')));
    assert.ok(lines.some(l => l.includes('Thân thiện')));
    assert.ok(lines.some(l => l.includes('4.7')));
  });
});

describe('Group Decision render functions', () => {
  test('renderSatisfactionScoreHtml renders a bar per member plus overall', () => {
    const group = computeGroupSatisfaction([{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }], { name: 'Seafood House', cuisine: 'Hải sản' }, 'vi');
    const html = renderSatisfactionScoreHtml(group, 'vi');
    assert.match(html, /sat-row overall/);
    assert.match(html, /A/);
    assert.match(html, /C/);
  });
  test('renderSatisfactionScoreHtml returns empty string with no members', () => {
    assert.equal(renderSatisfactionScoreHtml({ perMember: [] }, 'vi'), '');
  });
  test('renderConflictCardsHtml renders like/dislike pills', () => {
    const conflicts = detectPreferenceConflicts([{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }], { name: 'Seafood House', cuisine: 'Hải sản' }, 'vi');
    const html = renderConflictCardsHtml(conflicts, 'vi');
    assert.match(html, /person-pill like/);
    assert.match(html, /person-pill dislike/);
  });
  test('renderCompromiseOptionsHtml marks exactly one option as the AI pick', () => {
    const members = [{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }];
    const candidates = [{ name: 'Seafood House', cuisine: 'Hải sản' }, { name: 'Generic Park' }];
    const options = generateCompromiseOptions(candidates, members, 'vi');
    const html = renderCompromiseOptionsHtml(options, 'vi');
    assert.equal((html.match(/opt-card picked/g) || []).length, 1);
  });
  test('renderCompromiseOptionsHtml gives every option a choose button, unchosen by default', () => {
    const members = [{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }];
    const candidates = [{ name: 'Seafood House', cuisine: 'Hải sản' }, { name: 'Generic Park' }];
    const options = generateCompromiseOptions(candidates, members, 'vi');
    const html = renderCompromiseOptionsHtml(options, 'vi');
    assert.equal((html.match(/opt-choose-btn/g) || []).length, options.length);
    assert.doesNotMatch(html, /opt-choose-btn chosen/);
  });
  test('renderCompromiseOptionsHtml marks the matching option as chosen when a chosenName is given', () => {
    const members = [{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }];
    const candidates = [{ name: 'Seafood House', cuisine: 'Hải sản' }, { name: 'Generic Park' }];
    const options = generateCompromiseOptions(candidates, members, 'vi');
    const html = renderCompromiseOptionsHtml(options, 'vi', 'Generic Park');
    assert.equal((html.match(/opt-choose-btn chosen/g) || []).length, 1);
    assert.match(html, /data-opt-name="Generic Park"[^>]*>✓ Đã chọn/);
  });
});

// ================================================================
// Explainable Self-Healing (Feature 5) + Travel Risk Detection (Feature 6).
// ================================================================

describe('computeItinerarySatisfaction', () => {
  const members = [{ name: 'A', pref: 'Hải sản' }, { name: 'C', pref: 'Ăn chay' }];
  test('averages each member\'s score across every activity', () => {
    const g = computeItinerarySatisfaction(members, ['Beach', 'Hải sản restaurant'], 'vi');
    assert.equal(g.perMember.length, 2);
    assert.equal(typeof g.overall, 'number');
  });
  test('returns null with no members or no activities', () => {
    assert.equal(computeItinerarySatisfaction([], ['Beach'], 'vi'), null);
    assert.equal(computeItinerarySatisfaction(members, [], 'vi'), null);
  });
});

describe('computeSatisfactionDelta', () => {
  const members = [{ name: 'A', pref: 'Hải sản' }, { name: 'B', pref: 'Ăn chay' }];
  test('reports a before/after overall score and a per-member delta', () => {
    const delta = computeSatisfactionDelta(members, ['Beach'], ['Hải sản restaurant'], 'vi');
    assert.equal(typeof delta.before, 'number');
    assert.equal(typeof delta.after, 'number');
    assert.equal(delta.perMember.length, 2);
    assert.ok('before' in delta.perMember[0] && 'after' in delta.perMember[0]);
  });
  test('returns null when there are no members to score against', () => {
    assert.equal(computeSatisfactionDelta([], ['Beach'], ['Museum'], 'vi'), null);
  });
});

describe('detectTravelRisks', () => {
  test('flags excessive walking when many outdoor activities are back to back', () => {
    const risks = detectTravelRisks(['Beach', 'Sunset viewing', 'Hiking trail', 'Outdoor BBQ', 'Snorkel tour'], {}, null, 'vi');
    const walking = risks.find(r => r.type === 'walking');
    assert.ok(walking);
    assert.equal(walking.level, 'high');
  });
  test('flags a tight budget for the number of days', () => {
    const risks = detectTravelRisks(['Museum'], { budget: '10000', days: 4 }, null, 'vi');
    const budget = risks.find(r => r.type === 'budget');
    assert.ok(budget);
    assert.equal(budget.level, 'high');
  });
  test('does not flag budget risk when it is comfortable', () => {
    const risks = detectTravelRisks(['Museum'], { budget: '200000', days: 4 }, null, 'vi');
    assert.equal(risks.find(r => r.type === 'budget'), undefined);
  });
  test('flags missing transportation when there are many activities and no car/transit mention', () => {
    const risks = detectTravelRisks(['Beach', 'Museum', 'Market', 'Restaurant', 'Park'], { notes: '' }, null, 'vi');
    assert.ok(risks.find(r => r.type === 'transport'));
  });
  test('does not flag transportation when a car rental is mentioned', () => {
    const risks = detectTravelRisks(['Beach', 'Museum', 'Market', 'Restaurant', 'Park'], { notes: 'Thuê xe' }, null, 'vi');
    assert.equal(risks.find(r => r.type === 'transport'), undefined);
  });
  test('surfaces a high weather risk for a severe incident', () => {
    const incident = classifyIncident('Bão lớn cả ngày');
    const risks = detectTravelRisks(['Museum'], {}, incident, 'vi');
    const weather = risks.find(r => r.type === 'weather');
    assert.ok(weather);
    assert.equal(weather.level, 'high');
  });
  test('returns an empty array when nothing is risky', () => {
    assert.deepEqual(detectTravelRisks(['Museum'], { budget: '200000', days: 1, notes: 'Thuê xe' }, null, 'vi'), []);
  });
});

describe('Explainable Self-Healing / Risk render functions', () => {
  test('renderSatisfactionDeltaHtml shows before/after and a per-member delta', () => {
    const delta = { before: 87, after: 84, perMember: [{ name: 'A', before: 90, after: 80 }, { name: 'B', before: 84, after: 92 }] };
    const html = renderSatisfactionDeltaHtml(delta, 'vi');
    assert.match(html, /87%/);
    assert.match(html, /84%/);
    assert.match(html, /delta-neg/);
    assert.match(html, /delta-pos/);
  });
  test('renderSatisfactionDeltaHtml returns empty string with no delta', () => {
    assert.equal(renderSatisfactionDeltaHtml(null, 'vi'), '');
  });
  test('renderRiskPanelHtml renders one row per risk with its level', () => {
    const html = renderRiskPanelHtml([{ type: 'budget', level: 'high', detail: 'test detail' }], 'vi');
    assert.match(html, /risk-level high/);
    assert.match(html, /test detail/);
  });
  test('renderRiskPanelHtml returns empty string with no risks', () => {
    assert.equal(renderRiskPanelHtml([], 'vi'), '');
    assert.equal(renderRiskPanelHtml(null, 'vi'), '');
  });
});

describe('buildConversationTranscript', () => {
  test('joins messages with English role labels', () => {
    const text = buildConversationTranscript([
      { role: 'user', text: 'Tôi muốn đi Đà Nẵng' },
      { role: 'ai', text: 'Bạn muốn đi mấy ngày?' }
    ]);
    assert.equal(text, 'User: Tôi muốn đi Đà Nẵng\nAssistant: Bạn muốn đi mấy ngày?');
  });
  test('skips empty/missing entries and handles no messages', () => {
    assert.equal(buildConversationTranscript([{ role: 'user', text: '' }, null]), '');
    assert.equal(buildConversationTranscript([]), '');
    assert.equal(buildConversationTranscript(undefined), '');
  });
});

describe('normalizeExtractedSlots', () => {
  test('trims strings and parses a valid day count', () => {
    const slots = normalizeExtractedSlots({ destination: ' Đà Nẵng ', days: '3', startDate: '2026-10-01', budget: '5000000', group: 'gia đình', notes: 'thích biển' });
    assert.deepEqual(slots, { destination: 'Đà Nẵng', days: 3, startDate: '2026-10-01', budget: '5000000', group: 'gia đình', notes: 'thích biển' });
  });
  test('treats missing/zero/invalid day counts as null, not 0 or NaN', () => {
    assert.equal(normalizeExtractedSlots({ days: null }).days, null);
    assert.equal(normalizeExtractedSlots({ days: 0 }).days, null);
    assert.equal(normalizeExtractedSlots({ days: 'chưa biết' }).days, null);
    assert.equal(normalizeExtractedSlots({}).days, null);
  });
  test('handles a non-object input without throwing', () => {
    assert.deepEqual(normalizeExtractedSlots(null), { destination: '', days: null, startDate: '', budget: '', group: '', notes: '' });
  });
});

describe('missingTripSlots', () => {
  test('flags destination and days as missing when blank', () => {
    assert.deepEqual(missingTripSlots({ destination: '', days: null }), ['destination', 'days']);
  });
  test('flags only the one field that is missing', () => {
    assert.deepEqual(missingTripSlots({ destination: 'Okinawa', days: null }), ['days']);
    assert.deepEqual(missingTripSlots({ destination: '', days: 3 }), ['destination']);
  });
  test('returns an empty array once both are known', () => {
    assert.deepEqual(missingTripSlots({ destination: 'Okinawa', days: 3 }), []);
  });
});

describe('buildVoiceFollowUpQuestion', () => {
  test('asks for both when both are missing', () => {
    assert.equal(buildVoiceFollowUpQuestion(['destination', 'days'], 'vi'), tr('vi', 'voice.askBoth'));
  });
  test('asks only about the destination when only that is missing', () => {
    assert.equal(buildVoiceFollowUpQuestion(['destination'], 'en'), tr('en', 'voice.askDestination'));
  });
  test('asks only about day count when only that is missing', () => {
    assert.equal(buildVoiceFollowUpQuestion(['days'], 'ja'), tr('ja', 'voice.askDays'));
  });
  test('returns an empty string when nothing is missing', () => {
    assert.equal(buildVoiceFollowUpQuestion([], 'vi'), '');
  });
});

describe('detectItineraryIntent', () => {
  test('matches a trigger phrase case-insensitively', () => {
    assert.equal(detectItineraryIntent('Bạn TẠO LỊCH TRÌNH cho tôi nhé', ['tạo lịch trình']), true);
  });
  test('returns false when no trigger phrase is present', () => {
    assert.equal(detectItineraryIntent('Gợi ý cho tôi quán ăn gần đây', ['tạo lịch trình', 'lên lịch trình']), false);
  });
  test('returns false for empty text or no triggers', () => {
    assert.equal(detectItineraryIntent('', ['tạo lịch trình']), false);
    assert.equal(detectItineraryIntent('tạo lịch trình đi', []), false);
    assert.equal(detectItineraryIntent('tạo lịch trình đi', undefined), false);
  });
});
