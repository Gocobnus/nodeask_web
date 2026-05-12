'use client';

import React, { useEffect } from 'react';
import { Handle, Position, useViewport, useUpdateNodeInternals } from 'reactflow';
import { QuestionCard } from '../card/qcard';
import { motion } from 'framer-motion';
import { CustomTooltip } from '../ui/CustomTooltip';
import { CardDeleteIcon } from '../icons';
import { TooltipProps } from '@heroui/react';
import { CARD_WIDTH } from '@/app/config/constants';


const QCardNode = ({ id, data, selected }: { id: string, data: any, selected: boolean }) => {
  const { zoom } = useViewport();
  const updateNodeInternals = useUpdateNodeInternals();
  const isTinyZoom = zoom <= 0.3;
  const simplified = isTinyZoom && !selected;

  // QCard 不需要 ResizeObserver，因为：
  // 1. QCard 通常是第一个节点，位置固定
  // 2. 用户手动收起/展开不应触发全局布局
  // 3. QCard 内容较短，高度变化不会影响整体布局

  useEffect(() => {
     updateNodeInternals(id);
  }, [id, updateNodeInternals, data]);

  const getTooltipSize = (currentZoom: number): TooltipProps['size'] => {
    if (currentZoom < 0.8) return 'sm';
    if (currentZoom >= 0.8 && currentZoom < 1.2) return 'md';
    return 'lg';
  };
  const dynamicTooltipSize = getTooltipSize(zoom);

  return (
    <motion.div
      className={simplified ? 'qcard-node-wrapper qcard-node-wrapper--tiny-zoom' : 'qcard-node-wrapper'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }} // 0.4秒平滑淡入
      style={{ width: CARD_WIDTH, position: 'relative' }}
      onAnimationComplete={() => updateNodeInternals(id)}
    >
      {data.onDelete && selected && (
        <CustomTooltip
          placement="left"
          content="删除"
          size={dynamicTooltipSize}
        >
          <button
            className="qcard__delete-btn"
            onClick={(e) => { e.stopPropagation(); data.onDelete(); }}
            style={{ opacity: 1, transform: 'scale(1)', pointerEvents: 'auto', visibility: 'visible' }}
            type="button"
            aria-label="删除"
          >
            <CardDeleteIcon width={24} height={24} />
          </button>
        </CustomTooltip>
      )}
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle-top"
        style={{
          background: 'transparent',
          border: 'none',
          width: '1px',
          height: '1px',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="custom-handle-left"
        style={{
          background: 'transparent',
          border: 'none',
          width: '1px',
          height: '1px',
          top: '24px',
          left: '-8px'
        }}
      />
      <QuestionCard
        question={data.question}
        avatar={data.avatar}
        isSelected={selected}
        onClick={data.onClick}
        onCopy={data.onCopy}
        onCopyError={data.onCopyError}
        tooltipSize={dynamicTooltipSize}
        simplified={simplified}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="custom-handle-bottom"
        style={{
          background: 'transparent',
          border: 'none',
          width: '1px',
          height: '1px',
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </motion.div>
  );
};

export default React.memo(QCardNode);
