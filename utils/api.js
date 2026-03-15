// utils/api.js - 封装请求（餐厅、地图等）
// 后端使用免费 OpenStreetMap（Overpass API）获取餐厅，并用返回的经纬度计算距离
const config = require('../config.js');

/** 是否已配置真实后端（未配置则用模拟数据） */
function useRealApi() {
  const base = config.API_BASE || '';
  return base && !base.includes('你的') && (base.startsWith('http://') || base.startsWith('https://'));
}

/**
 * 获取用户位置附近的餐厅（通过你的后端调用 Google Places API）
 * @param {number} lat 纬度
 * @param {number} lng 经度
 * @param {number} radiusMeters 半径（米），如 500、1000、2000
 * @returns {Promise<Array>} 餐厅列表
 */
function getNearbyRestaurants(lat, lng, radiusMeters) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.API_BASE}/nearby`,
      method: 'GET',
      data: { lat, lng, radius: radiusMeters },
      success(res) {
        if (res.statusCode === 200) {
          const list = (res.data && res.data.list) ? res.data.list : [];
          resolve(Array.isArray(list) ? list : []);
        } else {
          reject(new Error(res.data?.message || '获取餐厅失败'));
        }
      },
      fail: (err) => reject(err || new Error('网络请求失败'))
    });
  });
}

/**
 * 按菜系获取餐厅（从近到远）
 * @param {string} cuisine 菜系关键词
 * @param {number} lat 纬度
 * @param {number} lng 经度
 */
function getRestaurantsByCuisine(cuisine, lat, lng) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.API_BASE}/cuisine`,
      method: 'GET',
      data: { cuisine, lat, lng },
      success(res) {
        if (res.statusCode === 200) {
          const list = (res.data && res.data.list) ? res.data.list : [];
          resolve(Array.isArray(list) ? list : []);
        } else {
          reject(new Error(res.data?.message || '获取餐厅失败'));
        }
      },
      fail: (err) => reject(err || new Error('网络请求失败'))
    });
  });
}

/**
 * 模拟数据（当后端未部署时，用于界面演示）
 */
function getMockNearbyRestaurants(radiusKm) {
  const mockList = [
    { name: '大利来记猪扒包', address: '氹仔 巴波沙总督街 18 号', distance: 0.3, cuisine: '茶餐厅' },
    { name: '黄枝记', address: '本岛 议事亭前地 17 号', distance: 0.8, cuisine: '粤菜' },
    { name: '玛嘉烈蛋挞', address: '本岛 马统领街 17 号', distance: 1.2, cuisine: '茶餐厅' },
    { name: '陈光记烧腊', address: '本岛 罗保博士街 19 号', distance: 1.5, cuisine: '粤菜' },
    { name: '义顺牛奶', address: '本岛 新马路 381 号', distance: 1.8, cuisine: '茶餐厅' },
    { name: '新武二', address: '氹仔 官也街 23 号', distance: 2.5, cuisine: '日料' },
    { name: '船屋', address: '本岛 妈阁河边新街 289 号', distance: 3.2, cuisine: '西餐' },
    { name: '龙华茶楼', address: '本岛 提督市北街 3 号', distance: 4.1, cuisine: '粤菜' }
  ].filter(p => p.distance <= radiusKm);
  if (mockList.length === 0) {
    return Promise.resolve([{ name: '模拟餐厅', address: '本岛 某街 1 号', distance: radiusKm, cuisine: '粤菜' }]);
  }
  return Promise.resolve(mockList);
}

function getMockRestaurantsByCuisine(cuisine) {
  const names = {
    '茶餐厅': ['喜莲咖啡', '南屏雅叙', '新鸿发'],
    '韩餐': ['汉拿山', '姜虎东', '本家'],
    '日料': ['江户日本料理', '和庭', '金坂极'],
    '西餐': ['Robuchon', '8½', 'Antonio'],
    '粤菜': ['永利轩', '誉珑轩', '陶陶居'],
    '川菜': ['蜀道', '麻辣诱惑', '川小馆'],
    '东南亚': ['金利丰', '暹罗象', '越南河']
  };
  const areas = ['本岛', '氹仔'];
  const streets = ['官也街', '新马路', '议事亭前地', '巴波沙总督街', '罗保博士街', '马统领街', '提督市北街', '妈阁街'];
  const list = (names[cuisine] || ['随机餐厅']).map((name, i) => ({
    name,
    address: areas[i % 2] + ' ' + streets[i % streets.length] + ' ' + (i + 1) + ' 号',
    distance: (i + 1) * 0.5,
    cuisine: cuisine
  }));
  return Promise.resolve(list);
}

module.exports = {
  getNearbyRestaurants,
  getRestaurantsByCuisine,
  getMockNearbyRestaurants,
  getMockRestaurantsByCuisine,
  useRealApi,
};
