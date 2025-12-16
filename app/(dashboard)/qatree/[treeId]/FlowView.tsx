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
import {
  createPendingNode,
  createPendingEdge,
  confirmPendingNode,
  cleanupPendingNodes
} from '../../../utils/pending-node-utils';
import { createHorizontalFollowUp } from '../../../services/qatree-api';

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

  // 布局进行中标记,防止重复触发
  const layoutInProgressRef = useRef(false);

  useEffect(() => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => {
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
      });
      nodesRef.current = updatedNodes;
      return updatedNodes;
    });
  }, [openDrawerId, setNodes]);

  useEffect(() => {
    if (followUpNodeId) {
      // followUpNodeId始终是父ACard的ID，直接使用
      const initialText = drafts[followUpNodeId] || '';
      setEditingText(initialText);
    } else {
      setEditingText('');
    }
  }, [followUpNodeId, drafts]);

  // 管理pending节点的生命周期 (与输入框同步)
  const lastFollowUpNodeIdRef = useRef<string | null>(null);
  // 记录上一个 followUpNodeId，用于恢复 hideAskButton
  const prevFollowUpNodeIdRef = useRef<string | null>(null);

  // 用于存储最新的 nodes 和 edges，解决异步状态更新导致的竞态条件
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<any[]>([]);

  useEffect(() => {
    // 如果followUpNodeId没有变化,不执行
    if (followUpNodeId === lastFollowUpNodeIdRef.current) {
      return;
    }
    lastFollowUpNodeIdRef.current = followUpNodeId;

    if (followUpNodeId) {
      setNodes((currentNodes) => {
        const currentNode = currentNodes.find(n => n.id === followUpNodeId);

        // 如果是ACard,需要创建horizontal pending节点
        if (currentNode?.type === 'acard') {
          const { cleanedNodes } = cleanupPendingNodes(currentNodes, edges);

          // 创建新的pending节点
          const pendingQNode = createPendingNode({
            type: 'qcard',
            parentNode: currentNode,
            pendingType: 'horizontal',
            initialContent: drafts[followUpNodeId] || ''
          });

          const pendingEdge = createPendingEdge(currentNode, pendingQNode, 'horizontal');

          // 添加pending边
          setEdges((currentEdges) => {
            const { cleanedEdges } = cleanupPendingNodes(cleanedNodes, currentEdges);
            const edgeExists = cleanedEdges.some(e => e.id === pendingEdge.id);
            const newEdges = edgeExists ? cleanedEdges : [...cleanedEdges, pendingEdge];
            edgesRef.current = newEdges;
            return newEdges;
          });

          const newNodes = [...cleanedNodes, pendingQNode];
          nodesRef.current = newNodes;
          return newNodes;
        }

        return currentNodes;
      });
    } else {

      // 输入框关闭时,删除所有pending节点和边，并恢复追问按钮
      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          const { cleanedEdges } = cleanupPendingNodes(currentNodes, currentEdges);
          edgesRef.current = cleanedEdges;
          return cleanedEdges;
        });
        const { cleanedNodes } = cleanupPendingNodes(currentNodes, []);

        // 恢复所有ACard的hideAskButton
        const finalNodes = cleanedNodes.map(n =>
          n.type === 'acard' && n.data.hideAskButton
            ? { ...n, data: { ...n.data, hideAskButton: false }}
            : n
        );
        nodesRef.current = finalNodes;
        return finalNodes;
      });
    }
  }, [followUpNodeId]);

  const handleUpdate = (newText: string) => {
    setEditingText(newText);

    // 查找pending节点：parentReactFlowId === followUpNodeId
    const pendingNode = nodes.find(n =>
      n.data.isPending && n.data.parentReactFlowId === followUpNodeId
    );

    if (pendingNode) {
      setNodes((nds) => {
        const updatedNodes = nds.map(n =>
          n.id === pendingNode.id
            ? { ...n, data: { ...n.data, question: newText }}
            : n
        );
        nodesRef.current = updatedNodes;
        return updatedNodes;
      });
    }

    // 保存草稿（followUpNodeId始终是父ACard的ID）
    if (followUpNodeId) {
      if (newText.trim() !== '') {
        setDrafts(prevDrafts => ({ ...prevDrafts, [followUpNodeId]: newText }));
      } else {
        setDrafts(prevDrafts => {
          const newDrafts = { ...prevDrafts };
          delete newDrafts[followUpNodeId];
          return newDrafts;
        });
      }
    }
  };

  const handleSubmit = async (submittedText: string) => {
    if (!followUpNodeId) return;

    // 查找pending节点：parentReactFlowId === followUpNodeId
    const pendingNode = nodes.find(n =>
      n.data.isPending && n.data.parentReactFlowId === followUpNodeId
    );

    if (pendingNode && pendingNode.data.pendingType === 'horizontal') {
      // 横向追问：调用API并确认pending节点
      try {
        const data = await createHorizontalFollowUp(
          treeId,
          pendingNode.data.parentNodeId,
          submittedText
        );
        const { q_node_id, qa_id } = data;

        // 先计算新的节点和边
        const { updatedNodes, updatedEdges } = confirmPendingNode(
          nodesRef.current,
          edgesRef.current,
          pendingNode.id,
          q_node_id,
          qa_id
        );

        // 同步更新 ref 和状态
        nodesRef.current = updatedNodes;
        edgesRef.current = updatedEdges;
        setNodes(updatedNodes);
        setEdges(updatedEdges);

        // 清理草稿（followUpNodeId就是父ACard的ID）
        setDrafts(prevDrafts => {
          const newDrafts = { ...prevDrafts };
          delete newDrafts[followUpNodeId];
          return newDrafts;
        });

        // 启动SSE连接接收Answer内容（此时 ref 已包含最新数据）
        startMockSSE({
          onMessage: (event, data) => {
            handleMessageRef.current(event, data);
          },
          onClose: () => console.log("Horizontal follow-up SSE stream closed."),
        }, {
          qaId: qa_id,        // 从 API 返回的 qa_id
          parentNodeId: q_node_id  // Q 节点 ID
        });

      } catch (error) {
        console.error('横向追问失败:', error);
        // 删除pending节点
        setNodes((currentNodes) => {
          const { cleanedNodes } = cleanupPendingNodes(currentNodes, edges);
          nodesRef.current = cleanedNodes;
          return cleanedNodes;
        });
        setEdges((currentEdges) => {
          const { cleanedEdges } = cleanupPendingNodes(nodes, currentEdges);
          edgesRef.current = cleanedEdges;
          return cleanedEdges;
        });
      }
    } else if (nodeForFollowUp?.type === 'followup') {
      // 垂直追问：保持原有逻辑
      // TODO: 调用真实 API

      setDrafts(prevDrafts => {
        const newDrafts = { ...prevDrafts };
        delete newDrafts[nodeForFollowUp.id];
        return newDrafts;
      });
    }

    // Deselect node after submit and restore hideAskButton
    setNodes((nds) => {
      const updatedNodes = nds.map(n => ({
        ...n,
        selected: false,
        data: n.type === 'acard' && n.data.hideAskButton
          ? { ...n.data, hideAskButton: false }
          : n.data
      }));
      nodesRef.current = updatedNodes;
      return updatedNodes;
    });
    setFollowUpNodeId(null);
  };

  // 节点操作的回调函数
  const onMoveStart = useCallback(() => {
    // onMoveStart logic if any
  }, []);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => ({ ...node, selected: node.id === nodeId }));
      nodesRef.current = updatedNodes;
      return updatedNodes;
    });
    setFollowUpNodeId(null);
  }, [setNodes]);

  const handleAskFollowUp = useCallback((nodeId: string) => {
    const previousNodeId = prevFollowUpNodeIdRef.current;

    setNodes((nds) => {
      const updatedNodes = nds.map((node) => ({
        ...node,
        selected: node.id === nodeId,
        data: node.type === 'acard'
          ? node.id === nodeId
            ? { ...node.data, hideAskButton: true }              // 当前节点：隐藏
            : node.id === previousNodeId
              ? { ...node.data, hideAskButton: undefined }       // 上一个节点：恢复为 undefined
              : node.data                                         // 其他节点：保持不变
          : node.data
      }));

      nodesRef.current = updatedNodes;
      return updatedNodes;
    });

    prevFollowUpNodeIdRef.current = nodeId;  // 更新记录
    setFollowUpNodeId(nodeId);
  }, [setNodes]);

  const handleNodeLocate = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => ({
        ...node,
        selected: node.id === nodeId,
      }));
      nodesRef.current = updatedNodes;
      return updatedNodes;
    });
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
    // 更新节点高度并触发布局重新计算
    setNodes((currentNodes) => {
      const updated = currentNodes.map(node =>
        node.id === nodeId
          ? { ...node, height: newHeight }
          : node
      );
      nodesRef.current = updated;
      return updated;
    });

    // 强制触发布局更新
    setLayoutTrigger(prev => prev + 1);
  }, [setNodes]);

  // 卡片操作函数
  const cardActions = useCallback((id: string, type: 'qcard' | 'acard') => ({
    onDelete: () => console.log(`Delete card ${id}`),
    onCopy: () => console.log(`Copy card ${id}`),
    onClick: type === 'qcard' ? () => handleAskFollowUp(id) : () => handleNodeSelect(id),
    onAsk: () => handleAskFollowUp(id),
    onLocate: () => handleNodeLocate(id),
    onHeightChange: handleHeightChange,
  }), [handleAskFollowUp, handleNodeSelect, handleNodeLocate, handleHeightChange]);

  const handleMessage = useCallback((event: string, data: string) => {
    setIsLoading(current => current ? false : current);

    const payload = JSON.parse(data);

    if (event === 'title') {
      updateTreeTitle(treeId, payload.title);
    }

    if (event === 'text' || event === 'ask_back') {
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
              // 后续节点:基于 parentId 查找父节点，从 ref 中查找以获取最新状态
              const parentNode = nodesRef.current.find(n => n.id === parentId);

              if (!parentNode) {
                console.error('未找到父节点:', parentId, '当前节点列表:', nodesRef.current.map(n => n.id));
                return currentNodes;
              }

              const parentHeight = parentNode.height || (
                parentNode.type === 'acard' ? 550 :
                parentNode.type === 'followup' ? 24 : 250
              );
              const GAP = 80; // 与 ELK 的 nodeSpacing 保持一致

              // 计算 x 位置：如果当前节点和父节点宽度不同，需要调整以保持中心对齐
              let xPosition = parentNode.position.x;
              if (type === 'followup' && parentNode.type !== 'followup') {
                // 从 360px 卡片到 24px followup：向右偏移
                xPosition = parentNode.position.x + (360 - 24) / 2;
              } else if (type !== 'followup' && parentNode.type === 'followup') {
                // 从 24px followup 到 360px 卡片：向左偏移
                xPosition = parentNode.position.x - (360 - 24) / 2;
              }

              initialPosition = {
                x: xPosition,
                y: parentNode.position.y + parentHeight + GAP
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

            const newNodes = [...currentNodes, newNode];
            nodesRef.current = newNodes;
            return newNodes;
          } else {
            const updatedNodes = currentNodes.map(n => {
              if (n.id === id) {
                // Q1 节点不累加内容（SSE 只推送空字符串用于创建节点）
                // A 节点才累加流式内容
                const currentContent = n.data.content;
                const updatedContent = n.type === 'qcard' ? currentContent : currentContent + content;

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
            nodesRef.current = updatedNodes;
            return updatedNodes;
          }
        });

        if (parentId) {
          setEdges(currentEdges => {
            const edgeId = `${parentId}-${id}`;
            const existingEdge = currentEdges.find(e => e.id === edgeId);
            if (!existingEdge) {
              const newEdges = [...currentEdges, {
                id: edgeId,
                source: parentId,
                target: id,
                style: {
                  strokeDasharray: '5,5',
                  stroke: '#b1b1b7',
                  strokeWidth: 2
                }
              }];
              edgesRef.current = newEdges;
              return newEdges;
            }
            return currentEdges;
          });
        }

      }

      if (event === 'ask_back') {
        const { node_id, ask_back } = payload;
        setNodes(currentNodes => {
          const updatedNodes = currentNodes.map(n =>
            n.id === node_id ? {
              ...n, data: { ...n.data, relatedQuestions: ask_back, ...cardActions(node_id, 'acard') }
            } : n
          );
          nodesRef.current = updatedNodes;
          return updatedNodes;
        });
      }
    }

    // 监听 SSE 完成事件，在最后一个 A 节点下方创建 F 节点
    if (event === 'done') {
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
        setNodes(prev => {
          const newNodes = [...prev, newFNode];
          nodesRef.current = newNodes;
          return newNodes;
        });

        // 更新边
        setEdges(prevEdges => {
          const edgeId = `${lastANode.id}-${nextFNodeId}`;
          const existingEdge = prevEdges.find(e => e.id === edgeId);
          if (!existingEdge) {
            const newEdges = [...prevEdges, {
              id: edgeId,
              source: lastANode.id,
              target: nextFNodeId,
              style: {
                strokeDasharray: '5,5',
                stroke: '#b1b1b7',
                strokeWidth: 2
              }
            }];
            edgesRef.current = newEdges;
            return newEdges;
          }
          return prevEdges;
        });

      }, 100);
    }
  }, [treeId, initialQuestion, updateTreeTitle, setNodes, setEdges, cardActions, setOpenDrawerId, getNodes, getZoom, fitView]);

  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
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
    const centerX = (canvasWidth / 2) - 12; // 12 = 24px F节点宽度的一半
    const centerY = canvasHeight / 2;

    // 创建 F0 节点
    if (currentTree.dummyNodeId) {
      const f0X = centerX; // F0直接居中,不需要偏移
      const f0Y = centerY - 104;
      const f0Node: Node = {
        id: currentTree.dummyNodeId,
        type: 'followup',
        position: { x: f0X, y: f0Y },
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
      const q1X = centerX - (360 - 24) / 2; // 基于F0中心向左偏移
      const q1Node: Node = {
        id: currentTree.qNodeId,
        type: 'qcard',
        position: { x: q1X, y: centerY },
        draggable: false,
        data: {
          pos: 0,
          content: initialQuestion,
          isGenerating: false,
          nodeId: currentTree.qNodeId,
          question: initialQuestion,
          avatar: mockUser.avatar,
          ...cardActions(currentTree.qNodeId, 'qcard'),
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

    // 同步更新 ref
    nodesRef.current = initialNodes;
    edgesRef.current = initialEdges;

    // 启动 SSE 接收 A 节点
    const abortSSE = startMockSSE({
      onMessage: (event, data) => {
        handleMessageRef.current(event, data);
      },
      onClose: () => console.log("Mock SSE stream closed."),
    }, {
      qaId: currentTree.qaId || 'qa1',        // 从 create API 返回的 qa_id
      parentNodeId: currentTree.qNodeId || 'q1'  // Q1 节点 ID
    });

    // Cleanup 函数：组件卸载或 treeId 变化时中止 SSE
    return () => {
      abortSSE();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId, router, setNodes, setEdges]);

  useEffect(() => {
    // 如果布局正在进行中,跳过
    if (layoutInProgressRef.current) {
      return;
    }

    if (nodes.length > 1 && edges.length > 0) {
      // 检查所有节点是否已被 ReactFlow 测量
      const allNodesMeasured = nodes.every(node =>
        node.width !== undefined &&
        node.height !== undefined
      );

      // 生成当前节点的高度签名
      const currentSignature = nodes.map(n => `${n.id}:${n.height}`).join(',');

      // 只有在节点都测量完成,且高度签名发生变化时才执行布局
      if (allNodesMeasured && currentSignature !== lastLayoutSignatureRef.current) {
        lastLayoutSignatureRef.current = currentSignature;
        layoutInProgressRef.current = true; // 标记布局开始

        const onLayout = async () => {
          // 调试日志
          console.log('🔄 触发布局 (onLayout 函数执行):', {
            nodeCount: nodes.length,
            nodes: nodes.map(n => ({
              reactFlowId: n.id,
              nodeId: n.data.nodeId || 'N/A',
              type: n.type,
              isPending: n.data.isPending || false,
              height: n.height,
              position: n.position
            }))
          });

          // 过滤掉 pending 节点和横向根节点（横向的 Q 节点），它们不参与 ELK 布局
          // 但横向根节点的子节点（A、F）会参与 ELK 布局，保证垂直对齐
          const layoutNodes = nodes.filter(n => !n.data.isPending && !n.data.isHorizontalRoot);
          const layoutEdges = edges.filter(e => {
            const sourceNode = nodes.find(n => n.id === e.source);
            const targetNode = nodes.find(n => n.id === e.target);

            // 如果任一节点不存在，说明是孤立边，应该过滤掉
            if (!sourceNode || !targetNode) {
              return false;
            }

            // 排除 pending 节点和横向根节点的边
            const sourceExcluded = sourceNode.data.isPending || sourceNode.data.isHorizontalRoot;
            const targetExcluded = targetNode.data.isPending || targetNode.data.isHorizontalRoot;
            return !sourceExcluded && !targetExcluded;
          });

          // 1. 找到第一个 F 节点作为参考点(锚点)
          const referenceNode = layoutNodes.find(n => n.type === 'followup');
          const referenceOldPos = referenceNode?.position;

          const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(layoutNodes, layoutEdges);

          // 2. 后处理:调整QA节点的x坐标,与父F节点中心对齐
          const adjustedNodes = layoutedNodes.map(node => {
            // 只处理QA节点
            if (node.type === 'qcard' || node.type === 'acard') {
              // 找到这个节点的父边
              const parentEdge = edges.find(e => e.target === node.id);
              if (parentEdge) {
                // 找到父节点
                const parentNode = layoutedNodes.find(n => n.id === parentEdge.source);
                // 如果父节点是F节点,基于F的中心线对齐当前QA节点
                if (parentNode && parentNode.type === 'followup') {
                  const fCenterX = parentNode.position.x + 12; // F节点中心x坐标 (x + width/2)
                  const alignedX = fCenterX - 180; // QA节点左边缘 = F中心 - 180 (360/2)

                  return {
                    ...node,
                    position: {
                      x: alignedX,
                      y: node.position.y  // y坐标保持ELK的结果
                    }
                  };
                }
              }
            }
            // F节点和其他节点保持ELK的结果
            return node;
          });

          // 3. 获取布局后参考节点的位置(使用调整后的节点)
          const referenceLayoutedNode = referenceNode ? adjustedNodes.find(n => n.id === referenceNode.id) : undefined;
          const referenceNewPos = referenceLayoutedNode?.position;

          // 4. 计算偏移量并应用到所有节点（基于F0参考节点）
          if (referenceOldPos && referenceNewPos) {
            const deltaX = referenceOldPos.x - referenceNewPos.x;
            const deltaY = referenceOldPos.y - referenceNewPos.y;

            const finalNodes = adjustedNodes.map(node => ({
              ...node,
              position: {
                x: node.position.x + deltaX,
                y: node.position.y + deltaY
              }
            }));

            // 合并 pending 节点和横向根节点
            const excludedNodes = nodes.filter(n => n.data.isPending || n.data.isHorizontalRoot);
            const allNodes = [...finalNodes, ...excludedNodes];

            console.log('📍 最终节点位置:', {
              referenceNodeId: referenceNode?.id,
              oldPos: referenceOldPos,
              newPos: referenceNewPos,
              delta: { deltaX, deltaY },
              finalPositions: allNodes.map(n => ({
                reactFlowId: n.id,
                nodeId: n.data.nodeId || 'N/A',
                type: n.type,
                isPending: n.data.isPending || false,
                position: { x: n.position.x, y: n.position.y }
              }))
            });

            nodesRef.current = allNodes;
            setNodes(allNodes);
          } else {
            // 合并 pending 节点和横向根节点
            const excludedNodes = nodes.filter(n => n.data.isPending || n.data.isHorizontalRoot);
            const allNodes = [...adjustedNodes, ...excludedNodes];

            console.log('📍 最终节点位置 (无参考):', {
              finalPositions: allNodes.map(n => ({
                reactFlowId: n.id,
                nodeId: n.data.nodeId || 'N/A',
                type: n.type,
                isPending: n.data.isPending || false,
                position: { x: n.position.x, y: n.position.y }
              }))
            });
            nodesRef.current = allNodes;
            setNodes(allNodes);
          }

          // 合并被排除的边（pending 边和横向根节点的边）
          const excludedEdges = edges.filter(e => {
            const sourceNode = nodes.find(n => n.id === e.source);
            const targetNode = nodes.find(n => n.id === e.target);
            const sourceExcluded = sourceNode?.data.isPending || sourceNode?.data.isHorizontalRoot;
            const targetExcluded = targetNode?.data.isPending || targetNode?.data.isHorizontalRoot;
            return sourceExcluded || targetExcluded;
          });

          // 从 layoutedEdges 中排除已存在的边（避免重复）
          const excludedEdgeIds = new Set(excludedEdges.map(e => e.id));
          const finalLayoutedEdges = layoutedEdges.filter(e => !excludedEdgeIds.has(e.id));

          const allEdges = [...finalLayoutedEdges, ...excludedEdges];
          edgesRef.current = allEdges;
          setEdges(allEdges);

          // 布局完成,清除进行中标记
          layoutInProgressRef.current = false;

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
          setNodes((currentNodes) => {
            setEdges((currentEdges) => {
              const { cleanedEdges } = cleanupPendingNodes(currentNodes, currentEdges);
              edgesRef.current = cleanedEdges;
              return cleanedEdges;
            });
            const { cleanedNodes } = cleanupPendingNodes(currentNodes, edges);

            // 取消选中并恢复追问按钮
            const finalNodes = cleanedNodes.map(n => ({
              ...n,
              selected: false,
              data: n.type === 'acard' && n.data.hideAskButton
                ? { ...n.data, hideAskButton: false }
                : n.data
            }));
            nodesRef.current = finalNodes;
            return finalNodes;
          });
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