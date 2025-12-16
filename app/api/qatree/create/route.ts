import { NextRequest, NextResponse } from 'next/server';

// Mock API for creating QA tree
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 300));

    // 生成 mock 数据（使用时间戳区分不同的 QA）
    const timestamp = Date.now();
    const tree_id = `tree-${timestamp}`;
    const qa_id = `qa-${timestamp}`;      // 带时间戳，传给 SSE
    const dummy_node_id = `f0-${timestamp}`;
    const q_node_id = `q1-${timestamp}`;

    return NextResponse.json({
      tree_id,
      qa_id,
      dummy_node_id,
      q_node_id,
      parent_node_id: dummy_node_id
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create QA tree' },
      { status: 500 }
    );
  }
}
