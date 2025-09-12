// 品牌头部组件 - 使用demo中的单一DOM结构方法
"use client";

import React from "react";
import { ExpandCollapseIcon } from "../icons";

const BrandIcon = ({ className }: { className?: string }) => {
  return (
    <div className={`sidebar__header__logo flex h-8 w-8 items-center justify-center rounded-full bg-primary transition-all duration-300 ease-in-out ${className}`}>
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
    <div className={`flex items-center justify-between transition-all duration-300 ease-in-out`}>
      <div className={`flex items-center min-w-0 transition-all duration-300 ease-in-out ${
        isCompact ? 'w-0 overflow-hidden flex-none gap-0' : 'flex-1 gap-2'
      }`}>
        <BrandIcon />
        <span className="sidebar__header__title text-lg font-bold leading-6 text-foreground truncate transition-all duration-300 ease-in-out">
          NodeAsk
        </span>
      </div>
      
      <button
        type="button"
        className="sidebar__header__toggle h-11 w-11 min-w-11 min-h-11 transition-all duration-300 ease-in-out flex items-center justify-center"
        onClick={onToggle}
      >
        <ExpandCollapseIcon 
          width={24} 
          height={24}
          className="sidebar__header__toggle-icon transition-transform duration-300 ease-in-out"
        />
      </button>
    </div>
  );
} 