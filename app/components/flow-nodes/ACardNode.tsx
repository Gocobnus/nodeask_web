'use client';

import React, { useState, useEffect } from 'react';
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