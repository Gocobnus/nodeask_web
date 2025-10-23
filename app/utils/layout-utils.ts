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
    children: nodes.map(node => ({
      ...node,
      // elkjs needs width and height for layout
      width: node.width || 360, 
      height: node.height || 150, 
    })),
    edges: edges,
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