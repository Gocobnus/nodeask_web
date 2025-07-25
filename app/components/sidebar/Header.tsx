// 品牌头部组件
// 显示应用的品牌标识和名称，支持收起/展开状态

"use client";

import React from "react";
import { Button, Tooltip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { sidebarConfig } from "./sidebar-config";

// 简单的品牌图标组件
const BrandIcon = ({ className }: { className?: string }) => {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary ${className}`}>
      <span className="text-primary-foreground font-bold text-sm">N</span>
    </div>
  );
};

// 展开按钮图标组件
const ExpandIcon = () => (
  <Image
    src="/icons/sidebar/展开缩放按钮.svg"
    alt="展开"
    width={20}
    height={20}
    className="text-default-500"
  />
);

// 收起按钮图标组件（翻转的展开图标）
const CollapseIcon = () => (
  <Image
    src="/icons/sidebar/展开缩放按钮.svg"
    alt="收起"
    width={20}
    height={20}
    className="text-default-500 scale-x-[-1]"
  />
);

interface HeaderProps {
  isCompact?: boolean;
  onToggleCompact?: () => void;
  onExpand?: () => void;
}

export default function Header({ isCompact, onToggleCompact, onExpand }: HeaderProps) {
  if (isCompact) {
    // 收起状态：只显示展开按钮，和原来一样
    return (
      <div className={`${sidebarConfig.headerHeight} flex items-center justify-center px-2`}>
        <Button
          isIconOnly
          className="h-8 w-8 min-w-8"
          size="sm"
          variant="light"
          onPress={(e) => {
            // 点击后主动触发鼠标离开，隐藏 tooltip
            (e.target as HTMLElement).blur();
            onExpand?.();
          }}
        >
          <ExpandIcon />
        </Button>
      </div>
    );
  }

  // 展开状态：显示完整的品牌信息和收起按钮，文字从右侧滑入
  return (
    <div className={`${sidebarConfig.headerHeight} flex items-center justify-between px-2`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <BrandIcon />
        <AnimatePresence mode="wait">
          <motion.span
            key="brand-text"
            initial={{ opacity: 0, scale: 0.95, x: -5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: 0,
              transition: { 
                delay: sidebarConfig.animation.contentDelay,
                duration: sidebarConfig.animation.duration * 0.7,
                ease: sidebarConfig.animation.ease
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95,
              x: -5,
              transition: { 
                duration: sidebarConfig.animation.duration * 0.4,
                ease: sidebarConfig.animation.ease
              }
            }}
            className="text-base font-bold leading-6 text-foreground truncate"
          >
            NodeAsk
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1,
          scale: 1,
          transition: { 
            delay: sidebarConfig.animation.contentDelay + 0.05,
            duration: sidebarConfig.animation.duration * 0.6,
            ease: sidebarConfig.animation.ease
          }
        }}
        exit={{ 
          opacity: 0,
          scale: 0.8,
          transition: { 
            duration: sidebarConfig.animation.duration * 0.3,
            ease: sidebarConfig.animation.ease
          }
        }}
      >
        <Button
          isIconOnly
          className="h-6 w-6 min-w-6"
          size="sm"
          variant="light"
          onPress={onToggleCompact}
        >
          <CollapseIcon />
        </Button>
      </motion.div>
    </div>
  );
} 