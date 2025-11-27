'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, useViewport, useUpdateNodeInternals } from 'reactflow';
import { AnswerCard } from '../card/acard';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomTooltip } from '../ui/CustomTooltip';
import { CardDeleteIcon, HorizontalAskIcon } from '../icons';
import { TooltipProps } from '@heroui/react';


const ACardNode = ({ id, data, selected }: { id: string, data: any, selected: boolean }) => {
  const { zoom } = useViewport();
  const [isHovered, setIsHovered] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(0);

  // ResizeObserver 监听高度变化
  useEffect(() => {
    if (!containerRef.current) return;

    // 查找内部的 acard__answer-content-wrapper 元素（内容容器）
    const contentWrapper = containerRef.current.querySelector('.acard__answer-content-wrapper');
    // 同时查找外层的 acard__background-card 元素
    const cardElement = containerRef.current.querySelector('.acard__background-card');

    if (!contentWrapper || !cardElement) {
      console.warn('⚠️ 未找到卡片元素');
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      // 获取内容容器的高度
      const contentHeight = (contentWrapper as HTMLElement).offsetHeight;
      // 获取 header 高度（假设约 60px）和 margin（16px）
      const headerHeight = 60;
      const bottomMargin = 16;
      const estimatedTotalHeight = headerHeight + contentHeight + bottomMargin;

      if (estimatedTotalHeight !== lastHeightRef.current && estimatedTotalHeight > 0) {
        console.log('🔍 ACard ResizeObserver 检测到高度变化:', {
          id,
          oldHeight: lastHeightRef.current,
          newHeight: estimatedTotalHeight,
          contentHeight,
          diff: estimatedTotalHeight - lastHeightRef.current
        });
        lastHeightRef.current = estimatedTotalHeight;

        // 通知父组件高度已变化
        if (data.onHeightChange) {
          data.onHeightChange(id, estimatedTotalHeight);
        }
      }
    });

    // 监听内容容器的变化
    resizeObserver.observe(contentWrapper);
    return () => resizeObserver.disconnect();
  }, [id, data.onHeightChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateNodeInternals(id);
    }, 100); // 稍微延迟以等待内部布局稳定
    return () => clearTimeout(timer);
  }, [id, updateNodeInternals, data]); // 监听 data 变化（例如内容生成时）

  const getTooltipSize = (currentZoom: number): TooltipProps['size'] => {
    if (currentZoom < 0.8) return 'sm';
    if (currentZoom >= 0.8 && currentZoom < 1.2) return 'md';
    return 'lg';
  };
  const dynamicTooltipSize = getTooltipSize(zoom);

  const isVisible = selected || isHovered;

  return (
    <motion.div
      ref={containerRef}
      className={`acard-node-wrapper ${selected ? 'selected' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }} // 0.4秒平滑淡入
      style={{ width: 360, position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onAnimationComplete={() => updateNodeInternals(id)}
    >
      {data.onDelete && selected && (
        <CustomTooltip
          placement="left"
          content="删除"
          size={dynamicTooltipSize}
        >
          <button
            className="acard__delete-btn"
            onClick={(e) => { e.stopPropagation(); data.onDelete(); }}
            style={{ opacity: 1, transform: 'scale(1)', pointerEvents: 'auto', visibility: 'visible' }}
            type="button"
            aria-label="删除"
          >
            <CardDeleteIcon width={24} height={24} />
          </button>
        </CustomTooltip>
      )}
      <AnimatePresence>
        {isVisible && (
          <CustomTooltip
            placement="right"
            content="追问卡片内容"
            size={dynamicTooltipSize}
          >
            <motion.button
              className="acard-node__ask-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
                if (data.onAsk) {
                  data.onAsk();
                }
              }}
              type="button"
              aria-label="追问卡片内容"
            >
              <HorizontalAskIcon width={24} height={24} />
            </motion.button>
          </CustomTooltip>
        )}
      </AnimatePresence>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle-top"
        style={{ background: 'transparent', border: 'none' }}
      />
      <AnswerCard
        title={data.title}
        content={data.content}
        isGenerating={data.isGenerating}
        isCompleted={!data.isGenerating}
        isSelected={selected}
        isOpen={data.isOpen}
        onPause={data.onPause}
        onCollapse={data.onCollapse}
        onExpand={data.onExpand}
        onCopy={data.onCopy}
        onCopyError={data.onCopyError}
        onClick={data.onClick}
        onLocate={data.onLocate}
        relatedQuestions={data.relatedQuestions}
        tooltipSize={dynamicTooltipSize}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="custom-handle-bottom"
        style={{ background: 'transparent', border: 'none' }}
      />
    </motion.div>
  );
};

export default React.memo(ACardNode);