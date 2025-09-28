import Sidebar from "../components/sidebar/Sidebar";
import { QATreeProvider } from "../context/QATreeContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QATreeProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto relative">
          {children}
        </main>
      </div>
    </QATreeProvider>
  );
}
