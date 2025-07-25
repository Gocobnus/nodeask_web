// 导航组件
// 处理主导航和知识图谱列表的显示和交互，支持收起/展开状态

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
import { mockMainNavItems, mockQATrees } from "../../lib/mock-data";
import { createActionHandler } from "../../lib/selection-utils";
import { sidebarConfig } from "./sidebar-config";
import SidebarButton from "./SidebarButton";

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
          className={`flex w-full items-center justify-between px-3 ${sidebarConfig.roundedButton} ${sidebarConfig.navButtonHeight} cursor-pointer ${sidebarConfig.buttonTransition} ${
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

// 简化的折叠组件，保持相同的动画效果
function CollapsibleSection({ 
  isExpanded, 
  children 
}: { 
  isExpanded: boolean; 
  children: React.ReactNode; 
}) {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div 
      className={`relative overflow-hidden transition-all ${
        isExpanded 
          ? 'duration-400 ease-out max-h-[400px] opacity-100' 
          : 'duration-600 ease-in max-h-0 opacity-0'
      }`}
    >
      <div 
        className={`relative transition-transform ${
          isExpanded 
            ? 'duration-400 ease-out transform translate-y-0' 
            : 'duration-500 ease-in transform -translate-y-full'
        }`}
      >
        {childrenArray.map((child, index) => (
          <div
            key={index}
            className={`transition-all ${
              isExpanded 
                ? 'duration-300 ease-out opacity-100 transform translate-y-0' 
                : 'duration-400 ease-in opacity-0 transform -translate-y-4'
            }`}
            style={{
              transitionDelay: isExpanded 
                ? `${index * 80}ms` 
                : `${(childrenArray.length - 1 - index) * 60}ms`
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
  onExpandRequest?: () => void;
}

export default function Navigation({ isCompact, onExpandRequest }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // 我的图谱折叠状态，默认展开
  const [isQATreeExpanded, setIsQATreeExpanded] = useState(true);
  // 手动选中"我的图谱"的状态
  const [isQATreeManuallySelected, setIsQATreeManuallySelected] = useState(false);
  // 增加一个状态，用于标记是否从点击图谱按钮触发的展开
  const [isExpandingFromQATree, setIsExpandingFromQATree] = useState(false);

  // 当isCompact变化时，处理图谱列表的展开/收起
  React.useEffect(() => {
    // 如果是从收起状态展开，并且是由图谱按钮触发的
    if (!isCompact && isExpandingFromQATree) {
      setIsQATreeExpanded(true);
      // 重置标记状态
      setIsExpandingFromQATree(false); 
    }
  }, [isCompact, isExpandingFromQATree]);
  
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
    if (isCompact) {
      // 标记是由图谱按钮触发的展开
      setIsExpandingFromQATree(true);
      onExpandRequest?.();
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

  // 收起状态：只显示主要导航图标
  if (isCompact) {
    const compactNavItems = [
      ...mockMainNavItems,
      {
        key: "qatree-list",
        href: "",
        icon: "solar:folder-linear",
        title: "我的图谱"
      }
    ];

    return (
      <div className={sidebarConfig.navigationSpacing}>
        {compactNavItems.map((item, index) => {
          const isSelected = selectedKey === item.key;
          const handleClick = () => {
            if (item.key === "qatree-list") {
              handleQATreeToggle();
            } else {
              handleNavItemClick(item.key, item.href);
            }
          };

          return (
            <SidebarButton
              key={item.key}
              icon={item.icon}
              title={item.title}
              isSelected={isSelected}
              isCompact={true}
              onClick={handleClick}
            />
          );
        })}
      </div>
    );
  }

  // 展开状态：显示完整的导航
  return (
    <div className={sidebarConfig.navigationSpacing}>
      {/* 主导航项 */}
      {mockMainNavItems.map((item, index) => (
        <SidebarButton
          key={item.key}
          icon={item.icon}
          title={item.title}
          isSelected={selectedKey === item.key}
          onClick={() => handleNavItemClick(item.key, item.href)}
        />
      ))}
      
      {/* 我的图谱 - 可折叠项 */}
      <SidebarButton
        icon="solar:folder-linear"
        title="我的图谱"
        isSelected={selectedKey === "qatree-list"}
        onClick={handleQATreeToggle}
        endContent={
          <Icon
            className={`text-default-400 ${sidebarConfig.buttonTransition} ${
              isQATreeExpanded ? "rotate-90" : "rotate-180"
            }`}
            icon="solar:alt-arrow-right-linear"
            width={16}
          />
        }
      />
      
      {/* 知识图谱子项列表 - 使用简化的折叠组件 */}
      <CollapsibleSection isExpanded={isQATreeExpanded}>
        {mockQATrees.map((tree) => (
          <QATreeItem
            key={tree.id}
            tree={tree}
            isSelected={currentTreeId === tree.id}
            onClick={() => handleQATreeClick(tree.id)}
          />
        ))}
      </CollapsibleSection>
    </div>
  );
} 