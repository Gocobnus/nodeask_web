// 侧边栏配置 - 统一管理所有间距和尺寸
// 修改这里的值会同时影响展开和收起状态

export const sidebarConfig = {
  // 宽度设置 (保留类名用于兼容)
  expandedWidth: 'w-72',        // 288px
  compactWidth: 'w-16',         // 64px
  
  // 数值尺寸 (用于动画)
  sizes: {
    expandedWidth: 288,         // 288px
    compactWidth: 64,           // 64px
    expandedPadding: 24,        // 24px
    compactPadding: 8,          // 8px
  },
  
  // 动画配置
  animation: {
    duration: 0.3,              // 300ms 动画持续时间
    ease: "easeOut",            // 更流畅的缓动函数
    staggerDelay: 0.02,         // 减少交错延迟，更快响应
    contentDelay: 0.08,         // 减少内容延迟，更快显示
    
    // 抽屉式动画专用配置
    drawer: {
      slideDistance: 20,        // 滑动距离
      fadeOpacity: 0,           // 淡出透明度
      scaleStart: 0.95,         // 缩放起始值
    }
  },
  
  // 内边距设置
  containerPadding: 'p-6',      // 24px 全方向（展开状态）
  compactPadding: 'px-2 py-6',  // 8px 左右，24px 上下（收起状态）
  
  // 按钮尺寸
  navButtonHeight: 'h-11',      // 44px (统一的导航按钮高度)
  navButtonWidth: 'w-11',       // 44px (收起状态按钮宽度)
  headerHeight: 'h-16',         // 64px (Header固定高度)
  
  // 通用样式
  borderStyle: 'border-r border-divider',
  centerAlign: 'flex justify-center',
  buttonTransition: 'transition-colors',
  roundedButton: 'rounded-lg',
  
  // 导航间距
  navigationSpacing: 'mb-6 space-y-1',
} as const;

// 类型定义
export type SidebarConfig = typeof sidebarConfig; 