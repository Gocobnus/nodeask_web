// QATree API 服务
// 统一管理所有 QATree 相关的 API 请求

import { CreateTreeResponse, FollowUpResponse } from '../types/qatree';

/**
 * 创建新的 QA 树
 * @param question 初始问题
 * @returns 创建响应，包含 tree_id, qa_id, dummy_node_id, q_node_id, parent_node_id
 */
export async function createQATree(question: string): Promise<CreateTreeResponse> {
  const response = await fetch('/api/qatree/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });

  if (!response.ok) {
    throw new Error('Failed to create QA tree');
  }

  return response.json();
}

/**
 * 横向追问（一阶段）
 * @param treeId 树 ID
 * @param parentNodeId 父节点 ID
 * @param question 追问问题
 * @returns 追问响应，包含 qa_id, q_node_id, parent_node_id
 */
export async function createHorizontalFollowUp(
  treeId: string,
  parentNodeId: string,
  question: string
): Promise<FollowUpResponse> {
  const response = await fetch('/api/followup/horizontal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tree_id: treeId,
      parent_node_id: parentNodeId,
      question
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create horizontal follow-up');
  }

  return response.json();
}

/**
 * 纵向追问（一阶段）
 * TODO: 实现纵向追问 API
 */
export async function createVerticalFollowUp(
  treeId: string,
  parentNodeId: string,
  question: string
): Promise<FollowUpResponse> {
  const response = await fetch('/api/followup/vertical', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tree_id: treeId,
      parent_node_id: parentNodeId,
      question
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create vertical follow-up');
  }

  return response.json();
}
