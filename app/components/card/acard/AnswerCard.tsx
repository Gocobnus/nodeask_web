"use client";

import React from "react";
import { ACardProps } from "../../../types/qacard";
import "./answercard.css";

export default function AnswerCard({
  title,
  content,
  isGenerating = false,
  isCompleted = false,
  onPause,
  onCollapse,
  onExpand,
  onCopy
}: ACardProps) {

  return (
    <div className="acard__background-card">
      {/* 标题栏 */}
      <div className="acard__header">
        <div className="acard__title">
          {title}
        </div>
        <div className="acard__header-actions">
          {/* 暂停回答按钮 - 只在生成中显示 */}
          {isGenerating && (
            <button
              className="acard__header-btn"
              onClick={onPause}
              type="button"
              aria-label="暂停回答"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="2" width="3" height="12" fill="currentColor" rx="1"/>
                <rect x="10" y="2" width="3" height="12" fill="currentColor" rx="1"/>
              </svg>
            </button>
          )}
          
          {/* 收起按钮 */}
          <button
            className="acard__header-btn"
            onClick={onCollapse}
            type="button"
            aria-label="收起卡片"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 10L8 6L12 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 回答卡 */}
      <div className="acard__answer-card">
        {/* Tabs区域 */}
        <div className="acard__tabs">
          <div className="acard__tab acard__tab--active">
            回答
          </div>
          <div className="acard__tab">
            相关问题
          </div>
        </div>

        {/* 回答内容区域 */}
        <div className="acard__content">
          {content || "这里是回答内容的占位文本。实际使用时这里会渲染markdown内容，支持流式更新显示。当前显示的是静态占位内容，用于展示卡片的基本样式和布局效果。\n\n支持多行文本显示，可以包含各种格式的内容。"}
        </div>

        {/* 底部操作栏 */}
        <div className="acard__footer">
          {/* 展开按钮 - 只在完成后显示 */}
          <button
            className={`acard__footer-btn ${!isCompleted ? 'acard__btn--hidden' : ''}`}
            onClick={onExpand}
            type="button"
            aria-label="展开更多"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* 复制按钮 - 只在完成后显示 */}
          <button
            className={`acard__footer-btn ${!isCompleted ? 'acard__btn--hidden' : ''}`}
            onClick={onCopy}
            type="button"
            aria-label="复制内容"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M6 2V3C6 3.55228 6.44772 4 7 4H13C13.5523 4 14 4.44772 14 5V11" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
