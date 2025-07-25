// 创建知识图谱按钮组件
// 点击后直接跳转到首页开始新的问答对话，系统会自动创建新图谱

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import SidebarButton from "./SidebarButton";

export default function CreateButton() {
  const router = useRouter();

  const handleCreateQATree = () => {
    // 直接跳转到首页开始新的问答对话
    router.push("/");
  };

  return (
    <SidebarButton
      icon="solar:add-circle-linear"
      title="创建图谱"
      onClick={handleCreateQATree}
      variant="primary"
    />
  );
} 