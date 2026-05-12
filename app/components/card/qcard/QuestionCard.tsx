'use client';

// 1. 导入 useLayoutEffect 和 useRef
import React, { useState, useLayoutEffect, useRef, useEffect } from "react";
import Image from 'next/image';
import { motion } from "framer-motion";
import { QCardProps } from "../../../types/qacard";
import { PullIcon, CopyIcon } from "../../icons";
import { CustomTooltip } from "../../ui/CustomTooltip";
import "./questioncard.css";
import { TooltipProps } from "@heroui/react";

interface CustomQCardProps extends QCardProps {
  tooltipSize?: TooltipProps['size'];
}

export default function QuestionCard({
  question,
  avatar,
  isSelected = false,
  isInitiallyCollapsed = false,
  isCollapsed: isCollapsedProp,
  onClick,
  onCollapse,
  onCopy,
  onCopyError,
  tooltipSize = 'sm'
}: CustomQCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(isCollapsedProp ?? isInitiallyCollapsed);
  const [_isCopied, _setIsCopied] = useState(false);
  const [isContentScrollable, setIsContentScrollable] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    if (typeof isCollapsedProp === 'boolean') {
      setIsCollapsed(isCollapsedProp);
    }
  }, [isCollapsedProp]);

  // 2. 创建三个 Ref
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const detailStyle = {
    opacity: 1,
    transition: 'opacity 180ms ease',
    pointerEvents: 'auto' as const,
  };

  // ... (handleButtonPress, handleButtonRelease, handleCopy, handleCardClick 保持不变) ...
  
  const handleButtonPress = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.add('btn-active');
  };

  const handleButtonRelease = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.remove('btn-active');
  };
  
  const handleCopy = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    navigator.clipboard.writeText(question)
      .then(() => {
        if (onCopy) {
          onCopy();
        }
      })
      .catch(err => {
        if (onCopyError) {
          onCopyError(err);
        }
      });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected && onClick) {
      onClick();
    }
  };

  const handleCollapseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isCollapsed;
    setIsCollapsed(next);
    onCollapse?.(next);
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查 Ctrl 或 Meta (Cmd) 键
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      }
    };
    const handleBlur = () => {
      // 窗口失焦时重置状态
      setIsCtrlPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useLayoutEffect(() => {
    if (contentRef.current) {
      const isScrollable = contentRef.current.scrollHeight > contentRef.current.clientHeight;
      setIsContentScrollable(isScrollable);
    }
  }, [question, isCollapsed]);

  // 3. 使用 useLayoutEffect 测量并设置高度
  useLayoutEffect(() => {
    if (cardRef.current && headerRef.current && contentWrapperRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      
      if (isCollapsed) {
        cardRef.current.style.maxHeight = `${headerHeight}px`;
      } else {
        const contentHeight = contentWrapperRef.current.scrollHeight;
        cardRef.current.style.maxHeight = `${headerHeight + contentHeight}px`;
      }
    }
  }, [isCollapsed, question]); // 依赖项：收起状态和问题文本

  return (
    <motion.div 
      // 4. 绑定 cardRef
      ref={cardRef}
      className={`qcard__background-card ${isSelected ? 'qcard__background-card--selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="qcard__background-card-wrapper">
        {/* 5. 绑定 headerRef */}
        <div className="qcard__header" ref={headerRef} style={detailStyle}>
            <div className="qcard__header-left">
              {avatar && <Image src={avatar} alt="avatar" className="qcard__avatar" width={24} height={24} />}
              <div className="qcard__header-title">{question}</div>
            </div>
          <div className="qcard__header-actions">
              <CustomTooltip 
                content={isCollapsed ? "展开" : "收起"} 
                placement="bottom"
                size={tooltipSize}
              >
                <button
                  className="qcard__icon-btn qcard__header-btn"
                  onClick={handleCollapseToggle}
                  onMouseDown={handleButtonPress}
                  onMouseUp={handleButtonRelease}
                  onMouseLeave={handleButtonRelease}
                  onPointerDown={(e) => e.stopPropagation()}
                  type="button"
                  aria-label={isCollapsed ? "展开" : "收起"}
                >
                  <PullIcon width={24} height={24} className={isCollapsed ? "rotate-180" : ""} />
                </button>
              </CustomTooltip>
          </div>
        </div>

        <motion.div 
          className={`qcard__body ${isCollapsed ? 'qcard__body--collapsed' : ''}`}
          style={detailStyle}
          animate={{
            opacity: isCollapsed ? 0 : 1
          }}
          transition={{
            duration: 0.3, 
            ease: [0.25, 0.46, 0.45, 0.94] 
          }}
        >
          {/* 6. 绑定 contentWrapperRef */}
          <div className="qcard__body-content-wrapper" ref={contentWrapperRef}>
            <div 
              ref={contentRef}
              className={`qcard__content nopan nodrag ${isContentScrollable && !isCtrlPressed ? 'nowheel' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {question}
            </div>
            <div className="qcard__footer">
                <div /> 
                <CustomTooltip 
                  content={"复制"}
                  placement="bottom"
                  size={tooltipSize}
                >
                  <motion.button
                    className="qcard__icon-btn qcard__footer-btn"
                    onClick={handleCopy}
                    onMouseDown={handleButtonPress as any}
                    onMouseUp={handleButtonRelease as any}
                    onMouseLeave={handleButtonRelease as any}
                    onPointerDown={(e) => e.stopPropagation()}
                    type="button"
                    aria-label="复制"
                    variants={iconVariants}
                    animate={isCollapsed ? "closed" : "open"}
                  >
                    <CopyIcon width={20} height={20} />
                  </motion.button>
                </CustomTooltip>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
