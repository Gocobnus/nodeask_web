'use client';

import React, { useState, useRef, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { ACardProps } from "../../../types/qacard";
interface CustomACardProps extends ACardProps {
  onLocate?: () => void;
}

import { Button, Listbox, ListboxItem, useDisclosure } from "@heroui/react";
import { PullIcon, StopIcon, CardDeleteIcon, CopyIcon, ExplodeIcon, SendIcon, LocationIcon, CloseIcon, ContractIcon } from "../../icons";
import { CustomTooltip } from "../../ui/CustomTooltip";
import { CustomDrawer } from './CustomDrawer';
import "./answercard.css";

const relatedQuestions = [
  { key: "q1", text: "如何更好地进行时间管理？" },
  { key: "q2", text: "有哪些值得推荐的深度学习入门书籍？" },
  { key: "q3", text: "如何克服公开演讲的恐惧？" },
  { key: "q4", text: "未来十年，最有前景的编程语言是什么？" },
  { key: "q5", text: "如何设计一个高效的个人知识管理系统？" },
];

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
  onClick,
  onDelete,
  onFollowUp,
  onLocate
}: CustomACardProps) {
  const [activeTab, setActiveTab] = useState<'answer' | 'related'>('answer');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [answerContentHeight, setAnswerContentHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const {isOpen, onOpen, onOpenChange} = useDisclosure();

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
      const questionsText = relatedQuestions.map(q => `- ${q.text}`).join('\n');
      navigator.clipboard.writeText(questionsText).then(() => {
        console.log("Related questions copied!");
      });
    } else {
      if (onCopy) {
        onCopy();
      }
    }
  };

  const handleLocateClick = () => {
    if (onLocate) {
      onLocate();
    }
  };
  
  const handleDrawerCopy = () => {
    const answerText = content || "";
    const questionsText = relatedQuestions.map(q => `- ${q.text}`).join('\n');
    const combinedText = `回答:\n${answerText}\n\n相关问题:\n${questionsText}`;
    
    navigator.clipboard.writeText(combinedText).then(() => {
      console.log("Drawer content copied!");
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

  const handleCardClick = () => {
    if (!isSelected && onClick) {
      onClick();
    }
  };
  
  const handleCollapseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isCollapsed && contentRef.current) {
      setScrollPosition(contentRef.current.scrollTop);
    }
    
    if (isCollapsed) {
      setIsCollapsed(false);
    } else {
      setIsCollapsed(true);
    }
    
    if (onCollapse) {
      onCollapse();
    }
    
    if (!isSelected && onClick) {
      onClick();
    }
  };
  
  useEffect(() => {
    if (!isCollapsed && contentRef.current && scrollPosition > 0) {
      contentRef.current.scrollTop = scrollPosition;
    }
  }, [isCollapsed]);

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
      className={`acard__background-card ${isSelected ? 'acard__background-card--selected' : ''} ${isCollapsed ? 'acard__background-card--collapsed' : ''}`}
      animate={{
        height: isCollapsed ? 48 : 'auto'
      }}
      transition={{
        duration: 0.3, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
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

        <div className="acard__header">
          <CustomTooltip 
            content={title} 
            placement="top" 
            className="acard__title-tooltip-content"
          >
            <div className="acard__title">
              {title}
            </div>
          </CustomTooltip>

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
          className={`acard__answer ${isCollapsed ? 'acard__answer--collapsed' : ''}`}
          animate={{
            opacity: isCollapsed ? 0 : 1
          }}
          transition={{
            duration: 0.3, 
            ease: [0.25, 0.46, 0.45, 0.94] 
          }}
        >
          <div className="acard__answer-content-wrapper">
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
                    onAction={(key) => console.log(`Chose related question: ${key}`)}
                    itemClasses={{
                      base: "acard__related-question-item",
                    }}
                    classNames={{
                      base: "p-0",
                      list: "gap-0",
                    }}
                  >
                    {relatedQuestions.map(q => (
                      <ListboxItem key={q.key}>{q.text}</ListboxItem>
                    ))}
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
                      onClick={onOpenChange}
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

        {/* --- ✨ 逻辑修改在这里 ✨ --- */}
        <div className="drawer__content-area">
          <div className="drawer-section-title">回答</div>
          {content || "这里是回答内容的占位文本。实际使用时这里会渲染markdown内容，支持流式更新显示。当前显示的是静态占位内容，用于展示卡片的基本样式和布局效果.支持多行文本显示，可以包含各种格式的内容。"}
        </div>
        <div className="drawer__related-questions">
          <div className="drawer-section-title">相关问题</div>
          <Listbox
              aria-label="相关问题"
              selectionMode="none"
              onAction={(key) => console.log(`Chose related question: ${key}`)}
              itemClasses={{
                base: "acard__related-question-item",
              }}
              classNames={{
                base: "p-0",
                list: "gap-0",
              }}
            >
              {relatedQuestions.map(q => (
                <ListboxItem key={q.key}>{q.text}</ListboxItem>
              ))}
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