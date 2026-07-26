"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Trade = {
  date?: string;
  pnl?: number;
};

export default function MonthlyPerformance({
  trades,
}: {
  trades: Trade[];
}) {
  const map: Record<string, number> = {};

  trades.forEach((trade) => {
    if (!trade.date) return;

    const month = trade.date.slice(0, 7);

    map[month] =
      (map[month] || 0) + Number(trade.pnl || 0);
  });

  const data = Object.entries(map).map(
    ([month, pnl]) => ({
      month,
      pnl,
    })
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-6 text-xl font-bold">
        Monthly Performance
      </h2>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#1e293b" />

            <XAxis dataKey="month" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="pnl"
              fill="#facc15"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}