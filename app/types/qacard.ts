// QACard问答卡片相关的TypeScript类型定义
// 定义问答卡片的数据结构，包含node_id、qa_id、tree_id等关联关系

export interface QANode {
  id: string;
  title: string;
  content: string;
  isGenerating: boolean;
  isCompleted: boolean;
  createdAt: Date;
}

export interface QCardProps {
  question: string;
}

export interface ACardProps {
  title: string;
  content: string;
  isGenerating?: boolean;
  isCompleted?: boolean;
  isSelected?: boolean;
  onPause?: () => void;
  onCollapse?: () => void;
  onExpand?: () => void;
  onCopy?: () => void;
  onClick?: () => void;
  onDelete?: () => void;
}