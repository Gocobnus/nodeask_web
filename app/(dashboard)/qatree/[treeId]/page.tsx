// 知识图谱详情页面
// 动态路由页面，根据treeId显示对应图谱的问答界面
// 现在在dashboard路由组中，侧边栏保持持久化

import { mockQATrees } from "../../../lib/mock-data";
import { notFound } from "next/navigation";

interface QATreePageProps {
  params: Promise<{
    treeId: string;
  }>;
}

// 预生成静态参数，提升性能
export async function generateStaticParams() {
  return mockQATrees.map((tree) => ({
    treeId: tree.id,
  }));
}

export default async function QATreePage({ params }: QATreePageProps) {
  const { treeId } = await params;
  
  // 根据treeId查找对应的图谱数据
  const qaTree = mockQATrees.find(tree => tree.id === treeId);
  
  // 如果图谱不存在，返回404页面
  if (!qaTree) {
    notFound();
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-4xl">
        {/* 图谱标题区域 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            {qaTree.name}
          </h1>
          <p className="text-default-500 text-lg">
            {qaTree.description}
          </p>
        </div>
        
        {/* 问答界面区域 */}
        <div className="bg-content1 rounded-large p-6 shadow-small">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              在此图谱中开始问答
            </h2>
            <div className="text-default-500">
              <p>• 创建时间: {qaTree.createdAt.toLocaleDateString()}</p>
              <p>• 最后更新: {qaTree.updatedAt.toLocaleDateString()}</p>
            </div>
          </div>
          
          {/* 这里将来可以集成问答组件 */}
          <div className="border-2 border-dashed border-default-200 rounded-large p-8 text-center">
            <p className="text-default-400">
              问答界面组件将在这里实现
            </p>
            <p className="text-small text-default-300 mt-2">
              当前图谱ID: {treeId}
            </p>
            <p className="text-small text-success mt-1">
              ✨ 侧边栏现在保持持久化，切换更流畅！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 