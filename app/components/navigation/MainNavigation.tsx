// 主导航组件
// 基于basic-sidebar的Sidebar组件实现，集成可折叠的知识图谱树形结构

"use client";

import React, { useState } from "react";
import { 
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter, usePathname } from "next/navigation";
import { mockMainNavItems, mockQATrees } from "../../lib/mock-data";
import { createActionHandler } from "../../lib/selection-utils";

// 知识图谱操作下拉菜单组件
function QATreeDropdown({ treeId }: { treeId: string }) {
  const handleAction = createActionHandler({
    rename: () => console.log("重命名知识图谱:", treeId),
    delete: () => console.log("删除知识图谱:", treeId)
  });

  return (
    <Dropdown>
      <DropdownTrigger>
        <Icon
          className="text-default-500 opacity-0 group-hover:opacity-100"
          icon="solar:menu-dots-bold"
          width={24}
        />
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="知识图谱操作" 
        className="py-2" 
        variant="faded"
        onAction={handleAction}
      >
        <DropdownItem
          key="rename"
          className="text-default-500 data-[hover=true]:text-default-500"
          startContent={
            <Icon 
              className="text-default-300" 
              height={20} 
              icon="solar:pen-linear" 
              width={20} 
            />
          }
        >
          重命名
        </DropdownItem>
        <DropdownItem
          key="delete"
          className="text-danger-500 data-[hover=true]:text-danger-500"
          color="danger"
          startContent={
            <Icon
              className="text-danger-500"
              height={20}
              icon="solar:trash-bin-minimalistic-linear"
              width={20}
            />
          }
        >
          删除
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

// 导航项组件
function NavItem({ 
  icon, 
  title, 
  isSelected, 
  onClick, 
  endContent 
}: {
  icon: string;
  title: string;
  isSelected: boolean;
  onClick: () => void;
  endContent?: React.ReactNode;
}) {
  return (
    <button
      className={`flex w-full items-center justify-between px-3 py-2 min-h-11 rounded-large h-[44px] text-left transition-colors ${
        isSelected 
          ? "bg-default-100 text-foreground" 
          : "text-default-500 hover:bg-default-50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={isSelected ? "text-foreground" : "text-default-500"}
          icon={icon}
          width={24}
        />
        <span className="text-small font-medium">
          {title}
        </span>
      </div>
      {endContent}
    </button>
  );
}

// 知识图谱子项组件
function QATreeItem({ 
  tree, 
  isSelected, 
  onClick 
}: {
  tree: typeof mockQATrees[0];
  isSelected: boolean;
  onClick: () => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    // 阻止点击下拉菜单时触发选中事件
    if ((e.target as Element).closest('[data-dropdown-trigger]')) {
      return;
    }
    onClick();
  };

  return (
    <div className="group relative">
      {/* 连接线 - 只保留一条线，不要连接点 */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-default-200 -translate-x-0.5"></div>
      
      <div className="ml-6 pl-6">
        <div
          className={`flex w-full items-center justify-between px-3 py-2 min-h-11 rounded-large h-[44px] cursor-pointer transition-colors ${
            isSelected 
              ? "bg-default-100 text-foreground" 
              : "text-default-500 hover:bg-default-50"
          }`}
          onClick={handleClick}
        >
          <span className="text-small font-medium truncate pr-2 leading-5">
            {tree.name}
          </span>
          <div data-dropdown-trigger>
            <QATreeDropdown treeId={tree.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MainNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  
  // 我的图谱折叠状态，默认展开
  const [isQATreeExpanded, setIsQATreeExpanded] = useState(true);
  // 手动选中"我的图谱"的状态
  const [isQATreeManuallySelected, setIsQATreeManuallySelected] = useState(false);
  
  // 获取当前图谱ID（从路径中提取）
  const getCurrentTreeId = () => {
    if (pathname.startsWith("/qatree/")) {
      return pathname.split("/")[2]; // 提取treeId
    }
    return null;
  };
  
  // 根据当前路径确定选中的主导航项
  const getSelectedKey = () => {
    if (pathname === "/") {
      // 如果在首页但手动选中了"我的图谱"，则高亮"我的图谱"
      return isQATreeManuallySelected ? "qatree-list" : "home";
    }
    if (pathname.startsWith("/discover")) {
      // 如果在发现页但手动选中了"我的图谱"，则高亮"我的图谱"
      return isQATreeManuallySelected ? "qatree-list" : "discover";
    }
    if (pathname.startsWith("/qatree/")) return "qatree-list"; // 图谱页面时高亮"我的图谱"
    return "home";
  };

  const handleNavItemClick = (key: string, href?: string) => {
    // 点击其他导航项时，清除"我的图谱"的手动选中状态
    setIsQATreeManuallySelected(false);
    
    if (href) {
      router.push(href);
    }
  };

  // 处理"我的图谱"按钮点击 - 只负责展开/折叠，并设置选中状态
  const handleQATreeToggle = () => {
    setIsQATreeExpanded(!isQATreeExpanded);
    // 点击"我的图谱"时，设置为手动选中状态
    setIsQATreeManuallySelected(true);
  };

  const handleQATreeClick = (treeId: string) => {
    // 跳转到图谱页面时，清除手动选中状态（因为URL会变为/qatree/xxx）
    setIsQATreeManuallySelected(false);
    // 跳转到对应的图谱页面
    router.push(`/qatree/${treeId}`);
  };

  const selectedKey = getSelectedKey();
  const currentTreeId = getCurrentTreeId();

  return (
    <div className="mb-6 space-y-1">
      {/* 主导航项 */}
      {mockMainNavItems.filter(item => item.key !== "qatree-list").map((item) => (
        <NavItem
          key={item.key}
          icon={item.icon}
          title={item.title}
          isSelected={selectedKey === item.key}
          onClick={() => handleNavItemClick(item.key, item.href)}
        />
      ))}
      
      {/* 我的图谱 - 可折叠项 */}
      <NavItem
        icon="solar:folder-linear"
        title="我的图谱"
        isSelected={selectedKey === "qatree-list"}
        onClick={handleQATreeToggle}
        endContent={
          <Icon
            className={`text-default-400 transition-transform ${
              isQATreeExpanded ? "rotate-90" : "rotate-180"
            }`}
            icon="solar:alt-arrow-right-linear"
            width={16}
          />
        }
      />
      
      {/* 知识图谱子项列表 - 带平滑动画的展开收起 */}
      <div 
        className={`relative overflow-hidden transition-all duration-300 ease-out ${
          isQATreeExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="relative">
          {mockQATrees.map((tree) => (
            <QATreeItem
              key={tree.id}
              tree={tree}
              isSelected={currentTreeId === tree.id}
              onClick={() => handleQATreeClick(tree.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 