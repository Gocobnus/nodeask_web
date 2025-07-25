// 主侧边栏容器组件
// 组合所有子组件，实现完整的侧边栏功能

"use client";

import React from "react";
import { Spacer, ScrollShadow } from "@heroui/react";
import BrandHeader from "./BrandHeader";
import CreateQATreeButton from "./CreateQATreeButton";
import MainNavigation from "./MainNavigation";
import UserProfile from "./UserProfile";

export default function Sidebar() {
  return (
    <div className="relative flex h-full w-72 flex-1 flex-col border-r border-divider p-6">
      {/* 1. 品牌区域 */}
      <BrandHeader />

      <Spacer y={8} />

      {/* 2. 创建知识图谱按钮 - 来自sidebar-with-chat-history */}
      <CreateQATreeButton />

      {/* 3. 主导航选项 - 集成了可折叠的知识图谱列表 */}
      <ScrollShadow className="flex-1 -mr-6 pr-6">
        <MainNavigation />
      </ScrollShadow>

      <Spacer y={8} />

      {/* 4. 用户信息区域 - 来自sidebar-with-chat-history，放在底部 */}
      <UserProfile />
    </div>
  );
} 