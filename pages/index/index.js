// pages/index/index.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    hasLocation: false,
    distance: 1,
    result: null
  },

  onLoad() {
    if (app.globalData.location) {
      this.setData({ hasLocation: true });
    }
  },

  requestLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        app.globalData.location = { latitude: res.latitude, longitude: res.longitude };
        this.setData({ hasLocation: true });
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
    const distance = e.detail.value;
    this.setData({ distance });
  },

  onRandomTap() {
    const { distance } = this.data;
    const radiusMeters = Math.round(distance * 1000);
    const location = app.globalData.location;

    if (!location) {
      wx.showToast({ title: '请先开启定位', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '抽签中…' });

    const fetchList = api.useRealApi()
      ? api.getNearbyRestaurants(location.latitude, location.longitude, radiusMeters)
      : api.getMockNearbyRestaurants(parseFloat(distance));

    fetchList.then(list => {
        wx.hideLoading();
        if (!list || list.length === 0) {
          wx.showToast({ title: '该范围内暂无餐厅', icon: 'none' });
          return;
        }
        const randomIndex = Math.floor(Math.random() * list.length);
        const result = list[randomIndex];
        this.setData({ result });
        wx.showToast({ title: '选好啦', icon: 'success' });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '获取失败，请稍后再试', icon: 'none' });
      });
  }
});
