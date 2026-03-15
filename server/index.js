/**
 * 今天吃啥 - 后端（完全免费，无需 API Key）
 * 使用 OpenStreetMap Overpass API 获取餐厅，用返回的经纬度计算距离。
 * 面向澳门发布；数据来自 OSM，不收费。
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
// 多个 Overpass 节点，一个超时或 504 时自动换下一个
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_TIMEOUT_MS = 25000;

// 澳门大致中心，用于无 location 时的兜底
const MACAU_CENTER = { lat: 22.1987, lng: 113.5439 };

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

/** 从 tags 拼地址 */
function formatAddress(tags) {
  if (!tags) return '澳门';
  const a = tags['addr:full'] || tags['addr:street'];
  if (a) {
    const num = tags['addr:housenumber'];
    return num ? `${a} ${num}` : a;
  }
  return tags['addr:street'] || '澳门';
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

/** 附近餐厅：范围内餐饮点，按距离排序 */
async function searchNearby(lat, lng, radiusMeters) {
  const radius = Math.min(50000, Math.max(100, radiusMeters));
  const query = `
[out:json][timeout:15];
(
  node(around:${radius},${lat},${lng})[amenity~"^(restaurant|cafe|fast_food)$"];
  way(around:${radius},${lat},${lng})[amenity~"^(restaurant|cafe|fast_food)$"];
);
out body center;
  `.trim();

  const data = await overpassQuery(query);
  const elements = data.elements || [];
  const list = [];
  for (const el of elements) {
    const pos = getLatLon(el);
    if (!pos) continue;
    const name = el.tags?.name || el.tags?.brand || '未知';
    list.push({
      name,
      address: formatAddress(el.tags),
      distance: haversineKm(lat, lng, pos.lat, pos.lon),
    });
  }
  list.sort((a, b) => a.distance - b.distance);
  return list;
}

/** 菜系关键词 -> OSM cuisine 或名称匹配（用于按菜系筛选）*/
const CUISINE_MAP = {
  茶餐厅: ['cantonese', 'tea', '茶', '茶餐厅'],
  韩餐: ['korean', '韩', '韩国'],
  日料: ['japanese', '日', '日本', '寿司', '拉面'],
  西餐: ['european', 'italian', 'french', '西餐', '西式'],
  粤菜: ['cantonese', '粤', '广东'],
  川菜: ['sichuan', '川', '麻辣'],
  东南亚: ['thai', 'vietnamese', 'indian', '泰', '越', '东南亚'],
  火锅: ['hot_pot', '火锅', '火鍋'],
};

/** 按菜系搜索：大范围内取餐饮点，再按菜系关键词/OSM cuisine 筛选，按距离排序 */
async function searchByCuisine(cuisine, lat, lng) {
  const radius = 50000;
  const query = `
[out:json][timeout:20];
(
  node(around:${radius},${lat},${lng})[amenity~"^(restaurant|cafe|fast_food)$"];
  way(around:${radius},${lat},${lng})[amenity~"^(restaurant|cafe|fast_food)$"];
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
    list.push({
      name: displayName,
      address: formatAddress(el.tags),
      distance: haversineKm(lat, lng, pos.lat, pos.lon),
    });
  }
  list.sort((a, b) => a.distance - b.distance);
  return list.slice(0, 30);
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
      const list = await searchNearby(lat, lng, radius);
      send(200, { list });
      return;
    }

    if (path === 'cuisine') {
      const cuisine = params.get('cuisine') || '餐厅';
      const lat = parseFloat(params.get('lat')) || MACAU_CENTER.lat;
      const lng = parseFloat(params.get('lng')) || MACAU_CENTER.lng;
      const list = await searchByCuisine(cuisine, lat, lng);
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
