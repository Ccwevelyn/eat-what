// app.js - 今天吃啥 小程序入口
App({
  onLaunch() {
    // 可以在这里做全局初始化，如检查登录、获取系统信息等
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      }
    });
  },
  globalData: {
    userInfo: null,
    location: null,  // { latitude, longitude }
    systemInfo: null
  }
});
