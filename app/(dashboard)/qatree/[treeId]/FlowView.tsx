'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState, useReactFlow, Edge, Node } from 'reactflow';
import { useQATrees } from '../../../context/QATreeContext';
import 'reactflow/dist/style.css';
import { mockUser } from '../../../lib/mock-data'; // 导入模拟用户
import { motion, AnimatePresence } from 'framer-motion';
import ReusableTiptapEditor from '../../../components/common/ReusableTiptapEditor';
import { getLayoutedElements } from '../../../utils/layout-utils';

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
}

interface FlowCanvasProps extends FlowViewProps {
  initialQuestion: string;
}

function FlowCanvas({ treeId, initialQuestion }: FlowCanvasProps) {
  const router = useRouter();
  const { trees, updateTreeTitle } = useQATrees();
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingText, setEditingText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [followUpNodeId, setFollowUpNodeId] = useState<string | null>(null);
  const nodeForFollowUp = nodes.find(n => n.id === followUpNodeId);
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'acard') {
          const newIsOpen = node.id === openDrawerId;
          if (node.data.isOpen === newIsOpen) return node;
          return {
            ...node,
            data: {
              ...node.data,
              isOpen: newIsOpen,
            },
          };
        }
        return node;
      })
    );
  }, [openDrawerId, setNodes]);

  useEffect(() => {
    if (nodeForFollowUp) {
      const initialText = drafts[nodeForFollowUp.id] !== undefined
        ? drafts[nodeForFollowUp.id]
        : (nodeForFollowUp.type === 'qcard' ? nodeForFollowUp.data.question || '' : '');
      setEditingText(initialText);
    } else {
      setEditingText('');
    }
  }, [nodeForFollowUp, drafts]);

  const handleUpdate = (newText: string) => {
    setEditingText(newText);
    if (nodeForFollowUp) {
      if (newText.trim() !== '') {
        setDrafts(prevDrafts => ({ ...prevDrafts, [nodeForFollowUp.id]: newText }));
      } else {
        setDrafts(prevDrafts => {
          const newDrafts = { ...prevDrafts };
          delete newDrafts[nodeForFollowUp.id];
          return newDrafts;
        });
      }
    }
  };

  const handleSubmit = (submittedText: string) => {
    if (!nodeForFollowUp) return;
    console.log(`追问 (Follow-up question for card ${nodeForFollowUp.id}): ${submittedText}`);

    setDrafts(prevDrafts => {
      const newDrafts = { ...prevDrafts };
      delete newDrafts[nodeForFollowUp.id];
      return newDrafts;
    });

    // Deselect node after submit
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    setFollowUpNodeId(null);
  };

  // 节点操作的回调函数
  const onMoveStart = useCallback(() => {
    // onMoveStart logic if any
  }, []);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => ({ ...node, selected: node.id === nodeId }))
    );
    setFollowUpNodeId(null);
  }, [setNodes]);

  const handleAskFollowUp = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => ({ ...node, selected: node.id === nodeId }))
    );
    setFollowUpNodeId(nodeId);
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

  const handleMessage = useCallback((event: string, data: string) => {
    setIsLoading(current => current ? false : current);

    const payload = JSON.parse(data);

    if (event === 'title') {
      updateTreeTitle(treeId, payload.title);
    }

    if (event === 'text' || event === 'ask_back') {
      const cardActions = (id: string, type: 'qcard' | 'acard') => ({
        onDelete: () => console.log(`Delete card ${id}`),
        onCopy: () => console.log(`Copy card ${id}`),
        onClick: type === 'qcard' ? () => handleAskFollowUp(id) : () => handleNodeSelect(id),
        onAsk: () => handleAskFollowUp(id),
        onLocate: () => handleNodeLocate(id),
      });

      if (event === 'text') {
        const { id, pos, content, finish, parentId } = payload.node_data;
        const isGenerating = !finish;
        const type = pos === 0 ? 'qcard' : 'acard';

        setNodes(currentNodes => {
          const existingNode = currentNodes.find(n => n.id === id);
          if (!existingNode) {
            let initialPosition = { x: 0, y: 0 };
            if (currentNodes.length > 0) {
                const lastNode = currentNodes[currentNodes.length - 1];
                const lastNodeHeight = lastNode.height || (lastNode.type === 'acard' ? 350 : 150); // Use fallback height
                const GAP = 40; // Vertical gap between nodes
                initialPosition = {
                    x: lastNode.position.x, // Keep the same X for a vertical stack
                    y: lastNode.position.y + lastNodeHeight + GAP
                };
            }

            const newNode: Node = {
              id,
              type,
              position: initialPosition,
              data: {
                pos, content, isGenerating,
                question: pos === 0 ? initialQuestion : '',
                title: pos > 0 ? `Answer ${id}` : '',
                avatar: pos === 0 ? mockUser.avatar : undefined,
                onExpand: () => setOpenDrawerId(prevId => prevId === id ? null : id),
                ...(!isGenerating && cardActions(id, type)),
              },
            };
            return [...currentNodes, newNode];
          } else {
            return currentNodes.map(n =>
              n.id === id ? {
                ...n,
                data: { 
                  ...n.data, 
                  content: n.data.content + content, 
                  isGenerating, 
                  onExpand: () => setOpenDrawerId(prevId => prevId === id ? null : id),
                  ...(!isGenerating && cardActions(id, type)) 
                }
              } : n
            );
          }
        });

        if (parentId) {
            setEdges(currentEdges => {
                const edgeId = `${parentId}-${id}`;
                const existingEdge = currentEdges.find(e => e.id === edgeId);
                if (!existingEdge) {
                    return [...currentEdges, { id: edgeId, source: parentId, target: id }];
                }
                return currentEdges;
            });
        }
      }

      if (event === 'ask_back') {
        const { node_id, ask_back } = payload;
        setNodes(currentNodes => currentNodes.map(n =>
          n.id === node_id ? {
            ...n, data: { ...n.data, relatedQuestions: ask_back, ...cardActions(node_id, 'acard') }
          } : n
        ));
      }
    }
  }, [treeId, initialQuestion, updateTreeTitle, setNodes, setEdges, handleNodeSelect, handleNodeLocate, setOpenDrawerId]);

  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId, router, setNodes, setEdges]);

  useEffect(() => {
    if (nodes.length > 1 && edges.length > 0) {
      const onLayout = async () => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        window.requestAnimationFrame(() => {
            fitView({duration: 500});
        });
      };
      onLayout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length]);

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
        zoomOnDoubleClick={true}
        fitView
        zoomOnScroll={false}
        panOnScroll={true}
        onPaneClick={() => {
          setNodes(nds => nds.map(n => ({ ...n, selected: false })));
          setFollowUpNodeId(null);
        }}
        selectNodesOnDrag={false}
      />
      <AnimatePresence>
        {nodeForFollowUp && (
          <motion.div
            className="absolute bottom-12 left-0 right-0 bg-transparent flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div
              className="pointer-events-auto"
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <ReusableTiptapEditor
                key="qatree-search-section"
                content={editingText}
                onUpdate={handleUpdate}
                onSubmit={handleSubmit}
                placeholder="输入内容以优化或追问..."
                isSubmitting={isSubmitting}
                disabled={isSubmitting}
                variant="bottomBar"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FlowView(props: FlowViewProps) {
  const { initialQuery, setInitialQuery, trees } = useQATrees();
  const [questionForFlow, setQuestionForFlow] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = () => {
      if (initialQuery) {
        // Flow 1: Initial creation from homepage
        setQuestionForFlow(initialQuery);
        setInitialQuery(null);
        setIsLoading(false);
      } else {
        // Flow 2: Refresh or direct navigation (MOCKED)
        setTimeout(() => {
          const currentTree = trees.find(t => t.id === props.treeId);
          const mockInitialQuestion = currentTree ? currentTree.name : `(Mock) Question for ${props.treeId}`;
          setQuestionForFlow(mockInitialQuestion);
          setIsLoading(false);
        }, 500);
      }
    };
    loadInitialData();
  }, [props.treeId, initialQuery, setInitialQuery, trees]);

  if (isLoading) {
    // This loading state is for resolving the initial question.
    // FlowCanvas has its own loading state for the SSE stream.
    return (
      <div className="w-full h-full p-4">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <FlowCanvas treeId={props.treeId} initialQuestion={questionForFlow || ''} />
    </ReactFlowProvider>
  );
}