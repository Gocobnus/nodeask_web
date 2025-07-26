// 品牌头部组件 - 使用demo中的单一DOM结构方法
"use client";

import React from "react";
import { Button } from "@heroui/react";
import Image from "next/image";
import { sidebarConfig } from "./sidebar-config";

const BrandIcon = ({ className }: { className?: string }) => {
  return (
    <div className={`nav__logo flex h-8 w-8 items-center justify-center rounded-full bg-primary transition-all duration-300 ease-in-out ${className}`}>
      <span className="text-primary-foreground font-bold text-sm">N</span>
    </div>
  );
};

interface HeaderProps {
  isCompact?: boolean;
  onToggle?: () => void;
}

export default function Header({ isCompact = false, onToggle }: HeaderProps) {
  return (
    <div className={`${sidebarConfig.headerHeight} flex items-center justify-between transition-all duration-300 ease-in-out`}>
      <div className={`flex items-center min-w-0 transition-all duration-300 ease-in-out ${
        isCompact ? 'w-0 overflow-hidden flex-none gap-0' : 'flex-1 gap-2'
      }`}>
        <BrandIcon />
        <span className="nav__heading-text text-lg font-bold leading-6 text-foreground truncate transition-all duration-300 ease-in-out">
          NodeAsk
        </span>
      </div>
      
      <Button
        isIconOnly
        className="nav__toggle-btn h-11 w-11 min-w-11 min-h-11 transition-all duration-300 ease-in-out"
        size="sm"
        variant="light"
        disableAnimation
        onPress={onToggle}
      >
        <Image
          src="/icons/sidebar/展开缩放按钮.svg"
          alt="收起"
          width={24}
          height={24}
          className="nav__toggle-icon text-default-500 transition-transform duration-300 ease-in-out"
        />
      </Button>
    </div>
  );
} 