'use client';

import React from 'react';
import { Handle, Position, useViewport } from 'reactflow';
import { AnswerCard } from '../card/acard';

import { motion } from 'framer-motion';

const ACardNode = ({ data, selected }: { data: any, selected: boolean }) => {
  const { zoom } = useViewport();
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ width: 360 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent" />
      <AnswerCard 
        title={data.title}
        content={data.content}
        isGenerating={data.isGenerating}
        isCompleted={!data.isGenerating}
        isSelected={selected}
        onPause={data.onPause}
        onCollapse={data.onCollapse}
        onExpand={data.onExpand}
        onCopy={data.onCopy}
        onCopyError={data.onCopyError}
        onClick={data.onClick}
        onDelete={data.onDelete}
        onFollowUp={data.onFollowUp}
        onLocate={data.onLocate}
        relatedQuestions={data.relatedQuestions}
        zoom={zoom}
      />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent" />
    </motion.div>
  );
};

export default React.memo(ACardNode);
