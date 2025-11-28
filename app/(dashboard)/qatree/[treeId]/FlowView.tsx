'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState, useReactFlow, Node } from 'reactflow';
import { useQATrees } from '../../../context/QATreeContext';
import 'reactflow/dist/style.css';
import { mockUser } from '../../../lib/mock-data'; // 导入模拟用户
import { motion, AnimatePresence } from 'framer-motion';
import ReusableTiptapEditor from '../../../components/common/ReusableTiptapEditor';
import { getLayoutedElements } from '../../../utils/layout-utils';

import { startMockSSE } from '../../../lib/mock-sse';
import QCardNode from '../../../components/flow-nodes/QCardNode';
import ACardNode from '../../../components/flow-nodes/ACardNode';
import FollowUpNode from '../../../components/flow-nodes/FollowUpNode';
import { Skeleton } from '@heroui/react';

const nodeTypes = {
  qcard: QCardNode,
  acard: ACardNode,
  followup: FollowUpNode,
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
  const { fitView, getZoom, getNodes } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingText, setEditingText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [followUpNodeId, setFollowUpNodeId] = useState<string | null>(null);
  const nodeForFollowUp = nodes.find(n => n.id === followUpNodeId);
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  // 记录上次布局时的节点高度签名,避免死循环
  const lastLayoutSignatureRef = useRef<string>('');

  // 用于强制触发布局更新的状态
  const [layoutTrigger, setLayoutTrigger] = useState(0);

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

    // 判断是垂直追问还是横向追问
    const isVerticalFollowUp = nodeForFollowUp.type === 'followup';
    const apiEndpoint = isVerticalFollowUp ? '/api/followup/vertical' : '/api/followup/horizontal';

    console.log(`追问 (${isVerticalFollowUp ? '垂直' : '横向'}) for node ${nodeForFollowUp.id}: ${submittedText}`);
    console.log(`API endpoint: ${apiEndpoint}`);

    // TODO: 调用真实 API
    // const response = await fetch(apiEndpoint, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     tree_id: treeId,
    //     parent_node_id: nodeForFollowUp.data.nodeId, // 使用业务 ID
    //     question: submittedText
    //   })
    // });
    // const data = await response.json();
    // 启动新的 SSE 连接接收 A 节点内容

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
      const currentZoom = getZoom();
      fitView({
        nodes: [{ id: nodeId }],
        duration: 500,
        minZoom: currentZoom,
        maxZoom: currentZoom
      });
    }, 0);
  }, [setNodes, fitView, getZoom]);

  // 处理节点高度变化
  const handleHeightChange = useCallback((nodeId: string, newHeight: number) => {
    console.log('🎯 FlowView 收到高度变化通知:', { nodeId, newHeight });

    // 更新节点高度并触发布局重新计算
    setNodes((currentNodes) => {
      const updated = currentNodes.map(node =>
        node.id === nodeId
          ? { ...node, height: newHeight }
          : node
      );
      return updated;
    });

    // 强制触发布局更新
    setLayoutTrigger(prev => prev + 1);
  }, [setNodes]);

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
        onHeightChange: handleHeightChange,
      });

      if (event === 'text') {
        const { id, pos, content, finish, parentId } = payload.node_data;
        const done = payload.done || false; // 从 CommonFields 获取 done 字段
        const isGenerating = !finish;

        // 根据 pos 判断节点类型
        let type: 'qcard' | 'acard' | 'followup';
        if (pos === -1) {
          type = 'followup';
        } else if (pos === 0) {
          type = 'qcard';
        } else {
          type = 'acard';
        }

        setNodes(currentNodes => {
          const existingNode = currentNodes.find(n => n.id === id);
          if (!existingNode) {
            let initialPosition = { x: 0, y: 0 };

            if (currentNodes.length === 0) {
              // 第一个节点:居中显示
              // 动态获取侧边栏宽度
              const sidebarElement = document.querySelector('.nav');
              const sidebarWidth = sidebarElement ? sidebarElement.getBoundingClientRect().width : 256;
              const canvasWidth = window.innerWidth - sidebarWidth;
              const canvasHeight = window.innerHeight;

              // 根据节点类型确定宽度
              const nodeWidth = type === 'followup' ? 24 : 360;
              const nodeHeight = 150;

              initialPosition = {
                x: (canvasWidth / 2) - (nodeWidth / 2),  // 水平居中(考虑侧边栏)
                y: (canvasHeight / 2) - nodeHeight        // 下边缘垂直居中
              };
            } else {
              // 后续节点:垂直堆叠，保持与第一个卡片节点（360px）中心对齐
              const lastNode = currentNodes[currentNodes.length - 1];
              const lastNodeHeight = lastNode.height || (
                lastNode.type === 'acard' ? 550 :
                lastNode.type === 'followup' ? 24 : 250
              );
              const GAP = 80; // 与 ELK 的 nodeSpacing 保持一致

              // 计算 x 位置：如果当前节点和上个节点宽度不同，需要调整以保持中心对齐
              let xPosition = lastNode.position.x;
              if (type === 'followup' && lastNode.type !== 'followup') {
                // 从 360px 卡片到 24px followup：向右偏移
                xPosition = lastNode.position.x + (360 - 24) / 2;
              } else if (type !== 'followup' && lastNode.type === 'followup') {
                // 从 24px followup 到 360px 卡片：向左偏移
                xPosition = lastNode.position.x - (360 - 24) / 2;
              }

              initialPosition = {
                x: xPosition,
                y: lastNode.position.y + lastNodeHeight + GAP
              };
            }

            // 创建节点
            let newNode: Node;
            if (type === 'followup') {
              newNode = {
                id,
                type: 'followup',
                position: initialPosition,
                draggable: false,
                data: {
                  nodeId: id,
                  onClick: () => handleAskFollowUp(id),
                },
              };
            } else {
              // type 是 'qcard' 或 'acard'
              const cardType = type as 'qcard' | 'acard';
              // Q1 节点的 content 应该使用 initialQuestion，因为 SSE 不推送 Q 节点内容
              const initialContent = pos === 0 ? initialQuestion : content;

              newNode = {
                id,
                type: cardType,
                position: initialPosition,
                draggable: false,
                data: {
                  pos,
                  content: initialContent,
                  isGenerating,
                  nodeId: id, // 添加业务 ID
                  question: pos === 0 ? initialQuestion : '',
                  title: pos > 0 ? `Answer ${id}` : '',
                  avatar: pos === 0 ? mockUser.avatar : undefined,
                  onExpand: cardType === 'acard' ? () => setOpenDrawerId(prevId => prevId === id ? null : id) : undefined,
                  ...(!isGenerating && cardActions(id, cardType)),
                },
              };
            }

            return [...currentNodes, newNode];
          } else {
            // 内容更新(ResizeObserver会自动监听高度变化)
            console.log('📝 内容更新:', id, 'content length:', content.length, 'chunk:', content);

            return currentNodes.map(n => {
              if (n.id === id) {
                // Q1 节点不累加内容（SSE 只推送空字符串用于创建节点）
                // A 节点才累加流式内容
                const currentContent = n.data.content;
                const updatedContent = n.type === 'qcard' ? currentContent : currentContent + content;
                console.log('💬 节点内容累加:', {
                  nodeId: id,
                  nodeType: n.type,
                  currentLength: currentContent.length,
                  chunkLength: content.length,
                  newLength: updatedContent.length
                });

                return {
                  ...n,
                  data: {
                    ...n.data,
                    content: updatedContent,
                    // QCard 的 question 字段保持不变（已经是 initialQuestion）
                    isGenerating,
                    onExpand: n.type === 'acard' ? () => setOpenDrawerId(prevId => prevId === id ? null : id) : n.data.onExpand,
                    ...(!isGenerating && n.type !== 'followup' && cardActions(id, n.type as 'qcard' | 'acard'))
                  }
                };
              }
              return n;
            });
          }
        });

        if (parentId) {
          setEdges(currentEdges => {
            const edgeId = `${parentId}-${id}`;
            const existingEdge = currentEdges.find(e => e.id === edgeId);
            if (!existingEdge) {
              return [...currentEdges, {
                id: edgeId,
                source: parentId,
                target: id,
                style: {
                  strokeDasharray: '5,5',
                  stroke: '#b1b1b7',
                  strokeWidth: 2
                }
              }];
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

    // 监听 SSE 完成事件，在最后一个 A 节点下方创建 F 节点
    if (event === 'done') {
      console.log('🎯 SSE 流结束，在最后一个 A 节点下方创建 F 节点');

      setTimeout(() => {
        // 使用 getNodes() 获取当前节点状态，避免在 setNodes reducer 中产生副作用
        const currentNodes = getNodes();
        
        // 找到最后一个 A 节点
        const aNodes = currentNodes.filter(n => n.type === 'acard');
        if (aNodes.length === 0) return;

        const lastANode = aNodes[aNodes.length - 1];

        // 检查是否已经存在 F 节点
        const existingFNode = currentNodes.find(n =>
          n.type === 'followup' &&
          n.data.parentACardId === lastANode.id
        );
        if (existingFNode) return;

        // 创建新的 F 节点
        const nextFNodeId = `f-${lastANode.id}-${Date.now()}`;
        const aNodeHeight = lastANode.height || 550;
        const GAP = 80;
        const fNodePosition = {
          x: lastANode.position.x + (360 - 24) / 2, // 360px 卡片中心对齐 24px followup
          y: lastANode.position.y + aNodeHeight + GAP
        };

        const newFNode: Node = {
          id: nextFNodeId,
          type: 'followup',
          position: fNodePosition,
          draggable: false,
          data: {
            nodeId: lastANode.id, // 业务 ID 复用最后一个 A 节点的 ID
            parentACardId: lastANode.id,
            onClick: () => handleAskFollowUp(nextFNodeId),
          },
        };

        // 更新节点
        setNodes(prev => [...prev, newFNode]);

        // 更新边
        setEdges(prevEdges => {
          const edgeId = `${lastANode.id}-${nextFNodeId}`;
          const existingEdge = prevEdges.find(e => e.id === edgeId);
          if (!existingEdge) {
            return [...prevEdges, {
              id: edgeId,
              source: lastANode.id,
              target: nextFNodeId,
              style: {
                strokeDasharray: '5,5',
                stroke: '#b1b1b7',
                strokeWidth: 2
              }
            }];
          }
          return prevEdges;
        });

      }, 100);
    }
  }, [treeId, initialQuestion, updateTreeTitle, setNodes, setEdges, handleNodeSelect, handleNodeLocate, handleHeightChange, setOpenDrawerId, getNodes, getZoom, fitView]);

  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    console.log('🔵 FlowView useEffect 触发，treeId:', treeId);
    const currentTree = trees.find(tree => tree.id === treeId);
    if (!currentTree) {
      router.push('/');
      return;
    }

    setIsLoading(true);

    // 根据 create API 返回的数据创建 F0 和 Q1 节点
    const initialNodes: Node[] = [];
    const initialEdges: any[] = [];

    // 获取画布尺寸用于居中
    const sidebarElement = document.querySelector('.nav');
    const sidebarWidth = sidebarElement ? sidebarElement.getBoundingClientRect().width : 256;
    const canvasWidth = window.innerWidth - sidebarWidth;
    const canvasHeight = window.innerHeight;
    const centerX = (canvasWidth / 2) - 180; // 180 = 360px 卡片宽度的一半
    const centerY = canvasHeight / 2;
    console.log('📐 画布尺寸:', { canvasWidth, canvasHeight, centerX, centerY });

    // 创建 F0 节点
    if (currentTree.dummyNodeId) {
      const f0X = centerX + (360 - 24) / 2;
      const f0Y = centerY - 150;
      console.log('🔴 创建 F0 节点:', { id: currentTree.dummyNodeId, x: f0X, y: f0Y });
      const f0Node: Node = {
        id: currentTree.dummyNodeId,
        type: 'followup',
        position: { x: f0X, y: f0Y }, // 24px 中心对齐 360px
        draggable: false,
        data: {
          nodeId: currentTree.dummyNodeId,
          onClick: () => handleAskFollowUp(currentTree.dummyNodeId!),
        },
      };
      initialNodes.push(f0Node);
    }

    // 创建 Q1 节点
    if (currentTree.qNodeId) {
      console.log('🟢 创建 Q1 节点:', { id: currentTree.qNodeId, x: centerX, y: centerY });
      const q1Node: Node = {
        id: currentTree.qNodeId,
        type: 'qcard',
        position: { x: centerX, y: centerY },
        draggable: false,
        data: {
          pos: 0,
          content: initialQuestion,
          isGenerating: false,
          nodeId: currentTree.qNodeId,
          question: initialQuestion,
          avatar: mockUser.avatar,
        },
      };
      initialNodes.push(q1Node);

      // 创建边 F0 → Q1
      if (currentTree.dummyNodeId && currentTree.qParentNodeId === currentTree.dummyNodeId) {
        initialEdges.push({
          id: `${currentTree.dummyNodeId}-${currentTree.qNodeId}`,
          source: currentTree.dummyNodeId,
          target: currentTree.qNodeId,
          style: {
            strokeDasharray: '5,5',
            stroke: '#b1b1b7',
            strokeWidth: 2
          }
        });
      }
    }

    setNodes(initialNodes);
    setEdges(initialEdges);

    // 启动 SSE 接收 A 节点
    console.log('🟡 启动 SSE 连接');
    const abortSSE = startMockSSE({
      onMessage: (event, data) => {
        console.log('📨 SSE 收到事件:', event, 'data length:', data.length);
        handleMessageRef.current(event, data);
      },
      onClose: () => console.log("Mock SSE stream closed."),
    });

    // Cleanup 函数：组件卸载或 treeId 变化时中止 SSE
    return () => {
      console.log('🧹 清理 SSE 连接');
      abortSSE();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId, router, setNodes, setEdges]);

  useEffect(() => {
    if (nodes.length > 1 && edges.length > 0) {
      // 检查所有节点是否已被 ReactFlow 测量
      const allNodesMeasured = nodes.every(node =>
        node.width !== undefined &&
        node.height !== undefined
      );

      // 生成当前节点的高度签名
      const currentSignature = nodes.map(n => `${n.id}:${n.height}`).join(',');

      // 打印高度变化日志
      if (currentSignature !== lastLayoutSignatureRef.current) {
        console.log('📏 高度签名变化:', {
          old: lastLayoutSignatureRef.current,
          new: currentSignature,
          allMeasured: allNodesMeasured
        });
      }

      // 只有在节点都测量完成,且高度签名发生变化时才执行布局
      if (allNodesMeasured && currentSignature !== lastLayoutSignatureRef.current) {
        lastLayoutSignatureRef.current = currentSignature;

        const onLayout = async () => {
          // 调试日志
          console.log('🔄 触发布局:', {
            nodeCount: nodes.length,
            heights: nodes.map(n => ({ id: n.id, height: n.height }))
          });

          // 1. 找到第一个 360px 宽的节点（qcard 或 acard）作为参考点
          const referenceNode = nodes.find(n => n.type === 'qcard' || n.type === 'acard');
          const referenceOldPos = referenceNode?.position;

          const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges);

          // 2. 获取布局后参考节点的位置
          const referenceLayoutedNode = referenceNode ? layoutedNodes.find(n => n.id === referenceNode.id) : undefined;
          const referenceNewPos = referenceLayoutedNode?.position;

          // 3. 计算偏移量并应用到所有节点（基于参考节点，而不是第一个节点）
          if (referenceOldPos && referenceNewPos) {
            const deltaX = referenceOldPos.x - referenceNewPos.x;
            const deltaY = referenceOldPos.y - referenceNewPos.y;

            console.log('📍 参考节点位置调整:', {
              referenceNodeId: referenceNode?.id,
              oldPos: referenceOldPos,
              newPos: referenceNewPos,
              delta: { deltaX, deltaY }
            });

            const adjustedNodes = layoutedNodes.map(node => ({
              ...node,
              position: {
                x: node.position.x + deltaX,
                y: node.position.y + deltaY
              }
            }));

            setNodes(adjustedNodes);
          } else {
            setNodes(layoutedNodes);
          }

          setEdges(layoutedEdges);

          // 可选: 只有在节点数量显著增加时才fitView,或者使用更平滑的参数
          // window.requestAnimationFrame(() => {
          //   fitView({ duration: 500, padding: 0.2 });
          // });
        };
        onLayout();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges.length, layoutTrigger]);

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
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        panOnScroll={true}
        onPaneClick={() => {
          setNodes(nds => nds.map(n => ({ ...n, selected: false })));
          setFollowUpNodeId(null);
        }}
        selectNodesOnDrag={false}
        minZoom={0.4}
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