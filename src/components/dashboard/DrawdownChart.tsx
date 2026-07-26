"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Trade = {
  pnl?: number;
};

export default function DrawdownChart({
  trades,
}: {
  trades: Trade[];
}) {
  let equity = 0;
  let peak = 0;

  const data = trades
    .slice()
    .reverse()
    .map((trade, index) => {
      equity += Number(trade.pnl || 0);

      if (equity > peak) {
        peak = equity;
      }

      return {
        trade: index + 1,
        drawdown: -(peak - equity),
      };
    });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-6 text-xl font-bold">
        Drawdown
      </h2>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="#1e293b" />

            <XAxis dataKey="trade" />

            <YAxis />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#ef4444"
              fill="#ef4444"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}