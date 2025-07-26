// 主侧边栏容器组件
// 组合所有子组件，实现完整的侧边栏功能
"use client";

import React, { useState, useEffect } from "react";
import { Spacer, ScrollShadow } from "@heroui/react";
import Header from "./Header";
import CreateButton from "./CreateButton";
import Navigation from "./Navigation";
import UserProfile from "./UserProfile";
import { sidebarConfig } from "./sidebar-config";

export default function Sidebar() {
  const [isCompact, setIsCompact] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleCompact = () => {
    setIsCompact(!isCompact);
  };

  return (
    <div
      className={`nav relative flex h-full flex-col ${sidebarConfig.borderStyle} py-2 transition-all duration-200 ease-in-out`}
      data-expanded={isMounted ? !isCompact : true}
    >
      {/* 1. 头部区域 */}
      <Header isCompact={isCompact} onToggle={toggleCompact} />

      <Spacer y={8} />

      {/* 2. 创建按钮 */}
      <CreateButton isCompact={isCompact} />

      <Spacer y={6} />

      {/* 3. 导航区域 */}
      <ScrollShadow className={isCompact ? "flex-1 -mr-2 pr-2" : "flex-1 -mr-6 pr-6"}>
        <Navigation isCompact={isCompact} setIsCompact={setIsCompact} />
      </ScrollShadow>

      <Spacer y={8} />

      {/* 4. 用户信息区域 */}
      <UserProfile isCompact={isCompact} />
    </div>
  );
} 