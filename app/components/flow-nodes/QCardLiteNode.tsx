'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import QCardNode from './QCardNode';
import { CARD_WIDTH } from '@/app/config/constants';
import { motion } from 'framer-motion';

const QCardLiteNode = ({ id, data, selected }: { id: string; data: any; selected: boolean }) => {
  const isLiteMode = Boolean(data?.isLiteMode);
  const shouldRenderFullCard = !isLiteMode || selected;

  const isCollapsed = Boolean(data?.isCollapsed);
  const measuredHeight = Number(data?.renderHeight);
  const hasMeasuredHeight = Number.isFinite(measuredHeight) && measuredHeight > 0;
  const renderHeight = isCollapsed
    ? 48
    : hasMeasuredHeight
      ? measuredHeight
      : 250;
  const needsProbeOnce = !hasMeasuredHeight && !data?.measuredOnce;

  if (shouldRenderFullCard) {
    return <QCardNode id={id} data={data} selected={selected} />;
  }

  const liteShellContent = (
    <>
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
      <div className="qcard-lite-shell__surface">
        <div className="qcard-lite-shell__header" />
        {!isCollapsed && <div className="qcard-lite-shell__body" />}
      </div>
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
    </>
  );

  if (needsProbeOnce) {
    // 探针：完整 QCardNode 通过 useLayoutEffect 单次上报 offsetHeight，视觉不可见。
    // 覆盖层：lite-shell 绝对定位贴合探针撑出的高度。
    const probeData = { ...data, disableEnterAnimation: true };
    return (
      <div
        className="qcard-lite-shell"
        style={{ position: 'relative', width: CARD_WIDTH }}
        onClick={(e) => {
          e.stopPropagation();
          if (!selected && data?.onClick) data.onClick();
        }}
      >
        <div style={{ visibility: 'hidden', pointerEvents: 'none' }}>
          <QCardNode id={id} data={probeData} selected={false} suppressHandles asProbe />
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {liteShellContent}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="qcard-lite-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ width: CARD_WIDTH, height: renderHeight }}
      onClick={(e) => {
        e.stopPropagation();
        if (!selected && data?.onClick) data.onClick();
      }}
    >
      {liteShellContent}
    </motion.div>
  );
};

export default React.memo(QCardLiteNode);
