'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Skeleton } from '@heroui/react';
import { CARD_WIDTH } from '@/app/config/constants';

const SkeletonNode = ({ data }: { data: any }) => {
  return (
    <div style={{ width: CARD_WIDTH, borderRadius: '20px', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Top} className="!bg-transparent" />
      <Skeleton className="h-48 w-full" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent" />
    </div>
  );
};

export default React.memo(SkeletonNode);
