// app.js - 今天吃啥 小程序入口（直接进入主页，无登录页）
App({
  onLaunch() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      }
    });
  },
  globalData: {
    userInfo: null,
    location: null,
    systemInfo: null
  }
});
