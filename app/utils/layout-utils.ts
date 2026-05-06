import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from 'reactflow';
import { CARD_WIDTH, FOLLOWUP_WIDTH, GAP, HORIZONTAL_GAP, HORIZONTAL_BRANCH_GAP, HORIZONTAL_TO_MAIN_VERTICAL_GAP, VERTICAL_QA_CLUSTER_GAP, MAIN_TO_HORIZONTAL_CLUSTER_GAP } from '../config/constants';

const elk = new ELK();

// 子树尺寸接口
interface SubtreeSize {
  width: number;   // 子树总宽度
  height: number;  // 子树总高度
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const horizontalBranchWidthCache = new Map<string, number>();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '80',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  // 优化节点放置策略,帮助ELK更好地计算父节点居中
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

export const getLayoutedElements = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map(node => {
      let height;
      let width;
      if (node.type === 'acard') {
        height = node.height || 550; // ACard高度范围344-760px,使用中值
        width = node.width || CARD_WIDTH;
      } else if (node.type === 'qcard') {
        height = node.height || 250; // QCard高度范围约100-344px,使用中值
        width = node.width || CARD_WIDTH;
      } else if (node.type === 'followup') {
        height = node.height || 24; // FollowUp节点固定大小
        width = node.width || 24;
      } else {
        height = node.height || 150;
        width = node.width || CARD_WIDTH;
      }

      return {
        ...node,
        width: width,
        height: height,
      };
    }),
    edges: edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    const layoutedNodes = nodes.map(node => {
      const nodeInLayout = layoutedGraph.children?.find(n => n.id === node.id);
      if (nodeInLayout?.x && nodeInLayout?.y) {
        return {
          ...node,
          position: { x: nodeInLayout.x, y: nodeInLayout.y },
        };
      }
      return node;
    });

    return { nodes: layoutedNodes, edges };
  } catch (e) {
    console.error('ELK layout error:', e);
    return { nodes, edges };
  }
};

// ============ 新的多列布局算法 ============

/**
 * 查找节点的子节点，区分横向和纵向
 */
function findChildren(
  nodeId: string,
  edges: Edge[]
): { horizontal: string[], vertical: string[] } {
  const horizontal: string[] = [];
  const vertical: string[] = [];

  for (const edge of edges) {
    if (edge.source === nodeId) {
      if (edge.sourceHandle === 'right') {
        // 横向追问（从A节点右侧出去）
        horizontal.push(edge.target);
      } else {
        // 纵向子节点（可能分叉）
        vertical.push(edge.target);
      }
    }
  }

  return { horizontal, vertical };
}

/**
 * 递归计算子树尺寸
 */
