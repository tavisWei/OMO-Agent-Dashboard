import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task, TaskStatus } from '../types';

interface DependencyGraphProps {
  tasks: Pick<Task, 'id' | 'title' | 'status' | 'depends_on'>[];
  className?: string;
  onNodeClick?: (taskId: number) => void;
}

const statusColors: Record<TaskStatus, { bg: string; border: string; text: string }> = {
  backlog: { bg: '#1e293b', border: '#334155', text: '#94a3b8' }, // slate-800, slate-700, slate-400
  in_progress: { bg: '#1e3a8a', border: '#1d4ed8', text: '#60a5fa' }, // blue-900, blue-700, blue-400
  done: { bg: '#064e3b', border: '#047857', text: '#34d399' }, // emerald-900, emerald-700, emerald-400
  failed: { bg: '#7f1d1d', border: '#b91c1c', text: '#f87171' }, // red-900, red-700, red-400
};

export function DependencyGraph({ tasks, className = '', onNodeClick }: DependencyGraphProps) {
  const navigate = useNavigate();

  const { nodes, edges, width, height } = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { nodes: [], edges: [], width: 0, height: 0 };
    }

    // 1. Build adjacency list and in-degrees
    const adj = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    const taskMap = new Map<number, Pick<Task, 'id' | 'title' | 'status' | 'depends_on'>>();

    tasks.forEach(t => {
      taskMap.set(t.id, t);
      if (!adj.has(t.id)) adj.set(t.id, []);
      if (!inDegree.has(t.id)) inDegree.set(t.id, 0);
    });

    tasks.forEach(t => {
      const dependsOn = t.depends_on || [];
      dependsOn.forEach(depId => {
        if (taskMap.has(depId)) {
          // depId -> t.id
          if (!adj.has(depId)) adj.set(depId, []);
          adj.get(depId)!.push(t.id);
          inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
        }
      });
    });

    // 2. Assign layers using BFS (Longest path from roots)
    const layers = new Map<number, number>();
    let maxLayer = 0;

    // Initialize roots (inDegree 0) to layer 0
    const queue: { id: number; layer: number }[] = [];
    tasks.forEach(t => {
      if (inDegree.get(t.id) === 0) {
        queue.push({ id: t.id, layer: 0 });
        layers.set(t.id, 0);
      }
    });

    // If there are cycles, some nodes might not be reached. We'll handle them later.
    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      maxLayer = Math.max(maxLayer, layer);

      const neighbors = adj.get(id) || [];
      neighbors.forEach(nextId => {
        const nextLayer = layer + 1;
        if (!layers.has(nextId) || layers.get(nextId)! < nextLayer) {
          layers.set(nextId, nextLayer);
          queue.push({ id: nextId, layer: nextLayer });
        }
      });
    }

    // Handle disconnected components or cycles
    tasks.forEach(t => {
      if (!layers.has(t.id)) {
        layers.set(t.id, 0);
      }
    });

    // 3. Group by layer
    const layerGroups: number[][] = [];
    for (let i = 0; i <= maxLayer; i++) {
      layerGroups.push([]);
    }
    tasks.forEach(t => {
      const l = layers.get(t.id) || 0;
      if (!layerGroups[l]) layerGroups[l] = [];
      layerGroups[l].push(t.id);
    });

    // 4. Calculate positions
    const nodeWidth = 160;
    const nodeHeight = 40;
    const layerSpacing = 80;
    const nodeSpacing = 20;

    const positions = new Map<number, { x: number; y: number }>();
    let maxNodesInLayer = 0;

    layerGroups.forEach((group, layerIdx) => {
      maxNodesInLayer = Math.max(maxNodesInLayer, group.length);
      const layerHeight = group.length * nodeHeight + (group.length - 1) * nodeSpacing;
      let startY = -layerHeight / 2;

      group.forEach((id, nodeIdx) => {
        positions.set(id, {
          x: layerIdx * (nodeWidth + layerSpacing),
          y: startY + nodeIdx * (nodeHeight + nodeSpacing) + nodeHeight / 2
        });
      });
    });

    const totalWidth = (maxLayer + 1) * nodeWidth + maxLayer * layerSpacing;
    const totalHeight = maxNodesInLayer * nodeHeight + (maxNodesInLayer - 1) * nodeSpacing;

    // 5. Create nodes and edges
    const renderNodes = tasks.map(t => {
      const pos = positions.get(t.id)!;
      return {
        ...t,
        x: pos.x,
        y: pos.y,
        width: nodeWidth,
        height: nodeHeight
      };
    });

    const renderEdges: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    tasks.forEach(t => {
      const targetPos = positions.get(t.id)!;
      const dependsOn = t.depends_on || [];
      dependsOn.forEach(depId => {
        if (positions.has(depId)) {
          const sourcePos = positions.get(depId)!;
          renderEdges.push({
            id: `${depId}-${t.id}`,
            x1: sourcePos.x + nodeWidth,
            y1: sourcePos.y,
            x2: targetPos.x,
            y2: targetPos.y
          });
        }
      });
    });

    return {
      nodes: renderNodes,
      edges: renderEdges,
      width: totalWidth,
      height: totalHeight
    };
  }, [tasks]);

  if (nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-slate-500 italic border border-slate-800/50 rounded-xl bg-slate-900/50 ${className}`}>
        No dependency data available.
      </div>
    );
  }

  const handleNodeClick = (taskId: number) => {
    if (onNodeClick) {
      onNodeClick(taskId);
    } else {
      navigate(`/tasks/${taskId}`);
    }
  };

  // Add padding to SVG viewBox
  const padding = 40;
  const viewBox = `${-padding} ${-height/2 - padding} ${width + padding * 2} ${height + padding * 2}`;

  return (
    <div className={`overflow-auto border border-slate-800/50 rounded-xl bg-slate-900/50 ${className}`}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={viewBox} 
        style={{ minHeight: Math.max(300, height + padding * 2) }}
        className="block"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map(edge => {
          // Simple cubic bezier curve for smooth edges
          const dx = Math.abs(edge.x2 - edge.x1);
          const cp1x = edge.x1 + dx / 2;
          const cp1y = edge.y1;
          const cp2x = edge.x2 - dx / 2;
          const cp2y = edge.y2;
          const path = `M ${edge.x1} ${edge.y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${edge.x2} ${edge.y2}`;

          return (
            <path
              key={edge.id}
              d={path}
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              className="transition-all duration-300"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const colors = statusColors[node.status] || statusColors.backlog;
          return (
            <g 
              key={node.id} 
              transform={`translate(${node.x}, ${node.y - node.height / 2})`}
              onClick={() => handleNodeClick(node.id)}
              className="cursor-pointer group"
            >
              <rect
                width={node.width}
                height={node.height}
                rx="6"
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth="2"
                className="transition-all duration-200 group-hover:brightness-125"
              />
              <text
                x="12"
                y={node.height / 2 + 4}
                fill={colors.text}
                fontSize="12"
                fontWeight="500"
                className="pointer-events-none"
              >
                {node.title.length > 20 ? node.title.substring(0, 18) + '...' : node.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
