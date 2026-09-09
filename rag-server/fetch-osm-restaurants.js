// One-time/occasional data-ingest script — NOT part of the running app or rag-server's HTTP
// service, and never called at demo/runtime. Fetches real restaurant/cafe/bar listings for
// Okinawa's main island from OpenStreetMap's public Overpass API (free, no API key, no billing),
// maps them into this app's existing restaurants.json schema, and writes them to a SEPARATE file
// (knowledge/restaurants-osm.json) so the hand-curated knowledge/restaurants.json — which has real
// price/rating data OSM doesn't — is never overwritten. rag-server/ingest.js already reads every
// .json file under knowledge/, so after running this, just re-run `node rag-server/ingest.js` to
// rebuild the embeddings; no other code changes needed.
//
// Data source & license: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright —
// data licensed under ODbL (keep this attribution if the file is redistributed). This is
// crowd-sourced map data, NOT independently verified: names/addresses/hours can be outdated or
// wrong, and OSM has no rating field at all — left out entirely rather than guessed.
//
// OSM also has no price field, but unlike rating, a price is needed for the app's cost-summary
// feature to say anything at all about these venues — so `priceRange` here is a ROUGH ESTIMATE
// derived from cuisine/venue type (a ramen shop costs roughly X, a steakhouse roughly Y), not a
// real observed price. This is clearly marked as such: every value starts with "~" and ends with
// "(ước lượng theo loại quán)" — same "~" convention app.js already uses to mark an inferred price
// elsewhere (see correctedActivityPrice) — so it reads as an estimate everywhere it's shown
// (cost summaries, the "Vì sao chọn" reasoning line), never mistaken for the hand-curated file's
// real, verified prices.
//
// Usage: node rag-server/fetch-osm-restaurants.js [--limit 300]

const fs = require('fs');
const path = require('path');

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

// Bounding box covering Okinawa's main island (Okinawa Honto): south,west,north,east.
const OKINAWA_HONTO_BBOX = '26.0,127.6,26.9,128.35';

const AMENITY_TYPES = ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'ice_cream'];

const AMENITY_LABEL_VI = {
  restaurant: 'Nhà hàng', cafe: 'Quán cà phê', fast_food: 'Đồ ăn nhanh',
  bar: 'Quán bar', pub: 'Pub', ice_cream: 'Kem'
};

// Common OSM `cuisine` tag values translated for readability. Anything not listed here just gets
// its underscores swapped for spaces instead of being dropped, so no data is ever discarded.
const CUISINE_LABEL_VI = {
  japanese: 'Nhật Bản', okinawan: 'Okinawa', ryukyu: 'Ryukyu truyền thống', seafood: 'Hải sản',
  yakiniku: 'Yakiniku (thịt nướng)', barbecue: 'Đồ nướng/BBQ', steak_house: 'Steak',
  ramen: 'Ramen', soba: 'Soba', sushi: 'Sushi', izakaya: 'Izakaya', udon: 'Udon',
  burger: 'Burger', pizza: 'Pizza', italian: 'Ý', chinese: 'Trung Hoa', korean: 'Hàn Quốc',
  american: 'Mỹ', international: 'Quốc tế', asian: 'Châu Á', curry: 'Cà ri',
  coffee_shop: 'Cà phê', vietnamese: 'Việt Nam', thai: 'Thái', french: 'Pháp', indian: 'Ấn Độ',
  regional: 'Đặc sản địa phương', local: 'Đặc sản địa phương', noodle: 'Mì', noodles: 'Mì',
  steak: 'Steak', chicken: 'Gà', grill: 'Nướng', buffet: 'Buffet', sandwich: 'Sandwich',
  tenpura: 'Tempura', beef: 'Bò', beef_bowl: 'Cơm thịt bò (gyudon)', hawaiian: 'Hawaii',
  fine_dining: 'Cao cấp', tacos: 'Taco', 'tex-mex': 'Tex-Mex', nepalese: 'Nepal',
  jerk_chicken: 'Gà kiểu Jamaica'
};