function calculateSubtreeSize(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  cache: Map<string, SubtreeSize>
): SubtreeSize {
  if (cache.has(nodeId)) return cache.get(nodeId)!;

  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    console.warn(`节点 ${nodeId} 未找到`);
    return { width: CARD_WIDTH, height: 550 };
  }

  const selfHeight = node.height || (node.type === 'acard' ? 550 :
                                     node.type === 'followup' ? 24 : 250);
  const selfWidth = node.type === 'followup' ? FOLLOWUP_WIDTH : CARD_WIDTH;

  const { horizontal, vertical } = findChildren(nodeId, edges);

  let totalWidth = selfWidth;
  let totalHeight = selfHeight;

  // 处理横向分支
  if (horizontal.length > 0) {
    let maxHorizontalWidth = 0;
    let totalHorizontalHeight = 0;

    for (const childId of horizontal) {
      const childSize = calculateSubtreeSize(childId, nodes, edges, cache);
      maxHorizontalWidth = Math.max(maxHorizontalWidth, childSize.width);
      totalHorizontalHeight += childSize.height + HORIZONTAL_BRANCH_GAP;
    }

    totalWidth = Math.max(totalWidth, selfWidth + HORIZONTAL_GAP + maxHorizontalWidth);
    totalHeight = Math.max(totalHeight, totalHorizontalHeight);
  }

  // 处理纵向子节点（可能分叉）
  if (vertical.length > 0) {
    if (vertical.length === 1) {
      // 单个子节点，不分叉
      const childSize = calculateSubtreeSize(vertical[0], nodes, edges, cache);
      totalWidth = Math.max(totalWidth, childSize.width);
      totalHeight += GAP + childSize.height;
    } else {
      // 多个子节点，分叉并排
      let forkTotalWidth = 0;
      let forkMaxHeight = 0;

      for (const childId of vertical) {
        const childSize = calculateSubtreeSize(childId, nodes, edges, cache);
        forkMaxHeight = Math.max(forkMaxHeight, childSize.height);
      }

      if (node.type === 'followup') {
        forkTotalWidth = CARD_WIDTH * vertical.length + VERTICAL_QA_CLUSTER_GAP * (vertical.length - 1);
      } else {
        for (const childId of vertical) {
          const childSize = calculateSubtreeSize(childId, nodes, edges, cache);
          forkTotalWidth += childSize.width;
        }
        forkTotalWidth += VERTICAL_QA_CLUSTER_GAP * (vertical.length - 1); // QA簇之间的间距
      }

      totalWidth = Math.max(totalWidth, forkTotalWidth);
      totalHeight += GAP + forkMaxHeight;
    }
  }

  const result = { width: totalWidth, height: totalHeight };
  cache.set(nodeId, result);
  return result;
}

/**
 * 递归布局节点
 */
function layoutNodeRecursive(
  nodeId: string,
  startX: number,
  startY: number,
  nodes: Node[],
  edges: Edge[],
  sizeCache: Map<string, SubtreeSize>,
  layoutedNodes: Map<string, Node>
): void {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    console.warn(`节点 ${nodeId} 未找到`);
    return;
  }

  const nodeHeight = node.height || (node.type === 'acard' ? 550 :
                                     node.type === 'followup' ? 24 : 250);

  // 放置当前节点
  const layoutedNode = {
    ...node,
    position: { x: startX, y: startY }
  };
  layoutedNodes.set(nodeId, layoutedNode);

  const { horizontal, vertical } = findChildren(nodeId, edges);

  // 布局横向分支
  let horizontalBottomY = startY + nodeHeight;
  if (horizontal.length > 0) {
    const branchXBase = startX + CARD_WIDTH + HORIZONTAL_GAP;
    let currentY = startY;

    for (const childId of horizontal) {
      const branchX = branchXBase;
      layoutNodeRecursive(childId, branchX, currentY, nodes, edges, sizeCache, layoutedNodes);

      const childSize = sizeCache.get(childId);
      if (!childSize) {
        console.warn(`横向子节点 ${childId} 的尺寸未找到，跳过`);
        continue;
      }
      horizontalBottomY = Math.max(horizontalBottomY, currentY + childSize.height);
      currentY += childSize.height + HORIZONTAL_BRANCH_GAP;
    }
  }

  // 布局纵向分叉
  if (vertical.length > 0) {
    const parentCenterX = startX + (node.type === 'followup' ? FOLLOWUP_WIDTH / 2 : CARD_WIDTH / 2);

    // 计算纵向子节点的起始Y坐标
    let childStartY;
    if (horizontal.length > 0) {
      // 仅在横向分支真实占用空间不足时，才下移纵向下游
      const baseY = startY + nodeHeight + GAP;
      const requiredY = horizontalBottomY + HORIZONTAL_TO_MAIN_VERTICAL_GAP;
      childStartY = Math.max(baseY, requiredY);
    } else {
      // 没有横向分支，使用节点自身高度
      childStartY = startY + nodeHeight + GAP;
    }

    if (vertical.length === 1) {
      // 单个子节点，居中对齐
      const childId = vertical[0];
      const childNode = nodes.find(n => n.id === childId);
      if (!childNode) {
        console.warn(`纵向子节点 ${childId} 未找到，跳过布局`);
        return;
      }
      const childWidth = childNode.type === 'followup' ? FOLLOWUP_WIDTH : CARD_WIDTH;
      const childX = parentCenterX - childWidth / 2;

      layoutNodeRecursive(childId, childX, childStartY, nodes, edges, sizeCache, layoutedNodes);
    } else {
      // 多个子节点，水平并排
      const childSizes = vertical.map(id => sizeCache.get(id)).filter((size): size is SubtreeSize => size !== undefined);

      if (childSizes.length === 0) {
        console.warn(`纵向分叉子节点的尺寸都未找到，跳过布局`);
        return;
      }

      const totalWidth = node.type === 'followup'
        ? CARD_WIDTH * childSizes.length + VERTICAL_QA_CLUSTER_GAP * (childSizes.length - 1)
        : childSizes.reduce((sum, size) => sum + size.width, 0) + VERTICAL_QA_CLUSTER_GAP * (childSizes.length - 1);

      let currentX = parentCenterX - totalWidth / 2;

      for (let i = 0; i < vertical.length; i++) {
        const childId = vertical[i];
        const childSize = sizeCache.get(childId);
        if (!childSize) {
          console.warn(`纵向分叉子节点 ${childId} 的尺寸未找到，跳过`);
          continue;
        }

        const childNode = nodes.find(n => n.id === childId);
        if (!childNode) {
          console.warn(`纵向分叉子节点 ${childId} 未找到，跳过布局`);
          continue;
        }
        const childWidth = childNode.type === 'followup' ? FOLLOWUP_WIDTH : CARD_WIDTH;

        const childX = node.type === 'followup'
          ? currentX
          : currentX + (childSize.width - childWidth) / 2;

        layoutNodeRecursive(childId, childX, childStartY, nodes, edges, sizeCache, layoutedNodes);

        currentX += (node.type === 'followup' ? CARD_WIDTH : childSize.width) + VERTICAL_QA_CLUSTER_GAP;
      }
    }
  }
}

