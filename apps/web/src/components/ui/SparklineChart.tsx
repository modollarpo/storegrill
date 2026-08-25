import { cn } from '@/lib/utils';

interface DataPoint {
  value: number;
  label?: string;
}

interface SparklineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  tone?: 'positive' | 'negative' | 'neutral';
  showArea?: boolean;
  className?: string;
}

function buildPath(points: Array<[number, number]>, close = false): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first[0]} ${first[1]}`;
  for (const [x, y] of rest) d += ` L ${x} ${y}`;
  if (close) {
    const last = points[points.length - 1];
    d += ` L ${last[0]} ${first[1]} L ${first[0]} ${first[1]} Z`;
  }
  return d;
}

export function SparklineChart({
  data,
  width = 120,
  height = 40,
  strokeWidth = 2,
  tone = 'positive',
  showArea = true,
  className,
}: SparklineChartProps) {
  if (data.length < 2) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = strokeWidth;

  const points: Array<[number, number]> = data.map((d, i) => [
    pad + (i / (data.length - 1)) * (width - pad * 2),
    pad + ((max - d.value) / range) * (height - pad * 2),
  ]);

  const trend = values[values.length - 1] >= values[0];

  const strokeColor =
    tone === 'neutral'
      ? 'var(--color-text-tertiary)'
      : tone === 'negative' || !trend
      ? 'var(--color-feedback-danger)'
      : 'var(--color-feedback-success)';

  const areaFill =
    tone === 'neutral'
      ? 'rgba(120,116,128,0.08)'
      : tone === 'negative' || !trend
      ? 'rgba(196,25,25,0.08)'
      : 'rgba(10,122,74,0.08)';

  const linePath = buildPath(points);
  const areaPath = buildPath(points, true);

  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      {showArea && (
        <path d={areaPath} fill={areaFill} strokeWidth={0} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastPoint[0]}
        cy={lastPoint[1]}
        r={strokeWidth + 1}
        fill={strokeColor}
      />
    </svg>
  );
}
