interface SimpleSankeyDiagramProps {
  width?: number;
  height?: number;
}

export function SimpleSankeyDiagram({ 
  width = 1200,
  height = 600
}: SimpleSankeyDiagramProps) {
  
  // Data Mobile Banking Analytics - User Journey
  const stages = [
    { 
      name: 'App Login', 
      value: 100, 
      percentage: '100%', 
      color: '#155DFC', 
      type: 'success' as const 
    },
    { 
      nodes: [
        { name: 'Active Session', value: 85, percentage: '85%', color: '#155DFC', type: 'success' as const },
        { name: 'Early Exit', value: 15, percentage: '15%', color: '#94a3b8', type: 'dropoff' as const }
      ]
    },
    { 
      nodes: [
        { name: 'Transfer', value: 28.5, percentage: '28.5%', color: '#00A63E', type: 'success' as const },
        { name: 'Payment', value: 22.3, percentage: '22.3%', color: '#00A63E', type: 'success' as const },
        { name: 'Check Balance', value: 18.7, percentage: '18.7%', color: '#64748b', type: 'success' as const },
        { name: 'Investment', value: 8.5, percentage: '8.5%', color: '#FDC700', type: 'success' as const },
        { name: 'AI Features', value: 7, percentage: '7%', color: '#8B5CF6', type: 'success' as const }
      ]
    },
    { 
      nodes: [
        { name: 'Transfer Success', value: 26.8, percentage: '26.8%', color: '#00A63E', type: 'success' as const },
        { name: 'Payment Success', value: 20.5, percentage: '20.5%', color: '#00A63E', type: 'success' as const },
        { name: 'Hyperpersonalized', value: 3.2, percentage: '3.2%', color: '#155DFC', type: 'success' as const },
        { name: 'Auto Reminder', value: 1.8, percentage: '1.8%', color: '#8B5CF6', type: 'success' as const },
        { name: 'Upselling', value: 1.2, percentage: '1.2%', color: '#C10007', type: 'success' as const },
        { name: 'Cross-Selling', value: 0.8, percentage: '0.8%', color: '#FB923C', type: 'success' as const },
        { name: 'Drop-off', value: 30.7, percentage: '30.7%', color: '#94a3b8', type: 'dropoff' as const }
      ]
    },
    { 
      nodes: [
        { name: 'Completed Txn', value: 47.3, percentage: '47.3%', color: '#00A63E', type: 'success' as const },
        { name: 'AI Converted', value: 4.5, percentage: '4.5%', color: '#8B5CF6', type: 'success' as const },
        { name: 'Abandoned', value: 33.2, percentage: '33.2%', color: '#94a3b8', type: 'dropoff' as const }
      ]
    }
  ];

  const stageGap = 200;
  const startX = 50;
  const barWidth = 50;
  const maxHeight = height - 120;
  const startY = 70;

  return (
    <div className="w-full overflow-x-auto bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
        <defs>
          {/* Gradients for different colors */}
          <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#155DFC" stopOpacity={1} />
            <stop offset="100%" stopColor="#0D4AD9" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00A63E" stopOpacity={1} />
            <stop offset="100%" stopColor="#008A33" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDC700" stopOpacity={1} />
            <stop offset="100%" stopColor="#E0B000" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C10007" stopOpacity={1} />
            <stop offset="100%" stopColor="#A00006" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" stopOpacity={1} />
            <stop offset="100%" stopColor="#F97316" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="dropoffGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity={1} />
            <stop offset="100%" stopColor="#64748b" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="neutralGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" stopOpacity={1} />
            <stop offset="100%" stopColor="#475569" stopOpacity={1} />
          </linearGradient>
        </defs>

        {/* Stage labels at the top */}
        <g>
          {['Login', 'Session', 'Activities', 'Interactions', 'Outcomes'].map((label, i) => (
            <text
              key={`stage-${i}`}
              x={startX + i * stageGap + barWidth / 2}
              y={30}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill="#1e293b"
              className="uppercase tracking-wide"
            >
              {label}
            </text>
          ))}
        </g>

        {/* Render all stages */}
        {stages.map((stage, stageIndex) => {
          const x = startX + stageIndex * stageGap;
          
          // Single node stage (Login)
          if ('name' in stage) {
            const barHeight = (stage.value / 100) * maxHeight;
            const y = startY + (maxHeight - barHeight);
            
            return (
              <g key={stageIndex}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#primaryGradient)"
                  rx={6}
                  className="drop-shadow-md"
                />
                
                {/* Label */}
                <g>
                  <rect
                    x={x + barWidth + 12}
                    y={y + barHeight / 2 - 20}
                    width={100}
                    height={40}
                    fill="white"
                    stroke="#cbd5e1"
                    strokeWidth={1.5}
                    rx={6}
                    className="drop-shadow-sm"
                  />
                  <text
                    x={x + barWidth + 20}
                    y={y + barHeight / 2 - 5}
                    fontSize="12"
                    fontWeight="700"
                    fill="#1e293b"
                  >
                    {stage.name}
                  </text>
                  <text
                    x={x + barWidth + 20}
                    y={y + barHeight / 2 + 10}
                    fontSize="11"
                    fontWeight="600"
                    fill="#155DFC"
                  >
                    {stage.percentage}
                  </text>
                </g>

                {/* Connection line to next stage */}
                {stageIndex < stages.length - 1 && (
                  <path
                    d={`M ${x + barWidth} ${y + barHeight / 2} 
                        L ${x + stageGap} ${startY + maxHeight / 2}`}
                    stroke="#155DFC"
                    strokeWidth={3}
                    fill="none"
                    opacity={0.2}
                  />
                )}
              </g>
            );
          }
          
          // Multiple nodes stage
          const nodes = stage.nodes;
          let currentY = startY;
          
          return (
            <g key={stageIndex}>
              {nodes.map((node, nodeIndex) => {
                const barHeight = (node.value / 100) * maxHeight;
                const y = currentY;
                currentY += barHeight + 8;
                
                const isSuccess = node.type === 'success';
                
                // Determine gradient based on node name/color
                let gradient = 'url(#primaryGradient)';
                if (node.color === '#00A63E') gradient = 'url(#successGradient)';
                else if (node.color === '#8B5CF6') gradient = 'url(#purpleGradient)';
                else if (node.color === '#FDC700') gradient = 'url(#yellowGradient)';
                else if (node.color === '#C10007') gradient = 'url(#redGradient)';
                else if (node.color === '#FB923C') gradient = 'url(#orangeGradient)';
                else if (node.color === '#64748b') gradient = 'url(#neutralGradient)';
                else if (node.type === 'dropoff') gradient = 'url(#dropoffGradient)';
                
                return (
                  <g key={nodeIndex}>
                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 4)}
                      fill={gradient}
                      rx={6}
                      className="drop-shadow-md transition-all hover:opacity-90"
                    />
                    
                    {/* Label - only show if bar is tall enough */}
                    {barHeight > 15 && (
                      <g>
                        <rect
                          x={x + barWidth + 12}
                          y={y + barHeight / 2 - 18}
                          width={node.name.length > 14 ? 115 : 105}
                          height={36}
                          fill="white"
                          stroke={node.type === 'dropoff' ? '#cbd5e1' : node.color}
                          strokeWidth={1.5}
                          rx={6}
                          className="drop-shadow-sm"
                        />
                        <text
                          x={x + barWidth + 20}
                          y={y + barHeight / 2 - 3}
                          fontSize="11"
                          fontWeight="700"
                          fill="#1e293b"
                        >
                          {node.name}
                        </text>
                        <text
                          x={x + barWidth + 20}
                          y={y + barHeight / 2 + 11}
                          fontSize="10"
                          fontWeight="600"
                          fill={node.color}
                        >
                          {node.percentage}
                        </text>
                      </g>
                    )}

                    {/* Connection lines */}
                    {stageIndex < stages.length - 1 && isSuccess && barHeight > 10 && (
                      <path
                        d={`M ${x + barWidth} ${y + barHeight / 2} 
                            C ${x + barWidth + 60} ${y + barHeight / 2}, 
                              ${x + stageGap - 60} ${startY + maxHeight / 3}, 
                              ${x + stageGap} ${startY + maxHeight / 3}`}
                        stroke={node.color}
                        strokeWidth={Math.max(1.5, barHeight / 15)}
                        fill="none"
                        opacity={0.15}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Legend at bottom */}
        <g transform={`translate(${width / 2 - 200}, ${height - 30})`}>
          <text x={0} y={0} fontSize="11" fontWeight="600" fill="#64748b">Legend:</text>
          
          <rect x={50} y={-8} width={16} height={16} fill="url(#successGradient)" rx={3} />
          <text x={72} y={3} fontSize="10" fill="#475569">Banking Activities</text>
          
          <rect x={180} y={-8} width={16} height={16} fill="url(#purpleGradient)" rx={3} />
          <text x={202} y={3} fontSize="10" fill="#475569">AI Features</text>
          
          <rect x={290} y={-8} width={16} height={16} fill="url(#dropoffGradient)" rx={3} />
          <text x={312} y={3} fontSize="10" fill="#475569">Drop-off</text>
        </g>
      </svg>
    </div>
  );
}
