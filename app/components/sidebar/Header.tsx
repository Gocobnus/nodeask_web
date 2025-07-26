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
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="nav__toggle-icon transition-transform duration-300 ease-in-out"
        >
          <path d="M11 14L3 14" stroke="#AE7EDE" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M11 18H3" stroke="#AE7EDE" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M18.875 14.1183C20.5288 15.0732 21.3558 15.5506 21.4772 16.2394C21.5076 16.4118 21.5076 16.5881 21.4772 16.7604C21.3558 17.4492 20.5288 17.9266 18.875 18.8815C17.2212 19.8363 16.3942 20.3137 15.737 20.0745C15.5725 20.0147 15.4199 19.9265 15.2858 19.814C14.75 19.3644 14.75 18.4096 14.75 16.4999C14.75 14.5902 14.75 13.6354 15.2858 13.1858C15.4199 13.0733 15.5725 12.9852 15.737 12.9253C16.3942 12.6861 17.2212 13.1635 18.875 14.1183Z" stroke="#AE7EDE" strokeWidth="1.5"/>
          <path d="M3 6L13.5 6M20 6L17.75 6" stroke="#AE7EDE" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M20 10L9.5 10M3 10H5.25" stroke="#AE7EDE" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </Button>
    </div>
  );
} 