function humanizeCuisine(cuisineTag, amenity) {
  if (!cuisineTag) return AMENITY_LABEL_VI[amenity] || 'Ẩm thực địa phương';
  return cuisineTag.split(';').map(c => {
    const key = c.trim().toLowerCase();
    return CUISINE_LABEL_VI[key] || key.replace(/_/g, ' ');
  }).join(', ');
}

// Rough price bands (yen/person) by cuisine keyword, checked most-specific-first — OSM has no
// price field at all, and unlike rating, the app's cost-summary/cost-split feature needs SOME
// number to work with for these venues, so this fills the gap with an estimate rather than
// leaving every OSM-sourced activity to hit the app's generic 800-yen food floor regardless of
// whether it's a quick soba stand or a steakhouse. Never claimed as real — see estimatePriceRange.
const PRICE_ESTIMATE_BANDS = [
  { keywords: ['fine_dining'], range: [5000, 8000] },
  { keywords: ['steak_house', 'steak', 'yakiniku', 'barbecue'], range: [2500, 4500] },
  { keywords: ['sushi', 'seafood'], range: [2000, 4000] },
  { keywords: ['izakaya'], range: [2000, 3500] },
  { keywords: ['ramen', 'soba', 'udon', 'noodle', 'noodles', 'curry'], range: [800, 1300] },
  { keywords: ['burger', 'sandwich', 'pizza', 'tacos', 'fast_food'], range: [800, 1500] },
  { keywords: ['coffee_shop'], range: [600, 1200] }
];

// Fallback by amenity type, when no cuisine keyword above matched (or there's no cuisine tag).
const AMENITY_PRICE_BAND = {
  ice_cream: [400, 800], cafe: [600, 1200], fast_food: [700, 1200],
  bar: [2000, 3500], pub: [2000, 3500], restaurant: [1500, 2500]
};

/**
 * Estimated price range for a venue with no real price data — deliberately formatted so it can
 * never be mistaken for a real, verified price: prefixed "~" (the same convention app.js already
 * uses to flag an inferred price, see correctedActivityPrice) and suffixed "(ước lượng theo loại
 * quán)" so the estimate is visible wherever this string is shown as-is (cost summaries, the "Vì
 * sao chọn" reasoning line) — not just buried in a notes field a user might not read.
 */
function estimatePriceRange(cuisineTag, amenity) {
  const tokens = String(cuisineTag || '').split(';').map(c => c.trim().toLowerCase()).filter(Boolean);
  const band = PRICE_ESTIMATE_BANDS.find(b => b.keywords.some(k => tokens.includes(k)));
  const [lo, hi] = band ? band.range : (AMENITY_PRICE_BAND[amenity] || AMENITY_PRICE_BAND.restaurant);
  return `~${lo}-${hi} yên/người (ước lượng theo loại quán)`;
}

/** Japan's block/chome addressing doesn't decompose into housenumber/street the way OSM's schema
 * expects, so mappers commonly stuff the whole Japanese address into addr:full or addr:street —
 * checked first, in that order, before falling back to whatever discrete addr:* parts exist. */
