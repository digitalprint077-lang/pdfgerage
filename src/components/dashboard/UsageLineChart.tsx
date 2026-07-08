interface ChartPoint {
  label: string;
  total: number;
}

interface UsageLineChartProps {
  points: ChartPoint[];
  height?: number;
}

export default function UsageLineChart({ points, height = 220 }: UsageLineChartProps) {
  const width = 800;
  const pad = { top: 16, right: 16, bottom: 32, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = points.length ? points.map((p) => p.total) : [0];
  const maxVal = Math.max(1, ...values);

  const coords =
    points.length > 1
      ? points.map((p, i) => {
          const x = pad.left + (i / (points.length - 1)) * innerW;
          const y = pad.top + innerH - (p.total / maxVal) * innerH;
          return { x, y, p };
        })
      : points.length === 1
        ? [{ x: pad.left + innerW / 2, y: pad.top + innerH - (points[0].total / maxVal) * innerH, p: points[0] }]
        : [];

  const linePath =
    coords.length > 0
      ? coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ")
      : "";

  const yTicks = [0, maxVal / 2, maxVal].map((v) => Math.round(v * 10) / 10);
  const xLabelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Usage chart">
      {yTicks.map((tick) => {
        const y = pad.top + innerH - (tick / maxVal) * innerH;
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgb(var(--border))" strokeWidth="1" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-[rgb(var(--muted))] text-[10px]">
              {tick}
            </text>
          </g>
        );
      })}
      {linePath ? (
        <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#22c55e" />
      ))}
      {coords.map((c, i) =>
        i % xLabelStep === 0 || i === coords.length - 1 ? (
          <text
            key={`lbl-${i}`}
            x={c.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-[rgb(var(--muted))] text-[9px]"
          >
            {formatBucketLabel(c.p.label)}
          </text>
        ) : null
      )}
    </svg>
  );
}

function formatBucketLabel(label: string) {
  if (label.includes(" ")) {
    const [, time] = label.split(" ");
    if (time) {
      const hour = parseInt(time.split(":")[0], 10);
      const h12 = hour % 12 || 12;
      const ampm = hour >= 12 ? "PM" : "AM";
      return `${h12}:00 ${ampm}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const d = new Date(label + "T12:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return label;
}
