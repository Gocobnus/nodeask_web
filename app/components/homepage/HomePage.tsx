"use client";

import React from "react";
import SearchSection from "./SearchSection";
import "./homepage.css";

import { useRouter } from 'next/navigation';
import { QATree } from '../../types/qatree';
import { useQATrees } from '../../context/QATreeContext';

export default function HomePage() {
  const router = useRouter();
  const { addTree } = useQATrees();

  const handleSubmit = (value: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newTree: QATree = {
          id: `mock_${Date.now()}`,
          name: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        addTree(newTree);

        router.push(`/qatree/${newTree.id}?q=${encodeURIComponent(value)}`);
        resolve();
      }, 1000); // 1-second delay
    });
  };

  return (
    <div className="homepage__container">
      <SearchSection 
        title="您想了解什么?"
        placeholder="请尽情提问！"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
