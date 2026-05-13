'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState, useReactFlow, Node, useViewport } from 'reactflow';
import { useQATrees } from '../../../context/QATreeContext';
import 'reactflow/dist/style.css';
import { mockUser } from '../../../lib/mock-data'; // 导入模拟用户
import { motion, AnimatePresence } from 'framer-motion';
import ReusableTiptapEditor from '../../../components/common/ReusableTiptapEditor';
import { getLayoutedElements, getMultiColumnLayoutedElements } from '../../../utils/layout-utils';
import { GAP, HORIZONTAL_BRANCH_GAP, CARD_WIDTH, FOLLOWUP_WIDTH, HORIZONTAL_GAP, MAIN_TO_HORIZONTAL_CLUSTER_GAP } from '../../../config/constants';

import { startMockSSE } from '../../../lib/mock-sse';
import QCardLiteNode from '../../../components/flow-nodes/QCardLiteNode';
import ACardLiteNode from '../../../components/flow-nodes/ACardLiteNode';
import FollowUpNode from '../../../components/flow-nodes/FollowUpNode';
import { Button, Listbox, ListboxItem, Skeleton } from '@heroui/react';
import { createHorizontalFollowUp, createVerticalFollowUp } from '../../../services/qatree-api';
import { CustomDrawer } from '../../../components/card/acard/CustomDrawer';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
import { CloseIcon, CopyIcon, LocationIcon } from '../../../components/icons';

const liteNodeTypes = {
  qcard: QCardLiteNode,
  acard: ACardLiteNode,
  followup: FollowUpNode,
};

interface FlowViewProps {
  treeId: string;
}

interface FlowCanvasProps extends FlowViewProps {
  initialQuestion: string;
}

