// QATree知识图谱相关的TypeScript类型定义
// 定义QATree实体的数据结构和相关接口类型

export interface QATree {
  id: string;
  name: string;
  description?: string;
  dummyNodeId?: string;   // F0 追问节点的业务 ID
  qNodeId?: string;       // Q1 节点的业务 ID
  qaId?: string;          // 第一个 QA 对的 ID
  qParentNodeId?: string; // Q1 的父节点业务 ID
  createdAt: Date;
  updatedAt: Date;
}

// SSE 响应通用字段
export interface CommonFields {
  log_id: string;
  tree_id: string;
  qa_id: string;
  pkg_index: number;
  created_at: string;
  done: boolean;
}

// SSE text 事件响应
export interface TextResponse {
  log_id: string;
  tree_id: string;
  qa_id: string;
  pkg_index: number;
  created_at: string;
  done: boolean;
  node_data: {
    id: string;
    pos: number;
    content: string;
    title: string;
    is_new_node: boolean;
    parentId?: string;
  };
}

// 创建树 API 响应
export interface CreateTreeResponse {
  tree_id: string;
  qa_id: string;
  dummy_node_id: string;
  q_node_id: string;
  parent_node_id: string;
}

// 追问 API 响应
export interface FollowUpResponse {
  qa_id: string;
  q_node_id: string;
  parent_node_id: string;
}