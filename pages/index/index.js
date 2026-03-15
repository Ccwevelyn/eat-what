// pages/index/index.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    hasLocation: false,
    locationAuthorized: false, // 是否已在系统设置中开启位置权限
    distance: 2,
    result: null
  },

  onLoad() {
    this.checkLocationStatus();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0 });
    this.checkLocationStatus();
  },

  /** 检查是否已开启位置权限、是否有位置数据 */
  checkLocationStatus() {
    wx.getSetting({
      success: (res) => {
        const auth = res.authSetting['scope.userLocation'];
        const hasLocation = !!app.globalData.location;
        this.setData({
          locationAuthorized: auth === true,
          hasLocation: hasLocation,
        });
        // 已授权但还没拿到坐标时，自动请求一次
        if (auth === true && !hasLocation) {
          this.requestLocation();
        }
      },
    });
  },

  requestLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        app.globalData.location = { latitude: res.latitude, longitude: res.longitude };
        this.setData({ hasLocation: true, locationAuthorized: true });
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
