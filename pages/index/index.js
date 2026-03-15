// pages/index/index.js
const app = getApp();
const api = require('../../utils/api.js');
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    t: i18n.zh,
    lang: 'zh',
    hasLocation: false,
    locationAuthorized: false,
    locationLabel: '',
    locationCoords: '',
    distance: 2,
    result: null
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

  /** 根据经纬度判断大致在珠海还是澳门（仅用于显示） */
  getLocationLabel(lat, lng) {
    if (lat == null || lng == null) return '';
    if (lat >= 22.14 && lat <= 22.22 && lng >= 113.52 && lng <= 113.60) return '澳门';
    if (lat >= 22.0 && lat <= 22.6 && lng >= 113.0 && lng <= 114.0) return '珠海';
    return '当前定位';
  },

  onLoad() {
    try {
      this.applyI18n();
      this.checkLocationStatus();
    } catch (e) {
      console.error('index onLoad', e);
    }
  },

  onShow() {
    try {
      this.applyI18n();
      var tabBar = this.getTabBar && this.getTabBar();
      if (tabBar && typeof tabBar.setData === 'function') tabBar.setData({ selected: 0 });
      this.checkLocationStatus();
    } catch (e) {
      console.error('index onShow', e);
    }
  },

  /** 检查是否已开启位置权限、是否有位置数据 */
  checkLocationStatus() {
    try {
      wx.getSetting({
        success: (res) => {
          if (!res || !res.authSetting) return;
          var auth = res.authSetting['scope.userLocation'];
          var loc = app && app.globalData && app.globalData.location;
          var hasLocation = !!loc;
          var label = hasLocation ? this.getLocationLabel(loc.latitude, loc.longitude) : '';
          var coords = hasLocation ? (loc.latitude.toFixed(4) + ', ' + loc.longitude.toFixed(4)) : '';
          this.setData({
            locationAuthorized: auth === true,
            hasLocation: hasLocation,
            locationLabel: label,
            locationCoords: coords,
          });
          if (auth === true && !hasLocation) this.requestLocation();
        },
        fail: function() {}
      });
    } catch (e) {
      console.error('checkLocationStatus', e);
    }
  },

  requestLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        app.globalData.location = { latitude: res.latitude, longitude: res.longitude };
        var label = this.getLocationLabel(res.latitude, res.longitude);
        var coords = res.latitude.toFixed(4) + ', ' + res.longitude.toFixed(4);
        this.setData({ hasLocation: true, locationAuthorized: true, locationLabel: label, locationCoords: coords });
        wx.showToast({ title: (this.data.t && this.data.t.toastLocSuccess) || '定位成功', icon: 'success' });
      },
      fail: (err) => {
        var t = this.data.t || i18n.zh;
        wx.showModal({
          title: app.globalData.lang === 'en' ? 'Location required' : '需要位置权限',
          content: app.globalData.lang === 'en' ? 'Please allow location in Settings to recommend nearby restaurants.' : '请在设置中允许「今天吃啥」使用您的位置，以便推荐附近餐厅。',
          confirmText: '去设置',
          success(res) {
            if (res.confirm) wx.openSetting();
          }
        });
      }
    });
  },

  onDistanceChange(e) {
    const raw = parseFloat(e.detail.value);
    this.setData({ distance: Math.round(raw * 10) / 10 });
  },

  onRandomTap() {
    const { distance } = this.data;
    const radiusMeters = Math.round(distance * 1000);
    var location = app.globalData.location;

    if (!location) {
      wx.showToast({ title: (this.data.t && this.data.t.toastPleaseLocation) || '请先开启定位', icon: 'none' });
      return;
    }

    var t = this.data.t || i18n.zh;
    wx.showLoading({ title: t.toastDrawing || '抽签中…' });

    var self = this;
    function doFetch(lat, lng) {
      if (!lat || !lng) return Promise.reject(new Error('请先开启定位'));
      return api.useRealApi()
        ? api.getNearbyRestaurants(lat, lng, radiusMeters)
        : api.getMockNearbyRestaurants(parseFloat(distance));
    }

    function runWithLocation() {
      var loc = app.globalData.location;
      if (!loc) {
        wx.hideLoading();
        wx.showToast({ title: (self.data.t && self.data.t.toastPleaseLocation) || '请先开启定位', icon: 'none' });
        return;
      }
      var t = self.data.t || i18n.zh;
      doFetch(loc.latitude, loc.longitude)
        .then(function (list) {
          wx.hideLoading();
          if (!list || list.length === 0) {
            wx.showToast({ title: t.toastNoRestaurant || '该范围内暂无餐厅', icon: 'none' });
            return;
          }
          var valid = list.filter(function (item) { return item.name && item.name !== '未知'; });
          if (valid.length === 0) {
            wx.showToast({ title: t.toastNoRestaurant || '该范围内暂无餐厅', icon: 'none' });
            return;
          }
          var randomIndex = Math.floor(Math.random() * valid.length);
          var result = valid[randomIndex];
          self.setData({ result: result });
          wx.showToast({ title: t.toastDone || '选好啦', icon: 'success' });
        })
        .catch(function () {
          wx.hideLoading();
          wx.showToast({ title: t.toastFail || '获取失败，请稍后再试', icon: 'none' });
        });
    }

    wx.getLocation({
      type: 'gcj02',
      success: function (res) {
        app.globalData.location = { latitude: res.latitude, longitude: res.longitude };
        var label = self.getLocationLabel(res.latitude, res.longitude);
        var coords = res.latitude.toFixed(4) + ', ' + res.longitude.toFixed(4);
        self.setData({ locationLabel: label, locationCoords: coords });
        runWithLocation();
      },
      fail: function () {
        runWithLocation();
      }
    });
  }
});
