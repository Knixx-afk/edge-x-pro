"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
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
  id: string;
  date?: string | null;
  time?: string | null;
  symbol?: string | null;
  direction?: string | null;
  pnl?: number | string | null;
  risk?: number | string | null;
  session?: string | null;
  strategy?: string | null;
  emotion?: string | null;
  rule_followed?: string | null;
  created_at?: string | null;
};

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTrades() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setTrades([]);
        setMessage("Please log in to view your analytics.");
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select(
          "id,date,time,symbol,direction,pnl,risk,session,strategy,emotion,rule_followed,created_at"
        )
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) throw error;

      setTrades((data || []) as Trade[]);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();
  }, []);

  const analytics = useMemo(() => {
    const pnlOf = (trade: Trade) => Number(trade.pnl || 0);

    const wins = trades.filter((trade) => pnlOf(trade) > 0);
    const losses = trades.filter((trade) => pnlOf(trade) < 0);
    const breakeven = trades.filter((trade) => pnlOf(trade) === 0);

    const totalPnL = trades.reduce((sum, trade) => sum + pnlOf(trade), 0);
    const grossProfit = wins.reduce((sum, trade) => sum + pnlOf(trade), 0);
    const grossLoss = Math.abs(
      losses.reduce((sum, trade) => sum + pnlOf(trade), 0)
    );

    const averageWin = wins.length ? grossProfit / wins.length : 0;
    const averageLoss = losses.length ? grossLoss / losses.length : 0;

    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const lossRate = trades.length
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

    const equityData = [...trades]
      .sort((a, b) => {
        const left = `${a.date || ""} ${a.time || ""}`;
        const right = `${b.date || ""} ${b.time || ""}`;
        return left.localeCompare(right);
      })
      .map((trade, index) => {
        runningPnL += pnlOf(trade);
        peak = Math.max(peak, runningPnL);
        const drawdown = peak - runningPnL;
        maxDrawdown = Math.max(maxDrawdown, drawdown);

        return {
          trade: index + 1,
          pnl: Number(runningPnL.toFixed(2)),
          drawdown: Number((-drawdown).toFixed(2)),
        };
      });

    const sessionMap: Record<string, { trades: number; pnl: number; wins: number }> = {};
    const strategyMap: Record<string, { trades: number; pnl: number; wins: number }> = {};
    const symbolMap: Record<string, { trades: number; pnl: number; wins: number }> = {};
    const directionMap: Record<string, { trades: number; pnl: number; wins: number }> = {};

    trades.forEach((trade) => {
      const pnl = pnlOf(trade);
      const session = trade.session?.trim() || "Unknown";
      const strategy = trade.strategy?.trim() || "No Strategy";
      const symbol = trade.symbol?.trim() || "Unknown";
      const direction = trade.direction?.trim() || "Unknown";

      const update = (
        map: Record<string, { trades: number; pnl: number; wins: number }>,
        key: string
      ) => {
        if (!map[key]) map[key] = { trades: 0, pnl: 0, wins: 0 };
        map[key].trades += 1;
        map[key].pnl += pnl;
        if (pnl > 0) map[key].wins += 1;
      };

      update(sessionMap, session);
      update(strategyMap, strategy);
      update(symbolMap, symbol);
      update(directionMap, direction);
    });

    const makeData = (
      map: Record<string, { trades: number; pnl: number; wins: number }>
    ) =>
      Object.entries(map)
        .map(([name, value]) => ({
          name,
          trades: value.trades,
          pnl: Number(value.pnl.toFixed(2)),
          winRate: value.trades
            ? Number(((value.wins / value.trades) * 100).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.pnl - a.pnl);

    const sessionData = makeData(sessionMap);
    const strategyData = makeData(strategyMap);
    const symbolData = makeData(symbolMap);
    const directionData = makeData(directionMap);

    const bestTrade = trades.length
      ? Math.max(...trades.map(pnlOf))
      : 0;
    const worstTrade = trades.length
      ? Math.min(...trades.map(pnlOf))
      : 0;

    const ruleFollowed = trades.filter(
      (trade) => trade.rule_followed?.toLowerCase() === "yes"
    ).length;

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
      ruleFollowed,
      sessionData,
      strategyData,
      symbolData,
      directionData,
      equityData,
    };
  }, [trades]);

  const outcomeData = [
    { name: "Wins", value: analytics.wins, fill: "#34d399" },
    { name: "Losses", value: analytics.losses, fill: "#f87171" },
    { name: "Breakeven", value: analytics.breakeven, fill: "#94a3b8" },
  ];

  const edgeScore =
    analytics.totalTrades === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            analytics.winRate * 0.7 +
              (analytics.expectancy > 0 ? 20 : 0) +
              (analytics.ruleFollowed / analytics.totalTrades) * 10
          )
        );

  return (
    <div className="flex min-h-screen bg-[#070d1b] text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold lg:text-4xl">
              Analytics
            </h1>
            <p className="mt-2 text-slate-400">
              Analyze your trading edge using your real Supabase journal data.
            </p>
          </div>

          <button
            onClick={loadTrades}
            disabled={loading}
            className="rounded-xl border border-yellow-400/40 bg-slate-900 px-5 py-3 font-semibold text-yellow-300 transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Loading..." : "↻ Refresh Analytics"}
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {message}
          </div>
        )}

        <section className="mb-7 rounded-2xl border border-slate-800 bg-[#111a2d] p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <HeroStat
              label="EDGE SCORE"
              value={`${edgeScore}/100`}
              color="text-yellow-400"
            />
            <HeroStat
              label="WIN RATE"
              value={`${analytics.winRate.toFixed(1)}%`}
              color="text-emerald-400"
            />
            <HeroStat
              label="NET PERFORMANCE"
              value={formatMoney(analytics.totalPnL)}
              color={analytics.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Trades" value={String(analytics.totalTrades)} />
          <MetricCard title="Best Trade" value={formatMoney(analytics.bestTrade)} valueClass="text-emerald-400" />
          <MetricCard title="Worst Trade" value={formatMoney(analytics.worstTrade)} valueClass="text-red-400" />
          <MetricCard
            title="Profit Factor"
            value={analytics.profitFactor === Infinity ? "∞" : analytics.profitFactor.toFixed(2)}
            valueClass="text-yellow-400"
          />
          <MetricCard title="Gross Profit" value={formatMoney(analytics.grossProfit)} valueClass="text-emerald-400" />
          <MetricCard
            title="Gross Loss"
            value={analytics.grossLoss > 0 ? `-$${analytics.grossLoss.toFixed(2)}` : "$0.00"}
            valueClass="text-red-400"
          />
          <MetricCard title="Average Win" value={formatMoney(analytics.averageWin)} valueClass="text-emerald-400" />
          <MetricCard
            title="Expectancy / Trade"
            value={formatMoney(analytics.expectancy)}
            valueClass={analytics.expectancy >= 0 ? "text-emerald-400" : "text-red-400"}
          />
        </div>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Win / Loss Distribution" subtitle="How your trades are ending">
            {analytics.totalTrades === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={4}
                      >
                        {outcomeData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <SmallStat label="Wins" value={analytics.wins} color="text-emerald-400" />
                  <SmallStat label="Losses" value={analytics.losses} color="text-red-400" />
                  <SmallStat label="BE" value={analytics.breakeven} color="text-slate-300" />
                </div>
              </>
            )}
          </Panel>

          <Panel title="Session Performance" subtitle="Net P&L by trading session">
            <BarChartPanel data={analytics.sessionData} />
          </Panel>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Strategy Performance" subtitle="Which setups are producing results">
            <PerformanceTable data={analytics.strategyData} />
          </Panel>

          <Panel title="Symbol Performance" subtitle="Performance by trading instrument">
            <PerformanceTable data={analytics.symbolData} />
          </Panel>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Long vs Short" subtitle="Compare your directional performance">
            <PerformanceTable data={analytics.directionData} />
          </Panel>

          <Panel title="Risk & Discipline" subtitle="Trading behavior from your journal">
            <div className="grid grid-cols-2 gap-4">
              <SmallStat
                label="Rules Followed"
                value={analytics.ruleFollowed}
                color="text-emerald-400"
              />
              <SmallStat
                label="Max Drawdown"
                value={`-$${analytics.maxDrawdown.toFixed(2)}`}
                color="text-red-400"
              />
              <SmallStat
                label="Average Loss"
                value={analytics.averageLoss > 0 ? `-$${analytics.averageLoss.toFixed(2)}` : "$0.00"}
                color="text-red-400"
              />
              <SmallStat
                label="Breakeven"
                value={analytics.breakeven}
                color="text-slate-300"
              />
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#020617",
  border: "1px solid #334155",
  borderRadius: "10px",
};

