'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { HorizontalAskIcon } from '../icons';

interface FollowUpNodeProps {
  id: string;
  data: {
    nodeId: string;        // 业务 ID
    parentACardId?: string; // 父 ACard 的业务 ID
    onClick?: () => void;
  };
}

const FollowUpNode = ({ id, data }: FollowUpNodeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        width: 24,
        height: 24,
        position: 'relative'
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: 'transparent',
          border: 'none',
          width: '1px',
          height: '1px',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />

      <button
        className="followup-node__btn"  // 使用独立的垂直追问样式
        onClick={(e) => {
          e.stopPropagation();
          if (data.onClick) {
            data.onClick();
          }
        }}
        type="button"
        aria-label="追问"
      >
        <HorizontalAskIcon width={24} height={24} />
      </button>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: 'transparent',
          border: 'none',
          width: '1px',
          height: '1px',
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </motion.div>
  );
};

export default FollowUpNode;
