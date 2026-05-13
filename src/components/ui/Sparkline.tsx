/**
 * Sparkline — Tiny inline bar chart for stat cards.
 * Renders a mini bar chart from an array of values.
 */

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = "#22c55e",
  height = 32,
  className = "",
}: SparklineProps) {
  const max = Math.max(...data, 1);

  return (
    <div className={`sparkline-container ${className}`} style={{ height }}>
      {data.map((value, i) => (
        <div
          key={i}
          className="sparkline-bar"
          style={{
            height: `${(value / max) * 100}%`,
            backgroundColor: color,
            opacity: 0.3 + (i / data.length) * 0.7,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}
