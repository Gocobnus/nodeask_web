// 导航组件 - 支持收起/展开状态
"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { mockQATrees } from "../../lib/mock-data";
import { createActionHandler } from "../../lib/selection-utils";
import SidebarButton from "./SidebarButton";
import Image from "next/image";

// 知识图谱操作下拉菜单组件
function QATreeDropdown({ treeId }: { treeId: string }) {
  const handleAction = createActionHandler({
    rename: () => console.log("重命名知识图谱:", treeId),
    delete: () => console.log("删除知识图谱:", treeId)
  });

  return (
    <Dropdown>
      <DropdownTrigger>
        <Image
          src="/icons/sidebar/more.svg"
          alt="更多操作"
          width={18}
          height={18}
          className="sidebar__navigation__qa-tree__item__dropdown opacity-0 group-hover:opacity-100 w-[18px] h-[18px]"
        />
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="知识图谱操作" 
        className="sidebar__navigation__qa-tree__dropdown__menu py-1 min-w-[60px]" 
        variant="faded"
        onAction={handleAction}
      >
        <DropdownItem
          key="rename"
          className="sidebar__navigation__qa-tree__dropdown__item text-default-500 data-[hover=true]:text-default-500 py-1 text-small"
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
          className="sidebar__navigation__qa-tree__dropdown__item text-danger-500 data-[hover=true]:text-danger-500 py-1 text-small"
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

// 知识图谱子项组件
function QATreeItem({ 
  tree, 
  isSelected, 
  onClick,
  isCompact
}: {
  tree: typeof mockQATrees[0];
  isSelected: boolean;
  onClick: () => void;
  isCompact?: boolean;
}) {
  const handleClick = (e: React.MouseEvent) => {
    // 阻止点击下拉菜单时触发选中事件
    if ((e.target as Element).closest('[data-dropdown-trigger]')) {
      return;
    }
    onClick();
  };

  if (isCompact) {
    return (
      <div className="group relative">
        <div className="ml-6 pl-6">
          <div
            className={`sidebar__navigation__qa-tree__item__container flex w-11 h-11 items-center justify-center rounded-large cursor-pointer transition-colors ${
              isSelected 
                ? "bg-default-100 text-foreground" 
                : "text-default-500 hover:bg-default-50"
            }`}
            onClick={handleClick}
          >
            <Icon
              className={`sidebar__navigation__qa-tree__item__icon ${isSelected ? "text-foreground" : "text-default-500"}`}
              icon="solar:document-linear"
              width={20}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {/* 连接线 - 只保留一条线，不要连接点，left-[22px] 是调整竖线与容器边界的距离 */}
      <div className="absolute left-[22px] top-0 bottom-0 w-px bg-default-200 -translate-x-0.5"></div>
      
      <div className="ml-[20px] pl-[14px]"> {/* 修改为 ml-3，使竖线与右侧按钮距离为 20px + 12px + 16px = 48px，竖线到右侧按钮为12px */}
        <div
          /* 下面是调整按钮的padding的 px-2.5=10px */
          className={`sidebar__navigation__qa-tree__item__container flex w-full items-center px-2.5 rounded-lg h-11 cursor-pointer transition-colors ${
            isSelected 
              ? "bg-default-100 text-foreground qa-tree-item-selected" 
              : "text-default-500 hover:bg-default-50"
          }`}
          onClick={handleClick}
        >
          <span className="sidebar__navigation__qa-tree__item__text text-small font-medium truncate pr-2 leading-5 flex-1 min-w-0">
            {tree.name}
          </span>
          <div data-dropdown-trigger className="flex-shrink-0">
            <QATreeDropdown treeId={tree.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 简化的折叠组件，保持相同的动画效果
function CollapsibleSection({ 
  isExpanded, 
  children,
  isCompact
}: { 
  isExpanded: boolean; 
  children: React.ReactNode;
  isCompact?: boolean;
}) {
  const childrenArray = React.Children.toArray(children);
  
  if (isCompact) {
    return null; // 收起状态下不显示折叠内容
  }
  
  return (
    <div 
      className={`relative overflow-hidden transition-all ${
        isExpanded 
          ? 'duration-300 ease-out max-h-[400px] opacity-100' 
          : 'duration-300 ease-in max-h-0 opacity-0'
      }`}
    >
      <div 
        className={`relative transition-transform ${
          isExpanded 
            ? 'duration-300 ease-out transform translate-y-0' 
            : 'duration-300 ease-in transform -translate-y-full'
        }`}
      >
        {childrenArray.map((child, index) => (
          <div
            key={index}
            className={`transition-all ${
              isExpanded 
                ? 'duration-300 ease-out opacity-100 transform translate-y-0' 
                : 'duration-300 ease-in opacity-0 transform -translate-y-4'
            }`}
            style={{
              transitionDelay: isExpanded 
                ? `${index * 60}ms` 
                : `${(childrenArray.length - 1 - index) * 45}ms`
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

interface NavigationProps {
  isCompact?: boolean;
  setIsCompact?: (v: boolean) => void;
}

export default function Navigation({ isCompact = false, setIsCompact }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isQATreeExpanded, setIsQATreeExpanded] = useState(true);
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
      return isQATreeManuallySelected ? "qatree-list" : "home";
    }
    if (pathname.startsWith("/discover")) {
      return isQATreeManuallySelected ? "qatree-list" : "discover";
    }
    if (pathname.startsWith("/qatree/")) return "qatree-list";
    return "home";
  };

  const handleNavItemClick = (key: string, href?: string) => {
    setIsQATreeManuallySelected(false);
    if (href) {
      router.push(href);
    }
  };

  const handleQATreeToggle = () => {
    if (isCompact && setIsCompact) {
      setIsCompact(false);
      setTimeout(() => {
        setIsQATreeExpanded(true);
        setIsQATreeManuallySelected(true);
      }, 100); // 等待侧边栏动画结束后再展开
    } else {
      setIsQATreeExpanded(!isQATreeExpanded);
      setIsQATreeManuallySelected(true);
    }
  };

  const handleQATreeClick = (treeId: string) => {
    // setIsQATreeManuallySelected(false); // 移除此行，修复选中状态闪烁的bug
    router.push(`/qatree/${treeId}`);
  };

  const selectedKey = getSelectedKey();
  const currentTreeId = getCurrentTreeId();

  return (
    <div className="space-y-0"> {/* 移除所有间距 */}
      {/* 主导航项 */}
      <SidebarButton
        icon="/icons/sidebar/home.svg"
        title="首页"
        isSelected={selectedKey === "home"}
        isCompact={isCompact}
        onClick={() => handleNavItemClick("home", "/")}
        type="navigation-item"
      />
      
      <SidebarButton
        icon="/icons/sidebar/discover.svg"
        title="发现"
        isSelected={selectedKey === "discover"}
        isCompact={isCompact}
        onClick={() => handleNavItemClick("discover", "/discover")}
        type="navigation-item"
      />
      
      {/* 我的图谱 - 可折叠项 */}
      <SidebarButton
        icon="/icons/sidebar/my-graphs.svg"
        title="我的图谱"
        isSelected={selectedKey === "qatree-list"}
        isCompact={isCompact}
        onClick={handleQATreeToggle}
        type="navigation-item"
        endContent={
          <Image
            src="/icons/sidebar/dropdown.svg"
            alt="展开收起"
            width={16}
            height={16}
            className={`transition-colors ${
              isQATreeExpanded ? "rotate-270" : "rotate-180"
            }`}
          />
        }
      />
      
      {/* 知识图谱子项列表 */}
      <CollapsibleSection isExpanded={isQATreeExpanded} isCompact={isCompact}>
        <div className="pt-2.5"> {/* 添加10px的上边距 */}
          <div className="space-y-0"> {/* 子图谱之间没有间距 */}
            {mockQATrees.map((tree) => (
              <QATreeItem
                key={tree.id}
                tree={tree}
                isSelected={currentTreeId === tree.id}
                isCompact={isCompact}
                onClick={() => handleQATreeClick(tree.id)}
              />
            ))}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
} 