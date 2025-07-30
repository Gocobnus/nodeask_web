// 创建知识图谱按钮组件
// 点击后直接跳转到首页开始新的问答对话，系统会自动创建新图谱

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import SidebarButton from "./SidebarButton";

interface CreateButtonProps {
  isCompact?: boolean;
  onNavigate?: () => void;
}

export default function CreateButton({ isCompact, onNavigate }: CreateButtonProps) {
  const router = useRouter();
  const handleCreateQATree = () => {
    // 通知父组件重置选中状态
    if (onNavigate) {
      onNavigate();
    }
    // 直接跳转到首页开始新的问答对话
    router.push("/");
  };

  return (
    <SidebarButton
      icon="/icons/sidebar/create.svg"
      title="创建图谱"
      isCompact={isCompact}
      onClick={handleCreateQATree}
      variant="primary"
      type="create-button"
    />
  );
} 
