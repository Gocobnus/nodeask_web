// 统一的侧边栏按钮组件 - 使用demo中的单一DOM结构方法
"use client";

import React from "react";
import { Tooltip } from "@heroui/react";
import { cn } from "@heroui/react";
import {
  HomeIcon,
  CreateIcon,
  DiscoverIcon,
  MyGraphsIcon,
  ExpandCollapseIcon,
  MoreIcon,
  DropdownIcon,
  SettingsIcon,
  LogoutIcon,
  RenameIcon,
  DeleteIcon
} from "../icons";

interface SidebarButtonProps {
  icon: string;
  title: string;
  isSelected?: boolean;
  onClick: () => void;
  variant?: 'default' | 'primary';
  endContent?: React.ReactNode;
  isCompact?: boolean;
  type?: 'default' | 'create-button' | 'navigation-item';
}

export default function SidebarButton({
  icon,
  title,
  isSelected = false,
  onClick,
  variant = 'default',
  endContent,
  isCompact = false,
  type = 'default'
}: SidebarButtonProps) {
  const isPrimary = variant === 'primary';

  // 根据type确定使用的类名
  const getContainerClass = () => {
    switch (type) {
      case 'create-button':
        return 'sidebar__create-button__container';
      case 'navigation-item':
        return 'sidebar__navigation__item__container';
      default:
        return 'sidebar__button__container';
    }
  };

  const getTextClass = () => {
    switch (type) {
      case 'create-button':
        return 'sidebar__create-button__text';
      case 'navigation-item':
        return 'sidebar__navigation__item__text';
      default:
        return 'sidebar__button__text';
    }
  };

  const getIconClass = () => {
    switch (type) {
      case 'create-button':
        return 'sidebar__create-button__icon';
      case 'navigation-item':
        return 'sidebar__navigation__item__icon';
      default:
        return 'sidebar__button__icon';
    }
  };

  const getBadgeClass = () => {
    switch (type) {
      case 'create-button':
        return 'sidebar__create-button__icon';
      case 'navigation-item':
        return 'sidebar__navigation__item__icon';
      default:
        return 'sidebar__navigation__item__icon';
    }
  };

  // 根据icon路径获取对应的图标组件
  const getIconComponent = () => {
    switch (icon) {
      case "/icons/sidebar/home.svg":
        return HomeIcon;
      case "/icons/sidebar/create.svg":
        return CreateIcon;
      case "/icons/sidebar/discover.svg":
        return DiscoverIcon;
      case "/icons/sidebar/my-tree.svg":
        return MyGraphsIcon;
      case "/icons/sidebar/expand-collapse.svg":
        return ExpandCollapseIcon;
      case "/icons/sidebar/more.svg":
        return MoreIcon;
      case "/icons/sidebar/dropdown.svg":
        return DropdownIcon;
      case "/icons/sidebar/settings.svg":
        return SettingsIcon;
      case "/icons/sidebar/logout.svg":
        return LogoutIcon;
      case "/icons/sidebar/rename.svg":
        return RenameIcon;
      case "/icons/sidebar/delete.svg":
        return DeleteIcon;
      default:
        return null;
    }
  };

  const IconComponent = getIconComponent();

  return (
    <Tooltip 
      content={title} 
      placement="right" 
      isDisabled={!isCompact}
      offset={4}
      classNames={{
        content: "bg-[#F9F9F9] text-[#666666]"
      }}
    >
      <div
        className={cn(
          `${getContainerClass()} flex items-center min-h-11 rounded-large cursor-pointer transition-all duration-300 ease-in-out w-full`,
          isPrimary
            ? "create-button"
            : isSelected
              ? "selected"
              : ""
        )}
        onClick={onClick}
      >
        <span className={`${getIconClass()} flex-shrink-0 w-6 h-6 flex items-center justify-center`}>
          {IconComponent && (
            <IconComponent
              width={24}
              height={24}
              className={cn(
                "transition-all duration-300 ease-in-out",
              )}
            />
          )}
        </span>
        <span className={`${getTextClass()} text-base font-medium transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap flex-1`}>
          {title}
        </span>
        
        {endContent && (
          <span className={`${getBadgeClass()} transition-all duration-300 ease-in-out flex-shrink-0`}>
            {endContent}
          </span>
        )}
      </div>
    </Tooltip>
  );
} 