// pages/wheel/wheel.js
const app = getApp();
const api = require('../../utils/api.js');

// 菜系列表（可继续扩充）
const CUISINES = [
  { name: '茶餐厅' },
  { name: '韩餐' },
  { name: '日料' },
  { name: '西餐' },
  { name: '粤菜' },
  { name: '川菜' },
  { name: '东南亚' },
  { name: '南亚' },
  { name: '火锅' }
];

Page({
  data: {
    cuisines: CUISINES,
    wheelRotation: 0,
    spinning: false,
    selectedCuisine: '',
    restaurantList: []
  },

  onShow() {
    try {
      var tabBar = this.getTabBar && this.getTabBar();
      if (tabBar && typeof tabBar.setData === 'function') tabBar.setData({ selected: 1 });
    } catch (e) {}
  },

  onSpinTap() {
    if (this.data.spinning) return;
    const { cuisines } = this.data;
    const randomIndex = Math.floor(Math.random() * cuisines.length);
    const segmentAngle = 360 / cuisines.length;
    // 让指针指向所选菜系：中心在上方，所以目标角度 = 360 - 当前索引对应的中心角 + 多转几圈
    const targetAngle = 360 * 5 + (360 - randomIndex * segmentAngle - segmentAngle / 2);
    this.setData({
      spinning: true,
      wheelRotation: this.data.wheelRotation + targetAngle
    });

    setTimeout(() => {
      const selected = cuisines[randomIndex].name;
      this.setData({ spinning: false, selectedCuisine: selected });
      this.loadRestaurantsByCuisine(selected);
    }, 4000);
  },

  loadRestaurantsByCuisine(cuisine) {
    const location = app.globalData.location;
    const lat = location ? location.latitude : 22.1987;
    const lng = location ? location.longitude : 113.5439;

    wx.showLoading({ title: '加载餐厅…' });
    const fetchList = api.useRealApi()
      ? api.getRestaurantsByCuisine(cuisine, lat, lng)
      : api.getMockRestaurantsByCuisine(cuisine);
    fetchList.then(list => {
        wx.hideLoading();
        var withCuisine = (list || []).map(function (item) {
          return Object.assign({}, item, { cuisine: item.cuisine || cuisine });
        });
        this.setData({ restaurantList: withCuisine });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  }
});
