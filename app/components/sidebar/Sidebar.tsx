// 主侧边栏容器组件
// 组合所有子组件，实现完整的侧边栏功能，支持收起/展开状态

"use client";

import React, { useState } from "react";
import { Spacer, ScrollShadow } from "@heroui/react";
import Header from "./Header";
import CreateButton from "./CreateButton";
import Navigation from "./Navigation";
import UserProfile from "./UserProfile";
import { sidebarConfig } from "./sidebar-config";

export default function Sidebar() {
  const [isCompact, setIsCompact] = useState(false);

  const toggleCompact = () => {
    setIsCompact(!isCompact);
  };

  const handleExpandFromCompact = () => {
    setIsCompact(false);
  };

  const scrollShadowClass = isCompact
    ? "flex-1 -mr-2 pr-2"
    : "flex-1 -mr-6 pr-6";

  return (
    <div
      className={`relative flex h-full flex-col ${sidebarConfig.borderStyle} py-6 transition-all duration-300 ease-out ${
        isCompact 
          ? `${sidebarConfig.compactWidth} ${sidebarConfig.compactPadding}`
          : `${sidebarConfig.expandedWidth} ${sidebarConfig.containerPadding}`
      }`}
    >
      {/* 1. 头部区域 */}
      <Header 
        isCompact={isCompact}
        onToggleCompact={toggleCompact}
        onExpand={handleExpandFromCompact} 
      />

      <Spacer y={8} />

      {/* 2. 创建按钮 */}
      <CreateButton isCompact={isCompact} />

      <Spacer y={6} />

      {/* 3. 导航区域 */}
      <ScrollShadow className={scrollShadowClass}>
        <Navigation 
          isCompact={isCompact}
          onExpandRequest={handleExpandFromCompact} 
        />
      </ScrollShadow>

      <Spacer y={8} />

      {/* 4. 用户信息区域 */}
      <UserProfile isCompact={isCompact} />
    </div>
  );
} 