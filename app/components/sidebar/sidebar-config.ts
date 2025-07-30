// 侧边栏配置 - 统一管理所有间距和尺寸

export const sidebarConfig = {
  // 通用样式
  borderStyle: 'border-r border-default-200',  // 改为更浅的颜色，几乎看不见
  headerHe1ght: 'h-16',         // 64px (Header固定高度)
} as const;

// 类型定义
export type SidebarConfig = typeof sidebarConfig; 