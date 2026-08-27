import React from 'react';

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface AnalyticsChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  color?: 'cyan' | 'indigo' | 'emerald' | 'purple' | 'amber';
  type?: 'bar' | 'area' | 'line';
  maxValue?: number;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  data,
  title,
  height = 180,
  color = 'cyan',
  type = 'area',
  maxValue,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm border border-dashed border-slate-700 rounded-lg">
        No telemetry data available
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const max = maxValue || Math.max(...values, 100);
  const min = 0;

  const colorMap = {
    cyan: { stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.15)', bar: 'bg-cyan-500' },
    indigo: { stroke: '#818cf8', fill: 'rgba(129, 140, 248, 0.15)', bar: 'bg-indigo-500' },
    emerald: { stroke: '#34d399', fill: 'rgba(52, 211, 153, 0.15)', bar: 'bg-emerald-500' },
    purple: { stroke: '#c084fc', fill: 'rgba(192, 132, 252, 0.15)', bar: 'bg-purple-500' },
    amber: { stroke: '#fbbf24', fill: 'rgba(251, 191, 36, 0.15)', bar: 'bg-amber-500' },
  };

  const palette = colorMap[color];

  // SVG dimensions
  const svgWidth = 500;
  const svgHeight = height;
  const padding = 25;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * graphWidth;
    const y = svgHeight - padding - ((d.value - min) / (max - min || 1)) * graphHeight;
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points.reduce((acc, point, index) => {
    return `${acc} ${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-lg">
      {title && (
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h4>
          <span className="text-[11px] text-slate-400 font-mono">Telemetry Peak: {max}</span>
        </div>
      )}

      {type === 'bar' ? (
        <div className="flex items-end justify-between gap-2 pt-2" style={{ height: `${height}px` }}>
          {data.map((item, idx) => {
            const heightPercent = Math.min(100, Math.max(8, (item.value / max) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  {item.value}
                </div>
                <div
                  className={`w-full ${palette.bar} rounded-t-md transition-all duration-300 group-hover:brightness-125`}
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative w-full">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            {/* Grid lines */}
            <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" />
            <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#334155" strokeDasharray="3 3" />
            <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#475569" />

            {/* Area Fill */}
            {type === 'area' && <path d={areaD} fill={palette.fill} />}

            {/* Line */}
            <path d={pathD} fill="none" stroke={palette.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Points */}
            {points.map((p, i) => (
              <g key={i} className="group cursor-pointer">
                <circle cx={p.x} cy={p.y} r="4" fill={palette.stroke} className="transition-transform group-hover:scale-150" />
                <title>{`${p.label}: ${p.value}`}</title>
              </g>
            ))}
          </svg>

          {/* Labels */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mt-2 px-1">
            {data.map((item, idx) => (
              <span key={idx}>{item.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
