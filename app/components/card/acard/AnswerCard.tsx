'use client';

import React, { useState, useRef, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { ACardProps } from "../../../types/qacard";
import { Button, Listbox, ListboxItem, useDisclosure, Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from "@heroui/react";
import { PullIcon, StopIcon, CardDeleteIcon, CopyIcon, ExplodeIcon, SendIcon, LocationIcon, CloseIcon } from "../../icons";
import { CustomTooltip } from "../../ui/CustomTooltip";
import "./answercard.css";

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
  onFollowUp
}: ACardProps) {
  const [activeTab, setActiveTab] = useState<'answer' | 'related'>('answer');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [answerContentHeight, setAnswerContentHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const {isOpen, onOpen, onOpenChange} = useDisclosure();

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
              type="button"
              aria-label="删除"
            >
              <CardDeleteIcon width={24} height={24} />
            </button>
          </CustomTooltip>
        )}

        <div className="acard__header">
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
                    <ListboxItem key="q1">如何更好地进行时间管理？</ListboxItem>
                    <ListboxItem key="q2">有哪些值得推荐的深度学习入门书籍？</ListboxItem>
                    <ListboxItem key="q3">如何克服公开演讲的恐惧？</ListboxItem>
                    <ListboxItem key="q4">未来十年，最有前景的编程语言是什么？</ListboxItem>
                    <ListboxItem key="q5">如何克服公开演讲的恐惧？</ListboxItem>
                  </Listbox>
                </div>
              )}
            </div>
            <div className={`acard__footer ${activeTab === 'related' ? 'acard__footer--center' : ''}`}>
              {activeTab === 'answer' ? (
                <>
                  {isCompleted && onExpand ? (
                    <CustomTooltip 
                      content="展开" 
                      placement="bottom"
                    >
                      <motion.button
                        className="acard__icon-btn acard__footer-btn"
                        onClick={onOpenChange}
                        type="button"
                        aria-label="展开"
                        variants={iconVariants}
                        animate={isCollapsed ? "closed" : "open"}
                      >
                        <ExplodeIcon width={20} height={20} />
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
                      content="复制" 
                      placement="bottom"
                    >
                      <motion.button
                        className="acard__icon-btn acard__footer-btn"
                        onClick={onCopy}
                        type="button"
                        aria-label="复制"
                        variants={iconVariants}
                        animate={isCollapsed ? "closed" : "open"}
                      >
                        <CopyIcon width={20} height={20} />
                      </motion.button>
                    </CustomTooltip>
                  ) : <div />}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      <Drawer
        isOpen={isOpen}
        isDismissable={false}
        shouldBlockScroll={false}
        backdrop="transparent"
        motionProps={{
          variants: {
            enter: {
              opacity: 1,
              x: 0,
            },
            exit: {
              x: 100,
              opacity: 0, 
            },
          },
        }}
        onOpenChange={onOpenChange}
        className="acard__drawer"
        hideCloseButton={true}
        classNames={{
          wrapper: "acard-drawer-wrapper",
          backdrop: "acard-drawer-backdrop",
          base: "acard-drawer-base",
        }}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="drawer__header">
                <CustomTooltip content="定位卡片" placement="bottom">
                  <button className="acard__icon-btn drawer__location-btn">
                    <LocationIcon/>
                  </button>
                </CustomTooltip>
                <CustomTooltip content="关闭" placement="bottom">
                  <button className="acard__icon-btn drawer__close-btn" onClick={onOpenChange}>
                    <CloseIcon />
                  </button>
                </CustomTooltip>
              </DrawerHeader>
              <DrawerBody>
                <div className="drawer__content-area">
                  {content || "这里是回答内容的占位文本。实际使用时这里会渲染markdown内容，支持流式更新显示。当前显示的是静态占位内容，用于展示卡片的基本样式和布局效果.支持多行文本显示，可以包含各种格式的内容。"}
                </div>
                <div className="drawer__related-questions">
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
                      <ListboxItem key="q1">如何更好地进行时间管理？</ListboxItem>
                      <ListboxItem key="q2">有哪些值得推荐的深度学习入门书籍？</ListboxItem>
                      <ListboxItem key="q3">如何克服公开演讲的恐惧？</ListboxItem>
                      <ListboxItem key="q4">未来十年，最有前景的编程语言是什么？</ListboxItem>
                      <ListboxItem key="q5">如何克服公开演讲的恐惧？</ListboxItem>
                    </Listbox>
                </div>
              </DrawerBody>
              <DrawerFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button onPress={() => {
                  if(onCopy) onCopy();
                  onClose();
                }}>Copy</Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </motion.div>
  );
}