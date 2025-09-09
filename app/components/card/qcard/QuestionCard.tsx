'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import { QCardProps } from "../../../types/qacard";
import { PullIcon, CardDeleteIcon, CopyIcon } from "../../icons";
import { CustomTooltip } from "../../ui/CustomTooltip";
import "./questioncard.css";



export default function QuestionCard({
  question,
  avatar,
  isSelected = false,
  isInitiallyCollapsed = false,
  onClick,
  onDelete,
  onCopy,
  onCopyError,
}: QCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(isInitiallyCollapsed);
  const [isCopied, setIsCopied] = useState(false);

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
    setIsCollapsed(prev => !prev);
    if (!isSelected && onClick) {
        onClick();
    }
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

  return (
    <motion.div 
      className={`qcard__background-card ${isSelected ? 'qcard__background-card--selected' : ''} ${isCollapsed ? 'qcard__background-card--collapsed' : ''}`}
      animate={{
        height: isCollapsed ? 48 : 'auto'
      }}
      onClick={handleCardClick}
    >
      <div className="qcard__background-card-wrapper">
        {onDelete && (
          <CustomTooltip 
            placement="left"
            content="删除" 
          >
            <button
              className="qcard__delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete();
              }}
              onMouseDown={handleButtonPress}
              onMouseUp={handleButtonRelease}
              onMouseLeave={handleButtonRelease}
              type="button"
              aria-label="删除"
            >
              <CardDeleteIcon width={24} height={24} />
            </button>
          </CustomTooltip>
        )}

        <div className="qcard__header">
            <div className="qcard__header-left">
              {avatar && <img src={avatar} alt="avatar" className="qcard__avatar" />}
              <div className="qcard__header-title">{question}</div>
            </div>
          <div className="qcard__header-actions">
              <CustomTooltip 
                content={isCollapsed ? "展开" : "收起"} 
                placement="bottom"
              >
                <button
                  className="qcard__icon-btn qcard__header-btn"
                  onClick={handleCollapseToggle}
                  onMouseDown={handleButtonPress}
                  onMouseUp={handleButtonRelease}
                  onMouseLeave={handleButtonRelease}
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
          animate={{
            opacity: isCollapsed ? 0 : 1
          }}
          transition={{
            duration: 0.3, 
            ease: [0.25, 0.46, 0.45, 0.94] 
          }}
        >
          <div className="qcard__body-content-wrapper">
            <div className="qcard__content">
              {question}
            </div>
            <div className="qcard__footer">
                <div /> 
                <CustomTooltip 
                  content={"复制"}
                  placement="bottom"
                >
                  <motion.button
                    className="qcard__icon-btn qcard__footer-btn"
                    onClick={handleCopy}
                    onMouseDown={handleButtonPress as any}
                    onMouseUp={handleButtonRelease as any}
                    onMouseLeave={handleButtonRelease as any}
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