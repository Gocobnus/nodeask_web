// 主导航组件
// 基于basic-sidebar的Sidebar组件实现，简化版本用于主要导航项

"use client";

import React from "react";
import { Listbox, ListboxItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter, usePathname } from "next/navigation";
import { mockMainNavItems } from "../../lib/mock-data";
import { createSelectionHandler } from "../../lib/selection-utils";

export default function MainNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  
  // 根据当前路径确定选中的导航项
  const getSelectedKey = () => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/discover")) return "discover";
    if (pathname.startsWith("/qatree-list")) return "qatree-list";
    return "home";
  };

  const handleSelectionChange = createSelectionHandler((selectedKey: string) => {
    const navItem = mockMainNavItems.find(item => item.key === selectedKey);
    if (navItem?.href) {
      router.push(navItem.href);
    }
  });

  return (
    <Listbox
      aria-label="主导航"
      className="mb-6"
      classNames={{
        list: "items-center",
      }}
      color="default"
      itemClasses={{
        base: "px-3 min-h-11 rounded-large h-[44px] data-[selected=true]:bg-default-100",
        title: "text-small font-medium text-default-500 group-data-[selected=true]:text-foreground",
      }}
      selectedKeys={[getSelectedKey()]}
      selectionMode="single"
      variant="flat"
      onSelectionChange={handleSelectionChange}
    >
      {mockMainNavItems.map((item) => (
        <ListboxItem
          key={item.key}
          startContent={
            <Icon
              className="text-default-500 group-data-[selected=true]:text-foreground"
              icon={item.icon}
              width={24}
            />
          }
          textValue={item.title}
        >
          {item.title}
        </ListboxItem>
      ))}
    </Listbox>
  );
} 