# 今天吃啥 - 后端（完全免费，无需 API Key）

本目录为 **可直接运行** 的后端：使用 **OpenStreetMap（Overpass API）** 查询餐厅，并用返回的经纬度计算距离。**不收费、无需申请任何 Key。**

## 1. 环境要求

- **Node.js 18+**（使用内置 `http` 与 `fetch`，无需安装额外依赖）

## 2. 本地运行

```bash
cd server
node index.js
```

服务会在 `http://localhost:3000` 启动。**无需设置环境变量。**

- **附近餐厅**：`GET /api/nearby?lat=22.19&lng=113.54&radius=1000`  
  返回该范围内餐厅（restaurant / cafe / fast_food），`distance` 由后端根据 OSM 返回的经纬度计算（公里）。
- **按菜系**：`GET /api/cuisine?cuisine=茶餐厅&lat=22.19&lng=113.54`  
  返回该菜系餐厅，按距离从近到远排序。

## 3. 部署到线上（供大家用、可发布）

将本后端部署到任意支持 Node 且可 **HTTPS** 访问的服务器（如腾讯云、阿里云、Railway、Render 等）。**无需配置 API Key 或环境变量。**

部署完成后：

1. 在小程序根目录 `config.js` 里把 `API_BASE` 改为 `https://你的域名.com/api`。
2. 在微信公众平台 **开发 → 开发管理 → 开发设置 → 服务器域名** 中，将该域名加入 **request 合法域名**。

数据来源： [OpenStreetMap](https://www.openstreetmap.org/)（© 贡献者），使用 [ODbL](https://www.openstreetmap.org/copyright) 许可。
