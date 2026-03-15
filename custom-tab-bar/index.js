Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '附近随机', icon: 'circle' },
      { pagePath: '/pages/wheel/wheel', text: '菜系转盘', icon: 'triangle' },
      { pagePath: '/pages/about/about', text: '声明', icon: 'diamond' }
    ]
  },
  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path;
      wx.switchTab({ url: path });
    }
  }
});
