'use client';

import React from 'react';
import { Handle, Position, useViewport } from 'reactflow';
import { QuestionCard } from '../card/qcard';

// React Flow a a prop called `data` to the node component.
// The `data` prop contains all the data that we passed to the node.
// We also get a `selected` prop that is true when the node is selected.
import { motion } from 'framer-motion';

const QCardNode = ({ data, selected }: { data: any, selected: boolean }) => {
  const { zoom } = useViewport();
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ width: 360 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent" />
      <QuestionCard 
        question={data.question}
        avatar={data.avatar}
        isSelected={selected}
        onClick={data.onClick}
        onDelete={data.onDelete}
        onCopy={data.onCopy}
        onCopyError={data.onCopyError}
        zoom={zoom}
      />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent" />
    </motion.div>
  );
};

export default React.memo(QCardNode);
