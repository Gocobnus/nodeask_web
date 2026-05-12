'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import ACardNode from './ACardNode';
import { CARD_WIDTH } from '@/app/config/constants';

const ACardLiteNode = ({ id, data, selected }: { id: string; data: any; selected: boolean }) => {
  const isLiteMode = Boolean(data?.isLiteMode);
  const shouldRenderFullCard = !isLiteMode || selected;

  const isCollapsed = Boolean(data?.isCollapsed);
  const measuredHeight = Number(data?.renderHeight);
  const renderHeight = isCollapsed
    ? 48
    : Number.isFinite(measuredHeight) && measuredHeight > 0
      ? measuredHeight
      : 550;

  if (shouldRenderFullCard) {
    const fullCardData = isLiteMode ? { ...data, disableEnterAnimation: true } : data;
    return <ACardNode id={id} data={fullCardData} selected={selected} />;
  }

  return (
    <div
      className="acard-lite-shell"
      style={{ width: CARD_WIDTH, height: renderHeight }}
    >
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
    </div>
  );
};

export default React.memo(ACardLiteNode);
