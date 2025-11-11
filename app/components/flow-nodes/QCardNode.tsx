'use client';

        import React from 'react';
        import { Handle, Position, useViewport } from 'reactflow';
        import { QuestionCard } from '../card/qcard';
        import { motion } from 'framer-motion';
        import { CustomTooltip } from '../ui/CustomTooltip';
        import { CardDeleteIcon } from '../icons';
        import { TooltipProps } from '@heroui/react';

        const QCardNode = ({ data, selected }: { data: any, selected: boolean }) => {
          const { zoom } = useViewport();

          const getTooltipSize = (currentZoom: number): TooltipProps['size'] => {
            if (currentZoom < 0.8) return 'sm';
            if (currentZoom >= 0.8 && currentZoom < 1.2) return 'md';
            return 'lg';
          };
          const dynamicTooltipSize = getTooltipSize(zoom);

          return (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ width: 360, position: 'relative' }}
            >
              {data.onDelete && selected && (
                <CustomTooltip
                  placement="left"
                  content="删除"
                  size={dynamicTooltipSize}
                >
                  <button
                    className="qcard__delete-btn"
                    onClick={(e) => { e.stopPropagation(); data.onDelete(); }}
                    style={{ opacity: 1, transform: 'scale(1)', pointerEvents: 'auto', visibility: 'visible' }}
                    type="button"
                    aria-label="删除"
                  >
                    <CardDeleteIcon width={24} height={24} />
                  </button>
                </CustomTooltip>
              )}
              <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />
              <QuestionCard
                question={data.question}
                avatar={data.avatar}
                isSelected={selected}
                onClick={data.onClick}
                onCopy={data.onCopy}
                onCopyError={data.onCopyError}
                tooltipSize={dynamicTooltipSize}
              />
              <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />
            </motion.div>
          );
        };

        export default React.memo(QCardNode);