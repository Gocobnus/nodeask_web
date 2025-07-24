// 选择处理工具函数
// 统一处理HeroUI组件的选择事件类型转换，避免重复的类型转换代码

import type { Selection } from "@react-types/shared";

/**
 * 从Selection中获取第一个选中的key作为字符串
 * 用于处理Listbox、Dropdown等组件的选择事件
 * 
 * @param keys - HeroUI Selection对象
 * @returns 第一个选中的key，如果没有选中则返回undefined
 */
export function getFirstSelectedKey(keys: Selection): string | undefined {
  if (keys === "all") {
    return undefined; // "all"选择模式下不返回具体key
  }
  
  const keyArray = Array.from(keys);
  return keyArray.length > 0 ? (keyArray[0] as string) : undefined;
}

/**
 * 将React.Key转换为字符串
 * 用于处理DropdownMenu的action事件
 * 
 * @param key - React.Key类型的键值
 * @returns 转换后的字符串
 */
export function keyToString(key: React.Key): string {
  return key as string;
}

/**
 * 创建标准的选择变更处理器
 * 用于Listbox等组件的onSelectionChange事件
 * 
 * @param onSelect - 选择回调函数
 * @returns 标准的选择变更处理器
 */
export function createSelectionHandler(
  onSelect: (key: string) => void
) {
  return (keys: Selection) => {
    const selectedKey = getFirstSelectedKey(keys);
    if (selectedKey) {
      onSelect(selectedKey);
    }
  };
}

/**
 * 创建标准的动作处理器
 * 用于DropdownMenu的onAction事件
 * 
 * @param actions - 动作处理映射对象
 * @returns 标准的动作处理器
 */
export function createActionHandler(
  actions: Record<string, () => void>
) {
  return (key: React.Key) => {
    const actionKey = keyToString(key);
    const handler = actions[actionKey];
    if (handler) {
      handler();
    }
  };
} 