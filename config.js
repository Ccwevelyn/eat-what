// config.js - 小程序配置（面向澳门发布，大家可用）
// 后端使用免费 OpenStreetMap 数据，无需任何 API Key、不收费

module.exports = {
  // 后端接口基础地址。部署好 server 并填这里后，小程序会用 OSM 免费数据查餐厅与距离
  API_BASE: 'https://eat-what-04zt.onrender.com/api',
  // 本地调试时可先填：'http://localhost:3000/api'（需在开发者工具勾选「不校验合法域名」）

  // 默认城市/区域（无定位时兜底，澳门）
  DEFAULT_LAT: 22.1987,
  DEFAULT_LNG: 113.5439,
  DEFAULT_CITY: '澳门'
};
