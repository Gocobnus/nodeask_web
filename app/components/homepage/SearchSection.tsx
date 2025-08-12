"use client";

import React from "react";
import InputArea from "./InputArea";
import "./homepage.css";

interface SearchSectionProps {
  title: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export default function SearchSection({ 
  title,
  placeholder,
  onSubmit,
  disabled = false
}: SearchSectionProps) {
  return (
    <div className="search-section__container">
      {/* 标题 */}
      <h1 className="search-section__title">{title}</h1>
      
      {/* 输入区域 */}
      <InputArea onSubmit={onSubmit} placeholder={placeholder} disabled={disabled} />
    </div>
  );
}
