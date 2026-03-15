// pages/wheel/wheel.js
const app = getApp();
const api = require('../../utils/api.js');
const i18n = require('../../utils/i18n.js');

const CUISINES = [
  { name: '茶餐厅' },
  { name: '韩餐' },
  { name: '日料' },
  { name: '西餐' },
  { name: '粤菜' },
  { name: '川菜' },
  { name: '东南亚' },
  { name: '南亚' },
  { name: '火锅' }
];

Page({
  data: {
    t: i18n.zh,
    lang: 'zh',
    cuisines: CUISINES,
    wheelRotation: 0,
    spinning: false,
    selectedCuisine: '',
    restaurantList: []
  },

  applyI18n() {
    var lang = app.globalData.lang || 'zh';
    var texts = i18n[lang] || i18n.zh;
    this.setData({ t: texts, lang: lang });
    wx.setNavigationBarTitle({ title: texts.appTitle || '今天吃啥' });
    var tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setData) {
      tabBar.setData({
        list: [
          { pagePath: '/pages/index/index', text: (i18n[lang] || i18n.zh).tabNearby, icon: 'circle' },
          { pagePath: '/pages/wheel/wheel', text: (i18n[lang] || i18n.zh).tabWheel, icon: 'triangle' },
          { pagePath: '/pages/about/about', text: (i18n[lang] || i18n.zh).tabAbout, icon: 'diamond' }
        ]
      });
    }
  },

  switchLang() {
    var next = app.globalData.lang === 'zh' ? 'en' : 'zh';
    app.globalData.lang = next;
    wx.setStorageSync('lang', next);
    this.applyI18n();
  },

  onShow() {
    try {
      this.applyI18n();
      var tabBar = this.getTabBar && this.getTabBar();
      if (tabBar && typeof tabBar.setData === 'function') tabBar.setData({ selected: 1 });
    } catch (e) {}
  },

  onSpinTap() {
    if (this.data.spinning) return;
    const { cuisines } = this.data;
    const randomIndex = Math.floor(Math.random() * cuisines.length);
    const segmentAngle = 360 / cuisines.length;
    // 让指针指向所选菜系：中心在上方，所以目标角度 = 360 - 当前索引对应的中心角 + 多转几圈
    const targetAngle = 360 * 5 + (360 - randomIndex * segmentAngle - segmentAngle / 2);
    this.setData({
      spinning: true,
      wheelRotation: this.data.wheelRotation + targetAngle
    });

    setTimeout(() => {
      const selected = cuisines[randomIndex].name;
      this.setData({ spinning: false, selectedCuisine: selected });
      this.loadRestaurantsByCuisine(selected);
    }, 4000);
  },

  loadRestaurantsByCuisine(cuisine) {
    const location = app.globalData.location;
    const lat = location ? location.latitude : 22.1987;
    const lng = location ? location.longitude : 113.5439;

    var t = this.data.t || i18n.zh;
    var lang = app.globalData.lang || 'zh';
    wx.showLoading({ title: lang === 'en' ? 'Loading…' : '加载餐厅…' });
    const fetchList = api.useRealApi()
      ? api.getRestaurantsByCuisine(cuisine, lat, lng)
      : api.getMockRestaurantsByCuisine(cuisine);
    var self = this;
    fetchList.then(list => {
        wx.hideLoading();
        var withCuisine = (list || []).map(function (item) {
          return Object.assign({}, item, { cuisine: item.cuisine || cuisine });
        });
        self.setData({ restaurantList: withCuisine });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: (self.data.t && self.data.t.toastFail) || '加载失败', icon: 'none' });
      });
  }
});
