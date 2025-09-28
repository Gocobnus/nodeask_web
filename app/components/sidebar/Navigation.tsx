// 导航组件 - 支持收起/展开状态
"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QATree } from "../../types/qatree";
import { 
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { useQATrees } from "../../context/QATreeContext";
import { createActionHandler } from "../../lib/selection-utils";
import SidebarButton from "./SidebarButton";
import {
  MoreIcon,
  RenameIcon,
  DeleteIcon,
  DropdownIcon
} from "../icons";

// 知识图谱操作下拉菜单组件
function QATreeDropdown({ treeId }: { treeId: string }) {
  const handleAction = createActionHandler({
    rename: () => console.log("重命名知识图谱:", treeId),
    delete: () => console.log("删除知识图谱:", treeId)
  });

  return (
    <Dropdown>
      <DropdownTrigger>
        <div className="sidebar__navigation__qa-tree__item__icon opacity-0 group-hover:opacity-100">
          <MoreIcon
            width={18}
            height={18}
            className="more-icon"
          />
        </div>
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="知识图谱操作" 
        className="sidebar__navigation__qa-tree__dropdown__menu py-1 min-w-[60px]" 
        variant="faded"
        onAction={handleAction}
      >
        <DropdownItem
          key="rename"
          className="sidebar__navigation__qa-tree__dropdown__item data-[hover=true]:bg-secondary-50"
          startContent={
            <RenameIcon
              width={20}
              height={20}
              className="rename-icon"
            />
          }
        >
          重命名
        </DropdownItem>
        <DropdownItem
          key="delete"
          className="sidebar__navigation__qa-tree__dropdown__item data-[hover=true]:bg-secondary-50"
          startContent={
            <DeleteIcon
              width={20}
              height={20}
              className="delete-icon"
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
  tree: QATree;
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
            className={`sidebar__navigation__qa-tree__item__container flex w-11 h-11 items-center justify-center rounded-large cursor-pointer transition-all duration-200 ease-in-out ${
              isSelected 
                ? "selected" 
                : ""
            }`}
            onClick={handleClick}
          >
            <div
              className={`sidebar__navigation__qa-tree__item__icon ${isSelected ? "text-foreground" : "text-default-500"}`}
            >
              {/* 这里需要一个文档图标，暂时使用文字 */}
              <span className="text-sm">📄</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {/* 连接线 - 只保留一条线，不要连接点，left-[22px] 是调整竖线与容器边界的距离 */}
      <div className="absolute left-[22px] top-0 bottom-0 w-px bg-default-200 -translate-x-0.5"></div>
      
      <div className="ml-[20px] pl-[16px]"> 
        <div
          /* 下面是调整按钮的padding的 px-2.5=10px */
          className={`sidebar__navigation__qa-tree__item__container flex w-full items-center px-2.5 rounded-lg h-11 cursor-pointer transition-all duration-200 ease-in-out ${
            isSelected 
              ? "selected" 
              : ""
          }`}
          onClick={handleClick}
        >
          <span className="sidebar__navigation__qa-tree__item__text text-small font-medium truncate leading-5 flex-1 min-w-0">
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
      className={`relative overflow-hidden transition-all duration-400 ease-in-out ${
        isExpanded 
          ? 'max-h-[400px] opacity-100' 
          : 'max-h-0 opacity-0'
      }`}
    >
      <div 
        className={`relative transition-transform duration-400 ease-in-out ${
          isExpanded 
            ? 'transform translate-y-0' 
            : 'transform -translate-y-full'
        }`}
      >
        {childrenArray.map((child, index) => (
          <div
            key={index}
            className={`transition-all duration-200 ease-in-out ${
              isExpanded 
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform -translate-y-4'
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
  isQATreeManuallySelected?: boolean;
  setIsQATreeManuallySelected?: (v: boolean) => void;
}

export default function Navigation({
  isCompact = false,
  setIsCompact,
  isQATreeManuallySelected: externalIsQATreeManuallySelected,
  setIsQATreeManuallySelected: externalSetIsQATreeManuallySelected
}: NavigationProps) {
  const { trees } = useQATrees();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isQATreeExpanded, setIsQATreeExpanded] = useState(true);
  const [internalIsQATreeManuallySelected, setInternalIsQATreeManuallySelected] = useState(false);
  
  // 使用外部状态或内部状态
  const _isQATreeManuallySelected = externalIsQATreeManuallySelected ?? internalIsQATreeManuallySelected;
  const setIsQATreeManuallySelected = externalSetIsQATreeManuallySelected ?? setInternalIsQATreeManuallySelected;

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
      return "home";
    }
    if (pathname.startsWith("/discover")) {
      return "discover";
    }
    if (pathname.startsWith("/qatree/")) {
      // 当在子图谱页面时，主图谱不应该被选中
      return "none";
    }
    return "home";
  };

  const handleNavItemClick = async (key: string, href?: string) => {
    if (href) {
      await router.push(href);
    }
    // 路由跳转完成后再更新状态
    setIsQATreeManuallySelected(false);
  };

  const handleQATreeToggle = () => {
    if (isCompact && setIsCompact) {
      setIsCompact(false);
      setTimeout(() => {
        setIsQATreeExpanded(true);
      }, 100); // 等待侧边栏动画结束后再展开
    }
    else {
      setIsQATreeExpanded(!isQATreeExpanded);
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
        icon="/icons/sidebar/treelist.svg"
        title="我的图谱"
        isSelected={false}
        isCompact={isCompact}
        onClick={handleQATreeToggle}
        type="navigation-item"
        endContent={
          <DropdownIcon
            width={16}
            height={16}
            className={`transition-all duration-200 ease-in-out ${
              isQATreeExpanded ? "-rotate-90" : "rotate-180"
            }`}
          />
        }
      />
      
      {/* 知识图谱子项列表 */}
      <CollapsibleSection isExpanded={isQATreeExpanded} isCompact={isCompact}>
        <div className="pt-2.5"> {/* 添加10px的上边距 */}
          <div className="space-y-0"> {/* 子图谱之间没有间距 */}
            {trees.map((tree) => (
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