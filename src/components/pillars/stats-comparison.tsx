"use client";

function pctChange(current: number, previous: number): string | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return "+100%";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(0)}%`;
}

interface MonthComparisonProps {
  current: {
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    avgEngagement: number;
  };
  previous: {
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    avgEngagement: number;
  };
  monthLabel: string;
}

export function MonthComparison({ current, previous, monthLabel }: MonthComparisonProps) {
  const stats = [
    { label: "Alcance", value: current.totalReach, prev: previous.totalReach },
    { label: "Likes", value: current.totalLikes, prev: previous.totalLikes },
    { label: "Comentarios", value: current.totalComments, prev: previous.totalComments },
    { label: "Engagement prom.", value: current.avgEngagement, prev: previous.avgEngagement },
  ];

  return (
    <section className="home-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">Comparación mensual</h2>
        <span className="text-xs text-muted capitalize">{monthLabel} vs mes anterior</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const change = pctChange(stat.value, stat.prev);
          const isUp = change?.startsWith("+");

          return (
            <div key={stat.label} className="rounded-lg bg-neutral-50 p-3">
              <p className="text-[10px] text-muted uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-xl font-semibold tabular-nums mt-1">
                {stat.value.toLocaleString()}
              </p>
              {change && (
                <p
                  className={`text-[10px] font-medium mt-0.5 ${
                    isUp ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {change} vs anterior
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface FormatBreakdownProps {
  breakdown: { format: string; count: number; avgEngagement: number }[];
}

const FORMAT_NAMES: Record<string, string> = {
  image: "Imagen",
  carousel: "Carrusel",
  video_carousel: "Video carrusel",
  feed: "Feed",
  reel: "Reel",
  story: "Story",
};

export function FormatBreakdown({ breakdown }: FormatBreakdownProps) {
  if (breakdown.length === 0) return null;

  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  return (
    <section className="home-card p-5">
      <h2 className="text-sm font-medium mb-4">Rendimiento por formato</h2>
      <div className="space-y-3">
        {breakdown.map((item) => (
          <div key={item.format} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>{FORMAT_NAMES[item.format] || item.format}</span>
              <span className="text-muted tabular-nums">
                {item.count} post{item.count !== 1 ? "s" : ""}
                {item.avgEngagement > 0 && (
                  <> · {item.avgEngagement} eng. prom.</>
                )}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/70 transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
