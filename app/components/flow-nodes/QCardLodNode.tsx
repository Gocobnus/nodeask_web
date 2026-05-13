'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { CARD_WIDTH } from '@/app/config/constants';
import Image from 'next/image';

const QCardLodNode = ({ id: _id, data, selected }: { id: string; data: any; selected: boolean }) => {
  const question = (data?.question || data?.content || '').toString();

  return (
    <div
      className="qcard-node-wrapper"
    style={{ width: CARD_WIDTH, position: 'relative' }}
    onClick={(e) => {
      e.stopPropagation();
      if (data?.onClick) data.onClick();
    }}
  >
      <Handle type="target" position={Position.Top} className="custom-handle-top" style={{ background: 'transparent', border: 'none', width: '1px', height: '1px', top: '-8px', left: '50%', transform: 'translateX(-50%)' }} />
      <Handle type="target" id="left" position={Position.Left} className="custom-handle-left" style={{ background: 'transparent', border: 'none', width: '1px', height: '1px', top: '24px', left: '-8px' }} />
      <div className={`qcard__background-card qcard__background-card--collapsed ${selected ? 'qcard__background-card--selected' : ''}`}>
        <div className="qcard__background-card-wrapper">
          <div className="qcard__header">
            <div className="qcard__header-left">
              {data?.avatar && (
                <Image
                  src={data.avatar}
                  alt="avatar"
                  className="qcard__avatar"
                  width={24}
                  height={24}
                />
              )}
              <div className="qcard__header-title">{question}</div>
            </div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="custom-handle-bottom" style={{ background: 'transparent', border: 'none', width: '1px', height: '1px', bottom: '-8px', left: '50%', transform: 'translateX(-50%)' }} />
    </div>
  );
};

export default React.memo(QCardLodNode);
