import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from 'reactflow';
import { CARD_WIDTH, FOLLOWUP_WIDTH, GAP, HORIZONTAL_GAP } from '../config/constants';

const elk = new ELK();

// 子树尺寸接口
interface SubtreeSize {
  width: number;   // 子树总宽度
  height: number;  // 子树总高度
}

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
      totalHorizontalHeight += childSize.height + GAP;
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
        forkTotalWidth += childSize.width;
        forkMaxHeight = Math.max(forkMaxHeight, childSize.height);
      }

      forkTotalWidth += GAP * (vertical.length - 1); // 分叉之间的间距

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

  // 放置当前节点
  const layoutedNode = {
    ...node,
    position: { x: startX, y: startY }
  };
  layoutedNodes.set(nodeId, layoutedNode);

  const { horizontal, vertical } = findChildren(nodeId, edges);

  // 布局横向分支
  if (horizontal.length > 0) {
    const branchX = startX + CARD_WIDTH + HORIZONTAL_GAP;
    let currentY = startY;

    for (const childId of horizontal) {
      layoutNodeRecursive(childId, branchX, currentY, nodes, edges, sizeCache, layoutedNodes);

      const childSize = sizeCache.get(childId);
      if (!childSize) {
        console.warn(`横向子节点 ${childId} 的尺寸未找到，跳过`);
        continue;
      }
      currentY += childSize.height + GAP;
    }
  }

  // 布局纵向分叉
  if (vertical.length > 0) {
    const nodeHeight = node.height || (node.type === 'acard' ? 550 :
                                       node.type === 'followup' ? 24 : 250);
    const parentCenterX = startX + (node.type === 'followup' ? FOLLOWUP_WIDTH / 2 : CARD_WIDTH / 2);

    // 计算纵向子节点的起始Y坐标
    let childStartY;
    if (horizontal.length > 0) {
      // 有横向分支：找到横向分支中所有节点的最底部位置
      // A2的上边缘 = 横向分支最底部节点的下边缘 + GAP
      let maxBottomY = startY + nodeHeight;

      // 遍历所有已布局的节点，找出属于横向分支的最底部节点
      for (const layoutedNode of layoutedNodes.values()) {
        // 检查这个节点是否属于当前节点的横向分支子树
        // 简单判断：如果节点的X坐标大于当前节点，且在合理范围内
        if (layoutedNode.position.x > startX && (layoutedNode.type === 'acard' || layoutedNode.type === 'followup')) 
        {
          const nodeBottom = layoutedNode.position.y + (layoutedNode.height || (layoutedNode.type === 'acard' ? 550 : 24));
          maxBottomY = Math.max(maxBottomY, nodeBottom);
        }
      }

      childStartY = maxBottomY + GAP;
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

      const totalWidth = childSizes.reduce((sum, size) => sum + size.width, 0) +
                         GAP * (childSizes.length - 1);

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

        // 子节点在其分配空间内居中
        const childX = currentX + (childSize.width - childWidth) / 2;

        layoutNodeRecursive(childId, childX, childStartY, nodes, edges, sizeCache, layoutedNodes);

        currentX += childSize.width + GAP;
      }
    }
  }
}

/**
 * 多列布局主入口
 */
export async function getMultiColumnLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[], edges: Edge[] }> {
  console.log('🚀 开始多列布局算法', { nodeCount: nodes.length, edgeCount: edges.length });

  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 1. 计算所有节点的子树尺寸
  const sizeCache = new Map<string, SubtreeSize>();
  for (const node of nodes) {
    calculateSubtreeSize(node.id, nodes, edges, sizeCache);
  }

  console.log('📏 子树尺寸计算完成', Array.from(sizeCache.entries()).map(([id, size]) => ({
    id,
    width: size.width,
    height: size.height
  })));

  // 2. 找到根节点（没有入边的节点）
  const nodesWithIncomingEdges = new Set(edges.map(e => e.target));
  const rootNodes = nodes.filter(n => !nodesWithIncomingEdges.has(n.id));

  if (rootNodes.length === 0) {
    console.error('未找到根节点');
    return { nodes, edges };
  }

  const rootNode = rootNodes[0];
  console.log('🌳 根节点:', rootNode.id);

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
  console.log('✅ 布局完成', { layoutedCount: layoutedNodes.length });

  return { nodes: layoutedNodes, edges };
}