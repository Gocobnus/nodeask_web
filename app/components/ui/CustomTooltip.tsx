
import { Tooltip, TooltipProps } from "@heroui/react";
import React from "react";

// Omit props that are set by default to avoid passing them every time
type CustomTooltipProps = Omit<TooltipProps, 'closeDelay' | 'radius' | 'offset' | 'classNames'>;

export const CustomTooltip = (props: CustomTooltipProps) => {
  // --- 修改点：从 props 中解构 size，并提供默认值 'sm' ---
  const { size = "sm", ...restProps } = props;

  return (
    <Tooltip
      {...restProps}
      closeDelay={0}
      size={size} // --- 修改点：使用动态的 size 属性 ---
      radius="sm"
      offset={4}
      classNames={{
        content: "bg-[#27272a] text-[#ffffff]",
      }}
    />
  );
};
