"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui";
import { quantity } from "@/lib/analysis-presentation";
import type { AnalysisPoint } from "@/types/api";
import "./analysis-timeline.css";

const timeZone = "Asia/Ho_Chi_Minh";
export const analysisTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone,
});
const shortTime = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone,
});

const dayMs = 86_400_000;
const calendarDate = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone,
});
const yearsAndDays = new Intl.DateTimeFormat("vi-VN", {
  year: "numeric",
  day: "2-digit",
  month: "2-digit",
  timeZone,
});

function todayInVietnam() {
  const parts = Object.fromEntries(
    calendarDate
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dayStart(date: string) {
  return Date.parse(`${date}T00:00:00+07:00`);
}

export function useAnalysisDateRange() {
  const [today, setToday] = useState(todayInVietnam);
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  useEffect(() => {
    const updateToday = () => setToday(todayInVietnam());
    const timer = window.setInterval(updateToday, 60_000);
    window.addEventListener("focus", updateToday);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateToday);
    };
  }, []);

  const year = Number(today.slice(0, 4));
  const june = `${year}-06-01`;
  const earliest = today < june ? `${year - 1}-06-01` : june;
  const from = custom.from && custom.from >= earliest ? custom.from : earliest;
  const to =
    custom.to && custom.to >= from && custom.to <= today ? custom.to : today;
  const start = dayStart(from);
  const end = dayStart(to) + dayMs;

  function changeFrom(value: string) {
    const next =
      value && value >= earliest ? (value > to ? to : value) : earliest;
    setCustom((current) => ({ ...current, from: next }));
  }

  function changeTo(value: string) {
    const next =
      value && value < today ? (value < from ? from : value) : undefined;
    setCustom((current) => ({ ...current, to: next }));
  }

  return {
    from,
    to,
    earliest,
    today,
    start,
    end,
    changeFrom,
    changeTo,
    reset: () => setCustom({}),
  };
}

type AnalysisDateRange = ReturnType<typeof useAnalysisDateRange>;

