'use client';

import React from 'react';
import QCardNode from './QCardNode';
import QCardLodNode from './QCardLodNode';

const QCardNodeSwitch = ({ id, data, selected }: { id: string; data: any; selected: boolean }) => {
  if (data?.lodLite === true) return <QCardLodNode id={id} data={data} selected={selected} />;
  return <QCardNode id={id} data={data} selected={selected} />;
};

export default React.memo(QCardNodeSwitch);
