import { cn } from "@/lib/utils";
import type { SkillAssessment } from "@shared/schema";

interface SkillRadarChartProps {
  assessments: SkillAssessment[];
}

export function SkillRadarChart({ assessments }: SkillRadarChartProps) {
  if (assessments.length === 0) return null;

  const latest = assessments[0];
  const previous = assessments.length > 1 ? assessments[1] : null;
  const latestDims = (latest.dimensions as Array<{ name: string; score: number }>) || [];
  const previousDims = previous ? (previous.dimensions as Array<{ name: string; score: number }>) || [] : null;

  if (latestDims.length === 0) return null;

  const size = 280;
  const center = size / 2;
  const maxRadius = 110;
  const levels = 5;

  const angleStep = (2 * Math.PI) / latestDims.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = startAngle + index * angleStep;
    const radius = (value / 10) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const getPolygonPoints = (dims: Array<{ name: string; score: number }>) => {
    return dims.map((d, i) => {
      const pt = getPoint(i, d.score);
      return `${pt.x},${pt.y}`;
    }).join(" ");
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px]">
        {Array.from({ length: levels }, (_, i) => {
          const r = ((i + 1) / levels) * maxRadius;
          const points = latestDims.map((_, j) => {
            const angle = startAngle + j * angleStep;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(" ");
          return (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-border"
            />
          );
        })}

        {latestDims.map((_, i) => {
          const pt = getPoint(i, 10);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={pt.x}
              y2={pt.y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-border"
            />
          );
        })}

        {previousDims && (
          <polygon
            points={getPolygonPoints(previousDims)}
            fill="hsl(var(--muted-foreground) / 0.1)"
            stroke="hsl(var(--muted-foreground) / 0.4)"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}

        <polygon
          points={getPolygonPoints(latestDims)}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {latestDims.map((d, i) => {
          const pt = getPoint(i, d.score);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3"
              fill="hsl(var(--primary))"
            />
          );
        })}

        {latestDims.map((d, i) => {
          const angle = startAngle + i * angleStep;
          const labelRadius = maxRadius + 20;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          const textAnchor = Math.abs(Math.cos(angle)) < 0.01 ? "middle" :
            Math.cos(angle) > 0 ? "start" : "end";

          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="fill-foreground text-[9px]"
            >
              {d.name}
            </text>
          );
        })}
      </svg>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-primary" />
          <span>Latest</span>
        </div>
        {previousDims && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-muted-foreground/40 border-dashed" style={{ borderTop: "1px dashed" }} />
            <span>Previous</span>
          </div>
        )}
      </div>
    </div>
  );
}
