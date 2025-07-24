// QATree列表组件
// 基于sidebar-with-chat-history的聊天历史列表实现

"use client";

import React from "react";
import { 
  Listbox, 
  ListboxItem, 
  ListboxSection,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { mockQATrees } from "../../lib/mock-data";
import { createSelectionHandler, createActionHandler } from "../../lib/selection-utils";

// QATree操作下拉菜单组件
function QATreeDropdown({ treeId }: { treeId: string }) {
  const handleAction = createActionHandler({
    rename: () => console.log("重命名QATree:", treeId),
    delete: () => console.log("删除QATree:", treeId)
  });

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          isIconOnly
          className="h-6 w-6 min-w-6 bg-transparent opacity-0 group-hover:opacity-100"
          size="sm"
          variant="light"
        >
          <Icon 
            className="text-default-400" 
            icon="solar:menu-dots-linear" 
            width={16} 
          />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="QATree操作"
        onAction={handleAction}
      >
        <DropdownItem
          key="rename"
          startContent={
            <Icon className="text-default-400" icon="solar:pen-linear" width={16} />
          }
        >
          重命名
        </DropdownItem>
        <DropdownItem
          key="delete"
          className="text-danger"
          color="danger"
          startContent={
            <Icon className="text-danger" icon="solar:trash-bin-minimalistic-linear" width={16} />
          }
        >
          删除
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

export default function QATreeList() {
  const handleQATreeSelect = createSelectionHandler((selectedKey: string) => {
    console.log("选中QATree:", selectedKey);
    // 这里可以添加选中QATree的逻辑
  });

  return (
    <Listbox 
      aria-label="我的QATree" 
      variant="flat"
      onSelectionChange={handleQATreeSelect}
    >
      <ListboxSection
        classNames={{
          base: "py-0",
          heading: "py-0 pl-[10px] text-small text-default-400",
        }}
        title="我的QATree"
      >
        {mockQATrees.map((tree) => (
          <ListboxItem
            key={tree.id}
            className="group h-[44px] px-[12px] py-[10px] text-default-500"
            endContent={<QATreeDropdown treeId={tree.id} />}
            textValue={tree.name}
          >
            {tree.name}
          </ListboxItem>
        ))}
      </ListboxSection>
    </Listbox>
  );
} 