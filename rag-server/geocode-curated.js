// One-time enrichment script — NOT called at app runtime. Geocodes the hand-curated
// knowledge/restaurants.json and knowledge/attractions.json entries (which have a name + address
// but no coordinates) against OpenStreetMap's free Nominatim geocoder, and adds a `lat`/`lon`
// field to each entry that resolves. Every other field (price, rating, notes...) is left exactly
// as-is — this only ever ADDS lat/lon, never rewrites or removes anything a person curated by hand.
// Already-geocoded entries are skipped, so it's safe to re-run after adding new curated venues.
//
// Why: detectGeographicRisks() in app.js needs real coordinates to tell a reasonable day-trip loop
// apart from a zigzag across the island — something the planner LLM has no way to check itself
// (it only ever sees place names, never real locations).
//
// Respects Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/):
// max 1 request/second and a real identifying User-Agent. This is a one-off script, run rarely
// (only when curated venues are added), never a repeating job.
//
// Usage: node rag-server/geocode-curated.js

const fs = require('fs');
const path = require('path');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'TravelAI-Hackathon-DataIngest/1.0 (one-off knowledge-base geocoding)';
const REQUEST_DELAY_MS = 1100; // stay under Nominatim's 1 req/sec limit with a small safety margin

const FILES = ['restaurants.json', 'attractions.json'];

// Last-resort fallback when a venue's own name+address doesn't resolve (common for a small local
// shop, or a fictional-sounding demo venue name Nominatim has never heard of): geocode just the
// town/area it's in instead. That's town-level precision, not the exact building — plenty good
// enough for detectGeographicRisks()'s "is this a huge cross-island jump" check, and honest: it's
// no less accurate than the address text ("Naha, khu trung tâm thương mại") already was.
const KNOWN_AREAS = [
  'Naha', 'Chatan', 'Motobu', 'Onna', 'Nago', 'Yomitan', 'Kadena', 'Ginowan', 'Urasoe', 'Itoman',
  'Nanjo', 'Uruma', 'Ishigaki', 'Miyako', 'Zamami', 'Shuri', 'Tsuboya', 'Sunabe', 'Kin', 'Ie'
];

function guessArea(item) {
  const haystack = `${item.name} ${item.address || ''}`;
  return KNOWN_AREAS.find(area => haystack.includes(area)) || null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocode(query) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=jp&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const results = await res.json();
  if (!results.length) return null;
  const lat = parseFloat(results[0].lat);
  const lon = parseFloat(results[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

async function geocodeFile(fileName) {
  const filePath = path.join(__dirname, '..', 'knowledge', fileName);
  if (!fs.existsSync(filePath)) { console.log(`(bỏ qua, không tìm thấy ${fileName})`); return; }
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let geocoded = 0, skipped = 0, failed = 0;

  for (const item of items) {
    if (item.lat != null && item.lon != null) { skipped++; continue; }
    if (!item.name) continue;

    // Try "name, address" first (most specific), then the address alone, then just the town/area
    // name it's in (see guessArea) — each tier trades precision for a better chance of resolving.
    const area = guessArea(item);
    const queries = [
      item.address ? `${item.name}, ${item.address}` : item.name,
      item.address,
      area ? `${area}, Okinawa, Japan` : null
    ].filter(Boolean);
    let found = null;
    let usedAreaFallback = false;
    for (const q of queries) {
      await sleep(REQUEST_DELAY_MS);
      found = await geocode(q);
      if (found) { usedAreaFallback = (q === queries[queries.length - 1] && q !== queries[0] && area); break; }
    }

    if (found) {
      item.lat = found.lat;
      item.lon = found.lon;
      geocoded++;
      console.log(`  ✓ ${item.name} → ${found.lat}, ${found.lon}${usedAreaFallback ? ` (ước lượng theo khu vực "${area}", không phải vị trí chính xác)` : ''}`);
    } else {
      failed++;
      console.log(`  ⚠️ Không tìm được toạ độ cho: ${item.name}`);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(items, null, 2) + '\n', 'utf8');
  console.log(`${fileName}: geocode thành công ${geocoded}, đã có sẵn ${skipped}, thất bại ${failed}\n`);
}

async function main() {
  for (const file of FILES) {
    console.log(`Đang geocode ${file}...`);
    await geocodeFile(file);
  }
  console.log('Xong. Chạy tiếp: node rag-server/ingest.js   (để rebuild embedding với field lat/lon mới)');
}

main().catch(err => {
  console.error('Lỗi khi geocode:', err.message);
  process.exit(1);
});
