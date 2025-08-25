// 知识图谱详情页面
// 动态路由页面，根据treeId显示对应图谱的问答界面
// 现在在dashboard路由组中，侧边栏保持持久化
"use client";

import { mockQATrees } from "../../../lib/mock-data";
import { notFound } from "next/navigation";
import { AnswerCard } from "../../../components/card/acard";
import { use, useEffect, useState } from "react";

interface QATreePageProps {
  params: Promise<{
    treeId: string;
  }>;
}

export default function QATreePage({ params }: QATreePageProps) {
  const { treeId } = use(params);
  const [isMounted, setIsMounted] = useState(false);
  
  // 避免水合错误
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 根据treeId查找对应的图谱数据
  const qaTree = mockQATrees.find(tree => tree.id === treeId);
  
  // 如果图谱不存在，返回404页面
  if (!qaTree) {
    notFound();
  }

  // 创建临时模拟数据用于展示卡片效果
  const mockCardData = {
    title: "什么是React的useState Hook？",
    content: "React的useState Hook是一个函数，允许你在函数组件中添加state。它返回一个数组，包含当前状态值和一个可以更新状态的函数。\n\n例如：\n```javascript\nconst [count, setCount] = useState(0);\n```\n\n这里count是状态值，setCount是更新函数，0是初始值。"
  };

  // 在客户端挂载前不渲染QACard组件
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        {/* 加载占位 */}
        <div className="w-[420px] h-[500px] bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* QACard组件展示 */}
      <AnswerCard
        title={mockCardData.title}
        content={mockCardData.content}
        isGenerating={false}
        isCompleted={true}
        onPause={() => console.log('暂停回答')}
        onCollapse={() => console.log('收起卡片')}
        onExpand={() => console.log('展开更多')}
        onCopy={() => console.log('复制内容')}
      />
    </div>
  );
} 