/**
 * MiniDonutChart — Pure SVG donut chart for E/S/G pillar distribution.
 * No dependencies. Renders 3-segment donut with labels.
 */

type Segment = {
  label: string;
  value: number;
  color: string;
};

interface MiniDonutChartProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function MiniDonutChart({
  segments,
  size = 160,
  strokeWidth = 24,
  className = "",
}: MiniDonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          <text x={center} y={center} textAnchor="middle" dominantBaseline="central" className="text-[13px] font-bold fill-gray-400">
            No Data
          </text>
        </svg>
      </div>
    );
  }

  let accumulatedOffset = 0;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {segments.map((segment) => {
            const segmentLength = (segment.value / total) * circumference;
            const gap = total > 0 && segments.filter(s => s.value > 0).length > 1 ? 4 : 0;
            const dashArray = `${Math.max(0, segmentLength - gap)} ${circumference - segmentLength + gap}`;
            const offset = accumulatedOffset;
            accumulatedOffset += segmentLength;

            return (
              <circle
                key={segment.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
                style={{ opacity: segment.value > 0 ? 1 : 0 }}
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-bold text-text-primary leading-none animate-counter-pop">{total}</span>
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1">Metrics</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-[11px] font-medium text-text-secondary">
              {segment.label} <span className="font-bold text-text-primary">{segment.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
