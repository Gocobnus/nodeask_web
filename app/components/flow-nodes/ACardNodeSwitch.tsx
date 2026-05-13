'use client';

import React from 'react';
import ACardNode from './ACardNode';
import ACardLodNode from './ACardLodNode';

const ACardNodeSwitch = ({ id, data, selected }: { id: string; data: any; selected: boolean }) => {
  if (data?.lodLite === true) return <ACardLodNode id={id} data={data} selected={selected} />;
  return <ACardNode id={id} data={data} selected={selected} />;
};

export default React.memo(ACardNodeSwitch);
