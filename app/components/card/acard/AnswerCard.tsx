'use client';

// 导入需要的 React Hooks 和类型
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
// 路径可能需要根据您的项目结构调整
import { ACardProps } from "../../../types/qacard";
import { TooltipProps } from "@heroui/react";

interface CustomACardProps extends ACardProps {
  onLocate?: () => void;
  relatedQuestions?: string[];
  tooltipSize?: TooltipProps['size'];
}

// 导入 HeroUI 组件和自定义组件
import { Button, Listbox, ListboxItem, useDisclosure } from "@heroui/react";
// 路径可能需要根据您的项目结构调整
import { PullIcon, StopIcon, CardDeleteIcon, CopyIcon, ExplodeIcon, SendIcon, LocationIcon, CloseIcon, ContractIcon } from "../../icons";
// 路径可能需要根据您的项目结构调整
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
  onFollowUp,
  onLocate,
  relatedQuestions = [],
  tooltipSize = 'sm'
}: CustomACardProps) {
  // 基础状态
  const [activeTab, setActiveTab] = useState<'answer' | 'related'>('answer');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [answerContentHeight, setAnswerContentHeight] = useState<number | null>(null);

  // --- 👇 添加 Tooltip 相关状态 ---
  const [isTitleTooltipDisabled, setIsTitleTooltipDisabled] = useState(true);
  // --- 结束 ---

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const answerTabRef = useRef<HTMLDivElement>(null);
  const relatedTabRef = useRef<HTMLDivElement>(null);

  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  // Drawer 状态
  const {isOpen, onOpenChange} = useDisclosure();

  // State 用于存储从 CSS 读取的 margin 值
  const [answerBottomMargin, setAnswerBottomMargin] = useState<number>(16);
  
  useLayoutEffect(() => {
    // 测量 activeTab 并更新下划线样式
    // 我们使用 requestAnimationFrame 来确保测量发生在下一次绘制前
    const measureAndUpdate = () => {
      if (activeTab === 'answer' && answerTabRef.current) {
        setUnderlineStyle({
          left: answerTabRef.current.offsetLeft,
          width: answerTabRef.current.offsetWidth,
        });
      } else if (activeTab === 'related' && relatedTabRef.current) {
        setUnderlineStyle({
          left: relatedTabRef.current.offsetLeft,
          width: relatedTabRef.current.offsetWidth,
        });
      }
    };

    // 立即执行一次
    measureAndUpdate();
    
    // (可选) 如果窗口大小变化，也重新测量
    window.addEventListener('resize', measureAndUpdate);
    return () => window.removeEventListener('resize', measureAndUpdate);

  }, [activeTab]); // 依赖项是 activeTab

  // Effect: 读取 CSS 变量
  useEffect(() => {
    if (cardRef.current) {
      const styles = getComputedStyle(cardRef.current);
      const marginBottomValue = styles.getPropertyValue('--acard-inner-margin-bottom').trim(); //
      const parsedValue = parseInt(marginBottomValue, 10);
      if (!isNaN(parsedValue)) {
        setAnswerBottomMargin(parsedValue);
      }
    }
  }, []);

  // 相关问题列表数据
  const listBoxItems = relatedQuestions.map((q, index) => ({ id: index.toString(), text: q }));

  // --- 事件处理函数 ---
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

  // --- Effects ---

  // Effect: 计算并设置卡片的 max-height 以实现动画
  useLayoutEffect(() => {

    if (cardRef.current && headerRef.current && contentWrapperRef.current) {
      const headerHeight = headerRef.current.offsetHeight;

      if (isCollapsed) {
        cardRef.current.style.maxHeight = `${headerHeight}px`;
      } else {
        const contentHeight = contentWrapperRef.current.scrollHeight;
        cardRef.current.style.maxHeight = `${headerHeight + contentHeight + answerBottomMargin}px`;
      }
    }
  }, [isCollapsed, content, activeTab, answerBottomMargin]);

  // Effect: 恢复滚动条位置
  useEffect(() => {

    if (!isCollapsed && contentRef.current && scrollPosition > 0) {
      contentRef.current.scrollTop = scrollPosition;
    }
  }, [isCollapsed, scrollPosition]);

  // Effect: 同步"相关问题"Tab的高度与"回答"Tab内容的高度
  useEffect(() => {
    if (contentRef.current) {
      const updateHeight = () => {
        if (activeTab === 'answer') {
          const currentContentHeight = contentRef.current?.offsetHeight || 0;
          setAnswerContentHeight(currentContentHeight);
        }
      };

      updateHeight();

      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(contentRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [activeTab, content, isCollapsed]);

  useLayoutEffect(() => {
    const checkTruncation = () => {
      const element = titleRef.current;
      if (element) {
        // 如果滚动宽度大于可见宽度，则启用 tooltip (isDisabled = false)
        const isTruncated = element.scrollWidth > element.offsetWidth;
        setIsTitleTooltipDisabled(!isTruncated); 
      }
    };

    checkTruncation(); // 初始检查

    // 可选：添加 ResizeObserver 监听容器宽度变化，以便动态更新 tooltip 状态
    const resizeObserver = new ResizeObserver(checkTruncation);
    if (titleRef.current) {
      resizeObserver.observe(titleRef.current);
    }

    return () => {
      resizeObserver.disconnect(); // 清理 observer
    };
  // 依赖项：当 title 文本变化时重新检查
  }, [title]);
  // --- Effect 结束 ---

  // --- Render ---
  return (
    <motion.div
      ref={cardRef}
      className={`acard__background-card ${isSelected ? 'acard__background-card--selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="acard__background-card-wrapper">
        <div className="acard__header" ref={headerRef}>
            <CustomTooltip
              content={title} // Tooltip 显示完整标题
              placement="top" // 或者你希望的位置
              isDisabled={isTitleTooltipDisabled} // 根据状态控制是否禁用
              size={tooltipSize}
            >
              <div className="acard__title" ref={titleRef}> 
                {title}
              </div>
            </CustomTooltip>
          <div className="acard__header-actions">
              {/* 暂停按钮 */}
              {isGenerating && (
                <CustomTooltip
                  content="暂停回答"
                  placement="bottom"
                  size={tooltipSize}
                >
                  <button
                    className="acard__icon-btn acard__header-btn"
                    onClick={onPause}
                    onMouseDown={handleButtonPress}
                    onMouseUp={handleButtonRelease}
                    onMouseLeave={handleButtonRelease}
                    onPointerDown={(e) => e.stopPropagation()}
                    type="button"
                    aria-label="暂停回答"
                  >
                    <StopIcon width={24} height={24} />
                  </button>
                </CustomTooltip>
              )}

              {/* 收起/展开按钮 */}
              <CustomTooltip
                content={isCollapsed ? "展开" : "收起"}
                placement="bottom"
                size={tooltipSize}
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

        {/* 卡片内容区域 */}
        <motion.div
          className={`acard__answer ${isCollapsed ? 'acard__answer--collapsed' : ''}`}
          animate={{
            opacity: isCollapsed ? 0 : 1 // 控制透明度动画
          }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          {/* 内容包装器，用于高度计算 */}
          <div className="acard__answer-content-wrapper" ref={contentWrapperRef}>
            <div className="acard__tabs">
                <div
                  ref={answerTabRef} // <-- 添加 Ref
                  className={`acard__tab ${activeTab === 'answer' ? 'acard__tab--active' : ''}`}
                  onClick={() => setActiveTab('answer')}
                >
                  回答
                </div>
                <div
                  ref={relatedTabRef} // <-- 添加 Ref
                  className={`acard__tab ${activeTab === 'related' ? 'acard__tab--active' : ''}`}
                  onClick={() => setActiveTab('related')}
                >
                  相关问题
                </div>
                <motion.div 
                  className="acard__tab-underline"
                  animate={underlineStyle} // <-- 使用 animate 驱动 left 和 width
                  transition={{ type: 'tween', duration: 0.2 }}
                />
              </div>

            {/* 内容或相关问题 */}
            <div
              className="acard__content nodrag"
              ref={contentRef} // 用于滚动条和高度同步
              style={{
                // 当"相关问题"Tab激活时，使用 state 中的高度来保持一致
                height: activeTab === 'answer' ? 'auto' : (answerContentHeight ? `${answerContentHeight}px` : 'auto'),
                flex: activeTab === 'answer' ? '1' : 'none' // 只有"回答"Tab允许 flex 增长
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {activeTab === 'answer' ? (
                content || "这里是回答内容的占位文本..."
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

            {/* 底部操作栏 */}
            <div className="acard__footer">
                {/* 展开/收起 Drawer 按钮 */}
                {isCompleted && onExpand ? (
                  <CustomTooltip
                    content={isOpen ? "收起" : "展开"}
                    placement="bottom"
                    size={tooltipSize}
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
                      onPointerDown={(e) => e.stopPropagation()}
                      type="button"
                      aria-label={isOpen ? "收起" : "展开"}
                      variants={iconVariants}
                      animate={isCollapsed ? "closed" : "open"}
                    >
                      {isOpen ? <ContractIcon width={20} height={20} /> : <ExplodeIcon width={20} height={20} />}
                    </motion.button>
                  </CustomTooltip>
                ) : <div /> /* 占位符保持布局 */}

                {/* 追问按钮 */}
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
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      追问卡片知识
                    </Button>
                  </div>
                )}

                {/* 复制按钮 */}
                {isCompleted && onCopy ? (
                  <CustomTooltip
                    content={activeTab === 'answer' ? "复制回答" : "复制问题列表"}
                    placement="bottom"
                    size={tooltipSize}
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
                ) : <div /> /* 占位符 */}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 抽屉组件 */}
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
        <div className="drawer-section-title drawer__fixed-title">{title}</div>
        <div className="drawer__content-area drawer__content-area--with-fixed-title">
          {content || "这里是回答内容的占位文本..."}
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
