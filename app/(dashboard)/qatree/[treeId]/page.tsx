'use client';

import { mockQATrees } from "../../../lib/mock-data";
import { notFound } from "next/navigation";
import { AnswerCard } from "../../../components/card/acard";
import { QuestionCard } from "../../../components/card/qcard"; // Import QuestionCard
import { use, useEffect, useState } from "react";

interface QATreePageProps {
  params: Promise<{
    treeId: string;
  }>;
}

export default function QATreePage({ params }: QATreePageProps) {
  const { treeId } = use(params);
  const [isMounted, setIsMounted] = useState(false);
  const [isAnswerCardSelected, setIsAnswerCardSelected] = useState(false);
  const [isQuestionCardSelected, setIsQuestionCardSelected] = useState(true);

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
    title: "什么是React的useState Hook？什么是React的useState Hook？什么是React的useState Hook？什么是React的useState Hook？",
    content: "夜深人静，万籁俱寂。窗外偶有微风拂过树叶，发出细微的沙沙声，像"
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
    <div 
      className="flex items-start justify-center min-h-screen p-6 pt-[15vh] gap-4"
      onClick={() => {
        setIsAnswerCardSelected(false);
        setIsQuestionCardSelected(false);
      }}
    >
      <AnswerCard
        title={mockCardData.title}
        content={mockCardData.content}
        isGenerating={true}
        isCompleted={true}
        isSelected={isAnswerCardSelected}
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
        onClick={() => setIsAnswerCardSelected(true)}
        onLocate={() => setIsAnswerCardSelected(true)}
        onDelete={() => console.log('删除回答卡片')}
        onFollowUp={() => console.log('点击了追问按钮')}
      />
      <QuestionCard 
        question="如何创建node应用"
        avatar="https://i.pravatar.cc/150?u=zhangsan" // Using a public asset for the avatar
        isSelected={isQuestionCardSelected}
        onClick={() => setIsQuestionCardSelected(true)}
        onCopy={() => console.log('Question copied')}
        onDelete={() => console.log('删除问题卡片')}
      />
    </div>
  );
}