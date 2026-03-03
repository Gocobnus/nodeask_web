
import { Tooltip, TooltipProps } from "@heroui/react";
import React from "react";

// Omit props that are set by default to avoid passing them every time
type CustomTooltipProps = Omit<TooltipProps, 'closeDelay' | 'radius' | 'offset' | 'classNames'>;

export const CustomTooltip = (props: CustomTooltipProps) => {
  const { size = "sm", ...restProps } = props;

  return (
    <Tooltip
      {...restProps}
      closeDelay={0}
      size={size}
      radius="sm"
      offset={4}
      classNames={{
        content: "bg-[#27272a] text-[#ffffff]",
      }}
    />
  );
};
