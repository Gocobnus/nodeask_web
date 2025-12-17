# 多列树形布局实现计划

## 问题背景

当前布局系统存在以下问题:
1. 横向追问的Q节点(`isHorizontalRoot`)被排除在ELK布局之外
2. 横向分支的子节点虽然参与ELK布局,但由于缺少父节点信息而无法正确定位
3. 主链路节点无法感知横向分支的高度,导致无法自动撑开间距,产生重叠

## 布局结构说明

```
F0
 |
Q1
 |
A1 ----→ Q_f1 (A1的第一个横向追问)
 |          |
 |       A_f1_1 ----→ Q_f1_h1 (A_f1_1的横向追问)
 |          |            |
 |          |         A_f1_h1_1
 |          |            |
 |       F_f1         F_f1_h1
 |          |
 |       Q_f1_v (纵向追问F_f1)
 |          |
 |       A_f1_v1
 |          |
 |       F_f1_v
 |
 | -----→ Q_f2 (A1的第二个横向追问)
 |          |
 |       A_f2_1
 |          |
 |       F_f2
 |
A2 (需要撑开,避免与上方的横向分支重叠)
 |
A3
 |
F3 (A3下面的F节点)
 |
Q_v (纵向追问F0)
 |
A_v1
 |
F_v
```

**关键特征**:
1. 横向分支是从ACard节点的右侧水平出发的Q节点
2. 横向Q节点下方的所有节点都是垂直排列
3. 同一个ACard可以有多个横向追问,它们在右侧垂直堆叠
4. 横向分支内的ACard还可以有自己的横向追问,形成多列结构
5. 主链路需要根据横向分支的总高度自动撑开间距

## 解决方案概述

采用**递归树形布局算法**:
1. 识别并构建树形结构(主链路 + 横向分支树)
2. 递归计算每个节点的"占用高度"(包括其所有横向分支的高度)
3. 使用ELK对主链路进行布局,但根据占用高度调整节点间距
4. 对每个横向分支递归应用相同的布局逻辑
5. 后处理调整所有节点的最终位置

## 技术方案

### 1. 数据结构设计

#### NodeLayoutInfo (节点布局信息)
```typescript
interface NodeLayoutInfo {
  nodeId: string;                    // 节点ID
  selfHeight: number;                 // 节点自身高度
  horizontalBranches: BranchInfo[];   // 该节点的所有横向分支
  occupiedHeight: number;             // 总占用高度 = max(selfHeight, sum(分支高度))
}
```

#### BranchInfo (分支信息)
```typescript
interface BranchInfo {
  rootNodeId: string;           // 分支根节点ID (isHorizontalRoot的Q节点)
  nodes: Node[];                // 该分支的所有节点
  totalHeight: number;          // 分支总高度(从根节点到最底部叶子节点)
  columnIndex: number;          // 列索引
}
```

#### TreeColumn (树形列)
```typescript
interface TreeColumn {
  columnIndex: number;          // 列索引 (0=主链路)
  nodes: Node[];                // 该列的节点(垂直排列)
  parentNodeId?: string;        // 该列起始节点的父节点ID
  startY: number;               // 该列的起始Y坐标
}
```

### 2. 核心算法

#### 算法流程
```
1. buildTreeStructure(nodes, edges)
   - 识别主链路节点 (没有isHorizontalRoot标记的节点)
   - 识别横向分支根节点 (isHorizontalRoot=true的节点)
   - 构建父子关系映射
   - 按列分组节点

2. calculateNodeOccupiedHeight(nodeId) [递归]
   - 获取节点自身高度
   - 找到该节点的所有横向分支根节点
   - 对每个横向分支:
     * 递归计算分支内每个节点的占用高度
     * 计算分支的总高度 = 从根到最深叶子的路径高度
   - 如果同一父节点有多个横向分支,它们需要垂直堆叠
   - 总占用高度 = max(selfHeight, sum(所有分支高度 + 分支间GAP))
   - 缓存结果避免重复计算

3. layoutMainChain(mainChainNodes)
   - 使用ELK对主链路进行初步布局
   - 调整节点Y坐标:
     * 遍历主链路节点
     * 如果节点有横向分支,根据occupiedHeight调整下一个节点的Y坐标
     * Y_next = Y_current + occupiedHeight + GAP
   - 返回调整后的节点位置

4. layoutHorizontalBranch(branchRootNode, parentNode) [递归]
   - 提取该分支的所有节点
   - 使用ELK对该分支进行垂直布局 (与主链路相同的算法)
   - 递归处理该分支内节点的横向分支
   - 调整该分支的位置:
     * X = parentNode.X + 360 + 80
     * Y = 根据父节点和前序分支计算
   - 返回该分支的所有节点位置

5. placeAllNodes(nodes, edges)
   - 布局主链路
   - 递归布局所有横向分支
   - 合并所有节点位置
   - 返回最终的节点和边数据
```