function SalesChart({
  versions,
  start,
  end,
  currentId,
  onSelect,
}: {
  versions: AnalysisPoint[];
  start: number;
  end: number;
  currentId?: string;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const measure = () => setAvailableWidth(container.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    return () => observer.disconnect();
  }, []);

  const chronological = [...versions].reverse();
  const singleDay = end - start === dayMs;
  const tickFormat = singleDay ? shortTime : yearsAndDays;
  const last = end - 1;
  const xRatio = (time: number) => (time - start) / (last - start);
  const sales = chronological.map((row) => {
    const value = row.quantity_sold;
    if (
      (typeof value !== "number" && typeof value !== "string") ||
      value === ""
    )
      return null;
    const sold = Number(value);
    return Number.isFinite(sold) && sold >= 0 ? sold : null;
  });
  const hasSales = sales.some((value) => value !== null);
  const hasMissingSales = sales.includes(null);
  const maximum = Math.max(1, ...sales.filter((value) => value !== null));
  const left = Math.max(60, 38 + quantity(maximum).length * 7);
  const width = Math.max(280, availableWidth, left + 168, chronological.length * 32);
  const right = width - 16;
  const top = 24;
  const bottom = 176;
  const missingY = 203;
  const datesY = hasMissingSales ? 230 : 202;
  const height = datesY + 39;
  const points = chronological.map((version, index) => {
    const time = Date.parse(version.analyzed_at);
    const sold = sales[index];
    return {
      version,
      x: left + (right - left) * xRatio(time),
      y: sold === null ? null : bottom - ((bottom - top) * sold) / maximum,
    };
  });
  let line = "";
  let lastKnown = false;
  for (const point of points) {
    if (point.y !== null)
      line += `${lastKnown ? "L" : "M"} ${point.x} ${point.y} `;
    lastKnown = point.y !== null;
  }
  const yValues = hasSales
    ? maximum <= 4 && Number.isInteger(maximum)
      ? Array.from({ length: maximum + 1 }, (_, value) => value)
      : [...new Set([0, Math.floor(maximum / 2), maximum])]
    : [];
  const numberOfDays = (end - start) / dayMs;
  const tickCapacity = Math.min(5, Math.floor((right - left) / 100) + 1);
  const tickCount = singleDay ? tickCapacity : Math.min(tickCapacity, numberOfDays);
  const tickTimes = Array.from({ length: tickCount }, (_, index) => {
    const fraction = index / (tickCount - 1);
    if (singleDay) return start + (last - start) * fraction;
    return start + Math.round((numberOfDays - 1) * fraction) * dayMs;
  });
  return (
    <div ref={scrollRef} className="analysis-timeline-chart-scroll">
      <div className="analysis-timeline-plot" style={{ width, height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Biểu đồ số lượng bán ra theo thời điểm phân tích"
        >
          {yValues.map((value) => {
            const y = bottom - ((bottom - top) * value) / maximum;
            return (
              <g key={value}>
                <line x1={left} x2={right} y1={y} y2={y} />
                <text x={left - 12} y={y + 4} textAnchor="end">
                  {quantity(value)}
                </text>
              </g>
            );
          })}
          <text
            className="analysis-timeline-axis-title"
            x={18}
            y={(top + bottom) / 2}
            transform={`rotate(-90 18 ${(top + bottom) / 2})`}
            textAnchor="middle"
          >
            Số lượng bán ra
          </text>
          <text
            className="analysis-timeline-axis-title"
            x={(left + right) / 2}
            y={height - 10}
            textAnchor="middle"
          >
            Thời gian
          </text>
          {hasMissingSales && (
            <line
              className="analysis-timeline-missing-line"
              x1={left}
              x2={right}
              y1={missingY}
              y2={missingY}
            />
          )}
          {tickTimes.map((time, index) => (
            <text
              key={time}
              x={
                index === tickTimes.length - 1
                  ? right
                  : left + (right - left) * xRatio(time)
              }
              y={datesY}
              textAnchor={
                index === 0
                  ? "start"
                  : index === tickTimes.length - 1
                    ? "end"
                    : "middle"
              }
            >
              {tickFormat.format(time)}
            </text>
          ))}
          <path d={line} vectorEffect="non-scaling-stroke" />
        </svg>
        {points.map(({ version, x, y }) => {
          const date = analysisTime.format(new Date(version.analyzed_at));
          const salesLabel =
            y === null
              ? "chưa có số bán"
              : `${quantity(version.quantity_sold)} đã bán`;
          return (
            <button
              key={version.id}
              type="button"
              className="analysis-timeline-point"
              data-missing-sales={y === null ? "true" : undefined}
              style={{ left: x, top: y ?? missingY }}
              aria-pressed={version.id === currentId}
              aria-label={`Xem mốc ${date}, ${salesLabel}`}
              title={`${date} · ${salesLabel}`}
              onClick={() => onSelect(version.id)}
            />
          );
        })}
      </div>
      {hasMissingSales && (
        <p className="analysis-timeline-missing-note">
          Điểm hình thoi là mốc chưa có số bán.
        </p>
      )}
    </div>
  );
}

export function AnalysisTimeline({
  rows,
  range,
  currentId,
  onSelect,
  onRangeChange,
}: {
  rows: AnalysisPoint[];
  range: AnalysisDateRange;
  currentId?: string;
  onSelect: (id: string) => void;
  onRangeChange: () => void;
}) {
  return (
    <Panel
      title="Số lượng bán ra theo thời gian"
      subtitle="Số bán ghi nhận tại từng lần phân tích đã lưu · Giờ Việt Nam"
    >
      <div className="analysis-timeline-range">
        <label>
          Từ ngày
          <input
            type="date"
            min={range.earliest}
            max={range.to}
            value={range.from}
            onChange={(event) => {
              range.changeFrom(event.currentTarget.value);
              onRangeChange();
            }}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            min={range.from}
            max={range.today}
            value={range.to}
            onChange={(event) => {
              range.changeTo(event.currentTarget.value);
              onRangeChange();
            }}
          />
        </label>
        <button
          type="button"
          className="button subtle small"
          disabled={range.from === range.earliest && range.to === range.today}
          onClick={() => {
            range.reset();
            onRangeChange();
          }}
        >
          Đặt lại
        </button>
      </div>
      {rows.length > 0 && (
        <>
          <strong>{rows.length} mốc phân tích</strong>
          <SalesChart
            versions={rows}
            start={range.start}
            end={range.end}
            currentId={currentId}
            onSelect={onSelect}
          />
          <p className="analysis-timeline-hint">
            {rows.length === 1
              ? "Khoảng ngày này có một mốc phân tích."
              : "Chọn một điểm để xem bằng chứng của lần phân tích đó bên dưới."}
          </p>
        </>
      )}
    </Panel>
  );
}
