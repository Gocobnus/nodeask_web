// 统一的侧边栏按钮组件 - 移除动画版本
"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { sidebarConfig } from "./sidebar-config";

interface SidebarButtonProps {
  icon: string;
  title: string;
  isSelected?: boolean;
  onClick: () => void;
  variant?: 'default' | 'primary';
  endContent?: React.ReactNode;
}

export default function SidebarButton({
  icon,
  title,
  isSelected = false,
  onClick,
  variant = 'default',
  endContent
}: SidebarButtonProps) {
  const isPrimary = variant === 'primary';

  if (isPrimary) {
    return (
      <Button
        fullWidth
        className={`${sidebarConfig.navButtonHeight} justify-start gap-3 bg-default-foreground px-3 py-[10px] text-default-50 overflow-hidden`}
        startContent={
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            <Icon className="text-default-50" icon={icon} width={24} />
          </div>
        }
        onClick={onClick}
      >
        <span className="text-small font-medium">
          {title}
        </span>
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
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          <Icon
            className={isSelected ? "text-foreground" : "text-default-500"}
            icon={icon}
            width={24}
          />
        </div>
        <span className="text-small font-medium">
          {title}
        </span>
      </div>
      {endContent && (
        <div>{endContent}</div>
      )}
    </button>
  );
} 