### 3. 关键计算逻辑

#### 3.1 识别横向分支根节点
```typescript
function findHorizontalBranchRoots(parentNodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  return nodes.filter(node =>
    node.data.isHorizontalRoot &&
    edges.some(e => e.source === parentNodeId && e.target === node.id && e.sourceHandle === 'right')
  );
}
```

#### 3.2 计算分支总高度
```typescript
function calculateBranchTotalHeight(
  branchRootId: string,
  nodes: Node[],
  edges: Edge[],
  heightCache: Map<string, number>
): number {
  // 找到从branchRootId出发的最长路径
  // 使用DFS遍历,累加每个节点的occupiedHeight

  function dfs(nodeId: string, currentHeight: number): number {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return currentHeight;

    const occupiedHeight = heightCache.get(nodeId) || (node.height || 550);
    const newHeight = currentHeight + occupiedHeight;

    // 找到该节点的垂直子节点 (不包括横向分支)
    const verticalChildren = edges
      .filter(e => e.source === nodeId && !e.sourceHandle)
      .map(e => e.target);

    if (verticalChildren.length === 0) {
      return newHeight;
    }

    // 递归计算所有子节点,取最大值
    return Math.max(...verticalChildren.map(childId =>
      dfs(childId, newHeight + GAP)
    ));
  }

  return dfs(branchRootId, 0);
}
```

#### 3.3 处理同一父节点的多个横向分支堆叠
```typescript
function layoutMultipleBranches(
  parentNode: Node,
  branches: BranchInfo[],
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const updatedNodes: Node[] = [];
  let currentY = parentNode.position.y; // 第一个分支与父节点Y对齐

  for (const branch of branches) {
    // 布局该分支的所有节点
    const branchNodes = layoutHorizontalBranch(
      branch.rootNodeId,
      parentNode,
      currentY,
      nodes,
      edges
    );

    updatedNodes.push(...branchNodes);

    // 下一个分支的Y坐标 = 当前分支最底部 + GAP
    currentY = currentY + branch.totalHeight + GAP;
  }

  return updatedNodes;
}
```

### 4. ELK配置调整

由于我们需要手动控制节点间距,需要调整ELK的配置:
```typescript
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '80',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  // 禁用自动间距优化,我们手动控制
  'elk.layered.compaction.postCompaction.strategy': 'NONE'
};
```

## 实施步骤

### 步骤1: 在 layout-utils.ts 中实现核心布局算法

**文件**: `app/utils/layout-utils.ts`

**新增函数**:
1. `buildTreeStructure(nodes: Node[], edges: Edge[])`
   - 识别主链路
   - 构建分支树
   - 返回树形结构

2. `calculateNodeOccupiedHeight(nodeId: string, nodes: Node[], edges: Edge[], cache: Map<string, number>)`
   - 递归计算节点占用高度
   - 使用缓存避免重复计算

3. `calculateBranchTotalHeight(branchRootId: string, nodes: Node[], edges: Edge[], cache: Map<string, number>)`
   - 计算分支从根到最深叶子的总高度

4. `findHorizontalBranchRoots(parentNodeId: string, nodes: Node[], edges: Edge[])`
   - 查找节点的所有横向分支根节点

5. `layoutMainChain(mainChainNodes: Node[], edges: Edge[], heightCache: Map<string, number>)`
   - 对主链路进行布局
   - 根据占用高度调整节点位置

