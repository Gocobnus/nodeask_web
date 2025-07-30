// 用户信息组件 - 使用单一DOM结构实现无缝切换
"use client";

import React, { useState } from "react";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Avatar } from "@heroui/react";
import { mockUser } from "../../lib/mock-data";
import { createActionHandler } from "../../lib/selection-utils";
import { SettingsIcon, LogoutIcon, OpenIcon } from "../icons";

// 下拉箭头图标
function AvatarDropdownIcon(props: React.ComponentProps<"svg">) {
  return (
    <div style={{ transform: 'rotate(90deg)' }}>
      <OpenIcon
        {...props}
        width={20}
        height={20}
      />
    </div>
  );
}

interface UserProfileProps {
  isCompact?: boolean;
}

export default function UserProfile({ isCompact = false }: UserProfileProps) {
  const [isSelected, setIsSelected] = useState(false);

  const handleAction = createActionHandler({
    settings: () => {
      setIsSelected(true);
    },
    logout: () => {
      setIsSelected(false);
    }
  });

  const handleButtonClick = () => {
    setIsSelected(true);
  };

  const handleDropdownOpen = () => {
    setIsSelected(true);
  };

  const handleDropdownClose = () => {
    // 下拉菜单关闭时，取消选中状态
    setIsSelected(false);
  };

  return (
    <div className="mt-auto mb-2">
      <Dropdown placement="top" onOpenChange={(isOpen) => {
        if (isOpen) {
          handleDropdownOpen();
        } else {
          handleDropdownClose();
        }
      }}>
        <DropdownTrigger>
          <Button
            fullWidth
            disableAnimation={isCompact}
            className={`sidebar__user-profile__container h-[44px] justify-start gap-3 rounded-[14px] border-1 border-default-300 bg-transparent px-2.5 py-[10px] transition-all duration-300 ease-in-out ${
              isSelected ? "selected" : ""
            }`}
            endContent={<AvatarDropdownIcon height={20} width={20} />}
            onPress={handleButtonClick}
          >
            <div className="flex w-full items-center gap-3">
              <Avatar size="sm" src={mockUser.avatar} className="sidebar__user-profile__avatar flex-shrink-0 w-6 h-6" />
              {!isCompact && (
                <div className="sidebar__user-profile__info flex flex-col text-left">
                  <p className="sidebar__user-profile__name text-base font-semibold leading-5 text-foreground transition-all duration-300 ease-in-out">
                    {mockUser.name}
                  </p>
                  <p className="sidebar__user-profile__email text-tiny text-default-400 transition-all duration-300 ease-in-out">
                    {mockUser.email}
                  </p>
                </div>
              )}
            </div>
          </Button>
        </DropdownTrigger>
        
        <DropdownMenu
          aria-label="用户菜单"
          className="sidebar__user-profile__dropdown__menu p-2"
          variant="faded"
          onAction={handleAction}
        >
          <DropdownItem key="profile" className="sidebar__user-profile__dropdown__item h-14 cursor-default data-[hover=true]:bg-secondary-50">
            <div className="flex w-full items-center gap-3">
              <Avatar size="sm" src={mockUser.avatar} />
              <div className="flex flex-col text-left">
                <p className="text-small font-normal leading-5 text-foreground">
                  {mockUser.name}
                </p>
                <p className="text-tiny text-default-400">
                  {mockUser.email}
                </p>
              </div>
            </div>
          </DropdownItem>
          
          <DropdownSection showDivider aria-label="用户操作" className="sidebar__user-profile__dropdown__section">
            <DropdownItem
              key="settings"
              className="sidebar__user-profile__dropdown__item py-[4px] text-default-500 data-[hover=true]:bg-secondary-50"
              startContent={
                <SettingsIcon
                  width={20}
                  height={20}
                  className="settings-icon"
                />
              }
            >
              设置
            </DropdownItem>
          </DropdownSection>
          
          <DropdownSection aria-label="账户操作" className="sidebar__user-profile__dropdown__section mb-0">
            <DropdownItem
              key="logout"
              className="sidebar__user-profile__dropdown__item pt-[4px] text-default-500 data-[hover=true]:bg-secondary-50"
              startContent={
                <LogoutIcon
                  width={20}
                  height={20}
                  className="logout-icon"
                />
              }
            >
              退出登录
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
} 