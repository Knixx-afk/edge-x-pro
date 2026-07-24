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

type Trade = {
  id: number;
  date?: string;
  time?: string;
  pnl?: number;
};

type Props = {
  trades: Trade[];
};

export default function EquityChart({ trades }: Props) {
  let cumulativePnL = 0;

  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = `${a.date || ""} ${a.time || ""}`;
    const dateB = `${b.date || ""} ${b.time || ""}`;

    return dateA.localeCompare(dateB);
  });

  const chartData = sortedTrades.map((trade, index) => {
    cumulativePnL += Number(trade.pnl || 0);

    return {
      trade: index + 1,
      pnl: Number(cumulativePnL.toFixed(2)),
      date: trade.date || "",
    };
  });

  const data = [
    {
      trade: 0,
      pnl: 0,
      date: "Start",
    },
    ...chartData,
  ];

  if (trades.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-slate-500">
        Add trades to generate your equity curve.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            left: 0,
            bottom: 10,
          }}
        >
          <defs>
            <linearGradient
              id="equityGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor="#facc15"
                stopOpacity={0.35}
              />

              <stop
                offset="95%"
                stopColor="#facc15"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
            vertical={false}
          />

          <XAxis
            dataKey="trade"
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "10px",
            }}
            labelStyle={{
              color: "#94a3b8",
            }}
            formatter={(value) => [
              `$${Number(value).toFixed(2)}`,
              "Cumulative P&L",
            ]}
            labelFormatter={(tradeNumber) =>
              tradeNumber === 0
                ? "Starting Point"
                : `Trade #${tradeNumber}`
            }
          />

          <Area
            type="monotone"
            dataKey="pnl"
            stroke="#facc15"
            strokeWidth={3}
            fill="url(#equityGradient)"
            activeDot={{
              r: 6,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}