function BarChartPanel({
  data,
}: {
  data: { name: string; trades: number; pnl: number; winRate: number }[];
}) {
  if (!data.length) return <EmptyState />;

  return (
    <div className="h-[330px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "P&L"]}
          />
          <Bar dataKey="pnl" fill="#facc15" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PerformanceTable({
  data,
}: {
  data: { name: string; trades: number; pnl: number; winRate: number }[];
}) {
  if (!data.length) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px]">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
            <th className="px-3 py-3">Name</th>
            <th className="px-3 py-3">Trades</th>
            <th className="px-3 py-3">Win Rate</th>
            <th className="px-3 py-3">Net P&L</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.name} className="border-b border-slate-800/80 last:border-0">
              <td className="px-3 py-4 font-semibold text-white">{row.name}</td>
              <td className="px-3 py-4 text-slate-300">{row.trades}</td>
              <td className="px-3 py-4 text-slate-300">{row.winRate.toFixed(1)}%</td>
              <td className={`px-3 py-4 font-bold ${row.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatMoney(row.pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeroStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-[#070d1b] p-5">
      <p className="text-xs font-semibold tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
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
    <div className="rounded-xl border border-slate-800 bg-[#111a2d] p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
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
    <section className="rounded-2xl border border-slate-800 bg-[#111a2d] p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SmallStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-[#070d1b] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl bg-[#070d1b] text-slate-500">
      Add more trades to unlock this analysis.
    </div>
  );
}

function formatMoney(value: number) {
  if (value > 0) return `+$${value.toFixed(2)}`;
  if (value < 0) return `-$${Math.abs(value).toFixed(2)}`;
  return "$0.00";
}