function getNodeHeightForConstraint(node: Node): number {
  if (typeof node.height === 'number') return node.height;
  if (node.type === 'acard') return 550;
  if (node.type === 'followup') return 24;
  return 250;
}

function getNodeWidthForConstraint(node: Node): number {
  if (typeof node.width === 'number') return node.width;
  if (node.type === 'followup') return FOLLOWUP_WIDTH;
  return CARD_WIDTH;
}

function getNodeCenterX(node: Node): number {
  return node.position.x + getNodeWidthForConstraint(node) / 2;
}

function collectSubtreeIds(rootId: string, edges: Edge[]): Set<string> {
  const ids = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (ids.has(currentId)) continue;
    ids.add(currentId);

    edges.forEach((edge) => {
      if (edge.source === currentId && !ids.has(edge.target)) {
        queue.push(edge.target);
      }
    });
  }

  return ids;
}

function collectNonRightDescendants(rootId: string, edges: Edge[]): Set<string> {
  const ids = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (ids.has(currentId)) continue;
    ids.add(currentId);

    edges.forEach((edge) => {
      if (edge.source === currentId && edge.sourceHandle !== 'right' && !ids.has(edge.target)) {
        queue.push(edge.target);
      }
    });
  }

  return ids;
}

function getSubtreeBounds(rootId: string, edges: Edge[], nodeMap: Map<string, Node>): Bounds | null {
  const subtreeIds = collectSubtreeIds(rootId, edges);
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  subtreeIds.forEach((id) => {
    const node = nodeMap.get(id);
    if (!node) return;
    const width = getNodeWidthForConstraint(node);
    const height = getNodeHeightForConstraint(node);
    left = Math.min(left, node.position.x);
    right = Math.max(right, node.position.x + width);
    top = Math.min(top, node.position.y);
    bottom = Math.max(bottom, node.position.y + height);
  });

  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
    return null;
  }

  return { left, right, top, bottom };
}

