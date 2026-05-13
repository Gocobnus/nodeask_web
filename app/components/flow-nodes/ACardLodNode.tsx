'use client';

import React from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { CARD_WIDTH } from '@/app/config/constants';
import { FollowUpIcon } from '../icons';
import { CustomTooltip } from '../ui/CustomTooltip';

const ACardLodNode = ({ id, data, selected }: { id: string; data: any; selected: boolean }) => {
  const title = (data?.title || '').toString();
  const updateNodeInternals = useUpdateNodeInternals();
  const [isHovered, setIsHovered] = React.useState(false);
  const [hoverKeepAlive, setHoverKeepAlive] = React.useState(false);
  const hoverLeaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rightHandlePos, setRightHandlePos] = React.useState<number>(-8);
  const rightHandleAnimRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (selected || isHovered) {
      if (hoverLeaveTimerRef.current !== null) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      setHoverKeepAlive(true);
      return;
    }
    if (hoverLeaveTimerRef.current !== null) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    hoverLeaveTimerRef.current = setTimeout(() => {
      setHoverKeepAlive(false);
      hoverLeaveTimerRef.current = null;
    }, 200);
  }, [selected, isHovered]);

  React.useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current !== null) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      if (rightHandleAnimRef.current !== null) {
        cancelAnimationFrame(rightHandleAnimRef.current);
        rightHandleAnimRef.current = null;
      }
    };
  }, []);

  const showAskButton = (selected || hoverKeepAlive) && !data?.hideAskButton && !data?.isGenerating;

  React.useEffect(() => {
    const startRight = rightHandlePos;
    const targetRight = showAskButton ? -52 : -8;
    const startAt = performance.now();
    const duration = 220;

    if (rightHandleAnimRef.current !== null) {
      cancelAnimationFrame(rightHandleAnimRef.current);
      rightHandleAnimRef.current = null;
    }

    const tick = (now: number) => {
      const t = Math.min((now - startAt) / duration, 1);
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const nextRight = startRight + (targetRight - startRight) * eased;
      setRightHandlePos(nextRight);
      updateNodeInternals(id);
      if (t < 1) {
        rightHandleAnimRef.current = requestAnimationFrame(tick);
      } else {
        rightHandleAnimRef.current = null;
      }
    };

    rightHandleAnimRef.current = requestAnimationFrame(tick);
  }, [showAskButton, id, updateNodeInternals]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="acard-node-wrapper"
      style={{ width: CARD_WIDTH, position: 'relative' }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (!selected && data?.onClick) data.onClick();
      }}
    >
      <Handle type="target" position={Position.Top} className="custom-handle-top" style={{ background: 'transparent', border: 'none', width: '1px', height: '1px', top: '-8px', left: '50%', transform: 'translateX(-50%)' }} />
      <div
        className={`acard__background-card ${selected ? 'acard__background-card--selected' : ''}`}
        style={{ maxHeight: '48px' }}
      >
        <div className="acard__background-card-wrapper">
          <div className="acard__header">
            <div className="acard__title">{title}</div>
          </div>
        </div>
      </div>
      <CustomTooltip placement="right" content="追问卡片内容" size="sm">
        <button
          className="acard-node__ask-btn acard-node__ask-btn--visible"
          style={{
            opacity: showAskButton ? 1 : 0,
            pointerEvents: showAskButton ? 'auto' : 'none',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (data?.onAsk) data.onAsk();
          }}
          type="button"
          aria-label="追问卡片内容"
        >
          <FollowUpIcon width={24} height={24} />
        </button>
      </CustomTooltip>
      <Handle type="source" position={Position.Bottom} className="custom-handle-bottom" style={{ background: 'transparent', border: 'none', width: '1px', height: '1px', bottom: '-8px', left: '50%', transform: 'translateX(-50%)' }} />
      <Handle type="source" id="right" position={Position.Right} className="custom-handle-right" style={{ background: 'transparent', border: 'none', width: '1px', height: '1px', top: '24px', right: `${rightHandlePos}px` }} />
    </div>
  );
};

export default React.memo(ACardLodNode);
