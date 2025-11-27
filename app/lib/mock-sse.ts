export interface MockSSECallbacks {
  onMessage: (event: string, data: string) => void;
  onClose: () => void;
}

const TREE_TITLE = "React Flow 核心概念";

const MOCK_NODES = [
  {
    id: 'q1',
    type: 'qcard',
    content: "什么是 React Flow?",
  },
  {
    id: 'a1',
    type: 'acard',
    content: "React Flow 是一个用于构建基于节点的应用程序的库。它易于使用、可定制，并为构建复杂的节点图提供了强大的功能。",
  },
  {
    id: 'a2',
    type: 'acard',
    content: "它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是它的核心理念是",
  },
  {
    id: 'a3',
    type: 'acard',
    content: "sbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfqsbcdcdcadcsafsadfwqfwqfqfq",
  },
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function startMockSSE(callbacks: MockSSECallbacks) {
  const { onMessage, onClose } = callbacks;

  // 1. Send Title event
  await delay(300);
  const titlePayload = { title: TREE_TITLE };
  onMessage('title', JSON.stringify(titlePayload));

  // 2. Send the first node (QCard) immediately
  const qNode = MOCK_NODES[0];

  // 按固定字符数分块(每 5 个字符一块)
  const qChunkSize = 5;
  const qChunks = [];
  for (let k = 0; k < qNode.content.length; k += qChunkSize) {
    qChunks.push(qNode.content.substring(k, k + qChunkSize));
  }

  for (let i = 0; i < qChunks.length; i++) {
    const isLastChunk = i === qChunks.length - 1;
    const textPayload = {
      node_data: {
        id: qNode.id,
        pos: 0,
        content: qChunks[i],
        finish: isLastChunk,
      }
    };
    await delay(50);
    onMessage('text', JSON.stringify(textPayload));
  }

  // 3. Wait before streaming answers
  await delay(5000);

  // 4. Stream subsequent answer nodes
  for (let i = 1; i < MOCK_NODES.length; i++) {
    const node = MOCK_NODES[i];

    // 按固定字符数分块(每 5 个字符一块)
    const chunkSize = 5;
    const chunks = [];
    for (let k = 0; k < node.content.length; k += chunkSize) {
      chunks.push(node.content.substring(k, k + chunkSize));
    }

    for (let j = 0; j < chunks.length; j++) {
      const isLastChunk = j === chunks.length - 1;
      const textPayload = {
        node_data: {
          id: node.id,
          pos: i,
          content: chunks[j],
          finish: isLastChunk,
          parentId: MOCK_NODES[i - 1].id,
        }
      };
      await delay(100);
      onMessage('text', JSON.stringify(textPayload));
    }

    if (node.type === 'acard') {
      await delay(200);
      const askBackPayload = {
        node_id: node.id,
        ask_back: [
          `关于 ${node.id} 的第一个相关问题？`,
          `关于 ${node.id} 的第二个相关问题？`,
        ]
      };
      onMessage('ask_back', JSON.stringify(askBackPayload));
    }

    // Add delay only if it's not the last answer card
    if (i < MOCK_NODES.length - 1) {
      await delay(5000);
    }
  }

  // 5. Send Done event
  await delay(500);
  const donePayload = { reason: "Stream completed successfully" };
  onMessage('done', JSON.stringify(donePayload));
  onClose();
}