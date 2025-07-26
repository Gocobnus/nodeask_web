// 侧边栏配置 - 统一管理所有间距和尺寸

export const sidebarConfig = {
  // 宽度设置
  expandedWidth: 'w-72',        // 288px
  compactWidth: 'w-16',         // 64px
  
  // 内边距设置
  containerPadding: 'px-2.5 py-6',  // 10px 左右，24px 上下
  compactPadding: 'px-2.5 py-6',    // 保持相同的左右padding，确保按钮居中
  
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