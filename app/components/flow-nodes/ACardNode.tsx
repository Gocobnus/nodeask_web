'use client';

        import React, { useState } from 'react';
        import { Handle, Position, useViewport } from 'reactflow';
        import { AnswerCard } from '../card/acard';
        import { motion, AnimatePresence } from 'framer-motion';
        import { CustomTooltip } from '../ui/CustomTooltip';
        import { CardDeleteIcon, HorizontalAskIcon } from '../icons';
        import { TooltipProps } from '@heroui/react';

        const ACardNode = ({ data, selected }: { data: any, selected: boolean }) => {
          const { zoom } = useViewport();
          const [isHovered, setIsHovered] = useState(false);

          const getTooltipSize = (currentZoom: number): TooltipProps['size'] => {
            if (currentZoom < 0.8) return 'sm';
            if (currentZoom >= 0.8 && currentZoom < 1.2) return 'md';
            return 'lg';
          };
          const dynamicTooltipSize = getTooltipSize(zoom);

          const isVisible = selected || isHovered;

          return (
            <motion.div
              className={`acard-node-wrapper ${selected ? 'selected' : ''}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ width: 360, position: 'relative' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
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
              <AnimatePresence>
                {isVisible && (
                  <CustomTooltip
                    placement="right"
                    content="追问"
                    size={dynamicTooltipSize}
                  >
                    <motion.button
                      className="acard-node__ask-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (data.onAsk) {
                          data.onAsk();
                        }
                      }}
                      type="button"
                      aria-label="追问"
                    >
                      <HorizontalAskIcon width={30} height={30}/>
                    </motion.button>
                  </CustomTooltip>
                )}
              </AnimatePresence>
              <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />
              <AnswerCard
                title={data.title}
                content={data.content}
                isGenerating={data.isGenerating}
                isCompleted={!data.isGenerating}
                isSelected={selected}
                isOpen={data.isOpen}
                onPause={data.onPause}
                onCollapse={data.onCollapse}
                onExpand={data.onExpand}
                onCopy={data.onCopy}
                onCopyError={data.onCopyError}
                onClick={data.onClick}
                onLocate={data.onLocate}
                relatedQuestions={data.relatedQuestions}
                tooltipSize={dynamicTooltipSize}
              />
              <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />
            </motion.div>
          );
        };

        export default React.memo(ACardNode);