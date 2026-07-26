"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Trade = {
  id: number;
  pnl?: number;
  date?: string;
};

export default function EquityCurve({
  trades,
}: {
  trades: Trade[];
}) {
  let equity = 0;

  const data = trades
    .slice()
    .reverse()
    .map((trade, index) => {
      equity += Number(trade.pnl || 0);

      return {
        trade: index + 1,
        equity,
      };
    });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-6 text-xl font-bold">
        Equity Curve
      </h2>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#1e293b" />

            <XAxis dataKey="trade" />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="equity"
              stroke="#facc15"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}