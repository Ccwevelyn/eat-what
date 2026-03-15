// pages/index/index.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    hasLocation: false,
    locationAuthorized: false,
    locationLabel: '', // 当前定位：珠海 / 澳门，用于核对
    distance: 2,
    result: null
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
      this.checkLocationStatus();
    } catch (e) {
      console.error('index onLoad', e);
    }
  },

  onShow() {
    try {
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
          this.setData({
            locationAuthorized: auth === true,
            hasLocation: hasLocation,
            locationLabel: label,
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
        this.setData({ hasLocation: true, locationAuthorized: true, locationLabel: label });
        wx.showToast({ title: '定位成功', icon: 'success' });
      },
      fail: (err) => {
        wx.showModal({
          title: '需要位置权限',
          content: '请在设置中允许「今天吃啥」使用您的位置，以便推荐附近餐厅。',
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
      wx.showToast({ title: '请先开启定位', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '抽签中…' });

    var self = this;
    function doFetch() {
      var loc = app.globalData.location;
      if (!loc) return Promise.reject(new Error('请先开启定位'));
      return api.useRealApi()
        ? api.getNearbyRestaurants(loc.latitude, loc.longitude, radiusMeters)
        : api.getMockNearbyRestaurants(parseFloat(distance));
    }

    doFetch();

    fetchList.then(list => {
        wx.hideLoading();
        if (!list || list.length === 0) {
          wx.showToast({ title: '该范围内暂无餐厅', icon: 'none' });
          return;
        }
        var valid = list.filter(function (item) { return item.name && item.name !== '未知'; });
        if (valid.length === 0) {
          wx.showToast({ title: '该范围内暂无餐厅', icon: 'none' });
          return;
        }
        var randomIndex = Math.floor(Math.random() * valid.length);
        var result = valid[randomIndex];
        this.setData({ result: result });
        wx.showToast({ title: '选好啦', icon: 'success' });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '获取失败，请稍后再试', icon: 'none' });
      });
  }
});
