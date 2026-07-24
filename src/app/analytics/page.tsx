"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Trade = {
  id: number;
  date?: string;
  time?: string;
  symbol?: string;
  direction?: string;
  pnl?: number;
  risk?: number;
  session?: string;
  strategy?: string;
  ruleFollowed?: string;
};

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    try {
      const savedTrades = localStorage.getItem("edge-x-trades");

      if (savedTrades) {
        const parsedTrades = JSON.parse(savedTrades);

        if (Array.isArray(parsedTrades)) {
          setTrades(parsedTrades);
        }
      }
    } catch (error) {
      console.error("Failed to load trades:", error);
    }
  }, []);

  const analytics = useMemo(() => {
    const wins = trades.filter(
      (trade) => Number(trade.pnl || 0) > 0
    );

    const losses = trades.filter(
      (trade) => Number(trade.pnl || 0) < 0
    );

    const breakeven = trades.filter(
      (trade) => Number(trade.pnl || 0) === 0
    );

    const totalPnL = trades.reduce(
      (total, trade) => total + Number(trade.pnl || 0),
      0
    );

    const grossProfit = wins.reduce(
      (total, trade) => total + Number(trade.pnl || 0),
      0
    );

    const grossLoss = Math.abs(
      losses.reduce(
        (total, trade) => total + Number(trade.pnl || 0),
        0
      )
    );

    const averageWin =
      wins.length > 0
        ? grossProfit / wins.length
        : 0;

    const averageLoss =
      losses.length > 0
        ? grossLoss / losses.length
        : 0;

    const winRate =
      trades.length > 0
        ? (wins.length / trades.length) * 100
        : 0;

    const lossRate =
      trades.length > 0
        ? (losses.length / trades.length) * 100
        : 0;

    const expectancy =
      (winRate / 100) * averageWin -
      (lossRate / 100) * averageLoss;

    const profitFactor =
      grossLoss > 0
        ? grossProfit / grossLoss
        : grossProfit > 0
        ? Infinity
        : 0;

    let runningPnL = 0;
    let peak = 0;
    let maxDrawdown = 0;

    trades
      .slice()
      .reverse()
      .forEach((trade) => {
        runningPnL += Number(trade.pnl || 0);

        if (runningPnL > peak) {
          peak = runningPnL;
        }

        const drawdown = peak - runningPnL;

        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      });

    const sessionMap: Record<
      string,
      { trades: number; pnl: number }
    > = {};

    trades.forEach((trade) => {
      const session = trade.session || "Unknown";

      if (!sessionMap[session]) {
        sessionMap[session] = {
          trades: 0,
          pnl: 0,
        };
      }

      sessionMap[session].trades += 1;
      sessionMap[session].pnl += Number(trade.pnl || 0);
    });

    const sessionData = Object.entries(sessionMap).map(
      ([name, data]) => ({
        name,
        trades: data.trades,
        pnl: Number(data.pnl.toFixed(2)),
      })
    );

    const strategyMap: Record<
      string,
      {
        trades: number;
        wins: number;
        pnl: number;
      }
    > = {};

    trades.forEach((trade) => {
      const strategy =
        trade.strategy?.trim() || "No Strategy";

      if (!strategyMap[strategy]) {
        strategyMap[strategy] = {
          trades: 0,
          wins: 0,
          pnl: 0,
        };
      }

      strategyMap[strategy].trades += 1;

      if (Number(trade.pnl || 0) > 0) {
        strategyMap[strategy].wins += 1;
      }

      strategyMap[strategy].pnl += Number(trade.pnl || 0);
    });

    const strategyData = Object.entries(strategyMap)
      .map(([name, data]) => ({
        name,
        trades: data.trades,
        winRate:
          data.trades > 0
            ? (data.wins / data.trades) * 100
            : 0,
        pnl: data.pnl,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const bestTrade =
      trades.length > 0
        ? Math.max(
            ...trades.map((trade) =>
              Number(trade.pnl || 0)
            )
          )
        : 0;

    const worstTrade =
      trades.length > 0
        ? Math.min(
            ...trades.map((trade) =>
              Number(trade.pnl || 0)
            )
          )
        : 0;

    return {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      breakeven: breakeven.length,
      totalPnL,
      grossProfit,
      grossLoss,
      averageWin,
      averageLoss,
      winRate,
      expectancy,
      profitFactor,
      maxDrawdown,
      bestTrade,
      worstTrade,
      sessionData,
      strategyData,
    };
  }, [trades]);

  const winLossData = [
    {
      name: "Wins",
      value: analytics.wins,
      fill: "#10b981",
    },
    {
      name: "Losses",
      value: analytics.losses,
      fill: "#ef4444",
    },
    {
      name: "Breakeven",
      value: analytics.breakeven,
      fill: "#64748b",
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Analytics
          </h1>

          <p className="mt-2 text-slate-400">
            Deep analysis of your trading performance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Trades"
            value={String(analytics.totalTrades)}
          />

          <MetricCard
            title="Win Rate"
            value={`${analytics.winRate.toFixed(1)}%`}
            valueClass="text-emerald-400"
          />

          <MetricCard
            title="Net P&L"
            value={formatMoney(analytics.totalPnL)}
            valueClass={
              analytics.totalPnL >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }
          />

          <MetricCard
            title="Profit Factor"
            value={
              analytics.profitFactor === Infinity
                ? "∞"
                : analytics.profitFactor.toFixed(2)
            }
            valueClass="text-yellow-400"
          />

          <MetricCard
            title="Average Win"
            value={formatMoney(analytics.averageWin)}
            valueClass="text-emerald-400"
          />

          <MetricCard
            title="Average Loss"
            value={
              analytics.averageLoss > 0
                ? `-$${analytics.averageLoss.toFixed(2)}`
                : "$0.00"
            }
            valueClass="text-red-400"
          />

          <MetricCard
            title="Expectancy / Trade"
            value={formatMoney(analytics.expectancy)}
            valueClass={
              analytics.expectancy >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }
          />

          <MetricCard
            title="Max Drawdown"
            value={`-$${analytics.maxDrawdown.toFixed(2)}`}
            valueClass="text-red-400"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel
            title="Win / Loss Distribution"
            subtitle="Distribution of your trade outcomes"
          >
            {analytics.totalTrades === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={winLossData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={4}
                    >
                      {winLossData.map(
                        (entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.fill}
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid #334155",
                        borderRadius: "10px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <SmallStat
                label="Wins"
                value={analytics.wins}
                className="text-emerald-400"
              />

              <SmallStat
                label="Losses"
                value={analytics.losses}
                className="text-red-400"
              />

              <SmallStat
                label="Breakeven"
                value={analytics.breakeven}
                className="text-slate-300"
              />
            </div>
          </Panel>

          <Panel
            title="Session Performance"
            subtitle="Net P&L generated by trading session"
          >
            {analytics.sessionData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-[390px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={analytics.sessionData}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                    />

                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                    />

                    <YAxis
                      stroke="#64748b"
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid #334155",
                        borderRadius: "10px",
                      }}
                      formatter={(value) => [
                        `$${Number(value).toFixed(2)}`,
                        "P&L",
                      ]}
                    />

                    <Bar
                      dataKey="pnl"
                      fill="#facc15"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <MetricCard
            title="Best Trade"
            value={formatMoney(analytics.bestTrade)}
            valueClass="text-emerald-400"
          />

          <MetricCard
            title="Worst Trade"
            value={formatMoney(analytics.worstTrade)}
            valueClass={
              analytics.worstTrade < 0
                ? "text-red-400"
                : "text-slate-200"
            }
          />

          <MetricCard
            title="Gross Profit / Loss"
            value={`$${analytics.grossProfit.toFixed(
              0
            )} / -$${analytics.grossLoss.toFixed(0)}`}
          />
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Strategy Performance
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Find which trading setups actually make money.
            </p>
          </div>

          {analytics.strategyData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800">
                    <TableHead>Strategy</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead>Net P&L</TableHead>
                  </tr>
                </thead>

                <tbody>
                  {analytics.strategyData.map(
                    (strategy) => (
                      <tr
                        key={strategy.name}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <TableCell>
                          {strategy.name}
                        </TableCell>

                        <TableCell>
                          {strategy.trades}
                        </TableCell>

                        <TableCell>
                          {strategy.winRate.toFixed(1)}%
                        </TableCell>

                        <TableCell>
                          <span
                            className={
                              strategy.pnl >= 0
                                ? "font-bold text-emerald-400"
                                : "font-bold text-red-400"
                            }
                          >
                            {formatMoney(strategy.pnl)}
                          </span>
                        </TableCell>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function formatMoney(value: number) {
  if (value > 0) {
    return `+$${value.toFixed(2)}`;
  }

  if (value < 0) {
    return `-$${Math.abs(value).toFixed(2)}`;
  }

  return "$0.00";
}

function MetricCard({
  title,
  value,
  valueClass = "text-white",
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        {subtitle}
      </p>

      {children}
    </section>
  );
}

function SmallStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4 text-center">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[320px] items-center justify-center text-slate-500">
      Add more trades to see analytics.
    </div>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-400">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-5 py-4 text-sm text-slate-300">
      {children}
    </td>
  );
}