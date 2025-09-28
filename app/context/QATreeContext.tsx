'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mockQATrees } from '../lib/mock-data';
import { QATree } from '../types/qatree';

interface QATreeContextType {
  trees: QATree[];
  addTree: (newTree: QATree) => void;
  updateTreeTitle: (treeId: string, newTitle: string) => void;
}

const QATreeContext = createContext<QATreeContextType | undefined>(undefined);

export function QATreeProvider({ children }: { children: ReactNode }) {
  const [trees, setTrees] = useState<QATree[]>(mockQATrees);

  const addTree = (newTree: QATree) => {
    setTrees(prevTrees => [newTree, ...prevTrees]);
  };

  const updateTreeTitle = (treeId: string, newTitle: string) => {
    setTrees(prevTrees => 
      prevTrees.map(tree => 
        tree.id === treeId ? { ...tree, name: newTitle } : tree
      )
    );
  };

  return (
    <QATreeContext.Provider value={{ trees, addTree, updateTreeTitle }}>
      {children}
    </QATreeContext.Provider>
  );
}

export function useQATrees() {
  const context = useContext(QATreeContext);
  if (context === undefined) {
    throw new Error('useQATrees must be used within a QATreeProvider');
  }
  return context;
}
