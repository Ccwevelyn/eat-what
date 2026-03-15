// pages/about/about.js
Page({
  data: {},
  onLoad() {},
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 2 });
  }
});
