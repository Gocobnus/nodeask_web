// 用户信息组件 - 使用单一DOM结构实现无缝切换
"use client";

import React from "react";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Avatar } from "@heroui/react";
import Image from "next/image";
import { mockUser } from "../../lib/mock-data";
import { createActionHandler } from "../../lib/selection-utils";

// 下拉箭头图标
function AvatarDropdownIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 3L14 7H6L10 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface UserProfileProps {
  isCompact?: boolean;
}

export default function UserProfile({ isCompact = false }: UserProfileProps) {
  const handleAction = createActionHandler({
    settings: () => console.log("打开设置"),
    logout: () => console.log("退出登录")
  });

  return (
    <div className="mt-auto mb-2">
      <Dropdown placement="top">
        <DropdownTrigger>
          <Button
            fullWidth
            disableAnimation={isCompact}
            className="sidebar__user-profile__container h-[44px] justify-start gap-3 rounded-[14px] border-1 border-default-300 bg-transparent px-2.5 py-[10px] transition-all duration-300 ease-in-out"
            endContent={<AvatarDropdownIcon height={20} width={20} />}
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
          variant="flat"
          onAction={handleAction}
        >
          <DropdownItem key="profile" className="sidebar__user-profile__dropdown__item h-14 cursor-default">
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
              className="sidebar__user-profile__dropdown__item py-[4px] text-default-500"
              startContent={
                <Image
                  src="/icons/sidebar/settings.svg"
                  alt="设置"
                  width={16}
                  height={16}
                  className="text-default-300"
                />
              }
            >
              设置
            </DropdownItem>
          </DropdownSection>
          
          <DropdownSection aria-label="账户操作" className="sidebar__user-profile__dropdown__section mb-0">
            <DropdownItem
              key="logout"
              className="sidebar__user-profile__dropdown__item pt-[4px] text-default-500"
              startContent={
                <Image
                  src="/icons/sidebar/logout.svg"
                  alt="退出登录"
                  width={16}
                  height={16}
                  className="text-default-300"
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