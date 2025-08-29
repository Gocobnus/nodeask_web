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
  const [isSelected, setIsSelected] = useState(false);
  
  // 避免水合错误
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 处理外部点击取消选中
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 如果点击的不是卡片内部，则取消选中
      if (!target.closest('.acard__background-card')) {
        setIsSelected(false);
      }
    };

    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelected]);
  
  // 根据treeId查找对应的图谱数据
  const qaTree = mockQATrees.find(tree => tree.id === treeId);
  
  // 如果图谱不存在，返回404页面
  if (!qaTree) {
    notFound();
  }

  // 创建临时模拟数据用于展示卡片效果
  const mockCardData = {
    title: "什么是React的useState Hook？什么是React的useState Hook？什么是React的useState Hook？什么是React的useState Hook？",
    content: "React的useState HoReact的useStateReact的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useStateReact的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState React的useState HoReact的useState "
  };

  // 在客户端挂载前不渲染QACard组件
  if (!isMounted) {
    return (
      <div className="flex items-start justify-center min-h-screen p-6 pt-[15vh]">
        {/* 加载占位 */}
        <div className="w-[380px] h-[452px] bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center min-h-screen p-6 pt-[15vh]">
      <AnswerCard
        title={mockCardData.title}
        content={mockCardData.content}
        isGenerating={true}
        isCompleted={true}
        isSelected={isSelected}
        onPause={() => console.log('暂停回答')}
        onCollapse={() => console.log('收起卡片')}
        onExpand={() => console.log('展开更多')}
        onCopy={async () => {
          try {
            await navigator.clipboard.writeText(mockCardData.content);
            console.log('内容已复制到剪贴板');
          } catch (err) {
            console.error('复制失败:', err);
          }
        }}
        onClick={() => setIsSelected(true)}
        onDelete={() => console.log('删除卡片')}
      />
    </div>
  );
} 