'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import ACardNode from './ACardNode';
import { CARD_WIDTH } from '@/app/config/constants';

const ACardLiteNode = ({ id, data, selected }: { id: string; data: any; selected: boolean }) => {
  const isLiteMode = Boolean(data?.isLiteMode);
  const isGenerating = Boolean(data?.isGenerating);
  const needsInitialHeightSync = Boolean(data?.needsInitialHeightSync);
  const shouldUseProbe = isGenerating || needsInitialHeightSync;
  const shouldRenderFullCard = !isLiteMode || selected;

  const isCollapsed = Boolean(data?.isCollapsed);
  const finalLiteHeight = Number(data?.finalLiteHeight);
  const measuredHeight = Number(data?.renderHeight);
  const preferredHeight = Number.isFinite(finalLiteHeight) && finalLiteHeight > 0
    ? finalLiteHeight
    : measuredHeight;
  const renderHeight = isCollapsed
    ? 48
    : Number.isFinite(preferredHeight) && preferredHeight > 0
      ? preferredHeight
      : 550;

  if (shouldRenderFullCard) {
    const fullCardData = isLiteMode ? { ...data, disableEnterAnimation: true } : data;
    return <ACardNode id={id} data={fullCardData} selected={selected} />;
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
      <div className="acard-lite-shell__surface">
        <div className="acard-lite-shell__header" />
        {!isCollapsed && <div className="acard-lite-shell__body" />}
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
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="custom-handle-right"
        style={{
          background: 'transparent',
          border: 'none',
          width: '1px',
          height: '1px',
          top: '24px',
          right: '-8px'
        }}
      />
    </>
  );

  if (shouldUseProbe) {
    // 探针：完整 ACardNode 在 DOM 中保留 layout 测量与 ResizeObserver，视觉不可见。
    // 覆盖层：lite-shell 绝对定位贴合探针撑出的高度，承担视觉表现与连线锚点。
    const probeData = { ...data, disableEnterAnimation: true };
    return (
      <div
        className="acard-lite-shell"
        style={{ position: 'relative', width: CARD_WIDTH }}
      >
        <div style={{ visibility: 'hidden', pointerEvents: 'none' }}>
          <ACardNode id={id} data={probeData} selected={false} suppressHandles />
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {liteShellContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className="acard-lite-shell"
      style={{ width: CARD_WIDTH, height: renderHeight }}
    >
      {liteShellContent}
    </div>
  );
};

export default React.memo(ACardLiteNode);