function FlowCanvas({ treeId, initialQuestion }: FlowCanvasProps) {
  const LITE_ENTER_ZOOM = 0.3;
  const LITE_EXIT_ZOOM = 0.35;
  const DRAWER_SWITCH_DELAY_MS = 250;
  const LOCATE_PAN_DURATION_MS = 550;
  const LOCATE_PAN_SETTLE_MS = 590;
  const FOLLOWUP_PAN_DURATION_MS = 550;
  const FOLLOWUP_PAN_SETTLE_MS = 590;
  const router = useRouter();
  const { trees, updateTreeTitle } = useQATrees();
  const { getZoom, getNodes, setViewport, getViewport } = useReactFlow();
  const { zoom } = useViewport();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingText, setEditingText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [followUpNodeId, setFollowUpNodeId] = useState<string | null>(null);
  const nodeForFollowUp = nodes.find(n => n.id === followUpNodeId);
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);
  const [isLiteMode, setIsLiteMode] = useState(false);

  // 记录上次布局时的节点高度签名,避免死循环
  const lastLayoutSignatureRef = useRef<string>('');

  // 用于强制触发布局更新的状态
  const [layoutTrigger, setLayoutTrigger] = useState(0);
  const locateAnimationRef = useRef<number | null>(null);
  const isCenteringRef = useRef(false);
  const lockedCenterZoomRef = useRef<number | null>(null);
  const drawerSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openDrawerIdRef = useRef<string | null>(null);
  const pendingDrawerOpenIdRef = useRef<string | null>(null);
  const animateNextLayoutRef = useRef(false);
  const [layoutTransitionEnabled, setLayoutTransitionEnabled] = useState(false);
  const pendingCenterNodeIdRef = useRef<string | null>(null);

  // 布局进行中标记,防止重复触发
  const layoutInProgressRef = useRef(false);
  const prevLiteModeRef = useRef(false);

  const getDefaultHeightForNode = useCallback((node: Node) => {
    if (typeof node.height === 'number') return node.height;
    if (node.type === 'acard') return 550;
    if (node.type === 'followup') return 24;
    return 250;
  }, []);

  const enrichNodeVisualData = useCallback((node: Node, _z: number): Node => {
    if (node.type !== 'qcard' && node.type !== 'acard') return node;
    const prevData = node.data || {};
    if (isLiteMode) {
      if (prevData.isLiteMode === true) return node;
      return {
        ...node,
        data: {
          ...prevData,
          isLiteMode,
        },
      };
    }

    if (prevData.isLiteMode !== true) return node;
    return {
      ...node,
      data: {
        ...prevData,
        isLiteMode,
      },
    };
  }, [isLiteMode]);

  const getNodeHeight = useCallback((node: Node): number => {
    if (typeof node.height === 'number') return node.height;
    if (node.type === 'acard') return 550;
    if (node.type === 'followup') return 24;
    return 250;
  }, []);

  const collectDescendantIds = useCallback((rootId: string, allEdges: any[]): Set<string> => {
    const descendants = new Set<string>();
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (descendants.has(currentId)) continue;
      descendants.add(currentId);

      allEdges.forEach((edge) => {
        if (edge.source === currentId && !descendants.has(edge.target)) {
          queue.push(edge.target);
        }
      });
    }

    return descendants;
  }, []);

  const applyHorizontalCollisionAvoidance = useCallback((
    currentNodes: Node[],
    allEdges: any[],
    parentNodeId: string,
    pendingNode: Node
  ): Node[] => {
    const nodeById = new Map(currentNodes.map((node) => [node.id, node]));

    // 主链路下一个节点（a -> b）
    const verticalChildIds = allEdges
      .filter((edge) => edge.source === parentNodeId && edge.sourceHandle !== 'right')
      .map((edge) => edge.target);

    if (verticalChildIds.length === 0) return currentNodes;

    const verticalChildren = verticalChildIds
      .map((id) => nodeById.get(id))
      .filter((node): node is Node => Boolean(node));

    if (verticalChildren.length === 0) return currentNodes;

    const downstreamRoot = verticalChildren.sort((a, b) => a.position.y - b.position.y)[0];

    // 在右侧列中找“a1 下方”的最近节点；没有则不移动
    const rightColumnCandidates = currentNodes
      .filter((node) => node.id !== pendingNode.id)
      .filter((node) => node.position.x >= pendingNode.position.x - 1)
      .filter((node) => node.position.y >= pendingNode.position.y);

    if (rightColumnCandidates.length === 0) return currentNodes;

    const nearestTop = Math.min(...rightColumnCandidates.map((node) => node.position.y));
    const pendingBottom = pendingNode.position.y + getNodeHeight(pendingNode);
    const minGap = GAP;
    const distance = nearestTop - pendingBottom;

    if (distance >= minGap) return currentNodes;

    const deltaY = minGap - distance;
    const shiftStartY = downstreamRoot.position.y;
    const shiftMinX = Math.min(downstreamRoot.position.x, pendingNode.position.x) - 1;
    return currentNodes.map((node) =>
      node.position.y >= shiftStartY &&
      node.position.x >= shiftMinX &&
      node.type !== 'followup'
        ? {
            ...node,
            position: {
              ...node.position,
              y: node.position.y + deltaY,
            },
          }
        : node
    );
  }, [getNodeHeight]);

  const placeHorizontalQBelowExistingBranches = useCallback((
    currentNodes: Node[],
    allEdges: any[],
    parentNodeId: string,
    qNode: Node
  ): Node => {
    const nodeById = new Map(currentNodes.map((node) => [node.id, node]));
    const existingHorizontalRoots = allEdges
      .filter((edge) => edge.source === parentNodeId && edge.sourceHandle === 'right')
      .map((edge) => edge.target)
      .filter((targetId) => targetId !== qNode.id);

    if (existingHorizontalRoots.length === 0) {
      return qNode;
    }

    let maxBottomY = qNode.position.y;
    existingHorizontalRoots.forEach((rootId) => {
      const subtreeIds = collectDescendantIds(rootId, allEdges);
      subtreeIds.forEach((nodeId) => {
        const node = nodeById.get(nodeId);
        if (!node) return;
        const nodeBottom = node.position.y + getNodeHeight(node);
        if (nodeBottom > maxBottomY) {
          maxBottomY = nodeBottom;
        }
      });
    });

    return {
      ...qNode,
      position: {
        ...qNode.position,
        y: maxBottomY + HORIZONTAL_BRANCH_GAP,
      },
    };
  }, [collectDescendantIds, getNodeHeight]);

  const getNodeWidth = useCallback((node: Node): number => {
    if (typeof node.width === 'number') return node.width;
    if (node.type === 'followup') return 24;
    return CARD_WIDTH;
  }, []);

  const collectSubtreeIdsBy = useCallback((rootId: string, allEdges: any[], includeRight: boolean): Set<string> => {
    const ids = new Set<string>();
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (ids.has(currentId)) continue;
      ids.add(currentId);

      allEdges.forEach((edge) => {
        if (edge.source !== currentId) return;
        if (!includeRight && edge.sourceHandle === 'right') return;
        if (!ids.has(edge.target)) {
          queue.push(edge.target);
        }
      });
    }

    return ids;
  }, []);

  const ensureHorizontalBranchGapOnVerticalFollowUp = useCallback((
    currentNodes: Node[],
    allEdges: any[],
    contextNodeId: string
  ): Node[] => {
    return currentNodes;
  }, []);

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
    if (!openDrawerId) return;
    const exists = nodes.some((n) => n.id === openDrawerId && n.type === 'acard');
    if (!exists) {
      setOpenDrawerId(null);
    }
  }, [openDrawerId, nodes]);

  useEffect(() => {
    if (followUpNodeId) {
      // 从 nodesRef 中查找节点
      const node = nodesRef.current.find(n => n.id === followUpNodeId);

      if (node?.type === 'qcard') {
        // Q节点：优先从drafts读取（用户编辑的内容），否则从节点数据读取
        const draftText = drafts[followUpNodeId];
        const questionText = draftText !== undefined
          ? draftText
          : (node.data.question || node.data.content || '');
        setEditingText(questionText);
      } else {
        // A节点或F节点：从drafts读取草稿
        const initialText = drafts[followUpNodeId] || '';
        setEditingText(initialText);
      }
    } else {
      setEditingText('');
    }
  }, [followUpNodeId, drafts]);

  useEffect(() => {
    openDrawerIdRef.current = openDrawerId;
  }, [openDrawerId]);

  const handleToggleDrawer = useCallback((nodeId: string) => {
    if (drawerSwitchTimerRef.current) {
      clearTimeout(drawerSwitchTimerRef.current);
      drawerSwitchTimerRef.current = null;
    }
    const currentOpenId = openDrawerIdRef.current;
    if (currentOpenId === nodeId) {
      pendingDrawerOpenIdRef.current = null;
      setOpenDrawerId(null);
      return;
    }
    if (currentOpenId) {
      pendingDrawerOpenIdRef.current = nodeId;
      setOpenDrawerId(null);
      drawerSwitchTimerRef.current = setTimeout(() => {
        if (openDrawerIdRef.current === null && pendingDrawerOpenIdRef.current) {
          setOpenDrawerId(pendingDrawerOpenIdRef.current);
        }
        pendingDrawerOpenIdRef.current = null;
        drawerSwitchTimerRef.current = null;
      }, DRAWER_SWITCH_DELAY_MS);
      return;
    }
    pendingDrawerOpenIdRef.current = null;
    setOpenDrawerId(nodeId);
  }, []);

  // 记录上一个 followUpNodeId，用于恢复 hideAskButton
  const prevFollowUpNodeIdRef = useRef<string | null>(null);

  // 用于存储最新的 nodes 和 edges，解决异步状态更新导致的竞态条件
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<any[]>([]);
  const handleAskFollowUpRef = useRef<(nodeId: string) => void>(() => {});
  const lastNodeHeightsRef = useRef<Record<string, number>>({});
  const layoutTriggerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTextEventsRef = useRef<Array<{ key: string; event: string; data: string; retries: number }>>([]);
  const flushingPendingRef = useRef(false);

  const resolveParentNodeIn = useCallback((allNodes: Node[], parentNodeId?: string) => {
    if (!parentNodeId) return undefined;
    return allNodes.find((n) => n.id === parentNodeId) || allNodes.find((n) => n.data?.nodeId === parentNodeId);
  }, []);

  const enqueuePendingTextEvent = useCallback((event: string, data: string, key: string) => {
    const exists = pendingTextEventsRef.current.some((item) => item.key === key);
    if (exists) return;
    pendingTextEventsRef.current.push({ key, event, data, retries: 0 });
  }, []);

  const handleUpdate = (newText: string) => {
    setEditingText(newText);

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

  useEffect(() => {
    setIsLiteMode((prev) => {
      if (!prev && zoom <= LITE_ENTER_ZOOM) return true;
      if (prev && zoom >= LITE_EXIT_ZOOM) return false;
      return prev;
    });
  }, [zoom, LITE_ENTER_ZOOM, LITE_EXIT_ZOOM]);

  useEffect(() => {
    const enteringLite = !prevLiteModeRef.current && isLiteMode;
    prevLiteModeRef.current = isLiteMode;
    setNodes((currentNodes) => {
      let changed = false;
      const next = currentNodes.map((node) => {
        let nextNode = node;
        if (node.type === 'qcard' || node.type === 'acard') {
          const prevData = node.data || {};
          if (enteringLite && prevData.isLiteMode !== true && typeof node.height === 'number') {
            const frozenHeight = node.height;
            nextNode = {
              ...node,
              data: {
                ...prevData,
                renderHeight: frozenHeight,
              },
            };
          }
        }
        const enriched = enrichNodeVisualData(nextNode, zoom);
        if (enriched !== node) changed = true;
        return enriched;
      });
      if (!changed) return currentNodes;
      nodesRef.current = next;
      return next;
    });
  }, [isLiteMode, nodes, zoom, setNodes, enrichNodeVisualData, getDefaultHeightForNode]);

  const runCreateQFollowUp = useCallback(async (
    parentReactFlowNodeId: string,
    questionText: string,
    mode: 'horizontal' | 'vertical'
  ) => {
    setIsSubmitting(true);
    // 锁定一次追问流程内的居中缩放，避免视图外定位时出现缩放变化
    lockedCenterZoomRef.current = getZoom();
    try {
      const parentNode = nodesRef.current.find(n => n.id === parentReactFlowNodeId);
      if (!parentNode) {
        throw new Error('Parent node not found');
      }
      const parentBusinessNodeId = parentNode.data?.nodeId || parentNode.id;
      const data = mode === 'horizontal'
        ? await createHorizontalFollowUp(treeId, parentBusinessNodeId, questionText)
        : await createVerticalFollowUp(treeId, parentBusinessNodeId, questionText);

      const { q_node_id, qa_id } = data;
      const shouldFocusAfterLayout = true;
      const newQNodeBase: Node = {
        id: q_node_id,
        type: 'qcard',
        position: {
          x: parentNode.position.x + (mode === 'horizontal' ? CARD_WIDTH + HORIZONTAL_GAP : 0),
          y: parentNode.position.y
        },
        draggable: false,
        selected: true,
        data: {
          pos: 0,
          content: questionText,
          question: questionText,
          isGenerating: false,
          nodeId: q_node_id,
          qaId: qa_id,
          parentNodeId: parentBusinessNodeId,
          parentReactFlowId: parentNode.id,
          avatar: mockUser.avatar,
          onDelete: () => console.log(`Delete card ${q_node_id}`),
          onCopy: () => console.log(`Copy card ${q_node_id}`),
          onClick: () => handleAskFollowUpRef.current(q_node_id),
        }
      };
      const newEdge: any = {
        id: `${parentNode.id}-${q_node_id}`,
        source: parentNode.id,
        target: q_node_id,
        type: 'smoothstep',
        style: {
          strokeDasharray: '5,5',
          stroke: '#b1b1b7',
          strokeWidth: 2
        }
      };
      if (mode === 'horizontal') {
        newEdge.sourceHandle = 'right';
        newEdge.targetHandle = 'left';
      }

      const edgeExists = edgesRef.current.some((e: any) => e.id === newEdge.id);
      const nextEdges = edgeExists ? edgesRef.current : [...edgesRef.current, newEdge];
      const placedHorizontalQNode = mode === 'horizontal'
        ? placeHorizontalQBelowExistingBranches(
            nodesRef.current,
            nextEdges,
            parentNode.id,
            newQNodeBase
          )
        : newQNodeBase;
      let nextNodes = [...nodesRef.current.map(node => ({ ...node, selected: false })), placedHorizontalQNode];

      if (mode === 'vertical') {
        nextNodes = ensureHorizontalBranchGapOnVerticalFollowUp(
          nextNodes,
          nextEdges,
          parentReactFlowNodeId
        );
      }

      const commitFollowUp = () => {
        nodesRef.current = nextNodes;
        edgesRef.current = nextEdges;
        setNodes(nextNodes);
        setEdges(nextEdges);
        if (shouldFocusAfterLayout) {
          pendingCenterNodeIdRef.current = q_node_id;
        }
        animateNextLayoutRef.current = true;
        setLayoutTrigger(prev => prev + 1);

        // 节点入图后再启动 SSE，避免流式消息先到导致父节点尚未可见
        startMockSSE({
          onMessage: (event, data) => {
            handleMessageRef.current(event, data);
          },
          onClose: () => console.log(`${mode} follow-up SSE stream closed.`),
        }, {
          qaId: qa_id,
          parentNodeId: q_node_id
        });
      };

      commitFollowUp();

    } catch (error) {
      console.error(`${mode}追问失败:`, error);
    } finally {
      // 释放缩放锁，后续流程可使用最新缩放
      lockedCenterZoomRef.current = null;
      setIsSubmitting(false);
    }
  }, [treeId, getZoom, placeHorizontalQBelowExistingBranches, setNodes, setEdges, ensureHorizontalBranchGapOnVerticalFollowUp]);

  const handleSubmit = async (submittedText: string) => {
    if (!followUpNodeId) return;

    const trimmedText = submittedText.trim();
    if (!trimmedText) return;

    if (nodeForFollowUp?.type === 'acard') {
      await runCreateQFollowUp(followUpNodeId, trimmedText, 'horizontal');

      // 清理草稿（followUpNodeId就是父ACard的ID）
      setDrafts(prevDrafts => {
        const newDrafts = { ...prevDrafts };
        delete newDrafts[followUpNodeId];
        return newDrafts;
      });
    } else if (nodeForFollowUp?.type === 'followup') {
      await runCreateQFollowUp(followUpNodeId, trimmedText, 'vertical');

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
      const updatedNodes = nds.map((node) => ({
        ...node,
        selected: node.id === nodeId,
        data: node.type === 'acard' && node.data.hideAskButton
          ? { ...node.data, hideAskButton: false }
          : node.data,
      }));
      nodesRef.current = updatedNodes;
      return updatedNodes;
    });
    prevFollowUpNodeIdRef.current = null;
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
  handleAskFollowUpRef.current = handleAskFollowUp;

  const handleRelatedQuestionFollowUp = useCallback((nodeId: string, question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    // 相关问题点击走静默横向追问，不设置 followUpNodeId，避免弹出底部输入框
    void runCreateQFollowUp(nodeId, trimmedQuestion, 'horizontal');
  }, [runCreateQFollowUp]);

  function centerPointInCanvas(
    targetCenterX: number,
    targetCenterY: number,
    onDone?: () => void,
    options?: { durationMs?: number; settleMs?: number }
  ) {
    const currentZoom = getZoom();
    const durationMs = options?.durationMs ?? FOLLOWUP_PAN_DURATION_MS;
    const settleMs = options?.settleMs ?? (durationMs + 40);
    const reactFlowEl = document.querySelector('.react-flow') as HTMLElement | null;
    const viewportWidth = reactFlowEl?.clientWidth ?? window.innerWidth;
    const viewportHeight = reactFlowEl?.clientHeight ?? window.innerHeight;
    const nextX = viewportWidth / 2 - targetCenterX * currentZoom;
    const nextY = viewportHeight / 2 - targetCenterY * currentZoom;
    const { x: startX, y: startY } = getViewport();
    if (locateAnimationRef.current !== null) {
      cancelAnimationFrame(locateAnimationRef.current);
      locateAnimationRef.current = null;
    }
    // 居中期间只保留画布平移，禁用节点重排过渡，避免“收缩”体感
    isCenteringRef.current = true;
    setLayoutTransitionEnabled(false);
    const startTs = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTs;
      const raw = Math.min(1, durationMs <= 0 ? 1 : elapsed / durationMs);
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      const x = startX + (nextX - startX) * eased;
      const y = startY + (nextY - startY) * eased;
      setViewport({ x, y, zoom: currentZoom });
      if (raw < 1) {
        locateAnimationRef.current = requestAnimationFrame(tick);
        return;
      }
      locateAnimationRef.current = null;
      window.setTimeout(() => {
        isCenteringRef.current = false;
        if (onDone) onDone();
      }, Math.max(0, settleMs - durationMs));
    };
    locateAnimationRef.current = requestAnimationFrame(tick);
  }

  function centerNodeInCanvas(
    nodeId: string,
    selectNode: boolean,
    onDone?: () => void,
    options?: { durationMs?: number; settleMs?: number }
  ) {
    if (selectNode) {
      setNodes((nds) => {
        const updatedNodes = nds.map((node) => ({
          ...node,
          selected: node.id === nodeId,
        }));
        nodesRef.current = updatedNodes;
        return updatedNodes;
      });
    }
    requestAnimationFrame(() => {
      const currentFlowNodes = getNodes();
      const targetNode = currentFlowNodes.find((n) => n.id === nodeId) || nodesRef.current.find((n) => n.id === nodeId);
      if (!targetNode) return;
      const nodeWidth = typeof targetNode.width === 'number'
        ? targetNode.width
        : (targetNode.type === 'followup' ? 24 : CARD_WIDTH);
      const nodeHeight = typeof targetNode.height === 'number'
        ? targetNode.height
        : (targetNode.type === 'acard' ? 550 : targetNode.type === 'followup' ? 24 : 250);
      const targetCenterX = targetNode.position.x + nodeWidth / 2;
      const targetCenterY = targetNode.position.y + nodeHeight / 2;
      centerPointInCanvas(targetCenterX, targetCenterY, onDone, options);
    });
  }

  const handleNodeLocate = useCallback((nodeId: string) => {
    centerNodeInCanvas(nodeId, true);
  }, []);
  // 处理节点高度变化
  const handleHeightChange = useCallback((nodeId: string, newHeight: number) => {
    const prevHeight = lastNodeHeightsRef.current[nodeId];
    if (prevHeight !== undefined && Math.abs(newHeight - prevHeight) < 8) {
      return;
    }
    lastNodeHeightsRef.current[nodeId] = newHeight;

    // 更新节点高度并触发布局重新计算
    // 同步写入 data.renderHeight / measuredOnce，供 lite-shell 切回后读取真实高度
    setNodes((currentNodes) => {
      const updated = currentNodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              height: newHeight,
              data: {
                ...node.data,
                renderHeight: newHeight,
                measuredOnce: true,
                ...(node.data?.completeImmediatelyAfterMount
                  ? {
                      isGenerating: false,
                      finalLiteHeight: newHeight,
                      completeImmediatelyAfterMount: undefined,
                      ...cardActions(nodeId, 'acard'),
                    }
                  : {}),
              },
            }
          : node
      );
      nodesRef.current = updated;
      return updated;
    });

    // 节流布局触发，避免收起/展开动画期间多次全量重排
    if (layoutTriggerTimeoutRef.current) {
      return;
    }
    layoutTriggerTimeoutRef.current = setTimeout(() => {
      layoutTriggerTimeoutRef.current = null;
      setLayoutTrigger(prev => prev + 1);
    }, 120);
  }, [setNodes]);

  useEffect(() => {
    return () => {
      if (drawerSwitchTimerRef.current) {
        clearTimeout(drawerSwitchTimerRef.current);
        drawerSwitchTimerRef.current = null;
      }
      pendingDrawerOpenIdRef.current = null;
      if (layoutTriggerTimeoutRef.current) {
        clearTimeout(layoutTriggerTimeoutRef.current);
        layoutTriggerTimeoutRef.current = null;
      }
      if (locateAnimationRef.current !== null) {
        cancelAnimationFrame(locateAnimationRef.current);
        locateAnimationRef.current = null;
      }
    };
  }, []);

  // 卡片操作函数
  const cardActions = useCallback((id: string, type: 'qcard' | 'acard') => ({
    onDelete: () => console.log(`Delete card ${id}`),
    onCopy: () => console.log(`Copy card ${id}`),
    onClick: type === 'qcard' ? () => handleAskFollowUp(id) : () => handleNodeSelect(id),
    onAsk: () => handleAskFollowUp(id),
    onRelatedQuestionClick: type === 'acard'
      ? (question: string) => handleRelatedQuestionFollowUp(id, question)
      : undefined,
    onLocate: () => handleNodeLocate(id),
    onHeightChange: handleHeightChange,
    onCollapse: () => {},
  }), [handleAskFollowUp, handleRelatedQuestionFollowUp, handleNodeSelect, handleNodeLocate, handleHeightChange]);

  const handleMessage = useCallback((event: string, data: string) => {
    setIsLoading(current => current ? false : current);

    const payload = JSON.parse(data);

    if (event === 'title') {
      updateTreeTitle(treeId, payload.title);
    }

    if (event === 'text' || event === 'ask_back') {
      if (event === 'text') {
        const { id, pos, content, finish, parentNodeId } = payload.node_data;
        const done = payload.done || false; // 从 CommonFields 获取 done 字段
        const qaId = payload.qa_id; // 从 CommonFields 获取 qa_id
        const isGenerating = !finish;
        let resolvedParentReactFlowId: string | undefined;
        let shouldDeferForMissingParent = false;

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
              const nodeWidth = type === 'followup' ? FOLLOWUP_WIDTH : CARD_WIDTH;
              const nodeHeight = 150;

              initialPosition = {
                x: (canvasWidth / 2) - (nodeWidth / 2),  // 水平居中(考虑侧边栏)
                y: (canvasHeight / 2) - nodeHeight        // 下边缘垂直居中
              };
            } else {
              // 后续节点: parentNodeId 可能是业务ID，也可能是 ReactFlow ID，需做双通道解析
              const parentNode = resolveParentNodeIn(currentNodes, parentNodeId);

              if (!parentNode) {
                shouldDeferForMissingParent = true;
                const pendingKey = `${event}:${id}:${parentNodeId ?? ''}`;
                enqueuePendingTextEvent(event, data, pendingKey);
                return currentNodes;
              }
              resolvedParentReactFlowId = parentNode.id;

              console.log('📍 新节点位置计算 - 节点ID:', id, '父节点:', {
                id: parentNode.id,
                type: parentNode.type,
                position: parentNode.position,
                nodeId: parentNode.data?.nodeId
              });

              const parentHeight = parentNode.height || (
                parentNode.type === 'acard' ? 550 :
                parentNode.type === 'followup' ? 24 : 250
              );
              const GAP = 80; // 与 ELK 的 nodeSpacing 保持一致

              // 计算 x 位置：如果当前节点和父节点宽度不同，需要调整以保持中心对齐
              let xPosition = parentNode.position.x;
              if (type === 'followup' && parentNode.type !== 'followup') {
                // 从 360px 卡片到 24px followup：向右偏移
                xPosition = parentNode.position.x + (CARD_WIDTH - FOLLOWUP_WIDTH) / 2;
              } else if (type !== 'followup' && parentNode.type === 'followup') {
                // 从 24px followup 到 360px 卡片：向左偏移
                xPosition = parentNode.position.x - (CARD_WIDTH - FOLLOWUP_WIDTH) / 2;
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
                  parentNodeId: parentNodeId, // 父节点的业务 ID
                  onClick: () => handleAskFollowUp(id),
                },
              };
            } else {
              // type 是 'qcard' 或 'acard'
              const cardType = type as 'qcard' | 'acard';
              const isCompletedOnFirstChunk = cardType === 'acard' && !isGenerating;
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
                  isGenerating: isCompletedOnFirstChunk ? true : isGenerating,
                  nodeId: id, // 添加业务 ID
                  qaId: qaId, // 添加 qa_id，用于在 done 事件中查找对应的 A 节点
                  parentNodeId: parentNodeId, // 父节点的业务 ID（用于调试和显示）
                  question: pos === 0 ? initialQuestion : '',
                  title: pos > 0 ? `Answer ${id}` : '',
                  avatar: pos === 0 ? mockUser.avatar : undefined,
                  ...(isCompletedOnFirstChunk ? { completeImmediatelyAfterMount: true } : {}),
                  onExpand: cardType === 'acard' ? () => handleToggleDrawer(id) : undefined,
                  ...(!isGenerating && cardActions(id, cardType)),
                },
              };

              // 调试日志：记录创建的节点信息
              if (cardType === 'acard') {
                console.log('🎨 Creating A node:', { id, qaId, type: cardType });
              }
            }

            const newNodes = [...currentNodes, newNode];
            nodesRef.current = newNodes;

            if (type === 'acard' && !isGenerating) {
              requestAnimationFrame(() => {
                setNodes((latestNodes) => {
                  const liveNode = getNodes().find((node) => node.id === id);
                  const cachedNode = nodesRef.current.find((node) => node.id === id);
                  const resolvedHeight = typeof liveNode?.height === 'number'
                    ? liveNode.height
                    : typeof cachedNode?.height === 'number'
                      ? cachedNode.height
                      : undefined;

                  const completedNodes = latestNodes.map((node) =>
                    node.id === id &&
                    node.data?.completeImmediatelyAfterMount &&
                    typeof resolvedHeight === 'number' &&
                    resolvedHeight > 0
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            isGenerating: false,
                            finalLiteHeight: resolvedHeight,
                            renderHeight: resolvedHeight,
                            completeImmediatelyAfterMount: undefined,
                            ...cardActions(id, 'acard'),
                          },
                        }
                      : node
                  );
                  nodesRef.current = completedNodes;
                  return completedNodes;
                });
              });
            }

            return newNodes;
          } else {
            const updatedNodes = currentNodes.map(n => {
              if (n.id === id) {
                const wasGenerating = Boolean(n.data?.isGenerating);
                const justFinishedGenerating = n.type === 'acard' && wasGenerating && !isGenerating;
                let finalMeasuredHeight: number | undefined;

                if (justFinishedGenerating) {
                  const liveNode = getNodes().find((node) => node.id === id);
                  const cachedNode = nodesRef.current.find((node) => node.id === id);
                  const liveNodeHeight = typeof liveNode?.height === 'number' ? liveNode.height : undefined;
                  const cachedNodeHeight = typeof cachedNode?.height === 'number' ? cachedNode.height : undefined;
                  const resolvedHeight = typeof liveNodeHeight === 'number'
                    ? liveNodeHeight
                    : typeof cachedNodeHeight === 'number'
                      ? cachedNodeHeight
                      : undefined;
                  if (typeof resolvedHeight === 'number' && resolvedHeight > 0) {
                    finalMeasuredHeight = resolvedHeight;
                  }
                }
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
                    ...(n.type === 'acard' && isGenerating ? { finalLiteHeight: undefined } : {}),
                    ...(finalMeasuredHeight ? { finalLiteHeight: finalMeasuredHeight, renderHeight: finalMeasuredHeight } : {}),
                    onExpand: n.type === 'acard' ? () => handleToggleDrawer(id) : n.data.onExpand,
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

        if (parentNodeId && !shouldDeferForMissingParent) {
          setEdges(currentEdges => {
            const sourceNodeId = resolvedParentReactFlowId
              || resolveParentNodeIn(nodesRef.current, parentNodeId)?.id
              || parentNodeId;
            const edgeId = `${sourceNodeId}-${id}`;
            const existingEdge = currentEdges.find(e => e.id === edgeId);
            if (!existingEdge) {
              const newEdges = [...currentEdges, {
                id: edgeId,
                source: sourceNodeId,
                target: id,
                type: 'smoothstep',
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

    // 监听 SSE 完成事件，在对应的 A 节点下方创建 F 节点
    if (event === 'done') {
      setTimeout(() => {
        // 使用 getNodes() 获取当前节点状态，避免在 setNodes reducer 中产生副作用
        const currentNodes = getNodes();

        // 从 payload 中获取 qa_id
        const qaId = payload.qa_id;
        console.log('🔍 Done event received:', { qaId, payload });

        if (!qaId) {
          console.warn('done event missing qa_id');
          return;
        }

        // 打印所有 A 节点的 qaId，便于调试
        const aNodes = currentNodes.filter(n => n.type === 'acard');
        console.log('🔍 All A nodes:', aNodes.map(n => ({ id: n.id, qaId: n.data.qaId })));

        // 通过 qa_id 查找对应的 A 节点 - 找到最后一个匹配的 A 节点
        // 因为一个 QA 对可能包含多个 A 节点（A1 → A2 → A3），F 节点应该在最后一个 A 节点下面
        const matchingANodes = currentNodes.filter(n =>
          n.type === 'acard' && n.data.qaId === qaId
        );

        if (matchingANodes.length === 0) {
          console.warn(`A node not found for qa_id: ${qaId}`);
          return;
        }

        // 取最后一个匹配的 A 节点
        const targetANode = matchingANodes[matchingANodes.length - 1];
        console.log('✅ Found target A node:', targetANode.id, `(${matchingANodes.length} total A nodes with this qa_id)`);

        // 检查是否已经存在 F 节点
        const existingFNode = currentNodes.find(n =>
          n.type === 'followup' &&
          n.data.parentACardId === targetANode.id
        );
        if (existingFNode) return;

        // 创建新的 F 节点
        const nextFNodeId = `f-${targetANode.id}-${Date.now()}`;
        const aNodeHeight = targetANode.height || 550;
        const GAP = 80;
        const fNodePosition = {
          x: targetANode.position.x + (CARD_WIDTH - FOLLOWUP_WIDTH) / 2,
          y: targetANode.position.y + aNodeHeight + GAP
        };

        const newFNode: Node = {
          id: nextFNodeId,
          type: 'followup',
          position: fNodePosition,
          draggable: false,
          data: {
            nodeId: targetANode.id, // 业务 ID 复用对应的 A 节点的 ID
            parentACardId: targetANode.id,
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
          const edgeId = `${targetANode.id}-${nextFNodeId}`;
          const existingEdge = prevEdges.find(e => e.id === edgeId);
          if (!existingEdge) {
            const newEdges = [...prevEdges, {
              id: edgeId,
              source: targetANode.id,
              target: nextFNodeId,
              type: 'smoothstep',
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
  }, [treeId, initialQuestion, updateTreeTitle, setNodes, setEdges, cardActions, handleToggleDrawer, getNodes, getZoom]);

  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    if (flushingPendingRef.current) return;
    if (pendingTextEventsRef.current.length === 0) return;

    flushingPendingRef.current = true;
    try {
      const remaining: Array<{ key: string; event: string; data: string; retries: number }> = [];
      for (const item of pendingTextEventsRef.current) {
        try {
          const payload = JSON.parse(item.data);
          const pendingParentId: string | undefined = payload?.node_data?.parentNodeId;
          const parentReady = !pendingParentId || Boolean(resolveParentNodeIn(nodesRef.current, pendingParentId));
          if (parentReady) {
            handleMessageRef.current(item.event, item.data);
          } else if (item.retries < 30) {
            remaining.push({ ...item, retries: item.retries + 1 });
          }
        } catch {
          // 丢弃无效事件
        }
      }
      pendingTextEventsRef.current = remaining;
    } finally {
      flushingPendingRef.current = false;
    }
  }, [nodes, resolveParentNodeIn]);

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
          parentNodeId: undefined, // F0 是根节点，没有父节点
          onClick: () => handleAskFollowUp(currentTree.dummyNodeId!),
        },
      };
      initialNodes.push(f0Node);
    }

    // 创建 Q1 节点
    if (currentTree.qNodeId) {
      const q1X = centerX - (CARD_WIDTH - FOLLOWUP_WIDTH) / 2;
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
          parentNodeId: currentTree.qParentNodeId, // Q1 的父节点是 F0（业务 ID）
          parentReactFlowId: currentTree.dummyNodeId, // Q1 的父节点是 F0（React Flow ID）
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
          type: 'smoothstep',
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
    // Prevent macOS two-finger horizontal swipe from triggering browser back/forward
    // while this canvas is active.
    const prevHtmlOverscrollX = document.documentElement.style.overscrollBehaviorX;
    const prevBodyOverscrollX = document.body.style.overscrollBehaviorX;
    document.documentElement.style.overscrollBehaviorX = 'none';
    document.body.style.overscrollBehaviorX = 'none';

    return () => {
      document.documentElement.style.overscrollBehaviorX = prevHtmlOverscrollX;
      document.body.style.overscrollBehaviorX = prevBodyOverscrollX;
    };
  }, []);

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

          // 使用新的多列布局算法
          const layoutNodes = nodes;
          const layoutEdges = edges;

          // 1. 找到第一个 F 节点作为参考点(锚点)
          const referenceNode = layoutNodes.find(n => n.type === 'followup');
          const referenceOldPos = referenceNode?.position;

          // 2. 使用新的多列布局算法
          const { nodes: layoutedNodes, edges: layoutedEdges } = await getMultiColumnLayoutedElements(layoutNodes, layoutEdges);

          // 3. 获取布局后参考节点的位置
          const referenceLayoutedNode = referenceNode ? layoutedNodes.find(n => n.id === referenceNode.id) : undefined;
          const referenceNewPos = referenceLayoutedNode?.position;

          // 4. 计算偏移量并应用到所有节点（基于F0参考节点）
          const applyLayoutNodes = (targetNodes: Node[]) => {
            const shouldAnimate = animateNextLayoutRef.current;
            animateNextLayoutRef.current = false;
            if (shouldAnimate && !isCenteringRef.current) {
              setLayoutTransitionEnabled(true);
              setTimeout(() => setLayoutTransitionEnabled(false), 550);
            }
            nodesRef.current = targetNodes;
            setNodes(targetNodes);
          };

          if (referenceOldPos && referenceNewPos) {
            const deltaX = referenceOldPos.x - referenceNewPos.x;
            const deltaY = referenceOldPos.y - referenceNewPos.y;

            const finalNodes = layoutedNodes.map(node => ({
              ...node,
              position: {
                x: node.position.x + deltaX,
                y: node.position.y + deltaY
              }
            }));

            applyLayoutNodes(finalNodes);
          } else {
            applyLayoutNodes(layoutedNodes);
          }

          edgesRef.current = layoutedEdges;
          setEdges(layoutedEdges);

          if (pendingCenterNodeIdRef.current) {
            const focusId = pendingCenterNodeIdRef.current;
            pendingCenterNodeIdRef.current = null;
            centerNodeInCanvas(focusId, false, undefined, {
              durationMs: FOLLOWUP_PAN_DURATION_MS,
              settleMs: FOLLOWUP_PAN_SETTLE_MS,
            });
          }

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

  const openDrawerNode = openDrawerId
    ? nodes.find((n) => n.id === openDrawerId && n.type === 'acard')
    : undefined;
  const drawerTitle = openDrawerNode?.data?.title || '';
  const drawerContent = openDrawerNode?.data?.content || '这里是回答内容的占位文本...';
  const drawerQuestions: string[] = Array.isArray(openDrawerNode?.data?.relatedQuestions)
    ? openDrawerNode!.data.relatedQuestions
    : [];
  const drawerListItems = drawerQuestions.map((q, index) => ({ id: index.toString(), text: q }));

  const handleDrawerClose = () => {
    setOpenDrawerId(null);
  };

  const handleDrawerLocate = () => {
    if (!openDrawerNode) return;
    centerNodeInCanvas(openDrawerNode.id, true, undefined, {
      durationMs: LOCATE_PAN_DURATION_MS,
      settleMs: LOCATE_PAN_SETTLE_MS,
    });
  };

  const handleDrawerCopy = async () => {
    const answerText = drawerContent || '';
    const questionsText = drawerQuestions.map(q => `- ${q}`).join('\n');
    const combinedText = `回答:\n${answerText}\n\n相关问题:\n${questionsText}`;
    await navigator.clipboard.writeText(combinedText);
  };

  const handleDrawerRelatedQuestionAction = (key: React.Key) => {
    if (!openDrawerId) return;
    const selectedItem = drawerListItems.find((item) => item.id === String(key));
    if (!selectedItem) return;
    handleRelatedQuestionFollowUp(openDrawerId, selectedItem.text);
  };

  const canvasClassName = layoutTransitionEnabled ? 'flow-canvas flow-canvas--layout-transition' : 'flow-canvas';

  return (
    <div
      className={canvasClassName}
      style={{
        width: '100%',
        height: '100vh',
        overscrollBehaviorX: 'none',
        overscrollBehaviorY: 'none',
        touchAction: 'none'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onlyRenderVisibleElements
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={liteNodeTypes}
        onMoveStart={onMoveStart}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        panOnScroll={true}
        preventScrolling={true}
        onPaneClick={() => {
          setNodes((currentNodes) => {
            // 取消选中并恢复追问按钮
            const finalNodes = currentNodes.map(n => ({
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
        minZoom={0.1}
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
      <CustomDrawer isOpen={Boolean(openDrawerId && openDrawerNode)} onClose={handleDrawerClose} className="acard__drawer">
        <div className="drawer__header">
          <CustomTooltip content="定位卡片" placement="bottom">
            <button className="acard__icon-btn drawer__location-btn" onClick={handleDrawerLocate}>
              <LocationIcon />
            </button>
          </CustomTooltip>
          <CustomTooltip content="关闭" placement="bottom">
            <button className="acard__icon-btn drawer__close-btn" onClick={handleDrawerClose}>
              <CloseIcon />
            </button>
          </CustomTooltip>
        </div>
        <div className="drawer-section-title drawer__fixed-title">{drawerTitle}</div>
        <div className="drawer__content-area drawer__content-area--with-fixed-title">
          {drawerContent}
        </div>
        <div className="drawer__related-questions">
          <div className="drawer-section-title">相关问题</div>
          <Listbox
            aria-label="相关问题"
            selectionMode="none"
            items={drawerListItems}
            onAction={handleDrawerRelatedQuestionAction}
            itemClasses={{
              base: "acard__related-question-item",
            }}
            classNames={{
              base: "p-0",
              list: "gap-0",
            }}
          >
            {(item) => (
              <ListboxItem key={item.id} textValue={item.text}>{item.text}</ListboxItem>
            )}
          </Listbox>
        </div>
        <div className="acard__drawer-footer">
          <Button variant="light" onPress={handleDrawerClose} className="drawer-btn-close">
            Close
          </Button>
          <Button onPress={handleDrawerCopy} className="drawer-btn-copy" startContent={<CopyIcon width={16} height={16} />}>
            Copy
          </Button>
        </div>
      </CustomDrawer>
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
