"use client";

import React from "react";
import SearchSection from "./SearchSection";
import "./homepage.css";

import { useRouter } from 'next/navigation';
import { QATree } from '../../types/qatree';
import { useQATrees } from '../../context/QATreeContext';

export default function HomePage() {
  const router = useRouter();
  const { addTree, setInitialQuery } = useQATrees();

  const handleSubmit = (value: string): Promise<void> => {
    // Step 1: Set the initial query for the next page to render.
    setInitialQuery(value);

    // Step 2: Mock the API call to create the tree.
    return new Promise((resolve) => {
      setTimeout(() => {
        // Create a mock tree object.
        const newTree: QATree = {
          id: `mock_${Date.now()}`,
          name: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Add the new tree to the sidebar/client state.
        addTree(newTree);

        // Navigate to the clean URL. The destination page will use
        // the `initialQuery` from the context to render the first node.
        router.push(`/qatree/${newTree.id}`);
        
        resolve();
      }, 500); // 0.5-second delay to simulate network
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