6. `layoutHorizontalBranch(branchRootId: string, parentNode: Node, startY: number, nodes: Node[], edges: Edge[], heightCache: Map<string, number>)`
   - 递归布局横向分支
   - 返回该分支的所有节点位置

7. `getMultiColumnLayoutedElements(nodes: Node[], edges: Edge[])`
   - 主入口函数
   - 协调整个布局流程
   - 返回最终的节点和边

### 步骤2: 修改 FlowView.tsx 中的布局调用

**文件**: `app/(dashboard)/qatree/[treeId]/FlowView.tsx`

**修改点**:
1. 移除对 `isHorizontalRoot` 节点的过滤 (行786-800)
2. 将 `getLayoutedElements` 替换为 `getMultiColumnLayoutedElements`
3. 移除手动调整QA节点x坐标的逻辑 (行809-834),新算法会自动处理
4. 移除对excludedNodes的合并逻辑 (行854-898),所有节点都参与布局

### 步骤3: 更新 pending-node-utils.ts

**文件**: `app/utils/pending-node-utils.ts`

**修改点**:
1. 保持 `isHorizontalRoot` 标记不变 (行134)
2. 可选: 添加 `columnIndex` 字段到节点数据中,便于调试

### 步骤4: 测试和调试

**测试场景**:
1. 简单场景: A1 → Q_f1 → A_f1_1 (单个横向分支)
2. 多个分支: A1 有两个横向追问 Q_f1 和 Q_f2
3. 嵌套分支: A_f1_1 再有横向追问 Q_f1_h1
4. 混合场景: 纵向追问 + 横向追问混合
5. 极端场景: 横向分支高度3000px,验证主链路是否正确撑开

**调试输出**:
- 每个节点的占用高度
- 每个分支的总高度
- 最终的节点位置

## 实施检查清单

### 实施前准备
- [x] 理解当前布局逻辑
- [x] 识别所有相关文件
- [x] 设计数据结构
- [x] 设计核心算法

### 实施步骤
1. [ ] 在 layout-utils.ts 中实现 `buildTreeStructure`
2. [ ] 在 layout-utils.ts 中实现 `findHorizontalBranchRoots`
3. [ ] 在 layout-utils.ts 中实现 `calculateNodeOccupiedHeight` (递归)
4. [ ] 在 layout-utils.ts 中实现 `calculateBranchTotalHeight` (递归)
5. [ ] 在 layout-utils.ts 中实现 `layoutMainChain`
6. [ ] 在 layout-utils.ts 中实现 `layoutHorizontalBranch` (递归)
7. [ ] 在 layout-utils.ts 中实现 `getMultiColumnLayoutedElements` (主入口)
8. [ ] 在 FlowView.tsx 中移除 isHorizontalRoot 过滤逻辑
9. [ ] 在 FlowView.tsx 中替换布局函数调用
10. [ ] 在 FlowView.tsx 中移除手动x坐标调整逻辑
11. [ ] 在 FlowView.tsx 中移除excludedNodes合并逻辑
12. [ ] 测试简单场景 (单个横向分支)
13. [ ] 测试多分支场景
14. [ ] 测试嵌套分支场景
15. [ ] 测试混合场景
16. [ ] 测试极端场景 (3000px高度)
17. [ ] 优化性能 (如果需要)
18. [ ] 代码审查和清理

## 潜在风险和注意事项

1. **性能问题**: 递归计算可能导致性能问题,需要充分利用缓存
2. **循环依赖**: 虽然理论上不应该有循环,但需要在算法中加入防护
3. **边的handle信息**: 需要正确识别横向边 (sourceHandle='right', targetHandle='left')
4. **ELK布局稳定性**: ELK可能对某些图结构产生意外结果,需要充分测试
5. **动画和过渡**: 节点位置大幅调整时,需要考虑动画效果
6. **F节点对齐**: F节点(followup)需要与父节点中心对齐,注意宽度差异(24px vs 360px)

## 后续优化方向

1. **增量布局**: 只重新计算受影响的节点,而不是全部重新布局
2. **布局缓存**: 缓存布局结果,避免重复计算
3. **虚拟化**: 对于大型图,使用虚拟化技术只渲染可见节点
4. **并行计算**: 对于独立的分支,可以并行计算布局