function getQCenterXForVerticalChild(
  childId: string,
  edges: Edge[],
  nodeMap: Map<string, Node>
): number | null {
  const childNode = nodeMap.get(childId);
  if (childNode?.type === 'qcard') {
    return getNodeCenterX(childNode);
  }

  const subtreeIds = collectSubtreeIds(childId, edges);
  const qNodes: Node[] = [];
  subtreeIds.forEach((id) => {
    const node = nodeMap.get(id);
    if (node?.type === 'qcard') {
      qNodes.push(node);
    }
  });

  if (qNodes.length === 0) return null;
  const rootQ = qNodes.sort((a, b) => a.position.y - b.position.y)[0];
  return getNodeCenterX(rootQ);
}

function enforceHorizontalSiblingSpacing(nodes: Node[], edges: Edge[]): Node[] {
  const adjustedNodes = nodes.map((node) => ({
    ...node,
    position: { ...node.position },
  }));
  const nodeMap = new Map(adjustedNodes.map((node) => [node.id, node]));

  const shiftSubtree = (rootId: string, deltaY: number) => {
    const subtreeIds = collectSubtreeIds(rootId, edges);
    subtreeIds.forEach((id) => {
      const node = nodeMap.get(id);
      if (!node) return;
      node.position.y += deltaY;
    });
  };

  const subtreeBottom = (rootId: string): number => {
    const subtreeIds = collectSubtreeIds(rootId, edges);
    let bottom = Number.NEGATIVE_INFINITY;
    subtreeIds.forEach((id) => {
      const node = nodeMap.get(id);
      if (!node) return;
      const nodeBottom = node.position.y + getNodeHeightForConstraint(node);
      bottom = Math.max(bottom, nodeBottom);
    });
    return bottom;
  };

  const parentToHorizontalChildren = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (edge.sourceHandle !== 'right') return;
    const list = parentToHorizontalChildren.get(edge.source) || [];
    list.push(edge.target);
    parentToHorizontalChildren.set(edge.source, list);
  });

  const maxPasses = Math.max(1, adjustedNodes.length * 2);
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;

    for (const [, childIds] of parentToHorizontalChildren) {
      if (childIds.length <= 1) continue;

      let prevBottom = subtreeBottom(childIds[0]);

      for (let i = 1; i < childIds.length; i++) {
        const currentId = childIds[i];
        const currentNode = nodeMap.get(currentId);
        if (!currentNode) continue;

        const requiredTop = prevBottom + HORIZONTAL_BRANCH_GAP;
        if (currentNode.position.y < requiredTop) {
          const deltaY = requiredTop - currentNode.position.y;
          shiftSubtree(currentId, deltaY);
          changed = true;
        }

        prevBottom = subtreeBottom(currentId);
      }
    }

    if (!changed) break;
  }

  return nodes.map((node) => nodeMap.get(node.id) || node);
}

