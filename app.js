// app.js - 今天吃啥 小程序入口
App({
  onLaunch() {
    try {
      var lang = wx.getStorageSync('lang') || 'zh';
      this.globalData.lang = lang;
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
    systemInfo: null,
    lang: 'zh'
  }
});
