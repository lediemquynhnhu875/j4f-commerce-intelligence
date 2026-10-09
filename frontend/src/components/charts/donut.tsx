"use client";
export function Donut({
  total,
  label,
  segments,
}: {
  total: number;
  label: string;
  segments: { value: number; color: string }[];
}) {
  return (
    <div className="donut">
      <svg
        viewBox="0 0 180 180"
        role="img"
        aria-label={`${label}: ${total}. ${segments.map((s) => s.value).join(" / ")}`}
      >
        <defs>
          <linearGradient id="donut-gradient">
            <stop stopColor="#f43f5e" />
            <stop offset=".35" stopColor="#d946ef" />
            <stop offset=".7" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle
          cx="90"
          cy="90"
          r="70"
          stroke="#f1ebff"
          strokeWidth="19"
          fill="none"
        />
        {segments.map((s, i) => {
          const start =
            (segments
              .slice(0, i)
              .reduce((sum, segment) => sum + segment.value, 0) /
              total) *
            100;
          return (
            <circle
              key={i}
              cx="90"
              cy="90"
              r="70"
              pathLength="100"
              fill="none"
              stroke={s.color}
              strokeWidth="19"
              strokeDasharray={`${(s.value / total) * 100} ${100 - (s.value / total) * 100}`}
              strokeDashoffset={-start}
              transform="rotate(-90 90 90)"
            />
          );
        })}
      </svg>
      <div>
        <strong>{total}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