function enforceVerticalClusterSeparation(nodes: Node[], edges: Edge[]): Node[] {
  const adjustedNodes = nodes.map((node) => ({
    ...node,
    position: { ...node.position },
  }));
  const nodeMap = new Map(adjustedNodes.map((node) => [node.id, node]));

  const shiftSubtreeX = (rootId: string, deltaX: number) => {
    if (deltaX <= 0) return;
    const subtreeIds = collectSubtreeIds(rootId, edges);
    subtreeIds.forEach((id) => {
      const node = nodeMap.get(id);
      if (!node) return;
      node.position.x += deltaX;
    });
  };

  const parentToVerticalChildren = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (edge.sourceHandle === 'right') return;
    const list = parentToVerticalChildren.get(edge.source) || [];
    list.push(edge.target);
    parentToVerticalChildren.set(edge.source, list);
  });

  for (const [, childIds] of parentToVerticalChildren) {
    if (childIds.length <= 1) continue;
    for (let i = 1; i < childIds.length; i++) {
      const prevId = childIds[i - 1];
      const currId = childIds[i];
      const prevBounds = getSubtreeBounds(prevId, edges, nodeMap);
      const currBounds = getSubtreeBounds(currId, edges, nodeMap);
      if (!prevBounds || !currBounds) continue;
      const requiredLeft = prevBounds.right + VERTICAL_QA_CLUSTER_GAP;
      if (currBounds.left < requiredLeft) {
        shiftSubtreeX(currId, requiredLeft - currBounds.left);
      }
    }
  }

  // 纵向簇内部防重叠后，再将整组子树按“最左Q与最右Q中点”回正到父节点中心。
  for (const [parentId, childIds] of parentToVerticalChildren) {
    if (childIds.length <= 1) continue;
    const parentNode = nodeMap.get(parentId);
    if (!parentNode) continue;

    const parentWidth = getNodeWidthForConstraint(parentNode);
    const parentCenterX = parentNode.position.x + parentWidth / 2;

    const qCenters = childIds
      .map((childId) => getQCenterXForVerticalChild(childId, edges, nodeMap))
      .filter((x): x is number => x !== null);
    if (qCenters.length === 0) continue;

    const minQCenterX = Math.min(...qCenters);
    const maxQCenterX = Math.max(...qCenters);
    const targetCenterX = (minQCenterX + maxQCenterX) / 2;
    const deltaX = parentCenterX - targetCenterX;
    if (Math.abs(deltaX) < 0.5) continue;

    childIds.forEach((childId) => {
      const subtreeIds = collectSubtreeIds(childId, edges);
      subtreeIds.forEach((id) => {
        const node = nodeMap.get(id);
        if (!node) return;
        node.position.x += deltaX;
      });
    });
  }

  // 回正后再做一轮边界分离，防止中点回正导致兄弟子树再次挤压重叠
  for (const [, childIds] of parentToVerticalChildren) {
    if (childIds.length <= 1) continue;
    for (let i = 1; i < childIds.length; i++) {
      const prevId = childIds[i - 1];
      const currId = childIds[i];
      const prevBounds = getSubtreeBounds(prevId, edges, nodeMap);
      const currBounds = getSubtreeBounds(currId, edges, nodeMap);
      if (!prevBounds || !currBounds) continue;
      const requiredLeft = prevBounds.right + VERTICAL_QA_CLUSTER_GAP;
      if (currBounds.left < requiredLeft) {
        shiftSubtreeX(currId, requiredLeft - currBounds.left);
      }
    }
  }

  return nodes.map((node) => nodeMap.get(node.id) || node);
}

