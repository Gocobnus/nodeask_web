export interface MockSSECallbacks {
  onMessage: (event: string, data: string) => void;
  onClose: () => void;
}

export interface MockSSEOptions {
  qaId: string;           // QA 对 ID（从 create/followup API 返回）
  parentNodeId: string;   // 父节点 ID（Q 节点的 ID）
}

const TREE_TITLE = "React Flow 核心概念";

// Mock 数据生成函数：根据 parentNodeId 动态生成 A 节点数据
const generateMockANodes = (parentNodeId: string) => {
  const timestamp = Date.now(); // 统一的时间戳，确保 ID 引用正确
  const a1Id = `a-${timestamp}-1`;
  const a2Id = `a-${timestamp}-2`;
  const a3Id = `a-${timestamp}-3`;

  return [
    {
      id: a1Id,
      type: 'acard',
      pos: 1,
      content: "React FlReact React FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReactReact FlReact",
      parentId: parentNodeId,  // 使用传入的父节点 ID
    },
    {
      id: a2Id,
      type: 'acard',
      pos: 1,
      content: "R1t",
      parentId: a1Id,  // A2 的父节点是 A1
    },
    {
      id: a3Id,
      type: 'acard',
      pos: 1,
      content: "在实际应用中,",
      parentId: a2Id,  // A3 的父节点是 A2
    },
  ];
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function startMockSSE(callbacks: MockSSECallbacks, options?: MockSSEOptions) {
  const { onMessage, onClose } = callbacks;
  const { qaId = 'qa1', parentNodeId = 'q1' } = options || {};
  let aborted = false;

  // 动态生成 A 节点数据
  const MOCK_A_NODES = generateMockANodes(parentNodeId);

  // 返回 abort 函数
  const abort = () => {
    console.log('🛑 SSE 连接被中止');
    aborted = true;
  };

  // 异步执行 SSE 流
  (async () => {
    // 1. Send Title event
    await delay(120);
    if (aborted) return;
    const titlePayload = { title: TREE_TITLE };
    onMessage('title', JSON.stringify(titlePayload));

    // 2. Wait before streaming A nodes (F0 和 Q1 已经通过 create API 创建)
    await delay(180);
    if (aborted) return;

    // 3. 循环推送所有 A 节点
    for (let i = 0; i < MOCK_A_NODES.length; i++) {
      if (aborted) return;
      const aNode = MOCK_A_NODES[i];

      // 按固定字符数分块(每 5 个字符一块)
      const chunkSize = 5;
      const chunks = [];
      for (let k = 0; k < aNode.content.length; k += chunkSize) {
        chunks.push(aNode.content.substring(k, k + chunkSize));
      }

      for (let j = 0; j < chunks.length; j++) {
        if (aborted) return;
        const isLastChunk = j === chunks.length - 1;
        const textPayload = {
          log_id: `log_${i + 1}`,
          tree_id: 'tree_mock',
          qa_id: qaId,  // 使用传入的 qa_id
          pkg_index: j,
          created_at: new Date().toISOString(),
          done: isLastChunk, // A 节点完成时 done=true
          node_data: {
            id: aNode.id,
            pos: aNode.pos,
            content: chunks[j],
            title: `Answer ${aNode.id}`,
            is_new_node: j === 0,
            finish: isLastChunk, // A 节点完成时 finish=true
            parentNodeId: aNode.parentId,
          }
        };
        await delay(35);
        onMessage('text', JSON.stringify(textPayload));
      }

      // 发送 ask_back
      await delay(80);
      if (aborted) return;
      const askBackPayload = {
        node_id: aNode.id,
        ask_back: [
          `关于 ${aNode.id} 的第一个相关问题？`,
          `关于 ${aNode.id} 的第二个相关问题？`,
        ]
      };
      onMessage('ask_back', JSON.stringify(askBackPayload));

      // 如果不是最后一个 A 节点，等待一段时间再推送下一个
      if (i < MOCK_A_NODES.length - 1) {
        await delay(350);
      }
    }

    // 4. Send Done event (包含 CommonFields)
    await delay(120);
    if (aborted) return;
    const donePayload = {
      log_id: 'log_done',
      tree_id: 'tree_mock',
      qa_id: qaId,  // 添加 qa_id 到 done 事件
      pkg_index: 0,
      created_at: new Date().toISOString(),
      done: true,
      reason: "Stream completed successfully"
    };
    onMessage('done', JSON.stringify(donePayload));
    onClose();
  })();

  // 返回 abort 函数供外部调用
  return abort;
}
