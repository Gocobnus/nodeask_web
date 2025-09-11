// Dashboard布局 - 包含侧边栏的页面布局
// 使用路由组确保侧边栏在相关页面间保持持久化，避免重新渲染

import Sidebar from "../components/sidebar/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {children}
      </main>
    </div>
  );
} 