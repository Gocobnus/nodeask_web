// 主侧边栏容器组件
// 组合所有子组件，实现完整的侧边栏功能

"use client";

import React from "react";
import { Spacer, ScrollShadow } from "@heroui/react";
import Header from "./Header";
import CreateButton from "./CreateButton";
import Navigation from "./Navigation";
import UserProfile from "./UserProfile";
import { sidebarConfig } from "./sidebar-config";

export default function Sidebar() {
  return (
    <div
      className={`relative flex h-full flex-col ${sidebarConfig.borderStyle} py-6 ${sidebarConfig.expandedWidth} ${sidebarConfig.containerPadding}`}
    >
      {/* 1. 头部区域 */}
      <Header />

      <Spacer y={8} />

      {/* 2. 创建按钮 */}
      <CreateButton />

      <Spacer y={6} />

      {/* 3. 导航区域 */}
      <ScrollShadow className="flex-1 -mr-6 pr-6">
        <Navigation />
      </ScrollShadow>

      <Spacer y={8} />

      {/* 4. 用户信息区域 */}
      <UserProfile />
    </div>
  );
} 