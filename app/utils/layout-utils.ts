import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from 'reactflow';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '80',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
};

export const getLayoutedElements = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map(node => {
      let height;
      if (node.type === 'acard') {
        height = node.height || 350; // ACard的最小高度约为344px
      } else if (node.type === 'qcard') {
        height = node.height || 150;
      } else {
        height = node.height || 150;
      }

      return {
        ...node,
        width: node.width || 360,
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