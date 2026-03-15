// pages/about/about.js
const app = getApp();
const i18n = require('../../utils/i18n.js');

Page({
  data: { t: i18n.zh, lang: 'zh' },
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
  onLoad() {},
  onShow() {
    try {
      this.applyI18n();
      var tabBar = this.getTabBar && this.getTabBar();
      if (tabBar && typeof tabBar.setData === 'function') tabBar.setData({ selected: 2 });
    } catch (e) {}
  }
});
