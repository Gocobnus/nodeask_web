'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState, useReactFlow, Edge } from 'reactflow';
import { useQATrees } from '../../../context/QATreeContext';
import 'reactflow/dist/style.css';

import { startMockSSE } from '../../../lib/mock-sse';
import QCardNode from '../../../components/flow-nodes/QCardNode';
import ACardNode from '../../../components/flow-nodes/ACardNode';

const nodeTypes = {
  qcard: QCardNode,
  acard: ACardNode,
};

interface FlowViewProps {
  treeId: string;
  initialQuestion: string;
}

import { Skeleton } from '@heroui/react';

function FlowCanvas({ treeId, initialQuestion }: FlowViewProps) {
  const router = useRouter();
  const { trees, updateTreeTitle } = useQATrees();
  const { setCenter } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isLoading, setIsLoading] = useState(true); // Page-level loading state
  const pendingEdgesRef = useRef<Edge[]>([]);

  const onMoveStart = useCallback(() => {
    setIsFollowing(false);
  }, []);

  const calculateNodePosition = (nodeIndex: number) => {
    return { x: 0, y: nodeIndex * 450 };
  };

  useEffect(() => {
    if (pendingEdgesRef.current.length > 0) {
      setEdges((eds) => [...eds, ...pendingEdgesRef.current]);
      pendingEdgesRef.current = [];
    }
  }, [nodes, setEdges]);

  useEffect(() => {
    const treeExists = trees.some(tree => tree.id === treeId);
    if (!treeExists) {
      router.push('/');
      return;
    }

    setNodes([]);
    setEdges([]);

    const handleMessage = (event: string, data: string) => {
      if (isLoading) {
        setIsLoading(false); // Turn off skeleton on first message
      }

      const payload = JSON.parse(data);

      if (event === 'title') {
        updateTreeTitle(treeId, payload.title);
      }

      if (event === 'text') {
        const { node_data } = payload;
        const { id, pos, content, finish } = node_data;

        setNodes(currentNodes => {
          const existingNodeIndex = currentNodes.findIndex(n => n.id === id);

          if (existingNodeIndex === -1) {
            const nodeType = pos === 0 ? 'qcard' : 'acard';
            const newNode = {
              id: id,
              type: nodeType,
              position: calculateNodePosition(pos),
              data: {
                pos: pos,
                question: pos === 0 ? initialQuestion : '',
                title: pos > 0 ? `Answer #${pos}` : '',
                content: content,
                isGenerating: !finish,
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
            return currentNodes.map(n => {
              if (n.id === id) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    content: n.data.content + content,
                    isGenerating: !finish,
                  },
                };
              }
              return n;
            });
          }
        });
      }

      if (event === 'ask_back') {
        const { node_id, ask_back } = payload;
        setNodes(currentNodes => 
          currentNodes.map(n => {
            if (n.id === node_id) {
              return {
                ...n,
                data: {
                  ...n.data,
                  relatedQuestions: ask_back,
                },
              };
            }
            return n;
          })
        );
      }
    };

    startMockSSE({
      onMessage: handleMessage,
      onClose: () => {
        console.log("Mock SSE stream closed.");
      },
    });

  }, [treeId]);

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