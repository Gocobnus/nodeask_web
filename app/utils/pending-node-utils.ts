// Pending节点工具函数
// 提供创建、确认、清理pending节点的通用功能

import { Node, Edge } from 'reactflow';
import {
  CreatePendingNodeConfig,
  ConfirmPendingNodeResult,
  CleanupPendingNodesResult
} from '../types/pending-node';

/**
 * 创建一个pending节点
 * @param config 创建配置
 * @returns 新创建的pending节点
 */
export function createPendingNode(config: CreatePendingNodeConfig): Node {
  const { type, parentNode, pendingType, initialContent = '' } = config;

  // 生成临时ID
  const tempId = `pending-${type}-${Date.now()}`;

  // 计算节点位置
  let position: { x: number; y: number };

  if (pendingType === 'horizontal') {
    // 横向追问：在父节点右侧，上边缘对齐
    position = {
      x: parentNode.position.x + 360 + 80, // 卡片宽度360 + 连接线80
      y: parentNode.position.y
    };
  } else {
    // 纵向追问：在父节点下方，水平居中对齐
    const parentHeight = parentNode.height || 550; // 默认高度
    position = {
      x: parentNode.position.x,
      y: parentNode.position.y + parentHeight + 80 // 间隙80
    };
  }

  // 构建节点数据
  const nodeData: any = {
    nodeId: tempId,
    isPending: true,
    pendingType,
    parentNodeId: parentNode.data.nodeId, // 父节点的业务ID (用于API调用)
    parentReactFlowId: parentNode.id, // 父节点的ReactFlow ID (用于drafts等UI状态)
    pos: type === 'qcard' ? 0 : 1, // Q节点pos=0, A节点pos=1
  };

  if (type === 'qcard') {
    nodeData.question = initialContent;
    nodeData.avatar = undefined; // Q节点可能需要avatar，这里暂时不设置
  } else {
    nodeData.content = initialContent;
    nodeData.title = 'Answer (pending)';
    nodeData.isGenerating = true;
  }

  return {
    id: tempId,
    type,
    position,
    draggable: false,
    data: nodeData
  };
}

/**
 * 创建pending边
 * @param sourceNode 源节点
 * @param targetNode 目标节点
 * @param pendingType pending类型
 * @returns 新创建的边
 */
export function createPendingEdge(
  sourceNode: Node,
  targetNode: Node,
  pendingType: 'horizontal' | 'vertical'
): Edge {
  const edgeId = `${sourceNode.id}-${targetNode.id}`;

  // 根据类型设置handle
  let sourceHandle: string | undefined;
  let targetHandle: string | undefined;

  if (pendingType === 'horizontal') {
    sourceHandle = 'right';
    targetHandle = 'left';
  }
  // 纵向追问使用默认的top/bottom handle，不需要指定

  return {
    id: edgeId,
    source: sourceNode.id,
    target: targetNode.id,
    sourceHandle,
    targetHandle,
    style: {
      strokeDasharray: '5,5',
      stroke: '#b1b1b7',
      strokeWidth: 2
    }
  };
}

/**
 * 确认pending节点，将临时ID更新为真实ID
 * @param nodes 当前所有节点
 * @param edges 当前所有边
 * @param tempId 临时节点ID
 * @param realId 真实节点ID
 * @param qaId QA对的ID
 * @returns 更新后的节点和边
 */
export function confirmPendingNode(
  nodes: Node[],
  edges: Edge[],
  tempId: string,
  realId: string,
  qaId: string
): ConfirmPendingNodeResult {
  // 更新节点
  const updatedNodes = nodes.map(node => {
    if (node.id === tempId) {
      return {
        ...node,
        id: realId,
        data: {
          ...node.data,
          nodeId: realId,
          qaId: qaId,
          isPending: false
        }
      };
    }
    return node;
  });

  // 更新边
  const updatedEdges = edges.map(edge => {
    if (edge.source === tempId) {
      return {
        ...edge,
        id: `${realId}-${edge.target}`,
        source: realId
      };
    }
    if (edge.target === tempId) {
      return {
        ...edge,
        id: `${edge.source}-${realId}`,
        target: realId
      };
    }
    return edge;
  });

  return {
    updatedNodes,
    updatedEdges
  };
}

/**
 * 清理pending节点
 * @param nodes 当前所有节点
 * @param edges 当前所有边
 * @param nodeIds 可选：指定要清理的节点ID列表，如果不指定则清理所有pending节点
 * @returns 清理后的节点和边
 */
export function cleanupPendingNodes(
  nodes: Node[],
  edges: Edge[],
  nodeIds?: string[]
): CleanupPendingNodesResult {
  // 确定要删除的节点ID集合
  const nodesToDelete = new Set<string>();

  nodes.forEach(node => {
    if (node.data.isPending) {
      if (nodeIds) {
        // 如果指定了nodeIds，只删除这些ID
        if (nodeIds.includes(node.id)) {
          nodesToDelete.add(node.id);
        }
      } else {
        // 否则删除所有pending节点
        nodesToDelete.add(node.id);
      }
    }
  });

  // 过滤节点
  const cleanedNodes = nodes.filter(node => !nodesToDelete.has(node.id));

  // 过滤边：删除与待删除节点相关的边
  const cleanedEdges = edges.filter(edge =>
    !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
  );

  return {
    cleanedNodes,
    cleanedEdges
  };
}

/**
 * 查找需要同步到编辑器的pending节点
 * @param nodes 当前所有节点
 * @returns 找到的节点或undefined
 */
export function findPendingNodeToSync(nodes: Node[]): Node | undefined {
  return nodes.find(node => node.data.isPending && node.data.pendingType === 'horizontal');
}
