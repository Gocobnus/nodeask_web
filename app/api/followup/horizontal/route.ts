import { NextRequest, NextResponse } from 'next/server';

// Mock API for horizontal follow-up
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tree_id, parent_node_id, question } = body;

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 300));

    // 生成 mock 数据
    const timestamp = Date.now();
    const q_node_id = `q-horizontal-${timestamp}`;
    const qa_id = `qa-${timestamp}`;

    return NextResponse.json({
      qa_id,
      q_node_id,
      parent_node_id
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create horizontal follow-up' },
      { status: 500 }
    );
  }
}
