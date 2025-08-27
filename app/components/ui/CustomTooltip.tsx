
import { Tooltip, TooltipProps } from "@heroui/react";
import React from "react";

// Omit props that are set by default to avoid passing them every time
type CustomTooltipProps = Omit<TooltipProps, 'closeDelay' | 'size' | 'radius' | 'offset' | 'classNames'>;

export const CustomTooltip = (props: CustomTooltipProps) => {
  return (
    <Tooltip
      {...props}
      closeDelay={0}
      size="sm"
      radius="sm"
      offset={4}
      classNames={{
        content: "bg-[#27272a] text-[#ffffff]",
      }}
    />
  );
};
