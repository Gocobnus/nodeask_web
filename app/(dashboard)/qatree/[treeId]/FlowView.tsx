'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState, useReactFlow, Node } from 'reactflow';
import { useQATrees } from '../../../context/QATreeContext';
import 'reactflow/dist/style.css';
import { mockUser } from '../../../lib/mock-data'; // 导入模拟用户
import { motion, AnimatePresence } from 'framer-motion';
import ReusableTiptapEditor from '../../../components/common/ReusableTiptapEditor';
import { getMultiColumnLayoutedElements } from '../../../utils/layout-utils';
import { GAP, HORIZONTAL_BRANCH_GAP, CARD_WIDTH, FOLLOWUP_WIDTH, HORIZONTAL_GAP } from '../../../config/constants';

import { startMockSSE } from '../../../lib/mock-sse';
import QCardNodeSwitch from '../../../components/flow-nodes/QCardNodeSwitch';
import ACardNodeSwitch from '../../../components/flow-nodes/ACardNodeSwitch';
import FollowUpNode from '../../../components/flow-nodes/FollowUpNode';
import { Button, Listbox, ListboxItem, Skeleton } from '@heroui/react';
import { createHorizontalFollowUp, createVerticalFollowUp } from '../../../services/qatree-api';
import { CustomDrawer } from '../../../components/card/acard/CustomDrawer';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
import { CloseIcon, CopyIcon, LocationIcon } from '../../../components/icons';
import { QuestionCard } from '../../../components/card/qcard';
import { AnswerCard } from '../../../components/card/acard';

const nodeTypes = {
  qcard: QCardNodeSwitch,
  acard: ACardNodeSwitch,
  followup: FollowUpNode,
};

interface FlowViewProps {
  treeId: string;
}

interface FlowCanvasProps extends FlowViewProps {
  initialQuestion: string;
}

