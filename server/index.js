/**
 * 今天吃啥 - 后端（全高德）
 * 高德周边搜索 POI：附近餐厅 + 按菜系关键词搜索，一次请求即带名称与地址，内地+澳门可用。
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const AMAP_PLACE_AROUND_URL = 'https://restapi.amap.com/v3/place/around';
const AMAP_KEY = process.env.AMAP_KEY || '';

const MACAU_CENTER = { lat: 22.1987, lng: 113.5439 };

/** Haversine 公式：两点经纬度求距离（公里），用于 GCJ02 坐标 */
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

/** 高德周边搜索（location 为 GCJ02 经度,纬度） */
async function amapPlaceAround(lng, lat, radiusMeters, keywords) {
  if (!AMAP_KEY) return [];
  try {
    const params = new URLSearchParams({
      key: AMAP_KEY,
      location: `${lng},${lat}`,
      radius: String(Math.min(50000, Math.max(100, radiusMeters))),
      sortrule: 'distance',
      offset: '25',
      page: '1',
      types: '050000',
    });
    if (keywords) params.set('keywords', keywords);
    const res = await fetch(`${AMAP_PLACE_AROUND_URL}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== '1' || !Array.isArray(data.pois)) return [];
    return data.pois;
  } catch (e) {
    console.error(e);
    return [];
  }
}

/** 将高德 POI 转为前端所需格式 */
function mapPoisToResult(pois, centerLat, centerLng) {
  return pois.slice(0, 15).map((p) => {
    let distKm = 0;
    if (p.location) {
      const [plng, plat] = p.location.split(',').map(Number);
      if (!isNaN(plat) && !isNaN(plng)) distKm = haversineKm(centerLat, centerLng, plat, plng);
    }
    if (distKm === 0 && p.distance) distKm = Number(p.distance) / 1000;
    return {
      name: p.name || '未知',
      region: p.adname || p.cityname || p.pname || '',
      address: p.address || '',
      distance: distKm,
      cuisine: undefined,
    };
  });
}

/** 附近餐厅：高德周边搜索，types=餐饮 */
async function searchNearby(lat, lng, radiusMeters) {
  const pois = await amapPlaceAround(lng, lat, radiusMeters, '');
  return mapPoisToResult(pois, lat, lng);
}

/** 菜系关键词（高德 keywords 用） */
const CUISINE_KEYWORDS = {
  茶餐厅: '茶餐厅',
  韩餐: '韩国料理',
  日料: '日本料理',
  西餐: '西餐',
  粤菜: '粤菜',
  川菜: '川菜',
  东南亚: '东南亚',
  南亚: '印度',
  火锅: '火锅',
};

/** 按菜系搜索：高德周边搜索 + keywords */
async function searchByCuisine(cuisine, lat, lng) {
  const keywords = CUISINE_KEYWORDS[cuisine] || cuisine;
  const pois = await amapPlaceAround(lng, lat, 10000, keywords);
  return mapPoisToResult(pois, lat, lng);
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
      const radius = parseInt(params.get('radius'), 10) || 1000;
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
  console.log(`今天吃啥 后端运行在 http://localhost:${PORT}（全高德 POI，需配置 AMAP_KEY）`);
});
