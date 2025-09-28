'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState, useReactFlow, Edge } from 'reactflow';
import { useQATrees } from '../../../context/QATreeContext';
import 'reactflow/dist/style.css';

import { startMockSSE } from '../../../lib/mock-sse';
import QCardNode from '../../../components/flow-nodes/QCardNode';
import ACardNode from '../../../components/flow-nodes/ACardNode';
import { Skeleton } from '@heroui/react';

const nodeTypes = {
  qcard: QCardNode,
  acard: ACardNode,
};

interface FlowViewProps {
  treeId: string;
  initialQuestion: string;
}

function FlowCanvas({ treeId, initialQuestion }: FlowViewProps) {
  const router = useRouter();
  const { trees, updateTreeTitle } = useQATrees();
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const pendingEdgesRef = useRef<Edge[]>([]);

  // 节点操作的回调函数
  const onMoveStart = useCallback(() => {
    // onMoveStart logic if any
  }, []);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => ({ ...node, selected: node.id === nodeId }))
    );
  }, [setNodes]);

  const handleNodeLocate = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === nodeId,
      }))
    );
    setTimeout(() => {
      fitView({ nodes: [{ id: nodeId }], duration: 500, padding: 0.2 });
    }, 0);
  }, [setNodes, fitView]);

  const calculateNodePosition = (nodeIndex: number) => ({ x: 0, y: nodeIndex * 450 });

  // 边处理的 Effect
  useEffect(() => {
    if (pendingEdgesRef.current.length > 0) {
      setEdges((eds) => [...eds, ...pendingEdgesRef.current]);
      pendingEdgesRef.current = [];
    }
  }, [nodes, setEdges]);

  // ✨ 1. 将消息处理逻辑稳定地包裹在 useCallback 中
  const handleMessage = useCallback((event: string, data: string) => {
    // 确保骨架屏只关闭一次
    setIsLoading(current => current ? false : current);

    const payload = JSON.parse(data);

    if (event === 'title') {
      updateTreeTitle(treeId, payload.title);
    }

    if (event === 'text' || event === 'ask_back') {
      const cardActions = (id: string) => ({
        onDelete: () => console.log(`Delete card ${id}`),
        onCopy: () => console.log(`Copy card ${id}`),
        onExpand: () => console.log(`Expand card ${id}`),
        onClick: () => handleNodeSelect(id),
        onLocate: () => handleNodeLocate(id),
      });

      setNodes(currentNodes => {
        if (event === 'text') {
          const { id, pos, content, finish } = payload.node_data;
          const isGenerating = !finish;
          const existingNode = currentNodes.find(n => n.id === id);

          if (!existingNode) {
            const newNode = {
              id,
              type: pos === 0 ? 'qcard' : 'acard',
              position: calculateNodePosition(pos),
              data: {
                pos, content, isGenerating,
                question: pos === 0 ? initialQuestion : '',
                title: pos > 0 ? `Answer #${pos}` : '',
                ...(!isGenerating && cardActions(id)),
              },
            };
            if (pos > 0) {
              const prevNode = currentNodes.find(n => n.data.pos === pos - 1);
              if (prevNode) {
                pendingEdgesRef.current.push({ id: `${prevNode.id}-${id}`, source: prevNode.id, target: id });
              }
            }
            return [...currentNodes, newNode];
          } else {
            return currentNodes.map(n =>
              n.id === id ? {
                ...n, data: { ...n.data, content: n.data.content + content, isGenerating, ...(!isGenerating && cardActions(id)) }
              } : n
            );
          }
        }

        if (event === 'ask_back') {
          const { node_id, ask_back } = payload;
          return currentNodes.map(n =>
            n.id === node_id ? {
              ...n, data: { ...n.data, relatedQuestions: ask_back, ...cardActions(node_id) }
            } : n
          );
        }
        
        return currentNodes;
      });
    }
  }, [treeId, initialQuestion, updateTreeTitle, setNodes, handleNodeSelect, handleNodeLocate]);

  // ✨ 2. 使用 Ref 来确保 SSE 回调总能访问到最新的 handleMessage 函数
  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  // ✨ 3. 主 Effect，只负责建立和清理 SSE 连接，依赖项只有 treeId
  useEffect(() => {
    // 在 Effect 内部直接访问 trees state 来进行一次性检查
    const treeExists = trees.some(tree => tree.id === treeId);
    if (!treeExists) {
      router.push('/');
      return;
    }

    setIsLoading(true);
    setNodes([]);
    setEdges([]);

    const sse = startMockSSE({
      onMessage: (event, data) => handleMessageRef.current(event, data),
      onClose: () => console.log("Mock SSE stream closed."),
    });

    // 清理函数（如果 startMockSSE 返回一个清理方法）
    // return () => {
    //   sse.close();
    // };
  }, [treeId, router, setNodes, setEdges]); // 关键：移除了 trees 依赖，切断循环

  if (isLoading) {
    return (
      <div className="w-full h-full p-4">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onMoveStart={onMoveStart}
        fitView
      />
    </div>
  );
}

export default function FlowView(props: FlowViewProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}