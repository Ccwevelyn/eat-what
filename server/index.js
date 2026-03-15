/**
 * 今天吃啥 - 后端
 * Overpass 查附近餐厅；逆地理用高德（内地+澳门），需配置 AMAP_KEY。
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_TIMEOUT_MS = 25000;
const AMAP_REGEO_URL = 'https://restapi.amap.com/v3/geocode/regeo';
const ENRICH_MAX_ITEMS = 15;

const AMAP_KEY = process.env.AMAP_KEY || '';

// 澳门大致中心，用于无 location 时的兜底
const MACAU_CENTER = { lat: 22.1987, lng: 113.5439 };

/** WGS84 → GCJ02（高德/国内坐标系），用于调用高德 API */
function wgs84ToGcj02(lat, lon) {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }
  function transformLon(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }
  const dLat = transformLat(lon - 105.0, lat - 35.0);
  const dLon = transformLon(lon - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLat2 = dLat * 180.0 / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  const dLon2 = dLon * 180.0 / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  return { lat: lat + dLat2, lng: lon + dLon2 };
}

/** Haversine 公式：两点经纬度求距离（公里） */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/** 从 Overpass 元素得到经纬度 */
function getLatLon(el) {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

/** 从 OSM tags 取地区（城市/区等） */
function getRegionFromTags(tags) {
  if (!tags) return '';
  return tags['addr:city'] || tags['addr:suburb'] || tags['addr:district'] || tags['addr:state'] || tags['addr:province'] || '';
}

/** 从 tags 拼详细地址（仅用 OSM 的 addr:*，不推测） */
function formatAddress(tags) {
  if (!tags) return '';
  const full = tags['addr:full'];
  if (full) return full;
  const city = tags['addr:city'] || '';
  const suburb = tags['addr:suburb'] || '';
  const street = tags['addr:street'] || '';
  const num = tags['addr:housenumber'] || '';
  const parts = [city, suburb, street, num].filter(Boolean);
  return parts.join(' ') || '';
}

/** OSM cuisine 英文 -> 中文菜系（印度归南亚，东南亚仅泰越等） */
const CUISINE_ZH = {
  cantonese: '粤菜', chinese: '中餐', japanese: '日料', korean: '韩餐',
  italian: '西餐', french: '西餐', european: '西餐', american: '西餐',
  thai: '东南亚', vietnamese: '东南亚', indian: '南亚',
  sichuan: '川菜', hot_pot: '火锅', tea: '茶餐厅', coffee: '咖啡'
};
function formatCuisine(tags) {
  if (!tags || !tags.cuisine) return '';
  const raw = (tags.cuisine || '').toLowerCase().split(';')[0].trim();
  return CUISINE_ZH[raw] || raw || '';
}

/** 高德逆地理（内地+澳门；坐标用 GCJ02） */
async function amapRegeo(lng, lat) {
  if (!AMAP_KEY) return '';
  try {
    const url = `${AMAP_REGEO_URL}?key=${encodeURIComponent(AMAP_KEY)}&location=${lng},${lat}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const data = await res.json();
    if (data.status !== '1' || !data.regeocode) return '';
    return data.regeocode.formatted_address || '';
  } catch (e) {
    return '';
  }
}

/** 对列表前 N 条用高德逆地理转成可读地址（并行请求，加快响应） */
async function enrichAddresses(list) {
  if (!AMAP_KEY) {
    list.forEach((item) => { delete item.lat; delete item.lon; });
    return;
  }
  const toEnrich = list.slice(0, ENRICH_MAX_ITEMS);
  await Promise.all(
    toEnrich.map(async (item) => {
      if (item.lat == null || item.lon == null) return;
      const gcj = wgs84ToGcj02(item.lat, item.lon);
      const addr = await amapRegeo(gcj.lng, gcj.lat);
      if (addr) item.address = addr;
    })
  );
  list.forEach((item) => {
    delete item.lat;
    delete item.lon;
  });
}

/** 调用 Overpass API（免费，无需 Key），带多节点重试 */
async function overpassQuery(query) {
  let lastErr;
  for (const url of OVERPASS_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Overpass API 请求失败: ' + res.status);
      return await res.json();
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw new Error(lastErr?.message || 'Overpass API 暂时不可用，请稍后再试');
}

/** 附近餐厅：范围内餐饮点，按距离排序；空结果时自动扩大范围重试。includeRawTags 为 true 时每项带 rawTags（OSM 原始标签） */
async function searchNearby(lat, lng, radiusMeters, includeRawTags) {
  let radius = Math.min(50000, Math.max(100, radiusMeters));
  const maxDistKm = radiusMeters / 1000;
  const amenityRegex = '^(restaurant|cafe|fast_food|bar|pub|food_court)$';
  const runQuery = async (r) => {
    const query = `
[out:json][timeout:20];
(
  node(around:${r},${lat},${lng})[amenity~"${amenityRegex}"];
  way(around:${r},${lat},${lng})[amenity~"${amenityRegex}"];
);
out body center;
    `.trim();
    const data = await overpassQuery(query);
    return data.elements || [];
  };

  let elements = await runQuery(radius);
  let useFallback = false;
  if (elements.length === 0 && radius < 10000) {
    elements = await runQuery(10000);
    useFallback = true;
  }
  if (elements.length === 0) {
    elements = await runQuery(50000);
    useFallback = true;
  }

  const list = [];
  for (const el of elements) {
    const pos = getLatLon(el);
    if (!pos) continue;
    const dist = haversineKm(lat, lng, pos.lat, pos.lon);
    if (!useFallback && dist > maxDistKm) continue;
    const name = el.tags?.name || el.tags?.brand || '未知';
    const cuisine = formatCuisine(el.tags);
    list.push({
      name,
      region: getRegionFromTags(el.tags),
      address: formatAddress(el.tags),
      distance: dist,
      cuisine: cuisine || undefined,
      lat: pos.lat,
      lon: pos.lon,
      ...(includeRawTags && { rawTags: el.tags || {} }),
    });
  }
  list.sort((a, b) => a.distance - b.distance);
  const out = list.slice(0, 15);
  await enrichAddresses(out);
  return out;
}

/** 菜系关键词 -> OSM cuisine 或名称匹配（用于按菜系筛选）*/
const CUISINE_MAP = {
  茶餐厅: ['cantonese', 'tea', '茶', '茶餐厅'],
  韩餐: ['korean', '韩', '韩国'],
  日料: ['japanese', '日', '日本', '寿司', '拉面'],
  西餐: ['european', 'italian', 'french', '西餐', '西式'],
  粤菜: ['cantonese', '粤', '广东'],
  川菜: ['sichuan', '川', '麻辣'],
  东南亚: ['thai', 'vietnamese', '泰', '越', '东南亚'],
  南亚: ['indian', '印度', '南亚'],
  火锅: ['hot_pot', '火锅', '火鍋'],
};

/** 按菜系搜索：大范围内取餐饮点，再按菜系关键词/OSM cuisine 筛选，按距离排序。includeRawTags 为 true 时每项带 rawTags */
async function searchByCuisine(cuisine, lat, lng, includeRawTags) {
  const radius = 50000;
  const amenityRegex = '^(restaurant|cafe|fast_food|bar|pub|food_court)$';
  const query = `
[out:json][timeout:25];
(
  node(around:${radius},${lat},${lng})[amenity~"${amenityRegex}"];
  way(around:${radius},${lat},${lng})[amenity~"${amenityRegex}"];
);
out body center;
  `.trim();

  const data = await overpassQuery(query);
  const elements = data.elements || [];
  const keywords = CUISINE_MAP[cuisine] ? CUISINE_MAP[cuisine].map((k) => String(k).toLowerCase()) : [];
  const list = [];
  for (const el of elements) {
    const pos = getLatLon(el);
    if (!pos) continue;
    const name = (el.tags?.name || el.tags?.brand || '').toLowerCase();
    const cuisineTag = (el.tags?.cuisine || '').toLowerCase();
    const displayName = el.tags?.name || el.tags?.brand || '未知';
    const match =
      keywords.length === 0 ||
      keywords.some((k) => name.includes(k) || cuisineTag.includes(k) || (displayName && displayName.toLowerCase().includes(k)));
    if (!match) continue;
    const cuisineStr = formatCuisine(el.tags) || cuisine;
    list.push({
      name: displayName,
      region: getRegionFromTags(el.tags),
      address: formatAddress(el.tags),
      distance: haversineKm(lat, lng, pos.lat, pos.lon),
      cuisine: cuisineStr,
      lat: pos.lat,
      lon: pos.lon,
      ...(includeRawTags && { rawTags: el.tags || {} }),
    });
  }
  list.sort((a, b) => a.distance - b.distance);
  const out = list.slice(0, 15);
  await enrichAddresses(out);
  return out;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const base = '/api/';
  if (!req.url.startsWith(base) || req.method !== 'GET') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not Found' }));
    return;
  }

  const path = req.url.slice(base.length).split('?')[0];
  const params = new URLSearchParams(req.url.split('?')[1] || '');

  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  try {
    if (path === 'nearby') {
      const lat = parseFloat(params.get('lat')) || MACAU_CENTER.lat;
      const lng = parseFloat(params.get('lng')) || MACAU_CENTER.lng;
      let radius = parseInt(params.get('radius'), 10) || 1000;
      const debug = params.get('debug') === '1';
      const list = await searchNearby(lat, lng, radius, debug);
      send(200, { list });
      return;
    }

    if (path === 'cuisine') {
      const cuisine = params.get('cuisine') || '餐厅';
      const lat = parseFloat(params.get('lat')) || MACAU_CENTER.lat;
      const lng = parseFloat(params.get('lng')) || MACAU_CENTER.lng;
      const debug = params.get('debug') === '1';
      const list = await searchByCuisine(cuisine, lat, lng, debug);
      send(200, { list });
      return;
    }

    send(404, { message: 'Not Found' });
  } catch (e) {
    console.error(e);
    send(500, { message: e.message || '服务器错误' });
  }
});

server.listen(PORT, () => {
  console.log(`今天吃啥 后端运行在 http://localhost:${PORT}（免费 OSM 数据，无需 API Key）`);
});
