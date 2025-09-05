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
    content: "夜深人静，万籁俱寂。窗外偶有微风拂过树叶，发出细微的沙沙声，像是夜的呼吸。此刻，白日里的喧嚣与纷扰皆已沉淀，心灵终于获得了一方宁静的天地。在这静谧之中，思绪如涓涓细流，悄然流淌，引人步入内心的深处。静夜具有一种神秘的力量，它剥离了白日的伪装与浮华，让人得以直面最真实的自己。当灯火阑珊，人声渐息，那些被日常琐事掩盖的情感与思考便悄然浮现。或许是未竟的梦想，或许是久违的回忆，又或是对未来的些许迷茫。静夜不评判，不催促，只是默默地容纳一切，给人以难得的自省之机。在这样的时刻，人往往能感受到一种超越日常的宁静与明晰。静坐窗前，仰望星空，宇宙的浩瀚与自身的渺小形成鲜明对比，却又奇妙地融为一体。这种体验并非孤独，而是一种与万物共鸣的联结感。夜的深沉让人放下执念，学会倾听内心的声音，从而寻得心灵的片刻栖息。静夜思，不仅是对过往的回顾，更是对未来的憧憬。它赋予人重新出发的勇气，因为在宁静中，人最能看清自己的方向。愿每个人都能在繁忙的生活中，留一方静夜给自己，让心灵在宁静中找到归途，让思绪在黑暗中绽放微光。夜深人静，万籁俱寂。窗外偶有微风拂过树叶，发出细微的沙沙声，像是夜的呼吸。此刻，白日里的喧嚣与纷扰皆已沉淀，心灵终于获得了一方宁静的天地。在这静谧之中，思绪如涓涓细流，悄然流淌，引人步入内心的深处。静夜具有一种神秘的力量，它剥离了白日的伪装与浮华，让人得以直面最真实的自己。当灯火阑珊，人声渐息，那些被日常琐事掩盖的情感与思考便悄然浮现。或许是未竟的梦想，或许是久违的回忆，又或是对未来的些许迷茫。静夜不评判，不催促，只是默默地容纳一切，给人以难得的自省之机。在这样的时刻，人往往能感受到一种超越日常的宁静与明晰。静坐窗前，仰望星空，宇宙的浩瀚与自身的渺小形成鲜明对比，却又奇妙地融为一体。这种体验并非孤独，而是一种与万物共鸣的联结感。夜的深沉让人放下执念，学会倾听内心的声音，从而寻得心灵的片刻栖息。静夜思，不仅是对过往的回顾，更是对未来的憧憬。它赋予人重新出发的勇气，因为在宁静中，人最能看清自己的方向。愿每个人都能在繁忙的生活中，留一方静夜给自己，让心灵在宁静中找到归途，让思绪在黑暗中绽放微光。"
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
        onFollowUp={() => console.log('点击了追问按钮')}
      />
    </div>
  );
} 