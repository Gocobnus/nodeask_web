"use client";

import React, { useState } from "react";
import { Tooltip } from "@heroui/react";
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
  const [activeTab, setActiveTab] = useState<'answer' | 'related'>('answer');

  // 处理卡片点击 - 如果未选中则选中，如果已选中则保持选中
  const handleCardClick = () => {
    if (!isSelected && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`acard__background-card ${isSelected ? 'acard__background-card--selected' : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 删除按钮 - CSS控制显示/隐藏 */}
      {onDelete && (
        <Tooltip 
          placement="left"
          content="删除" 
          closeDelay={0}
          size="sm"
          radius="sm"
          offset={4}
          classNames={{
            content: "bg-[#27272a] text-[#ffffff]"
          }}
        >
          <button
            className="acard__delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            type="button"
            aria-label="删除"
          >
            <CardDeleteIcon width={24} height={24} />
          </button>
        </Tooltip>
      )}

      {/* 标题栏 */}
      <div className="acard__header">
        <div className="acard__title">
          {title}
        </div>
        <div className="acard__header-actions">
                      {/* 暂停回答按钮 - 只在生成中显示 */}
            {isGenerating && (
              <Tooltip 
                content="暂停回答" 
                closeDelay={0}
                size="sm" 
                radius="sm"
                placement="bottom"
                offset={4}
                classNames={{
                  content: "bg-[#27272a] text-[#ffffff]"
                }}
              >
                <button
                  className="acard__header-btn"
                  onClick={onPause}
                  type="button"
                  aria-label="暂停回答"
                >
                  <StopIcon width={24} height={24} />
                </button>
              </Tooltip>
            )}
            
            {/* 收起按钮 */}
            <Tooltip 
              content="收起" 
              closeDelay={0}
              size="sm" 
              radius="sm"
              placement="bottom"
              offset={4}
              classNames={{
                content: "bg-[#27272a] text-[#ffffff]"
              }}
            >
              <button
                className="acard__header-btn"
                onClick={onCollapse}
                type="button"
                aria-label="收起"
              >
                <PullIcon width={24} height={24} />
              </button>
            </Tooltip>
        </div>
      </div>

      {/* 回答卡 */}
      <div className="acard__answer">
        {/* Tabs区域 */}
        <div className="acard__tabs">
          <div 
            className={`acard__tab ${activeTab === 'answer' ? 'acard__tab--active' : ''}`}
            onClick={() => setActiveTab('answer')}
          >
            回答
          </div>
          <div 
            className={`acard__tab ${activeTab === 'related' ? 'acard__tab--active' : ''}`}
            onClick={() => setActiveTab('related')}
          >
            相关问题
          </div>
        </div>

        {/* 内容区域 */}
        <div className="acard__content">
          {activeTab === 'answer' ? (
            content || "这里是回答内容的占位文本。实际使用时这里会渲染markdown内容，支持流式更新显示。当前显示的是静态占位内容，用于展示卡片的基本样式和布局效果。\n\n支持多行文本显示，可以包含各种格式的内容。"
          ) : (
            "这里会显示相关问题的内容。可以包含推荐的后续问题、相关主题链接等。当前是占位内容，实际使用时会根据回答内容智能生成相关问题。"
          )}
        </div>

        {/* 底部操作栏 - 只在回答tab显示 */}
        {activeTab === 'answer' && (
          <div className="acard__footer">
            {/* 展开按钮 - 只在完成后显示 */}
            {isCompleted && (
              <Tooltip 
                content="展开" 
                closeDelay={0}
                size="sm" 
                radius="sm"
                placement="bottom"
                offset={4}
                classNames={{
                  content: "bg-[#27272a] text-[#ffffff]"
                }}
              >
                <button
                  className="acard__footer-btn"
                  onClick={onExpand}
                  type="button"
                  aria-label="展开"
                >
                  <ExplodeIcon width={20} height={20} />
                </button>
              </Tooltip>
            )}

            {/* 复制按钮 - 只在完成后显示 */}
            {isCompleted && (
              <Tooltip 
                content="复制" 
                closeDelay={0}
                size="sm" 
                radius="sm"
                placement="bottom"
                offset={4}
                classNames={{
                  content: "bg-[#27272a] text-[#ffffff]"
                }}
              >
                <button
                  className="acard__footer-btn"
                  onClick={onCopy}
                  type="button"
                  aria-label="复制"
                >
                  <CopyIcon width={20} height={20} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
