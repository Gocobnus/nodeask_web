// Pending节点相关的TypeScript类型定义
// 用于支持"先创建后确认"的节点机制（横向追问场景）

import { Node, Edge } from 'reactflow';

// Pending节点类型
export type PendingType = 'horizontal' | 'vertical';

// Pending节点的额外数据字段
export interface PendingNodeData {
  isPending?: boolean;           // 是否是待确认节点
  pendingType?: PendingType;     // 待确认类型：横向或纵向
  parentNodeId?: string;         // 父节点的业务ID（用于API调用）
  parentReactFlowId?: string;    // 父节点的ReactFlow ID（用于drafts等UI状态）
}

// 创建Pending节点的配置
export interface CreatePendingNodeConfig {
  type: 'qcard' | 'acard';       // 节点类型
  parentNode: Node;               // 父节点对象
  pendingType: PendingType;       // Pending类型
  initialContent?: string;        // 初始内容
}

// 确认Pending节点的结果
export interface ConfirmPendingNodeResult {
  updatedNodes: Node[];
  updatedEdges: Edge[];
}

// 清理Pending节点的结果
export interface CleanupPendingNodesResult {
  cleanedNodes: Node[];
  cleanedEdges: Edge[];
}
