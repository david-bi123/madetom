"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

export type SalesChartPoint = {
  date: string;
  label: string;
  revenue: number;
  transactions: number;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: SalesChartPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-[var(--shadow-float)]">
      <p className="text-[10.5px] font-medium tracking-[0.04em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-[16px] font-semibold text-ink tabular">
        {formatMoney(point.revenue)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {point.transactions} {point.transactions === 1 ? "sale" : "sales"}
      </p>
    </div>
  );
}

export function SalesChart({ data }: { data: SalesChartPoint[] }) {
  return (
    <div
      className="h-[248px] w-full"
      role="img"
      aria-label="Daily net revenue for the last 14 days"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#146b50" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#146b50" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e6eae3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10.5, fill: "#65746b" }}
            interval="preserveStartEnd"
            minTickGap={18}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10.5, fill: "#65746b" }}
            tickFormatter={(value: number) =>
              value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value)
            }
            width={48}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#b9c9bf", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#0f5c47"
            strokeWidth={2}
            fill="url(#revenueFill)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 2, fill: "#ffffff", stroke: "#0f5c47" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
