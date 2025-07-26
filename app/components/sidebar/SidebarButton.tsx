// 统一的侧边栏按钮组件 - 使用demo中的单一DOM结构方法
"use client";

import React from "react";
import { Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { cn } from "@heroui/react";

interface SidebarButtonProps {
  icon: string;
  title: string;
  isSelected?: boolean;
  onClick: () => void;
  variant?: 'default' | 'primary';
  endContent?: React.ReactNode;
  isCompact?: boolean;
}

export default function SidebarButton({
  icon,
  title,
  isSelected = false,
  onClick,
  variant = 'default',
  endContent,
  isCompact = false
}: SidebarButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Tooltip content={title} placement="right" isDisabled={!isCompact}>
      <div
        className={cn(
          "nav__item-box flex items-center min-h-11 rounded-large cursor-pointer transition-all duration-300 ease-in-out w-full",
          isPrimary
            ? "bg-default-foreground text-default-50 hover:opacity-80"
            : isSelected
              ? "bg-default-100 text-foreground"
              : "text-default-500 hover:bg-default-50"
        )}
        onClick={onClick}
      >
        <span className="nav__item-icon flex-shrink-0 w-6 h-6 flex items-center justify-center">
          <Icon
            className={cn(
              "transition-all duration-300 ease-in-out",
              isPrimary ? "text-default-50" : (isSelected ? "text-foreground" : "text-default-500")
            )}
            icon={icon}
            width={24}
            height={24}
          />
        </span>
        <span className="nav__item-text text-base font-medium transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap flex-1">
          {title}
        </span>
        
        {endContent && (
          <span className="nav__item-badge transition-all duration-300 ease-in-out flex-shrink-0">
            {endContent}
          </span>
        )}
      </div>
    </Tooltip>
  );
} 