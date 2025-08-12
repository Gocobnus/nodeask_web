"use client";

import React from "react";
import SearchSection from "./SearchSection";
import "./homepage.css";

export default function HomePage() {
  // 处理提交
  const handleSubmit = async (value: string) => {
    console.log('提交内容:', value);
    // TODO: 实现实际的提交逻辑
    // 这里可以调用API或触发其他操作
  };

  return (
    <div className="homepage__container">
      <SearchSection 
        title="您想了解什么?"
        placeholder="请尽情提问！"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
