"use client";

import React, { useState } from "react";
import { ACardProps } from "../../../types/qacard";
import { PullIcon, StopIcon, CardDeleteIcon, CopyIcon, ExplodeIcon } from "../../icons";
import "./answercard.css";

export default function AnswerCard({
  title,
  content,
  isGenerating = false,
  isCompleted = false,
  isSelected = false,
  onPause,
  onCollapse,
  onExpand,
  onCopy,
  onClick,
  onDelete
}: ACardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`acard__background-card ${isSelected ? 'acard__background-card--selected' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 删除按钮 - CSS控制显示/隐藏 */}
      {onDelete && (
        <button
          className="acard__delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          type="button"
          aria-label="删除卡片"
        >
          <CardDeleteIcon width={24} height={24} />
        </button>
      )}

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
              <StopIcon width={24} height={24} />
            </button>
          )}
          
          {/* 收起按钮 */}
          <button
            className="acard__header-btn"
            onClick={onCollapse}
            type="button"
            aria-label="收起卡片"
          >
            <PullIcon width={24} height={24} />
          </button>
        </div>
      </div>

      {/* 回答卡 */}
      <div className="acard__answer">
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
            <ExplodeIcon width={20} height={20} />
          </button>

          {/* 复制按钮 - 只在完成后显示 */}
          <button
            className={`acard__footer-btn ${!isCompleted ? 'acard__btn--hidden' : ''}`}
            onClick={onCopy}
            type="button"
            aria-label="复制内容"
          >
            <CopyIcon width={20} height={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
