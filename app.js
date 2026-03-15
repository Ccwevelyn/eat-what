// app.js - 今天吃啥 小程序入口（一打开即进入首页）
App({
  onLaunch() {
    try {
      wx.getSystemInfo({
        success: function(res) {
          if (res) getApp().globalData.systemInfo = res;
        },
        fail: function() {}
      });
      wx.reLaunch({ url: '/pages/index/index' });
    } catch (e) {
      console.error('app onLaunch', e);
    }
  },
  globalData: {
    userInfo: null,
    location: null,
    systemInfo: null
  }
});
