import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from 'reactflow';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '80',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  // 优化节点放置策略,帮助ELK更好地计算父节点居中
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

export const getLayoutedElements = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map(node => {
      let height;
      let width;
      if (node.type === 'acard') {
        height = node.height || 550; // ACard高度范围344-760px,使用中值
        width = node.width || 360;
      } else if (node.type === 'qcard') {
        height = node.height || 250; // QCard高度范围约100-344px,使用中值
        width = node.width || 360;
      } else if (node.type === 'followup') {
        height = node.height || 24; // FollowUp节点固定大小
        width = node.width || 24;
      } else {
        height = node.height || 150;
        width = node.width || 360;
      }

      return {
        ...node,
        width: width,
        height: height,
      };
    }),
    edges: edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    const layoutedNodes = nodes.map(node => {
      const nodeInLayout = layoutedGraph.children?.find(n => n.id === node.id);
      if (nodeInLayout?.x && nodeInLayout?.y) {
        return {
          ...node,
          position: { x: nodeInLayout.x, y: nodeInLayout.y },
        };
      }
      return node;
    });

    return { nodes: layoutedNodes, edges };
  } catch (e) {
    console.error('ELK layout error:', e);
    return { nodes, edges };
  }
};