function enforceMainToHorizontalClusterGapOnGrowth(nodes: Node[], edges: Edge[]): Node[] {
  const adjustedNodes = nodes.map((node) => ({
    ...node,
    position: { ...node.position },
  }));
  const nodeMap = new Map(adjustedNodes.map((node) => [node.id, node]));
  const activeBranchRoots = new Set<string>();

  const shiftSubtreeX = (rootId: string, deltaX: number) => {
    if (deltaX <= 0) return;
    const subtreeIds = collectSubtreeIds(rootId, edges);
    subtreeIds.forEach((id) => {
      const node = nodeMap.get(id);
      if (!node) return;
      node.position.x += deltaX;
    });
  };

  const horizontalEdges = edges.filter((edge) => edge.sourceHandle === 'right');

  horizontalEdges.forEach((edge) => {
    activeBranchRoots.add(edge.target);
    const parentNode = nodeMap.get(edge.source);
    if (!parentNode) return;

    const currentBounds = getSubtreeBounds(edge.target, edges, nodeMap);
    if (!currentBounds) return;
    const currentWidth = currentBounds.right - currentBounds.left;
    const prevWidth = horizontalBranchWidthCache.get(edge.target);
    const widthGrowth = prevWidth === undefined ? 0 : currentWidth - prevWidth;

    if (prevWidth === undefined) {
      horizontalBranchWidthCache.set(edge.target, currentWidth);
      return;
    }

    // 仅在分支自身变宽时触发与主链的间距修正
    if (widthGrowth <= 0.5) {
      horizontalBranchWidthCache.set(edge.target, currentWidth);
      return;
    }

    const mainSideIds = collectNonRightDescendants(parentNode.id, edges);
    let mainRight = Number.NEGATIVE_INFINITY;
    mainSideIds.forEach((id) => {
      const node = nodeMap.get(id);
      if (!node) return;
      mainRight = Math.max(mainRight, node.position.x + getNodeWidthForConstraint(node));
    });

    if (!Number.isFinite(mainRight)) {
      mainRight = parentNode.position.x + getNodeWidthForConstraint(parentNode);
    }

    const requiredLeft = mainRight + MAIN_TO_HORIZONTAL_CLUSTER_GAP;
    if (currentBounds.left < requiredLeft) {
      shiftSubtreeX(edge.target, requiredLeft - currentBounds.left);
    }

    horizontalBranchWidthCache.set(edge.target, currentWidth);
  });

  for (const key of horizontalBranchWidthCache.keys()) {
    if (!activeBranchRoots.has(key)) {
      horizontalBranchWidthCache.delete(key);
    }
  }

  return nodes.map((node) => nodeMap.get(node.id) || node);
}

function enforceAnchoredChildrenAndFatherCenter(nodes: Node[], edges: Edge[]): Node[] {
  const adjustedNodes = nodes.map((node) => ({
    ...node,
    position: { ...node.position },
  }));
  const nodeMap = new Map(adjustedNodes.map((node) => [node.id, node]));
  const incomingEdgesByTarget = new Map<string, Edge[]>();
  edges.forEach((edge: Edge) => {
    const list: Edge[] = incomingEdgesByTarget.get(edge.target) ?? [];
    list.push(edge);
    incomingEdgesByTarget.set(edge.target, list);
  });

  const shiftSubtreeX = (rootId: string, deltaX: number) => {
    if (deltaX <= 0) return;
    const subtreeIds = collectSubtreeIds(rootId, edges);
    subtreeIds.forEach((id) => {
      const n = nodeMap.get(id);
      if (!n) return;
      n.position.x += deltaX;
    });
  };

  const findFatherQaInfo = (fNodeId: string): { fatherQaId: string; sourceAId: string } | null => {
    const queue: string[] = [fNodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const inEdges: Edge[] = incomingEdgesByTarget.get(currentId) ?? [];
      if (inEdges.length === 0) continue;

      const rightIncoming = inEdges.find((edge: Edge) => edge.sourceHandle === 'right');
      if (rightIncoming) {
        return { fatherQaId: currentId, sourceAId: rightIncoming.source };
      }

      inEdges
        .filter((edge: Edge) => edge.sourceHandle !== 'right')
        .forEach((edge: Edge) => queue.push(edge.source));
    }
    return null;
  };

  adjustedNodes
    .filter((n) => n.type === 'followup')
    .forEach((fNode) => {
      const verticalChildren = edges
        .filter((edge) => edge.source === fNode.id && edge.sourceHandle !== 'right')
        .map((edge) => edge.target);

      // 仅作用于“横向追问分支中的F节点”，普通纵向F不参与该规则
      const fatherInfo = findFatherQaInfo(fNode.id);
      if (!fatherInfo) return;
      const fatherQa = nodeMap.get(fatherInfo.fatherQaId);
      if (!fatherQa) return;

      if (verticalChildren.length === 0) {
        return;
      }
      const orderedChildren = [...verticalChildren].sort((a, b) => {
        const ax = nodeMap.get(a)?.position.x ?? 0;
        const bx = nodeMap.get(b)?.position.x ?? 0;
        return ax - bx;
      });

      if (orderedChildren.length > 1) {
        let prevRight = (getSubtreeBounds(orderedChildren[0], edges, nodeMap)?.right ?? (nodeMap.get(orderedChildren[0])?.position.x ?? 0));
        for (let i = 1; i < orderedChildren.length; i++) {
          const childId = orderedChildren[i];
          const childBounds = getSubtreeBounds(childId, edges, nodeMap);
          if (!childBounds) continue;
          const requiredLeft = prevRight + VERTICAL_QA_CLUSTER_GAP;
          if (childBounds.left < requiredLeft) {
            shiftSubtreeX(childId, requiredLeft - childBounds.left);
          }
          const updatedBounds = getSubtreeBounds(childId, edges, nodeMap);
          if (updatedBounds) prevRight = updatedBounds.right;
        }
      }

      const childCenters = orderedChildren
        .map((id) => {
          const n = nodeMap.get(id);
          if (!n) return null;
          return n.position.x + getNodeWidthForConstraint(n) / 2;
        })
        .filter((x): x is number => x !== null);
      if (childCenters.length === 0) return;
      const leftCenter = Math.min(...childCenters);
      const rightCenter = Math.max(...childCenters);
      const targetFatherCenter = (leftCenter + rightCenter) / 2;
      const fatherCenter = fatherQa.position.x + getNodeWidthForConstraint(fatherQa) / 2;
      fatherQa.position.x += targetFatherCenter - fatherCenter;

      const sourceANode = nodeMap.get(fatherInfo.sourceAId);
      if (!sourceANode) return;

      const leftQaCenterX = getNodeCenterX(sourceANode);
      const leftMostChildId = orderedChildren[0];
      const leftMostChildBounds = getSubtreeBounds(leftMostChildId, edges, nodeMap);
      if (!leftMostChildBounds) return;
      const childQa1Left = leftMostChildBounds.left;
      const minDistance = CARD_WIDTH / 2 + HORIZONTAL_GAP;
      const currentDistance = childQa1Left - leftQaCenterX;

      if (currentDistance < minDistance) {
        const deltaX = minDistance - currentDistance;
        shiftSubtreeX(fatherInfo.fatherQaId, deltaX);
      }
    });

  return nodes.map((node) => nodeMap.get(node.id) || node);
}

