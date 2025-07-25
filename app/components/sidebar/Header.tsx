// 品牌头部组件 - 移除动画版本
"use client";

import React from "react";
import { sidebarConfig } from "./sidebar-config";

const BrandIcon = ({ className }: { className?: string }) => {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary ${className}`}>
      <span className="text-primary-foreground font-bold text-sm">N</span>
    </div>
  );
};

interface HeaderProps {}

export default function Header({}: HeaderProps) {
  return (
    <div className={`${sidebarConfig.headerHeight} flex items-center justify-between px-2`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <BrandIcon />
        <span className="text-base font-bold leading-6 text-foreground truncate">
          NodeAsk
        </span>
      </div>
    </div>
  );
} 