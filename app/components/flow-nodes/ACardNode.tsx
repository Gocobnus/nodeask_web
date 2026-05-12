'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Handle, Position, useViewport, useUpdateNodeInternals } from 'reactflow';
import { AnswerCard } from '../card/acard';
import { motion } from 'framer-motion';
import { CustomTooltip } from '../ui/CustomTooltip';
import { CardDeleteIcon, FollowUpIcon } from '../icons';
import { TooltipProps } from '@heroui/react';
import { CARD_WIDTH } from '@/app/config/constants';


const ACardNode = ({ id, data, selected, suppressHandles }: { id: string, data: any, selected: boolean, suppressHandles?: boolean }) => {
  const HANDLE_ATTACH_DELAY_MS = 0;
  const ASK_FADE_MS = 180;
  const { zoom } = useViewport();
  const [isHovered, setIsHovered] = useState(false);
  const [hoverKeepAlive, setHoverKeepAlive] = useState(false);
  const [isCollapsedLocal, setIsCollapsedLocal] = useState(false);
  const [handleAttachCommitted, setHandleAttachCommitted] = useState(false);
  const [transitionLock, setTransitionLock] = useState(false);
  const [lockedButtonVisible, setLockedButtonVisible] = useState(false);
  const [frozenScale, setFrozenScale] = useState(1);
  const [frozenTransform, setFrozenTransform] = useState<string | null>(null);
  const [isHidingAskBtn, setIsHidingAskBtn] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();
  const containerRef = useRef<HTMLDivElement>(null);
  const askBtnRef = useRef<HTMLButtonElement>(null);
  const lastHeightRef = useRef<number>(0);
  const resizeRafRef = useRef<number | null>(null);
  const pendingHeightRef = useRef<number>(0);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAttachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightHandleAnimRef = useRef<number | null>(null);
  const askHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rightHandlePos, setRightHandlePos] = useState<number>(-8);
  const disableEnterAnimation = Boolean(data?.disableEnterAnimation);
  const forceShowActions = Boolean(data?.forceShowActions);
  const forceTiny = Boolean(data?.forceTiny);

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

      if (estimatedTotalHeight <= 0) {
        return;
      }

      pendingHeightRef.current = estimatedTotalHeight;
      if (resizeRafRef.current !== null) {
        return;
      }

      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        const nextHeight = pendingHeightRef.current;
        if (Math.abs(nextHeight - lastHeightRef.current) < 8) {
          return;
        }
        lastHeightRef.current = nextHeight;
        if (data.onHeightChange) {
          data.onHeightChange(id, nextHeight);
        }
      });
    });

    // 监听内容容器的变化
    resizeObserver.observe(contentWrapper);
    return () => {
      resizeObserver.disconnect();
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
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

  useEffect(() => {
    if (selected || isHovered || forceShowActions) {
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
  }, [selected, isHovered, forceShowActions]);

  const baseButtonVisible = (selected || hoverKeepAlive) && !data.hideAskButton;
  const buttonVisible = transitionLock ? lockedButtonVisible : baseButtonVisible;
  const attachToAskButtonRight = isCollapsedLocal && handleAttachCommitted;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, attachToAskButtonRight, updateNodeInternals]);

  useEffect(() => {
    if (handleAttachTimerRef.current !== null) {
      clearTimeout(handleAttachTimerRef.current);
      handleAttachTimerRef.current = null;
    }
    const shouldAttach = isCollapsedLocal && baseButtonVisible;
    handleAttachTimerRef.current = setTimeout(() => {
      setHandleAttachCommitted(shouldAttach);
      handleAttachTimerRef.current = null;
    }, HANDLE_ATTACH_DELAY_MS);
  }, [isCollapsedLocal, baseButtonVisible]);

  useEffect(() => {
    if (transitionLockTimerRef.current !== null) {
      clearTimeout(transitionLockTimerRef.current);
      transitionLockTimerRef.current = null;
    }

    // 折叠时：按钮与线锚点提交同一时刻开始（避免按钮先出现）
    if (isCollapsedLocal) {
      setTransitionLock(true);
      setLockedButtonVisible(false);
      transitionLockTimerRef.current = setTimeout(() => {
        setLockedButtonVisible(baseButtonVisible);
        setTransitionLock(false);
        transitionLockTimerRef.current = null;
      }, HANDLE_ATTACH_DELAY_MS);
      return;
    }

    // 展开时：不延迟按钮显示，直接回到基础可见性
    setTransitionLock(false);
    setLockedButtonVisible(baseButtonVisible);
  }, [isCollapsedLocal, baseButtonVisible, HANDLE_ATTACH_DELAY_MS]);

  useEffect(() => {
    const startRight = rightHandlePos;
    const targetRight = attachToAskButtonRight ? -52 : -8;
    const startAt = performance.now();
    const duration = 300;

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
  }, [attachToAskButtonRight, id, updateNodeInternals]); // eslint-disable-line react-hooks/exhaustive-deps

  const parseScaleFromTransform = (transform: string): number => {
    if (!transform || transform === 'none') return 1;
    const matrix3dMatch = transform.match(/matrix3d\(([^)]+)\)/);
    if (matrix3dMatch) {
      const values = matrix3dMatch[1].split(',').map((v) => Number(v.trim()));
      return Number.isFinite(values[0]) ? values[0] : 1;
    }
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(',').map((v) => Number(v.trim()));
      return Number.isFinite(values[0]) ? values[0] : 1;
    }
    return 1;
  };

  const prevButtonVisibleRef = useRef(false);
  useLayoutEffect(() => {
    const prevVisible = prevButtonVisibleRef.current;
    if (prevVisible && !buttonVisible) {
      const el = askBtnRef.current;
      if (el) {
        const computed = getComputedStyle(el);
        setFrozenScale(parseScaleFromTransform(computed.transform));
        setFrozenTransform(computed.transform && computed.transform !== 'none' ? computed.transform : 'translateY(-50%) scale(1)');
      } else {
        setFrozenScale(1);
        setFrozenTransform('translateY(-50%) scale(1)');
      }
      setIsHidingAskBtn(true);
      if (askHideTimerRef.current !== null) {
        clearTimeout(askHideTimerRef.current);
      }
      askHideTimerRef.current = setTimeout(() => {
        setIsHidingAskBtn(false);
        setFrozenScale(1);
        setFrozenTransform(null);
        askHideTimerRef.current = null;
      }, ASK_FADE_MS);
    } else if (buttonVisible) {
      if (askHideTimerRef.current !== null) {
        clearTimeout(askHideTimerRef.current);
        askHideTimerRef.current = null;
      }
      setIsHidingAskBtn(false);
      setFrozenScale(1);
      setFrozenTransform(null);
    }
    prevButtonVisibleRef.current = buttonVisible;
  }, [buttonVisible]);

  // 当节点失去 selected 状态时，强制清除 isHovered
  const prevSelectedRef = useRef(selected);
  useEffect(() => {
    if (!selected && prevSelectedRef.current) {
      setIsHovered(false);
    }
    prevSelectedRef.current = selected;
  }, [selected, id]);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current !== null) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      if (handleAttachTimerRef.current !== null) {
        clearTimeout(handleAttachTimerRef.current);
        handleAttachTimerRef.current = null;
      }
      if (rightHandleAnimRef.current !== null) {
        cancelAnimationFrame(rightHandleAnimRef.current);
        rightHandleAnimRef.current = null;
      }
      if (askHideTimerRef.current !== null) {
        clearTimeout(askHideTimerRef.current);
        askHideTimerRef.current = null;
      }
      if (transitionLockTimerRef.current !== null) {
        clearTimeout(transitionLockTimerRef.current);
        transitionLockTimerRef.current = null;
      }
    };
  }, []);


  return (
    <motion.div
      ref={containerRef}
      className={`acard-node-wrapper ${selected ? 'selected' : ''} ${forceTiny ? 'acard-node-wrapper--tiny-zoom' : ''}`}
      initial={disableEnterAnimation ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={disableEnterAnimation ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
      style={{ width: CARD_WIDTH, position: 'relative' }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
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
      <CustomTooltip
        placement="right"
        content="追问卡片内容"
        size={dynamicTooltipSize}
      >
        <button
          ref={askBtnRef}
          className={`acard-node__ask-btn acard-node__ask-btn--visible ${isHidingAskBtn ? 'acard-node__ask-btn--hiding' : ''}`}
          style={{
            pointerEvents: buttonVisible ? 'auto' : 'none',
            ['--ask-btn-scale' as string]: `${frozenScale}`,
            opacity: buttonVisible ? 1 : 0,
            transform: isHidingAskBtn && frozenTransform ? frozenTransform : undefined,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (data.onAsk) {
              data.onAsk();
            }
          }}
          type="button"
          aria-label="追问卡片内容"
        >
          <FollowUpIcon width={24} height={24} />
        </button>
      </CustomTooltip>
      {!suppressHandles && (
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
      )}
      <AnswerCard
        title={data.title}
        content={data.content}
        isGenerating={data.isGenerating}
        isCompleted={!data.isGenerating}
        isSelected={selected}
        isOpen={data.isOpen}
        onPause={data.onPause}
        onCollapse={() => {
          const nextCollapsed = !isCollapsedLocal;
          setIsCollapsedLocal(nextCollapsed);
          if (data.onCollapse) {
            data.onCollapse();
          }
        }}
        onExpand={data.onExpand}
        onCopy={data.onCopy}
        onCopyError={data.onCopyError}
        onClick={data.onClick}
        onLocate={data.onLocate}
        onRelatedQuestionClick={data.onRelatedQuestionClick}
        relatedQuestions={data.relatedQuestions}
        tooltipSize={dynamicTooltipSize}
      />
      {!suppressHandles && (
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
      )}
      {!suppressHandles && (
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
            right: `${rightHandlePos}px`
          }}
        />
      )}
    </motion.div>
  );
};

export default React.memo(ACardNode);