/**
 * 多列布局主入口
 */
export async function getMultiColumnLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[], edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 1. 计算所有节点的子树尺寸
  const sizeCache = new Map<string, SubtreeSize>();
  for (const node of nodes) {
    calculateSubtreeSize(node.id, nodes, edges, sizeCache);
  }

  // 2. 找到根节点（没有入边的节点）
  const nodesWithIncomingEdges = new Set(edges.map(e => e.target));
  const rootNodes = nodes.filter(n => !nodesWithIncomingEdges.has(n.id));

  if (rootNodes.length === 0) {
    console.error('未找到根节点');
    return { nodes, edges };
  }

  const rootNode = rootNodes[0];

  // 3. 从根节点开始递归布局
  const layoutedNodesMap = new Map<string, Node>();
  const rootPosition = rootNode.position || { x: 0, y: 0 };

  layoutNodeRecursive(
    rootNode.id,
    rootPosition.x,
    rootPosition.y,
    nodes,
    edges,
    sizeCache,
    layoutedNodesMap
  );

  // 4. 返回布局结果
  const layoutedNodes = Array.from(layoutedNodesMap.values());
  const stabilizedNodes = enforceHorizontalSiblingSpacing(layoutedNodes, edges);
  const separatedNodes = enforceVerticalClusterSeparation(stabilizedNodes, edges);
  const anchoredNodes = enforceAnchoredChildrenAndFatherCenter(separatedNodes, edges);
  // 锚定与回正可能再次改变子树边界，最后再做一轮分离收口，避免深层场景重叠
  const finalSeparatedNodes = enforceVerticalClusterSeparation(anchoredNodes, edges);
  return { nodes: finalSeparatedNodes, edges };
}
