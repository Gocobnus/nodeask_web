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
  onToggle?: () => void;
}

export default function Header({ onToggle }: HeaderProps) {
  return (
    <div className={`${sidebarConfig.headerHeight} flex items-center justify-between px-2 transition-all duration-300 ease-in-out`}>
      <div className="flex items-center gap-2 min-w-0 flex-1 transition-all duration-300 ease-in-out">
        <BrandIcon />
        <span className="nav__heading-text text-base font-bold leading-6 text-foreground truncate transition-all duration-300 ease-in-out">
          NodeAsk
        </span>
      </div>
      
      <Button
        isIconOnly
        className="nav__toggle-btn h-6 w-6 min-w-6 transition-all duration-300 ease-in-out hover:scale-110"
        size="sm"
        variant="light"
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