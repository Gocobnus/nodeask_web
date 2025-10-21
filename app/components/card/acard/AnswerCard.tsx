'use client';

// 导入 useLayoutEffect 和 useRef, useEffect
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { ACardProps } from "../../../types/qacard";
interface CustomACardProps extends ACardProps {
  onLocate?: () => void;
  relatedQuestions?: string[];
}

import { Button, Listbox, ListboxItem, useDisclosure } from "@heroui/react";
import { PullIcon, StopIcon, CardDeleteIcon, CopyIcon, ExplodeIcon, SendIcon, LocationIcon, CloseIcon, ContractIcon } from "../../icons";
import { CustomTooltip } from "../../ui/CustomTooltip";
import { CustomDrawer } from './CustomDrawer';
import "./answercard.css"; // 确保 CSS 文件已导入


export default function AnswerCard({
  title,
  content,
  isGenerating = false,
  isCompleted = false,
  isSelected = false,
  onPause,
  onCollapse,
  onExpand,
  onCopy,
  onCopyError,
  onClick,
  onDelete,
  onFollowUp,
  onLocate,
  relatedQuestions = []
}: CustomACardProps) {
  const [activeTab, setActiveTab] = useState<'answer' | 'related'>('answer');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [answerContentHeight, setAnswerContentHeight] = useState<number | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); 

  const {isOpen, onOpenChange} = useDisclosure();

  // --- 👇 读取 CSS 变量 ---
  // 1. 创建 state 来存储读取到的 CSS 变量值，给一个默认值以防读取失败
  const [answerBottomMargin, setAnswerBottomMargin] = useState<number>(16); 

  // 2. 使用 useEffect 在组件挂载后读取 CSS 变量
  useEffect(() => {
    if (cardRef.current) {
      // 获取 card 元素的计算样式
      const styles = getComputedStyle(cardRef.current);
      // 读取 CSS 变量 '--acard-inner-margin-bottom' 的值
      const marginBottomValue = styles.getPropertyValue('--acard-inner-margin-bottom').trim();
      // 解析值（例如 '16px' -> 16）
      const parsedValue = parseInt(marginBottomValue, 10);
      // 如果解析成功且不是 NaN，则更新 state
      if (!isNaN(parsedValue)) {
        setAnswerBottomMargin(parsedValue);
      }
    }
  }, []); // 空依赖数组确保只在挂载时运行一次
  // --- 读取结束 ---

  const listBoxItems = relatedQuestions.map((q, index) => ({ id: index.toString(), text: q }));

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
    if (activeTab === 'related') {
      const questionsText = relatedQuestions.map(q => `- ${q}`).join('\n');
      navigator.clipboard.writeText(questionsText)
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
    } else {
      navigator.clipboard.writeText(content || "")
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
    }
  };

  const handleLocateClick = () => {
    if (onLocate) {
      onLocate();
    } else if (onClick) {
      onClick();
    }
  };
  
  const handleDrawerCopy = () => {
    const answerText = content || "";
    const questionsText = relatedQuestions.map(q => `- ${q}`).join('\n');
    const combinedText = `回答:\n${answerText}\n\n相关问题:\n${questionsText}`;
    
    navigator.clipboard.writeText(combinedText)
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

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected && onClick) {
      onClick();
    }
  };
  
  const handleCollapseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isCollapsed && contentRef.current) {
      setScrollPosition(contentRef.current.scrollTop);
    }
    
    setIsCollapsed(prev => !prev);
    
    if (onCollapse) {
      onCollapse();
    }
    
  };
  
  useLayoutEffect(() => {
    if (cardRef.current && headerRef.current && contentWrapperRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      
      if (isCollapsed) {
        cardRef.current.style.maxHeight = `${headerHeight}px`;
      } else {
        const contentHeight = contentWrapperRef.current.scrollHeight;
        // --- 👇 使用 state 中的值 ---
        cardRef.current.style.maxHeight = `${headerHeight + contentHeight + answerBottomMargin}px`;
        // --- 使用结束 ---
      }
    }
  // --- 👇 添加 answerBottomMargin 依赖 ---
  }, [isCollapsed, content, activeTab, answerBottomMargin]); 

  useEffect(() => {
    if (!isCollapsed && contentRef.current && scrollPosition > 0) {
      contentRef.current.scrollTop = scrollPosition;
    }
  }, [isCollapsed, scrollPosition]);


  useEffect(() => {
    if (contentRef.current) {
      const updateHeight = () => {
        if (activeTab === 'answer') {
          const contentHeight = contentRef.current?.offsetHeight || 0;
          setAnswerContentHeight(contentHeight);
        }
      };
      
      updateHeight();
      
      const resizeObserver = new ResizeObserver(updateHeight);
      if (contentRef.current) {
        resizeObserver.observe(contentRef.current);
      }
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [activeTab, content, isCollapsed]);

  return (
    <motion.div 
      ref={cardRef}
      className={`acard__background-card ${isSelected ? 'acard__background-card--selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="acard__background-card-wrapper">
        {onDelete && (
          <CustomTooltip 
            placement="left"
            content="删除" 
          >
           <button
              className="acard__delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
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

        <div className="acard__header" ref={headerRef}>
            <div className="acard__title">
              {title}
            </div>
          <div className="acard__header-actions">
              {isGenerating && (
                <CustomTooltip 
                  content="暂停回答" 
                  placement="bottom"
                >
                  <button
                    className="acard__icon-btn acard__header-btn"
                    onClick={onPause}
                    onMouseDown={handleButtonPress}
                    onMouseUp={handleButtonRelease}
                    onMouseLeave={handleButtonRelease}
                    type="button"
                    aria-label="暂停回答"
                  >
                    <StopIcon width={24} height={24} />
                  </button>
                </CustomTooltip>
              )}
              
              <CustomTooltip 
                content={isCollapsed ? "展开" : "收起"} 
                placement="bottom"
              >
                <button
                  className="acard__icon-btn acard__header-btn"
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
          className={`acard__answer ${isCollapsed ? 'acard__answer--collapsed' : ''} nodrag`}
          animate={{
            opacity: isCollapsed ? 0 : 1
          }}
          transition={{
            duration: 0.3, 
            ease: [0.25, 0.46, 0.45, 0.94] 
          }}
        >
          <div className="acard__answer-content-wrapper" ref={contentWrapperRef}>
            <LayoutGroup>
              <div className="acard__tabs">
                <div 
                  className={`acard__tab ${activeTab === 'answer' ? 'acard__tab--active' : ''}`}
                  onClick={() => setActiveTab('answer')}
                >
                  回答
                  {activeTab === 'answer' && <motion.div className="acard__tab-underline" layoutId="underline" transition={{ type: 'tween', duration: 0.2 }} />}
                </div>
                <div 
                  className={`acard__tab ${activeTab === 'related' ? 'acard__tab--active' : ''}`}
                  onClick={() => setActiveTab('related')}
                >
                  相关问题
                  {activeTab === 'related' && <motion.div className="acard__tab-underline" layoutId="underline" transition={{ type: 'tween', duration: 0.2 }} />}
                </div>
              </div>
            </LayoutGroup>

            <div 
              className="acard__content" 
              ref={contentRef}
              style={{
                height: activeTab === 'answer' ? 'auto' : (answerContentHeight ? `${answerContentHeight}px` : 'auto'),
                flex: activeTab === 'answer' ? '1' : 'none'
              }}
            >
              {activeTab === 'answer' ? (
                content || "这里是回答内容的占位文本。实际使用时这里会渲染markdown内容，支持流式更新显示。当前显示的是静态占位内容，用于展示卡片的基本样式和布局效果.支持多行文本显示，可以包含各种格式的内容。"
              ) : (
                <div className="acard__related-questions-list">
                  <Listbox
                    aria-label="相关问题"
                    selectionMode="none"
                    items={listBoxItems}
                    onAction={(key) => console.log(`Chose related question: ${key}`)}
                    itemClasses={{
                      base: "acard__related-question-item",
                    }}
                    classNames={{
                      base: "p-0",
                      list: "gap-0",
                    }}
                  >
                    {(item) => (
                      <ListboxItem key={item.id} textValue={item.text}>{item.text}</ListboxItem>
                    )}
                  </Listbox>
                </div>
              )}
            </div>
            <div className="acard__footer">
                {isCompleted && onExpand ? (
                  <CustomTooltip 
                    content={isOpen ? "收起" : "展开"} 
                    placement="bottom"
                  >
                    <motion.button
                      className="acard__icon-btn acard__footer-btn"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (!isOpen && onClick) {
                          onClick(e);
                        }
                        onOpenChange(); 
                      }}
                      onMouseDown={handleButtonPress as any}
                      onMouseUp={handleButtonRelease as any}
                      onMouseLeave={handleButtonRelease as any}
                      type="button"
                      aria-label={isOpen ? "收起" : "展开"}
                      variants={iconVariants}
                      animate={isCollapsed ? "closed" : "open"}
                    >
                      {isOpen ? <ContractIcon width={20} height={20} /> : <ExplodeIcon width={20} height={20} />}
                    </motion.button>
                  </CustomTooltip>
                ) : <div />}

                {isCompleted && onFollowUp && (
                  <div className="acard__follow-up-wrapper">
                    <Button
                      size="sm"
                      variant="solid"
                      className="custom-follow-up-btn"
                      endContent={<SendIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFollowUp();
                      }}
                    >
                      追问卡片知识
                    </Button>
                  </div>
                )}

                {isCompleted && onCopy ? (
                  <CustomTooltip 
                    content={activeTab === 'answer' ? "复制回答" : "复制问题列表"}
                    placement="bottom"
                  >
                    <motion.button
                      className="acard__icon-btn acard__footer-btn"
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
                ) : <div />}
            </div>
          </div>
        </motion.div>
      </div>
      
      <CustomDrawer isOpen={isOpen} onClose={onOpenChange} className="acard__drawer">
        <div className="drawer__header">
          <CustomTooltip content="定位卡片" placement="bottom">
            <button className="acard__icon-btn drawer__location-btn" onClick={handleLocateClick}>
              <LocationIcon/>
            </button>
          </CustomTooltip>
          <CustomTooltip content="关闭" placement="bottom">
            <button className="acard__icon-btn drawer__close-btn" onClick={onOpenChange}>
              <CloseIcon />
            </button>
          </CustomTooltip>
        </div>
        <div className="drawer-section-title drawer__fixed-title">回答</div>
        <div className="drawer__content-area drawer__content-area--with-fixed-title">
          {content || "这里是回答内容的占位文本。实际使用时这里会渲染markdown内容，支持流式更新显示。当前显示的是静态占位内容，用于展示卡片的基本样式和布局效果.支持多行文本显示，可以包含各种格式的内容。"}
        </div>
        <div className="drawer__related-questions">
          <div className="drawer-section-title">相关问题</div>
          <Listbox
              aria-label="相关问题"
              selectionMode="none"
              items={listBoxItems}
              onAction={(key) => console.log(`Chose related question: ${key}`)}
              itemClasses={{
                base: "acard__related-question-item",
              }}
              classNames={{
                base: "p-0",
                list: "gap-0",
              }}
            >
              {(item) => (
                <ListboxItem key={item.id} textValue={item.text}>{item.text}</ListboxItem>
              )}
            </Listbox>
        </div>
        <div className="acard__drawer-footer">
          <Button variant="light" onPress={onOpenChange} className="drawer-btn-close">
            Close
          </Button>
          <Button onPress={handleDrawerCopy} className="drawer-btn-copy">
            Copy
          </Button>
        </div>
      </CustomDrawer>
    </motion.div>
  );
}