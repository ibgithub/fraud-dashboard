interface SankeyNode {
  name: string;
  color?: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  color?: string;
}

interface SankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function SankeyDiagram({ nodes, links }: SankeyDiagramProps) {
  const width = 800;
  const height = 400;
  const nodeWidth = 20;
  const nodePadding = 40;

  // Simple layout calculation
  const levels = 3; // Source -> Module -> Target
  const nodeHeight = (height - (nodes.length / levels - 1) * nodePadding) / (nodes.length / levels);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {links.map((link, i) => (
          <linearGradient
            key={`gradient-${i}`}
            id={`gradient-${i}`}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={link.color || '#6366f1'} stopOpacity={0.4} />
            <stop offset="100%" stopColor={link.color || '#6366f1'} stopOpacity={0.2} />
          </linearGradient>
        ))}
      </defs>

      {/* Links */}
      <g>
        {links.map((link, i) => {
          const sourceLevel = Math.floor(link.source / (nodes.length / levels));
          const targetLevel = Math.floor(link.target / (nodes.length / levels));
          const sourceIndex = link.source % (nodes.length / levels);
          const targetIndex = link.target % (nodes.length / levels);

          const x1 = (width / (levels + 1)) * (sourceLevel + 1) + nodeWidth;
          const y1 = sourceIndex * (nodeHeight + nodePadding) + nodeHeight / 2;
          const x2 = (width / (levels + 1)) * (targetLevel + 1);
          const y2 = targetIndex * (nodeHeight + nodePadding) + nodeHeight / 2;

          const linkHeight = (link.value / 100) * 60; // Scale link thickness

          return (
            <path
              key={`link-${i}`}
              d={`
                M ${x1} ${y1 - linkHeight / 2}
                C ${(x1 + x2) / 2} ${y1 - linkHeight / 2},
                  ${(x1 + x2) / 2} ${y2 - linkHeight / 2},
                  ${x2} ${y2 - linkHeight / 2}
                L ${x2} ${y2 + linkHeight / 2}
                C ${(x1 + x2) / 2} ${y2 + linkHeight / 2},
                  ${(x1 + x2) / 2} ${y1 + linkHeight / 2},
                  ${x1} ${y1 + linkHeight / 2}
                Z
              `}
              fill={`url(#gradient-${i})`}
              opacity={0.6}
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {nodes.map((node, i) => {
          const level = Math.floor(i / (nodes.length / levels));
          const index = i % (nodes.length / levels);
          const x = (width / (levels + 1)) * (level + 1);
          const y = index * (nodeHeight + nodePadding);

          return (
            <g key={`node-${i}`}>
              <rect
                x={x}
                y={y}
                width={nodeWidth}
                height={nodeHeight}
                fill={node.color || '#6366f1'}
                rx={4}
              />
              <text
                x={level === 0 ? x - 10 : level === levels - 1 ? x + nodeWidth + 10 : x + nodeWidth / 2}
                y={y + nodeHeight / 2}
                textAnchor={level === 0 ? 'end' : level === levels - 1 ? 'start' : 'middle'}
                dominantBaseline="middle"
                fontSize="12"
                fill="#475569"
                fontWeight="500"
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
