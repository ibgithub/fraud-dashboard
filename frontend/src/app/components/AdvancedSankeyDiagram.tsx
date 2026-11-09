interface SankeyNode {
  name: string;
  color?: string;
  layer: number; // Which stage/layer this node belongs to (0-4)
  value?: number; // Total value flowing through this node
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  color?: string;
}

interface AdvancedSankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
}

export function AdvancedSankeyDiagram({ 
  nodes, 
  links,
  width = 1200,
  height = 800
}: AdvancedSankeyDiagramProps) {
  const nodeWidth = 24;
  const layerGap = width / 6; // Space between layers
  const nodePadding = 20;

  // Group nodes by layer
  const nodesByLayer: SankeyNode[][] = [];
  for (let i = 0; i < 5; i++) {
    nodesByLayer[i] = nodes.filter(node => node.layer === i);
  }

  // Calculate positions for each node
  const nodePositions: { x: number; y: number; height: number }[] = [];
  
  nodes.forEach((node, index) => {
    const layer = node.layer;
    const nodesInLayer = nodesByLayer[layer];
    const indexInLayer = nodesInLayer.findIndex(n => n.name === node.name);
    
    // Calculate total height needed for this layer
    const totalNodes = nodesInLayer.length;
    const availableHeight = height - 80; // Padding top and bottom
    const totalPadding = (totalNodes - 1) * nodePadding;
    const nodeHeight = Math.max(30, Math.min(60, (availableHeight - totalPadding) / totalNodes));
    
    // Calculate y position
    const layerHeight = totalNodes * nodeHeight + totalPadding;
    const startY = (height - layerHeight) / 2;
    const y = startY + indexInLayer * (nodeHeight + nodePadding);
    
    // Calculate x position
    const x = 60 + layer * layerGap;
    
    nodePositions[index] = { x, y, height: nodeHeight };
  });

  // Calculate link paths with proper thickness based on value
  const getLinkPath = (link: SankeyLink) => {
    const sourcePos = nodePositions[link.source];
    const targetPos = nodePositions[link.target];
    
    if (!sourcePos || !targetPos) return '';
    
    const x1 = sourcePos.x + nodeWidth;
    const y1 = sourcePos.y + sourcePos.height / 2;
    const x2 = targetPos.x;
    const y2 = targetPos.y + targetPos.height / 2;
    
    const linkHeight = Math.max(3, (link.value / 100) * 40);
    const controlPointOffset = (x2 - x1) * 0.5;
    
    return `
      M ${x1} ${y1 - linkHeight / 2}
      C ${x1 + controlPointOffset} ${y1 - linkHeight / 2},
        ${x2 - controlPointOffset} ${y2 - linkHeight / 2},
        ${x2} ${y2 - linkHeight / 2}
      L ${x2} ${y2 + linkHeight / 2}
      C ${x2 - controlPointOffset} ${y2 + linkHeight / 2},
        ${x1 + controlPointOffset} ${y1 + linkHeight / 2},
        ${x1} ${y1 + linkHeight / 2}
      Z
    `;
  };

  // Layer labels
  const layerLabels = [
    'Stage 1: Entry',
    'Stage 2: Early Split',
    'Stage 3: AI Module Exposure',
    'Stage 4: User Interaction',
    'Stage 5: Final Outcome'
  ];

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
        <defs>
          {links.map((link, i) => (
            <linearGradient
              key={`gradient-${i}`}
              id={`adv-gradient-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={nodePositions[link.source]?.x + nodeWidth}
              y1={nodePositions[link.source]?.y}
              x2={nodePositions[link.target]?.x}
              y2={nodePositions[link.target]?.y}
            >
              <stop offset="0%" stopColor={link.color || nodes[link.source]?.color || '#6366f1'} stopOpacity={0.5} />
              <stop offset="100%" stopColor={link.color || nodes[link.target]?.color || '#6366f1'} stopOpacity={0.3} />
            </linearGradient>
          ))}
        </defs>

        {/* Stage labels */}
        <g>
          {layerLabels.map((label, i) => (
            <text
              key={`stage-label-${i}`}
              x={60 + i * layerGap + nodeWidth / 2}
              y={20}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#64748b"
              className="uppercase tracking-wide"
            >
              {label}
            </text>
          ))}
        </g>

        {/* Links */}
        <g>
          {links.map((link, i) => (
            <g key={`link-${i}`}>
              <path
                d={getLinkPath(link)}
                fill={`url(#adv-gradient-${i})`}
                opacity={0.6}
                className="transition-opacity hover:opacity-90"
              />
            </g>
          ))}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node, i) => {
            const pos = nodePositions[i];
            if (!pos) return null;

            const isLeftAlign = node.layer === 0 || node.layer === 1;
            const isRightAlign = node.layer === 4;
            const isCenterAlign = !isLeftAlign && !isRightAlign;

            return (
              <g key={`node-${i}`}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={nodeWidth}
                  height={pos.height}
                  fill={node.color || '#6366f1'}
                  rx={6}
                  className="drop-shadow-sm"
                />
                
                {/* Node label */}
                <text
                  x={isLeftAlign ? pos.x - 10 : isRightAlign ? pos.x + nodeWidth + 10 : pos.x + nodeWidth / 2}
                  y={pos.y + pos.height / 2}
                  textAnchor={isLeftAlign ? 'end' : isRightAlign ? 'start' : 'middle'}
                  dominantBaseline="middle"
                  fontSize="11"
                  fontWeight="500"
                  fill="#334155"
                >
                  {node.name}
                </text>

                {/* Value label if provided */}
                {node.value !== undefined && (
                  <text
                    x={isLeftAlign ? pos.x - 10 : isRightAlign ? pos.x + nodeWidth + 10 : pos.x + nodeWidth / 2}
                    y={pos.y + pos.height / 2 + 14}
                    textAnchor={isLeftAlign ? 'end' : isRightAlign ? 'start' : 'middle'}
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#155DFC"
                  >
                    {node.value.toFixed(1)}%
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
