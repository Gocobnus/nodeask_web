// 统一的侧边栏按钮组件 - 使用demo中的单一DOM结构方法
"use client";

import React from "react";
import { Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { cn } from "@heroui/react";
import Image from "next/image";
import DiscoverIcon from "../../../public/icons/sidebar/discover.svg";

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
  const isLocalIcon = icon.startsWith('/');

  return (
    <Tooltip content={title} placement="right" isDisabled={!isCompact}>
      <div
        className={cn(
          "nav__item-box flex items-center min-h-11 rounded-large cursor-pointer transition-all duration-300 ease-in-out w-full",
          isPrimary
            ? "create-button text-default-50 hover:opacity-80"
            : isSelected
              ? "bg-default-100 text-foreground"
              : "text-default-500"
        )}
        onClick={onClick}
      >
        <span className="nav__item-icon flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {icon === "/icons/sidebar/discover.svg" ? (
            <DiscoverIcon
              width={24}
              height={24}
              className={cn(
                "transition-all duration-300 ease-in-out",
                isPrimary ? "text-default-50" : (isSelected ? "text-foreground" : "text-default-500")
              )}
            />
          ) : isLocalIcon ? (
            <Image
              src={icon}
              alt={title}
              width={24}
              height={24}
              className="transition-all duration-300 ease-in-out"
            />
          ) : (
            <Icon
              className={cn(
                "transition-all duration-300 ease-in-out",
                isPrimary ? "text-default-50" : (isSelected ? "text-foreground" : "text-default-500")
              )}
              icon={icon}
              width={24}
              height={24}
            />
          )}
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