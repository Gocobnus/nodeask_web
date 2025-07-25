// 创建知识图谱按钮组件
// 点击后直接跳转到首页开始新的问答对话，系统会自动创建新图谱

"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

export default function CreateQATreeButton() {
  const router = useRouter();

  const handleCreateQATree = () => {
    // 直接跳转到首页开始新的问答对话
    router.push("/");
  };

  return (
    <Button
      fullWidth
      className="mb-6 mt-2 h-[44px] justify-start gap-3 bg-default-foreground px-3 py-[10px] text-default-50"
      startContent={
        <Icon className="text-default-50" icon="solar:add-circle-linear" width={24} />
      }
      onClick={handleCreateQATree}
    >
      创建图谱
    </Button>
  );
} 