function buildAddress(tags) {
  if (tags['addr:full']) return tags['addr:full'];
  if (tags['addr:street'] && /[市区町村]/.test(tags['addr:street'])) return tags['addr:street'];
  const parts = [tags['addr:province'], tags['addr:city'], tags['addr:suburb'], tags['addr:neighbourhood'], tags['addr:housenumber']].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

function buildNotes(tags, lat, lon) {
  const bits = [];
  const phone = tags.phone || tags['contact:phone'];
  const website = tags.website || tags['contact:website'];
  if (phone) bits.push(`SĐT: ${phone}`);
  if (website) bits.push(`Web: ${website}`);
  bits.push(`Toạ độ: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
  bits.push('Dữ liệu từ OpenStreetMap (cộng đồng đóng góp, giấy phép ODbL) — CHƯA được kiểm chứng thủ công, có thể sai/lỗi thời. Luôn kiểm tra lại qua Google Maps trước khi dùng.');
  return bits.join(' · ');
}

async function fetchOverpass(query) {
  let lastErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          // Overpass rate-limits/rejects requests with no identifying User-Agent.
          'User-Agent': 'TravelAI-Hackathon-DataIngest/1.0 (one-off knowledge-base seed script)'
        },
        body: 'data=' + encodeURIComponent(query)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      console.warn(`  ⚠️ ${endpoint} lỗi (${err.message}), thử endpoint khác nếu còn...`);
    }
  }
  throw lastErr;
}

function loadExistingNames() {
  const curatedPath = path.join(__dirname, '..', 'knowledge', 'restaurants.json');
  if (!fs.existsSync(curatedPath)) return new Set();
  try {
    const items = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
    return new Set((Array.isArray(items) ? items : [items]).map(i => String(i.name || '').trim().toLowerCase()).filter(Boolean));
  } catch (err) {
    return new Set();
  }
}

async function main() {
  const limitArgIdx = process.argv.indexOf('--limit');
  const limit = limitArgIdx !== -1 ? parseInt(process.argv[limitArgIdx + 1], 10) : 300;

  const amenityFilter = AMENITY_TYPES.join('|');
  // Over-fetches (2x the target) up front since a chunk of raw OSM points have no usable name
  // (unmapped by any contributor) and get dropped below — cheap insurance against ending up with
  // far fewer named entries than requested.
  const query = `[out:json][timeout:120];(nwr["amenity"~"^(${amenityFilter})$"](${OKINAWA_HONTO_BBOX}););out center ${limit * 2};`;

  console.log('Đang tải dữ liệu quán ăn/uống ở đảo chính Okinawa từ OpenStreetMap (Overpass API)...');
  const data = await fetchOverpass(query);
  console.log(`Nhận được ${data.elements.length} điểm thô từ OSM.`);

  const existingNames = loadExistingNames();
  const seen = new Set();
  const entries = [];
  let skippedNoName = 0, skippedDuplicate = 0, skippedCurated = 0;

  for (const el of data.elements) {
    const tags = el.tags || {};
    const name = (tags.name || tags['name:en'] || tags['name:ja'] || '').trim();
    if (!name) { skippedNoName++; continue; }
    const key = name.toLowerCase();
    if (existingNames.has(key)) { skippedCurated++; continue; } // already hand-curated with real price/rating
    if (seen.has(key)) { skippedDuplicate++; continue; }
    seen.add(key);

    const lat = el.lat != null ? el.lat : (el.center && el.center.lat);
    const lon = el.lon != null ? el.lon : (el.center && el.center.lon);
    if (lat == null || lon == null) continue;

    const entry = {
      name,
      cuisine: humanizeCuisine(tags.cuisine, tags.amenity),
      priceRange: estimatePriceRange(tags.cuisine, tags.amenity),
      address: buildAddress(tags) || `Gần toạ độ ${lat.toFixed(5)}, ${lon.toFixed(5)}, Okinawa`,
      notes: buildNotes(tags, lat, lon)
    };
    if (tags.opening_hours) entry.hours = tags.opening_hours;
    if (tags.highchair === 'yes') entry.kidFriendly = true;
    else if (tags.highchair === 'no') entry.kidFriendly = false;
    // No `rating` field: OSM has none, and this app already treats a missing rating as "unrated"
    // everywhere (scoreEntryForMember's isNaN(rating) check) rather than needing a fabricated
    // placeholder — unlike price, a missing rating doesn't block any feature from working.

    entries.push(entry);
    if (entries.length >= limit) break;
  }

  const outPath = path.join(__dirname, '..', 'knowledge', 'restaurants-osm.json');
  fs.writeFileSync(outPath, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`Bỏ qua: ${skippedNoName} không có tên, ${skippedCurated} trùng với knowledge/restaurants.json đã soạn tay, ${skippedDuplicate} trùng tên trong chính kết quả OSM.`);
  console.log(`Đã ghi ${entries.length} quán ăn/uống vào ${path.relative(process.cwd(), outPath)}`);
  console.log('Chạy tiếp: node rag-server/ingest.js   (đọc lại toàn bộ knowledge/, tự nạp luôn file này, rebuild embedding)');
}

main().catch(err => {
  console.error('Lỗi khi tải dữ liệu OSM:', err.message);
  process.exit(1);
});