function FlowCanvas({ treeId, initialQuestion }: FlowCanvasProps) {
  const DEBUG_LAYOUT_TRACE = true;
  const LOD_FADE_OUT_MS = 170;
  const LOD_FADE_IN_MS = 210;
  const DRAWER_SWITCH_DELAY_MS = 250;
  const LOCATE_PAN_DURATION_MS = 550;
  const LOCATE_PAN_SETTLE_MS = 590;
  const FOLLOWUP_PAN_DURATION_MS = 550;
  const FOLLOWUP_PAN_SETTLE_MS = 590;
  const router = useRouter();
  const { trees, updateTreeTitle } = useQATrees();
  const { getZoom, getNodes, setViewport, getViewport } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLodLiteMode, setIsLodLiteMode] = useState(false);
  const [isLodSwitchVeilVisible, setIsLodSwitchVeilVisible] = useState(false);
  const [lodSwitchDirection, setLodSwitchDirection] = useState<'to-lite' | 'to-full'>('to-lite');
  const [lodSwitchPhase, setLodSwitchPhase] = useState<'fade-out' | 'fade-in'>('fade-out');

  const [editingText, setEditingText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [followUpNodeId, setFollowUpNodeId] = useState<string | null>(null);
  const nodeForFollowUp = nodes.find(n => n.id === followUpNodeId);
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);
  const [lodPreviewNodeId, setLodPreviewNodeId] = useState<string | null>(null);

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
  const lodFadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lodFadeInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lodSwitchingRef = useRef(false);
  const layoutPassIdRef = useRef(0);
  const lastPositionByNodeRef = useRef<Record<string, { x: number; y: number }>>({});
  const trackedParentAIdsRef = useRef<Set<string>>(new Set());
  const activeHorizontalAnimBranchesRef = useRef<Set<string>>(new Set());
  const horizontalAnimUntilRef = useRef<Map<string, number>>(new Map());
  const pendingHorizontalSseStartsRef = useRef<Array<() => void>>([]);
  const pendingHorizontalParentForVisualSyncRef = useRef<string | null>(null);
  const lastTrackedA4MoveTsRef = useRef<number | null>(null);

  // 布局进行中标记,防止重复触发
  const layoutInProgressRef = useRef(false);

  const traceLog = useCallback((label: string, payload?: Record<string, unknown>) => {
    if (!DEBUG_LAYOUT_TRACE) return;
    if (payload) {
      console.log(`[LAYOUT_TRACE] ${label}`, payload);
      return;
    }
    console.log(`[LAYOUT_TRACE] ${label}`);
  }, [DEBUG_LAYOUT_TRACE]);

  const touchHorizontalAnimBranch = useCallback((branchId?: string, ttlMs = 900) => {
    if (!branchId) return;
    const now = Date.now();
    activeHorizontalAnimBranchesRef.current.add(branchId);
    horizontalAnimUntilRef.current.set(branchId, now + ttlMs);
  }, []);

  const hasActiveHorizontalAnim = useCallback(() => {
    const now = Date.now();
    const map = horizontalAnimUntilRef.current;
    for (const [branchId, until] of map.entries()) {
      if (until <= now) {
        map.delete(branchId);
        activeHorizontalAnimBranchesRef.current.delete(branchId);
      }
    }
    return activeHorizontalAnimBranchesRef.current.size > 0;
  }, []);

  const flushPendingHorizontalSseStarts = useCallback(() => {
    if (pendingHorizontalSseStartsRef.current.length === 0) return;
    const starts = [...pendingHorizontalSseStartsRef.current];
    pendingHorizontalSseStartsRef.current = [];
    const now = Date.now();
    const msSinceLastA4Move = lastTrackedA4MoveTsRef.current === null
      ? null
      : now - lastTrackedA4MoveTsRef.current;
    traceLog('flush pending sse starts begin', {
      count: starts.length,
      layoutTransitionEnabled,
      msSinceLastA4Move,
      ts: now,
    });
    starts.forEach((start) => start());
  }, [traceLog, layoutTransitionEnabled]);

  const getViewportAndNodeLeft = useCallback((nodeId: string) => {
    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    const viewportTransform = viewportEl ? getComputedStyle(viewportEl).transform : null;
    const nodeEl = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`) as HTMLElement | null;
    const nodeLeft = nodeEl ? nodeEl.getBoundingClientRect().left : null;
    return { viewportTransform, nodeLeft };
  }, []);

  const getHorizontalAnimDebug = useCallback(() => {
    const now = Date.now();
    let maxRemainingMs = 0;
    for (const until of horizontalAnimUntilRef.current.values()) {
      maxRemainingMs = Math.max(maxRemainingMs, Math.max(0, until - now));
    }
    return {
      activeCount: activeHorizontalAnimBranchesRef.current.size,
      maxRemainingMs,
    };
  }, []);

  const getNodeHeight = useCallback((node: Node): number => {
    if (typeof node.height === 'number') return node.height;
    if (node.type === 'acard') return 550;
    if (node.type === 'followup') return 24;
    return 250;
  }, []);

  const enrichNodeLodData = useCallback((node: Node, lodLite: boolean): Node => {
    if (node.type !== 'qcard' && node.type !== 'acard') return node;
    const prevData = node.data || {};
    if (Boolean(prevData.lodLite) === lodLite) return node;
    return {
      ...node,
      data: {
        ...prevData,
        lodLite,
      },
    };
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

  const collectNonHorizontalDescendantIds = useCallback((rootId: string, allEdges: any[]): Set<string> => {
    const ids = new Set<string>();
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      allEdges.forEach((edge) => {
        if (edge.source !== currentId) return;
        if (edge.sourceHandle === 'right') return;
        if (ids.has(edge.target)) return;
        ids.add(edge.target);
        queue.push(edge.target);
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

  const openLodPreviewByNodeId = useCallback((nodeId: string): boolean => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return false;
    if ((node.type !== 'qcard' && node.type !== 'acard') || node.data?.lodLite !== true) return false;
    setLodPreviewNodeId(nodeId);
    return true;
  }, []);

  const clearQNodeDraftIfNeeded = useCallback((nodeId: string | null) => {
    if (!nodeId) return;
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node?.type !== 'qcard') return;
    setDrafts(prevDrafts => {
      const newDrafts = { ...prevDrafts };
      delete newDrafts[nodeId];
      return newDrafts;
    });
  }, []);

  const handleUpdate = (newText: string) => {
    setEditingText(newText);

    // 保存草稿（followUpNodeId始终是父ACard的ID）
    if (!followUpNodeId) return;

    const currentNode = nodesRef.current.find(n => n.id === followUpNodeId);
    if (currentNode?.type === 'qcard') {
      setDrafts(prevDrafts => ({ ...prevDrafts, [followUpNodeId]: newText }));
      return;
    }

    if (newText.trim() !== '') {
      setDrafts(prevDrafts => ({ ...prevDrafts, [followUpNodeId]: newText }));
    } else {
      setDrafts(prevDrafts => {
        const newDrafts = { ...prevDrafts };
        delete newDrafts[followUpNodeId];
        return newDrafts;
      });
    }
  };

  // 处理节点高度变化
  const handleHeightChange = useCallback((nodeId: string, newHeight: number) => {
    const prevHeight = lastNodeHeightsRef.current[nodeId];
    if (prevHeight !== undefined && Math.abs(newHeight - prevHeight) < 8) {
      return;
    }
    lastNodeHeightsRef.current[nodeId] = newHeight;

    // 更新节点高度并触发布局重新计算
    setNodes((currentNodes) => {
      const updated = currentNodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              height: newHeight,
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

  const handleCollapseChange = useCallback((nodeId: string, collapsed: boolean) => {
    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.map((node) => {
        if (node.id !== nodeId || (node.type !== 'qcard' && node.type !== 'acard')) {
          return node;
        }
        return {
          ...node,
          data: {
            ...node.data,
            isCollapsed: collapsed,
          },
        };
      });
      nodesRef.current = updatedNodes;
      return updatedNodes;
    });
  }, [setNodes]);

  const _handleToggleLodMode = useCallback(() => {
    if (lodSwitchingRef.current) return;
    const next = !isLodLiteMode;

    lodSwitchingRef.current = true;
    setLodSwitchDirection(next ? 'to-lite' : 'to-full');
    setLodSwitchPhase('fade-out');
    setIsLodSwitchVeilVisible(true);

    if (lodFadeOutTimerRef.current) clearTimeout(lodFadeOutTimerRef.current);
    if (lodFadeInTimerRef.current) clearTimeout(lodFadeInTimerRef.current);

    lodFadeOutTimerRef.current = setTimeout(() => {
      setIsLodLiteMode(next);
      setLodSwitchPhase('fade-in');
      lodFadeOutTimerRef.current = null;

      lodFadeInTimerRef.current = setTimeout(() => {
        setIsLodSwitchVeilVisible(false);
        lodFadeInTimerRef.current = null;
        lodSwitchingRef.current = false;
      }, LOD_FADE_IN_MS);
    }, LOD_FADE_OUT_MS);
  }, [isLodLiteMode, LOD_FADE_OUT_MS, LOD_FADE_IN_MS]);

  useEffect(() => {
    setNodes((currentNodes) => {
      let changed = false;
      const next = currentNodes.map((node) => {
        const enriched = enrichNodeLodData(node, isLodLiteMode);
        if (enriched !== node) changed = true;
        return enriched;
      });
      if (!changed) return currentNodes;
      nodesRef.current = next;
      return next;
    });
  }, [isLodLiteMode, setNodes, enrichNodeLodData]);

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
      if (mode === 'horizontal' && parentNode.type === 'acard') {
        pendingHorizontalParentForVisualSyncRef.current = parentNode.id;
        const qaId = parentNode.data?.qaId;
        const trackedIds = new Set(
          nodesRef.current
            .filter((n) => n.type === 'acard' && n.data?.qaId === qaId)
            .map((n) => n.id)
        );
        trackedParentAIdsRef.current = trackedIds;
        traceLog('track parent A-chain', {
          qaId,
          count: trackedIds.size,
          ids: Array.from(trackedIds),
          ts: Date.now(),
        });
      }
      const data = mode === 'horizontal'
        ? await createHorizontalFollowUp(treeId, parentBusinessNodeId, questionText)
        : await createVerticalFollowUp(treeId, parentBusinessNodeId, questionText);

      const { q_node_id, qa_id } = data;
      if (mode === 'horizontal') {
        activeHorizontalAnimBranchesRef.current.add(q_node_id);
        touchHorizontalAnimBranch(q_node_id, 1800);
        traceLog('horizontal anim branch added', {
          branchId: q_node_id,
          activeCount: activeHorizontalAnimBranchesRef.current.size,
          ts: Date.now(),
        });
      }
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
          lodLite: isLodLiteMode,
          nodeId: q_node_id,
          qaId: qa_id,
          horizontalRootQId: mode === 'horizontal' ? q_node_id : parentNode.data?.horizontalRootQId,
          parentNodeId: parentBusinessNodeId,
          parentReactFlowId: parentNode.id,
          avatar: mockUser.avatar,
          onDelete: () => console.log(`Delete card ${q_node_id}`),
          onCopy: () => console.log(`Copy card ${q_node_id}`),
          onClick: () => handleAskFollowUpRef.current(q_node_id),
          onAsk: () => handleAskFollowUpRef.current(q_node_id),
          onHeightChange: handleHeightChange,
          onCollapse: (collapsed?: boolean) => {
            if (typeof collapsed === 'boolean') {
              handleCollapseChange(q_node_id, collapsed);
            }
          },
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
        traceLog('set animateNextLayoutRef true', {
          source: 'runCreateQFollowUp',
          parentReactFlowNodeId,
          q_node_id,
          ts: Date.now(),
        });
        animateNextLayoutRef.current = true;
        traceLog('setLayoutTrigger from followup', { ts: Date.now() });
        setLayoutTrigger(prev => prev + 1);

        // 节点入图后再启动 SSE：统一先挂起，等待布局稳定后再启动
        const startFollowupSSE = () => {
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
        pendingHorizontalSseStartsRef.current.push(startFollowupSSE);
        traceLog('queue followup sse start after layout transition', {
          mode,
          q_node_id,
          queuedCount: pendingHorizontalSseStartsRef.current.length,
          ts: Date.now(),
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
  }, [treeId, getZoom, placeHorizontalQBelowExistingBranches, setNodes, setEdges, ensureHorizontalBranchGapOnVerticalFollowUp, isLodLiteMode, traceLog, touchHorizontalAnimBranch, handleHeightChange, handleCollapseChange]);

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
    } else if (nodeForFollowUp?.type === 'qcard') {
      const parentReactFlowId = nodeForFollowUp.data?.parentReactFlowId;
      const parentBusinessId = nodeForFollowUp.data?.parentNodeId;
      const parentNode = (parentReactFlowId
        ? nodesRef.current.find((n) => n.id === parentReactFlowId)
        : undefined) || resolveParentNodeIn(nodesRef.current, parentBusinessId);
      if (!parentNode) {
        return;
      }
      const mode: 'horizontal' | 'vertical' = parentNode?.type === 'followup' ? 'vertical' : 'horizontal';
      await runCreateQFollowUp(parentNode.id, trimmedText, mode);

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
    if (openLodPreviewByNodeId(nodeId)) {
      return;
    }
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
    clearQNodeDraftIfNeeded(followUpNodeId);
    prevFollowUpNodeIdRef.current = null;
    setFollowUpNodeId(null);
  }, [setNodes, openLodPreviewByNodeId, followUpNodeId, clearQNodeDraftIfNeeded]);

  const handleAskFollowUp = useCallback((nodeId: string, options?: { forceInput?: boolean }) => {
    const targetNode = nodesRef.current.find((n) => n.id === nodeId);
    const isQNode = targetNode?.type === 'qcard';
    if (!options?.forceInput && !isQNode && openLodPreviewByNodeId(nodeId)) {
      return;
    }
    if (followUpNodeId && followUpNodeId !== nodeId) {
      clearQNodeDraftIfNeeded(followUpNodeId);
    }
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
  }, [setNodes, openLodPreviewByNodeId, followUpNodeId, clearQNodeDraftIfNeeded]);
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
      if (lodFadeOutTimerRef.current) {
        clearTimeout(lodFadeOutTimerRef.current);
        lodFadeOutTimerRef.current = null;
      }
      if (lodFadeInTimerRef.current) {
        clearTimeout(lodFadeInTimerRef.current);
        lodFadeInTimerRef.current = null;
      }
      pendingHorizontalSseStartsRef.current = [];
      activeHorizontalAnimBranchesRef.current.clear();
      lodSwitchingRef.current = false;
    };
  }, []);

  // 生成中和完成态都需要的基础卡片操作
  const baseCardActions = useCallback((id: string, type: 'qcard' | 'acard') => ({
    onClick: type === 'qcard' ? () => handleAskFollowUp(id, { forceInput: true }) : () => handleNodeSelect(id),
    onAsk: () => handleAskFollowUp(id, { forceInput: true }),
    onLocate: () => handleNodeLocate(id),
    onHeightChange: handleHeightChange,
    onCollapse: (collapsed?: boolean) => {
      if (typeof collapsed === 'boolean') {
        handleCollapseChange(id, collapsed);
      }
    },
  }), [handleAskFollowUp, handleNodeSelect, handleNodeLocate, handleHeightChange, handleCollapseChange]);

  // 完成态卡片操作函数
  const cardActions = useCallback((id: string, type: 'qcard' | 'acard') => ({
    ...baseCardActions(id, type),
    onDelete: () => console.log(`Delete card ${id}`),
    onCopy: () => console.log(`Copy card ${id}`),
    onExpand: type === 'acard' ? () => handleToggleDrawer(id) : undefined,
    onRelatedQuestionClick: type === 'acard'
      ? (question: string) => handleRelatedQuestionFollowUp(id, question)
      : undefined,
  }), [baseCardActions, handleToggleDrawer, handleRelatedQuestionFollowUp]);

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
        const isGenerating = !(finish === true || done === true);
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
        const lastAskHiddenNodeId =
          typeof window !== 'undefined' ? (window as any).__lastAskHiddenNodeId : undefined;
        if (type === 'acard' && (finish === true || lastAskHiddenNodeId === id)) {
          console.log('[ACARD_GENERATING_TRACE] sse text', {
            id,
            qaId,
            finish,
            done,
            nextIsGenerating: isGenerating,
            pkgIndex: payload.pkg_index,
            currentIsGenerating: nodesRef.current.find((n) => n.id === id)?.data?.isGenerating,
            ts: Date.now(),
          });
        }

        setNodes(currentNodes => {
          const existingNode = currentNodes.find(n => n.id === id);
          if (!existingNode) {
            let initialPosition = { x: 0, y: 0 };
            let inheritedHorizontalRootQId: string | undefined;

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
              inheritedHorizontalRootQId = parentNode.data?.horizontalRootQId;
              touchHorizontalAnimBranch(inheritedHorizontalRootQId, 1000);

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
                  horizontalRootQId: inheritedHorizontalRootQId,
                  onClick: () => handleAskFollowUp(id, { forceInput: true }),
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
                  lodLite: isLodLiteMode,
                  nodeId: id, // 添加业务 ID
                  qaId: qaId, // 添加 qa_id，用于在 done 事件中查找对应的 A 节点
                  horizontalRootQId: inheritedHorizontalRootQId,
                  parentNodeId: parentNodeId, // 父节点的业务 ID（用于调试和显示）
                  question: pos === 0 ? initialQuestion : '',
                  title: pos > 0 ? `Answer ${id}` : '',
                  avatar: pos === 0 ? mockUser.avatar : undefined,
                  ...baseCardActions(id, cardType),
                  ...(!isGenerating ? cardActions(id, cardType) : {}),
                },
              };

              // 调试日志：记录创建的节点信息
              if (cardType === 'acard') {
                console.log('🎨 Creating A node:', { id, qaId, type: cardType });
              }
            }

            const newNodes = [...currentNodes, newNode];
            nodesRef.current = newNodes;

            return newNodes;
          } else {
            touchHorizontalAnimBranch(existingNode.data?.horizontalRootQId, 1000);
            const updatedNodes = currentNodes.map(n => {
              if (n.id === id) {
                // Q1 节点不累加内容（SSE 只推送空字符串用于创建节点）
                // A 节点才累加流式内容
                const currentContent = n.data.content;
                const updatedContent = n.type === 'qcard' ? currentContent : currentContent + content;
                if (n.type === 'acard' && (n.data?.isGenerating !== isGenerating || finish === true)) {
                  console.log('[ACARD_GENERATING_TRACE] set node from text', {
                    id,
                    prevIsGenerating: n.data?.isGenerating,
                    nextIsGenerating: isGenerating,
                    finish,
                    done,
                    pkgIndex: payload.pkg_index,
                    ts: Date.now(),
                  });
                }

                return {
                  ...n,
                  data: {
                    ...n.data,
                    content: updatedContent,
                    // QCard 的 question 字段保持不变（已经是 initialQuestion）
                    isGenerating,
                    ...(n.type !== 'followup' ? baseCardActions(id, n.type as 'qcard' | 'acard') : {}),
                    ...(!isGenerating && n.type !== 'followup' ? cardActions(id, n.type as 'qcard' | 'acard') : {})
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
        const askBackNode = nodesRef.current.find((n) => n.id === node_id);
        const lastAskHiddenNodeId =
          typeof window !== 'undefined' ? (window as any).__lastAskHiddenNodeId : undefined;
        if (askBackNode?.type === 'acard' && (lastAskHiddenNodeId === node_id || askBackNode.data?.isGenerating === true)) {
          console.log('[ACARD_GENERATING_TRACE] ask_back', {
            nodeId: node_id,
            currentIsGenerating: askBackNode.data?.isGenerating,
            ts: Date.now(),
          });
        }
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
        const horizontalRootQId = matchingANodes[matchingANodes.length - 1]?.data?.horizontalRootQId;
        if (horizontalRootQId) {
          touchHorizontalAnimBranch(horizontalRootQId, 900);
          traceLog('horizontal anim branch touched on done', {
            branchId: horizontalRootQId,
            activeCount: activeHorizontalAnimBranchesRef.current.size,
            ts: Date.now(),
          });
        }

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
  }, [treeId, initialQuestion, updateTreeTitle, setNodes, setEdges, cardActions, handleToggleDrawer, getNodes, getZoom, isLodLiteMode, traceLog, touchHorizontalAnimBranch]);

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
          lodLite: isLodLiteMode,
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
        const layoutPassId = ++layoutPassIdRef.current;
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
            const activeBranchAnimating = hasActiveHorizontalAnim();
            const horizontalAnimDebug = getHorizontalAnimDebug();
            const shouldAnimate = animateNextLayoutRef.current || activeBranchAnimating;
            animateNextLayoutRef.current = false;
            const xChangedNodeIds: string[] = [];
            targetNodes.forEach((node) => {
              if (node.type !== 'acard') return;
              if (!trackedParentAIdsRef.current.has(node.id)) return;
              const prev = lastPositionByNodeRef.current[node.id];
              const next = { x: node.position.x, y: node.position.y };
              if (!prev || prev.x !== next.x || prev.y !== next.y) {
                if (prev && prev.x !== next.x) {
                  xChangedNodeIds.push(node.id);
                  traceLog('tracked A-chain x changed', {
                    layoutPassId,
                    nodeId: node.id,
                    fromX: prev.x,
                    toX: next.x,
                    deltaX: next.x - prev.x,
                    ts: Date.now(),
                  });
                }
                if (node.id.endsWith('-4')) {
                  lastTrackedA4MoveTsRef.current = Date.now();
                  traceLog('tracked A4 moved', {
                    layoutPassId,
                    nodeId: node.id,
                    from: prev || null,
                    to: next,
                    shouldAnimate,
                    activeHorizontalCount: horizontalAnimDebug.activeCount,
                    activeHorizontalMaxRemainingMs: horizontalAnimDebug.maxRemainingMs,
                    ts: lastTrackedA4MoveTsRef.current,
                  });
                }
              }
              lastPositionByNodeRef.current[node.id] = next;
            });
            if (xChangedNodeIds.length > 0) {
              traceLog('tracked A-chain x changed summary', {
                layoutPassId,
                nodeIds: xChangedNodeIds,
                shouldAnimate,
                ts: Date.now(),
              });
            }
            const trackedA4 = targetNodes.find((n) => n.id.endsWith('-4') && trackedParentAIdsRef.current.has(n.id));
            if (trackedA4) {
              traceLog('A4 screen before layout apply', {
                layoutPassId,
                a4Id: trackedA4.id,
                screen: getViewportAndNodeLeft(trackedA4.id),
                ts: Date.now(),
              });
            }

            const visualSyncParentId = pendingHorizontalParentForVisualSyncRef.current;
            const prevParent = visualSyncParentId
              ? nodesRef.current.find((node) => node.id === visualSyncParentId)
              : undefined;
            const nextParent = visualSyncParentId
              ? targetNodes.find((node) => node.id === visualSyncParentId)
              : undefined;
            const parentDeltaX = prevParent && nextParent
              ? nextParent.position.x - prevParent.position.x
              : 0;
            const visualSyncDescendantIds = visualSyncParentId && prevParent && nextParent && shouldAnimate && Math.abs(parentDeltaX) >= 0.5
              ? collectNonHorizontalDescendantIds(visualSyncParentId, layoutEdges)
              : new Set<string>();
            const visualSyncStartNodes = visualSyncDescendantIds.size > 0
              ? targetNodes.map((node) =>
                  visualSyncDescendantIds.has(node.id)
                    ? {
                        ...node,
                        position: {
                          ...node.position,
                          x: node.position.x - parentDeltaX,
                        },
                      }
                    : node
                )
              : null;

            const mergeLayoutNodesWithLatestData = (nodesToMerge: Node[]): Node[] => {
              type LayoutNode = Node & { measured?: unknown; resizing?: boolean };
              const latestNodeById = new Map(nodesRef.current.map((node) => [node.id, node]));

              return nodesToMerge.map((targetNode) => {
                const latestNode = latestNodeById.get(targetNode.id);
                if (!latestNode) return targetNode;

                const layoutNode = targetNode as LayoutNode;
                return {
                  ...latestNode,
                  position: targetNode.position,
                  width: targetNode.width,
                  height: targetNode.height,
                  dragging: targetNode.dragging,
                  ...(layoutNode.measured !== undefined ? { measured: layoutNode.measured } : {}),
                  ...(layoutNode.resizing !== undefined ? { resizing: layoutNode.resizing } : {}),
                };
              });
            };

            const mergedVisualSyncStartNodes = visualSyncStartNodes
              ? mergeLayoutNodesWithLatestData(visualSyncStartNodes)
              : null;
            const visualSyncStaleNodes = mergedVisualSyncStartNodes
              ? mergedVisualSyncStartNodes
                  .filter((node) => node.type === 'acard')
                  .map((node) => {
                    const currentNode = nodesRef.current.find((current) => current.id === node.id);
                    if (currentNode?.data?.isGenerating === false && node.data?.isGenerating === true) {
                      return {
                        id: node.id,
                        currentIsGenerating: currentNode.data?.isGenerating,
                        startIsGenerating: node.data?.isGenerating,
                      };
                    }
                    return null;
                  })
                  .filter((item): item is { id: string; currentIsGenerating: boolean; startIsGenerating: boolean } => Boolean(item))
              : [];
            if (visualSyncStaleNodes.length > 0) {
              console.log('[ACARD_GENERATING_TRACE] visual sync stale start', {
                layoutPassId,
                staleNodes: visualSyncStaleNodes,
                ts: Date.now(),
              });
            }

            const commitFinalNodes = () => {
              const mergedTargetNodes = mergeLayoutNodesWithLatestData(targetNodes);
              const currentNodeById = new Map(nodesRef.current.map((node) => [node.id, node]));
              const staleNodes = mergedTargetNodes
                .filter((node) => node.type === 'acard')
                .map((node) => {
                  const currentNode = currentNodeById.get(node.id);
                  if (currentNode?.data?.isGenerating === false && node.data?.isGenerating === true) {
                    return {
                      id: node.id,
                      currentIsGenerating: currentNode.data?.isGenerating,
                      targetIsGenerating: node.data?.isGenerating,
                      currentContentLength: String(currentNode.data?.content || '').length,
                      targetContentLength: String(node.data?.content || '').length,
                    };
                  }
                  return null;
                })
                .filter((item): item is {
                  id: string;
                  currentIsGenerating: boolean;
                  targetIsGenerating: boolean;
                  currentContentLength: number;
                  targetContentLength: number;
                } => Boolean(item));
              if (staleNodes.length > 0) {
                console.log('[ACARD_GENERATING_TRACE] layout stale overwrite before', {
                  layoutPassId,
                  staleNodes,
                  shouldAnimate,
                  hasVisualSyncStartNodes: Boolean(mergedVisualSyncStartNodes),
                  ts: Date.now(),
                });
              }
              nodesRef.current = mergedTargetNodes;
              setNodes(mergedTargetNodes);
              if (trackedA4) {
                requestAnimationFrame(() => {
                  traceLog('A4 screen after layout apply', {
                    layoutPassId,
                    a4Id: trackedA4.id,
                    screen: getViewportAndNodeLeft(trackedA4.id),
                    ts: Date.now(),
                  });
                });
              }
              if (staleNodes.length > 0) {
                requestAnimationFrame(() => {
                  console.log('[ACARD_GENERATING_TRACE] layout stale overwrite after', {
                    layoutPassId,
                    nodes: staleNodes.map((item) => {
                      const currentNode = nodesRef.current.find((node) => node.id === item.id);
                      return {
                        id: item.id,
                        currentIsGenerating: currentNode?.data?.isGenerating,
                        contentLength: String(currentNode?.data?.content || '').length,
                      };
                    }),
                    ts: Date.now(),
                  });
                });
              }
            };

            if (shouldAnimate && !isCenteringRef.current) {
              setLayoutTransitionEnabled(true);
              if (mergedVisualSyncStartNodes) {
                nodesRef.current = mergedVisualSyncStartNodes;
                setNodes(mergedVisualSyncStartNodes);
                requestAnimationFrame(() => {
                  commitFinalNodes();
                });
              } else {
                commitFinalNodes();
              }
              setTimeout(() => {
                setLayoutTransitionEnabled(false);
                pendingHorizontalParentForVisualSyncRef.current = null;
                flushPendingHorizontalSseStarts();
              }, 550);
            } else {
              commitFinalNodes();
              pendingHorizontalParentForVisualSyncRef.current = null;
              setTimeout(() => {
                flushPendingHorizontalSseStarts();
              }, 0);
            }
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

  const lodPreviewNode = lodPreviewNodeId
    ? nodes.find((n) => n.id === lodPreviewNodeId && (n.type === 'qcard' || n.type === 'acard'))
    : undefined;
  const canvasClassName = [
    'flow-canvas',
    layoutTransitionEnabled ? 'flow-canvas--layout-transition' : '',
    lodPreviewNode ? 'flow-canvas--lod-preview' : '',
    isLodSwitchVeilVisible ? 'flow-canvas--lod-switching' : '',
    isLodSwitchVeilVisible && lodSwitchDirection === 'to-lite' ? 'flow-canvas--lod-switching-to-lite' : '',
    isLodSwitchVeilVisible && lodSwitchDirection === 'to-full' ? 'flow-canvas--lod-switching-to-full' : '',
  ].filter(Boolean).join(' ');

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
        nodeTypes={nodeTypes}
        onMoveStart={onMoveStart}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        panOnScroll={true}
        preventScrolling={true}
        onPaneClick={() => {
          if (lodPreviewNodeId) {
            setLodPreviewNodeId(null);
          }
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
          clearQNodeDraftIfNeeded(followUpNodeId);
          setFollowUpNodeId(null);
        }}
        selectNodesOnDrag={false}
        minZoom={0.4}
      />
      <AnimatePresence>
        {isLodSwitchVeilVisible && (
          <motion.div
            className={`absolute inset-0 z-30 pointer-events-none ${
              lodSwitchDirection === 'to-lite'
                ? 'bg-white/10 backdrop-blur-[0.8px]'
                : 'bg-white/8 backdrop-blur-[0.6px]'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: lodSwitchPhase === 'fade-out' ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: lodSwitchPhase === 'fade-out' ? LOD_FADE_OUT_MS / 1000 : LOD_FADE_IN_MS / 1000,
              ease: 'easeInOut'
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lodPreviewNode && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center bg-white/16 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onClick={() => setLodPreviewNodeId(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              {lodPreviewNode.type === 'qcard' ? (
                <QuestionCard
                  question={lodPreviewNode.data?.question || lodPreviewNode.data?.content || ''}
                  avatar={lodPreviewNode.data?.avatar}
                  isSelected
                  onClick={() => {}}
                />
              ) : (
                <AnswerCard
                  title={lodPreviewNode.data?.title || ''}
                  content={lodPreviewNode.data?.content || ''}
                  isGenerating={Boolean(lodPreviewNode.data?.isGenerating)}
                  isCompleted={!lodPreviewNode.data?.isGenerating}
                  isSelected
                  relatedQuestions={Array.isArray(lodPreviewNode.data?.relatedQuestions) ? lodPreviewNode.data.relatedQuestions : []}
                  onClick={() => {}}
                />
              )}
            </div>
          </motion.div>
        )}
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
