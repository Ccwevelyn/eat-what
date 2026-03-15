// pages/about/about.js
Page({
  data: {},
  onLoad() {},
  onShow() {
    try {
      var tabBar = this.getTabBar && this.getTabBar();
      if (tabBar && typeof tabBar.setData === 'function') tabBar.setData({ selected: 2 });
    } catch (e) {}
  }
});
