# 今天吃啥 / Eat What

> 微信小程序：用定位 + 随机/转盘，帮你决定今天吃啥。内地与澳门均可使用，支持中英切换。

---

## 功能

- **附近随机**：开启定位 → 选择 1–5 km 范围 → 随机推荐一家餐厅，显示详细地址（高德 POI）
- **菜系转盘**：九格转盘（茶餐厅 / 韩餐 / 日料 / 西餐 / 粤菜 / 川菜 / 东南亚 / 南亚 / 火锅），转出菜系后列出该菜系附近餐厅
- **声明页**：数据来源、非营利说明、鸣谢、免责、联系邮箱
- **中 / EN**：右上角语言切换，声明页与主要文案支持中英对照

---

## 技术栈

| 端     | 说明 |
|--------|------|
| 小程序 | 微信小程序原生（WXML / WXSS / JS），自定义 TabBar |
| 后端   | Node.js，**高德周边搜索** POI（餐厅列表与地址一体，内地+澳门） |
| 部署   | 后端可部署至 [Render](https://render.com/) 等，小程序在微信公众平台发布 |

---

## 项目结构

```
EatWhat/
├── app.js, app.json, app.wxss
├── config.js                 # API_BASE、默认经纬度
├── utils/
│   ├── api.js                # 附近 / 菜系接口封装
│   └── i18n.js               # 中英文案
├── server/                   # 后端（需部署）
│   ├── index.js              # /api/nearby、/api/cuisine，高德周边搜索 POI
│   └── package.json
├── custom-tab-bar/           # 底部导航
└── pages/
    ├── index/                # 附近随机
    ├── wheel/                # 菜系转盘
    └── about/                # 声明（中英）
```

---

## 快速开始

### 1. 克隆并打开项目

```bash
git clone https://github.com/Ccwevelyn/eat-what.git
```

用 **微信开发者工具** 打开项目目录，填入自己的 AppID（或使用测试号）。

### 2. 配置后端

- 在 **微信公众平台** 将后端域名加入 **request 合法域名**。
- 根目录 `config.js` 中设置 **API_BASE** 为你的后端地址，例如：
  - `https://你的服务.onrender.com/api`

### 3. 后端部署（含高德 Key）

- 部署 `server/` 到任意 Node 环境（如 Render：Root Directory 填 `server`，Start Command 填 `node index.js`）。
- 餐厅与地址均来自 **高德 Web 服务**，需在后端环境变量中配置 **AMAP_KEY**（[高德开放平台](https://lbs.amap.com/) 申请 Web 服务 Key）。

### 4. 真机预览与发布

- **预览**：开发者工具 → 预览 → 手机扫码（建议先删除手机端旧版再扫，避免缓存）。
- **发布**：开发者工具 → 上传 → 公众平台「版本管理」中选为体验版或提交审核发布。

---

## 配置说明

| 配置项    | 说明 |
|-----------|------|
| `config.API_BASE` | 后端接口基础地址，如 `https://xxx.onrender.com/api` |
| 后端 `AMAP_KEY`   | 高德 Web 服务 Key，用于周边搜索 POI（餐厅+地址，内地+澳门） |

未配置 `AMAP_KEY` 时，接口返回空列表。

---

## 常见问题

- **手机上是旧版？** 删除手机微信中的该小程序后，重新扫「预览」二维码；若用体验版，需先上传新代码并设为体验版。
- **模拟器里只有澳门餐厅？** 开发者工具中把「模拟位置」改为当前城市（如珠海）再试。
- **转盘格数**：当前为 9 格，修改需同步改 `pages/wheel/wheel.js`、`wheel.wxml`、`wheel.wxss` 中的分段与角度。

---

## 致谢与联系

- 数据： [高德开放平台](https://lbs.amap.com/) 周边搜索 POI
- 特别鸣谢：陈小姐 / Ava（灵感来源）
- 联系：ccwevelyncambridge@outlook.com
