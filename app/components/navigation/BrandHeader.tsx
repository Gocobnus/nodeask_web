// 品牌头部组件
// 显示应用的品牌标识和名称

import React from "react";

// 简单的品牌图标组件
const BrandIcon = ({ className }: { className?: string }) => {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary ${className}`}>
      <span className="text-primary-foreground font-bold text-sm">Q</span>
    </div>
  );
};

export default function BrandHeader() {
  return (
    <div className="flex items-center gap-2 px-2">
      <BrandIcon />
      <span className="text-base font-bold uppercase leading-6 text-foreground">
        QATree
      </span>
    </div>
  );
} 