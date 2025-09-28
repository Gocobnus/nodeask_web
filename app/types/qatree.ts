// QATree知识图谱相关的TypeScript类型定义
// 定义QATree实体的数据结构和相关接口类型

export interface QATree {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}