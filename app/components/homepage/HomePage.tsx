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
    // TODO: 替换为真实 API 调用
    // const response = await fetch('/api/qatree/create', {
    //   method: 'POST',
    //   body: JSON.stringify({ question: value })
    // });
    // const data = await response.json();

    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock API 响应数据
        const mockResponse = {
          tree_id: `tree_${Date.now()}`,
          qa_id: 'qa1',
          dummy_node_id: 'f0',
          q_node_id: 'q1',
          parent_node_id: 'f0'
        };

        // Create a tree object with new fields
        const newTree: QATree = {
          id: mockResponse.tree_id,
          name: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
          dummyNodeId: mockResponse.dummy_node_id,   // F0 的业务 ID
          qNodeId: mockResponse.q_node_id,           // Q1 的业务 ID
          qaId: mockResponse.qa_id,                  // 第一个 QA 对 ID
          qParentNodeId: mockResponse.parent_node_id, // Q1 的父节点业务 ID
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
