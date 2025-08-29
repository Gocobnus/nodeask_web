'use client';

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ACardProps } from "../../../types/qacard";
import { PullIcon, StopIcon, CardDeleteIcon, CopyIcon, ExplodeIcon } from "../../icons";
import { CustomTooltip } from "../../ui/CustomTooltip";
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
  const [activeTab, setActiveTab] = useState<'answer' | 'related'>('answer');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [answerContentHeight, setAnswerContentHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const iconVariants = {
    open: {
      opacity: 1,
      transition: { delay: 0.3, duration: 0.2 }
    },
    closed: {
      opacity: 0,
      transition: { duration: 0.01 }
    }
  };

  // 处理卡片点击 - 如果未选中则选中，如果已选中则保持选中
  const handleCardClick = () => {
    if (!isSelected && onClick) {
      onClick();
    }
  };
  
  // 处理收起/展开切换
  const handleCollapseToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    
    // 保存滚动位置
    if (!isCollapsed && contentRef.current) {
      setScrollPosition(contentRef.current.scrollTop);
    }
    
    // 添加小延迟使动画更自然
    if (isCollapsed) {
      // 展开时直接设置状态
      setIsCollapsed(false);
    } else {
      // 收起时先触发动画，然后更新状态
      setIsCollapsed(true);
    }
    
    if (onCollapse) {
      onCollapse();
    }
    
    // 确保卡片获得选中状态
    if (!isSelected && onClick) {
      onClick();
    }
  };
  
  // 在展开后恢复滚动位置
  useEffect(() => {
    if (!isCollapsed && contentRef.current && scrollPosition > 0) {
      contentRef.current.scrollTop = scrollPosition;
    }
  }, [isCollapsed]);

  // 监听回答标签页内容高度变化
  useEffect(() => {
    if (contentRef.current) {
      const updateHeight = () => {
        // 只有在回答标签页时才更新高度
        if (activeTab === 'answer') {
          const contentHeight = contentRef.current?.scrollHeight || 0;
          setAnswerContentHeight(contentHeight);
        }
      };
      
      // 立即更新一次
      updateHeight();
      
      // 使用ResizeObserver监听内容高度变化
      const resizeObserver = new ResizeObserver(updateHeight);
      if (contentRef.current) {
        resizeObserver.observe(contentRef.current);
      }
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [activeTab, content, isCollapsed]);

  return (
    <motion.div 
      className={`acard__background-card ${isSelected ? 'acard__background-card--selected' : ''} ${isCollapsed ? 'acard__background-card--collapsed' : ''}`}
      animate={{
        height: isCollapsed ? 48 : 'auto'
      }}
      transition={{
        duration: 0.3, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      onClick={handleCardClick}
    >
      <div className="acard__background-card-wrapper">
        {/* 删除按钮 - CSS控制显示/隐藏 */}
        {onDelete && (
          <CustomTooltip 
            placement="left"
            content="删除" 
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
          </CustomTooltip>
        )}

        {/* 标题栏 */}
        <div className="acard__header">
          <div className="acard__title">
            {title}
          </div>
          <div className="acard__header-actions">
              {/* 暂停回答按钮 - 只在生成中显示 */}
              {isGenerating && (
                <CustomTooltip 
                  content="暂停回答" 
                  placement="bottom"
                >
                  <button
                    className="acard__icon-btn acard__header-btn"
                    onClick={onPause}
                    type="button"
                    aria-label="暂停回答"
                  >
                    <StopIcon width={24} height={24} />
                  </button>
                </CustomTooltip>
              )}
              
              {/* 收起/展开按钮 */}
              <CustomTooltip 
                content={isCollapsed ? "展开" : "收起"} 
                placement="bottom"
              >
                <button
                  className="acard__icon-btn acard__header-btn"
                  onClick={handleCollapseToggle}
                  type="button"
                  aria-label={isCollapsed ? "展开" : "收起"}
                >
                  <PullIcon width={24} height={24} className={isCollapsed ? "rotate-180" : ""} />
                </button>
              </CustomTooltip>
          </div>
        </div>

        {/* 回答卡 */}
        <motion.div 
          className={`acard__answer ${isCollapsed ? 'acard__answer--collapsed' : ''}`}
          // animate={{
          //   opacity: isCollapsed ? 0 : 1
          // }}
          // transition={{
          //   duration: 0.3, 
          //   ease: [0.25, 0.46, 0.45, 0.94] 
          // }}
        >
          <div className="acard__answer-content-wrapper">
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
            <div 
              className="acard__content" 
              ref={contentRef}
              style={{
                height: activeTab === 'answer' ? 'auto' : (answerContentHeight ? `${answerContentHeight}px` : 'auto'),
                flex: activeTab === 'answer' ? '1' : 'none'
              }}
            >
              {activeTab === 'answer' ? (
                content || "这里是回答内容的占位文本。实际使用时这里会渲染markdown内容，支持流式更新显示。当前显示的是静态占位内容，用于展示卡片的基本样式和布局效果.支持多行文本显示，可以包含各种格式的内容。"
              ) : (
                "这里会显示相关问题的内容。可以包含推荐的后续问题、相关主题链接等。当前是占位内容，实际使用时会根据回答内容智能生成相关问题。"
              )}
            </div>

            {/* 底部操作栏 - 始终显示以保持高度一致 */}
            <div className="acard__footer">
              {/* 展开按钮 - 只在回答tab且完成后显示 */}
              {activeTab === 'answer' && isCompleted && (
                <CustomTooltip 
                  content="展开" 
                  placement="bottom"
                >
                  <motion.button
                    className="acard__icon-btn acard__footer-btn"
                    onClick={onExpand}
                    type="button"
                    aria-label="展开"
                    variants={iconVariants}
                    animate={isCollapsed ? "closed" : "open"}
                  >
                    <ExplodeIcon width={20} height={20} />
                  </motion.button>
                </CustomTooltip>
              )}

              {/* 复制按钮 - 只在回答tab且完成后显示 */}
              {activeTab === 'answer' && isCompleted && (
                <CustomTooltip 
                  content="复制" 
                  placement="bottom"
                >
                  <motion.button
                    className="acard__icon-btn acard__footer-btn"
                    onClick={onCopy}
                    type="button"
                    aria-label="复制"
                    variants={iconVariants}
                    animate={isCollapsed ? "closed" : "open"}
                  >
                    <CopyIcon width={20} height={20} />
                  </motion.button>
                </CustomTooltip>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}