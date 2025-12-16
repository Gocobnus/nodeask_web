"use client";

import React from "react";
import SearchSection from "./SearchSection";
import "./homepage.css";

import { useRouter } from 'next/navigation';
import { QATree } from '../../types/qatree';
import { useQATrees } from '../../context/QATreeContext';
import { createQATree } from '../../services/qatree-api';

export default function HomePage() {
  const router = useRouter();
  const { addTree, setInitialQuery } = useQATrees();

  const handleSubmit = async (value: string): Promise<void> => {
    // Step 1: Set the initial query for the next page to render.
    setInitialQuery(value);

    // Step 2: Call API to create the tree
    try {
      const data = await createQATree(value);

      // Create a tree object with new fields
      const newTree: QATree = {
        id: data.tree_id,
        name: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
        dummyNodeId: data.dummy_node_id,   // F0 的业务 ID
        qNodeId: data.q_node_id,           // Q1 的业务 ID
        qaId: data.qa_id,                  // 第一个 QA 对 ID
        qParentNodeId: data.parent_node_id, // Q1 的父节点业务 ID
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add the new tree to the sidebar/client state.
      addTree(newTree);

      // Navigate to the clean URL. The destination page will use
      // the `initialQuery` from the context to render the first node.
      router.push(`/qatree/${newTree.id}`);
    } catch (error) {
      console.error('Failed to create QA tree:', error);
      // TODO: 显示错误提示
    }
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
