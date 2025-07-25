// 统一的侧边栏按钮组件
// 用于展开和收起状态的所有按钮，减少代码重复

"use client";

import React from "react";
import { Button, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { sidebarConfig } from "./sidebar-config";

interface SidebarButtonProps {
  icon: string;
  title: string;
  isSelected?: boolean;
  isCompact?: boolean;
  onClick: () => void;
  variant?: 'default' | 'primary';
  endContent?: React.ReactNode;
}

export default function SidebarButton({
  icon,
  title,
  isSelected = false,
  isCompact = false,
  onClick,
  variant = 'default',
  endContent
}: SidebarButtonProps) {
  const isPrimary = variant === 'primary';
  
  // 收起状态：只显示图标，完全按照原来的设计
  if (isCompact) {
    const button = (
      <button
        className={`
          ${sidebarConfig.navButtonWidth} 
          ${sidebarConfig.navButtonHeight} 
          flex justify-center items-center 
          ${sidebarConfig.roundedButton} 
          ${sidebarConfig.buttonTransition}
          ${isPrimary 
            ? 'bg-default-foreground text-default-50 hover:opacity-80' 
            : isSelected 
              ? 'bg-default-100 text-foreground' 
              : 'text-default-500 hover:bg-default-50'
          }
        `}
        onClick={onClick}
      >
        <Icon
          className={isPrimary ? "text-default-50" : (isSelected ? "text-foreground" : "text-default-500")}
          icon={icon}
          width={24}
        />
      </button>
    );

    return (
      <div className={sidebarConfig.centerAlign}>
        <Tooltip content={title} placement="right">
          {button}
        </Tooltip>
      </div>
    );
  }

  // 展开状态：显示图标和文本，按照原来的设计，只为文字添加动画
  if (isPrimary) {
    return (
      <Button
        fullWidth
        className={`${sidebarConfig.navButtonHeight} justify-start gap-3 bg-default-foreground px-3 py-[10px] text-default-50 overflow-hidden`}
        startContent={<Icon className="text-default-50" icon={icon} width={24} />}
        onClick={onClick}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key="button-text"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1,
              scale: 1,
              transition: { 
                delay: sidebarConfig.animation.contentDelay,
                duration: sidebarConfig.animation.duration * 0.7,
                ease: sidebarConfig.animation.ease
              }
            }}
            exit={{ 
              opacity: 0,
              scale: 0.95,
              transition: { 
                duration: sidebarConfig.animation.duration * 0.4,
                ease: sidebarConfig.animation.ease
              }
            }}
          >
            {title}
          </motion.span>
        </AnimatePresence>
      </Button>
    );
  }

  return (
    <button
      className={`
        flex w-full items-center justify-between px-3 
        ${sidebarConfig.roundedButton} 
        ${sidebarConfig.navButtonHeight} 
        text-left 
        ${sidebarConfig.buttonTransition}
        overflow-hidden
        ${isSelected 
          ? "bg-default-100 text-foreground" 
          : "text-default-500 hover:bg-default-50"
        }
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={isSelected ? "text-foreground" : "text-default-500"}
          icon={icon}
          width={24}
        />
        <AnimatePresence mode="wait">
          <motion.span
            key="button-text"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1,
              scale: 1,
              transition: { 
                delay: sidebarConfig.animation.contentDelay,
                duration: sidebarConfig.animation.duration * 0.7,
                ease: sidebarConfig.animation.ease
              }
            }}
            exit={{ 
              opacity: 0,
              scale: 0.95,
              transition: { 
                duration: sidebarConfig.animation.duration * 0.4,
                ease: sidebarConfig.animation.ease
              }
            }}
            className="text-small font-medium"
          >
            {title}
          </motion.span>
        </AnimatePresence>
      </div>
      {endContent && (
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
          {endContent}
        </motion.div>
      )}
    </button>
  );
} 