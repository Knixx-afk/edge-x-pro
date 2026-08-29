"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import EquityChart from "../components/EquityChart";
import { supabase } from "@/lib/supabase";

type Trade = {
  id: string;
  user_id: string;
  date?: string | null;
  time?: string | null;
  symbol?: string | null;
  direction?: string | null;
  pnl?: number | null;
  risk?: number | null;
  entry_price?: number | null;
  exit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  strategy?: string | null;
  session?: string | null;
};

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not logged in:", userError);
        setTrades([]);
        return;
      }

      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (error) {
        console.error("Failed to load trades:", error);
        alert("Failed to load dashboard trades: " + error.message);
        setTrades([]);
        return;
      }

      setTrades((data || []) as Trade[]);
    } catch (error) {
      console.error("Dashboard error:", error);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const totalTrades = trades.length;

    const winningTrades = trades.filter(
      (trade) => Number(trade.pnl || 0) > 0
    );

    const losingTrades = trades.filter(
      (trade) => Number(trade.pnl || 0) < 0
    );

    const breakevenTrades = trades.filter(
      (trade) => Number(trade.pnl || 0) === 0
    );

    const netProfit = trades.reduce(
      (total, trade) => total + Number(trade.pnl || 0),
      0
    );

    const grossProfit = winningTrades.reduce(
      (total, trade) => total + Number(trade.pnl || 0),
      0
    );

    const grossLoss = Math.abs(
      losingTrades.reduce(
        (total, trade) => total + Number(trade.pnl || 0),
        0
      )
    );

    const winRate =
      totalTrades > 0
        ? (winningTrades.length / totalTrades) * 100
        : 0;

    let profitFactor = 0;

    if (grossLoss > 0) {
      profitFactor = grossProfit / grossLoss;
    } else if (grossProfit > 0) {
      profitFactor = grossProfit;
    }

    const sortedForStreak = [...trades]
      .sort((a, b) => {
        const dateA = `${a.date || ""} ${a.time || ""}`;
        const dateB = `${b.date || ""} ${b.time || ""}`;
        return dateA.localeCompare(dateB);
      });

    let currentStreak = 0;
    let streakType = "NONE";

    for (let i = sortedForStreak.length - 1; i >= 0; i--) {
      const pnl = Number(sortedForStreak[i].pnl || 0);

      if (pnl === 0) break;

      const currentType = pnl > 0 ? "WIN" : "LOSS";

      if (streakType === "NONE") {
        streakType = currentType;
        currentStreak = 1;
      } else if (streakType === currentType) {
        currentStreak++;
      } else {
        break;
      }
    }

    const strategyStats: Record<
      string,
      { total: number; pnl: number }
    > = {};

    trades.forEach((trade) => {
      const strategy = trade.strategy || "No Strategy";

      if (!strategyStats[strategy]) {
        strategyStats[strategy] = {
          total: 0,
          pnl: 0,
        };
      }

      strategyStats[strategy].total++;

      strategyStats[strategy].pnl += Number(trade.pnl || 0);
    });

    const bestStrategy =
      Object.entries(strategyStats)
        .sort((a, b) => b[1].pnl - a[1].pnl)[0]?.[0] || "—";

    const sessionStats: Record<
      string,
      { total: number; pnl: number }
    > = {};

    trades.forEach((trade) => {
      const session = trade.session || "Unknown";

      if (!sessionStats[session]) {
        sessionStats[session] = {
          total: 0,
          pnl: 0,
        };
      }

      sessionStats[session].total++;

      sessionStats[session].pnl += Number(trade.pnl || 0);
    });

    const bestSession =
      Object.entries(sessionStats)
        .sort((a, b) => b[1].pnl - a[1].pnl)[0]?.[0] || "—";

    return {
      totalTrades,
      wins: winningTrades.length,
      losses: losingTrades.length,
      breakeven: breakevenTrades.length,
      netProfit,
      winRate,
      profitFactor,
      currentStreak,
      streakType,
      bestStrategy,
      bestSession,
    };
  }, [trades]);

  const latestTrades = [...trades]
    .sort((a, b) => {
      const dateA = `${a.date || ""} ${a.time || ""}`;
      const dateB = `${b.date || ""} ${b.time || ""}`;

      return dateB.localeCompare(dateA);
    })
    .slice(0, 6);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8">
        <Header />

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold">
                EDGE X PRO Dashboard
              </h1>

              <p className="mt-2 text-slate-400">
                {userEmail
                  ? `Trading performance for ${userEmail}`
                  : "Monitor performance and prepare for the next opportunity."}
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs uppercase text-slate-500">
                  Win Rate
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  {stats.winRate.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs uppercase text-slate-500">
                  Net Profit
                </p>

                <p
                  className={`mt-2 text-2xl font-bold ${
                    stats.netProfit >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {stats.netProfit >= 0 ? "+" : "-"}$
                  {Math.abs(stats.netProfit).toFixed(2)}
                </p>
              </div>

              <button
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-yellow-400 hover:border-yellow-400 disabled:opacity-50"
              >
                {loading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Trades"
            value={String(stats.totalTrades)}
          />

          <StatCard
            title="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
          />

          <StatCard
            title="Net Profit"
            value={`${stats.netProfit >= 0 ? "+" : "-"}$${Math.abs(
              stats.netProfit
            ).toFixed(2)}`}
          />

          <StatCard
            title="Profit Factor"
            value={stats.profitFactor.toFixed(2)}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Winning Trades
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {stats.wins}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Losing Trades
            </p>

            <p className="mt-2 text-3xl font-bold text-red-400">
              {stats.losses}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Breakeven Trades
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-300">
              {stats.breakeven}
            </p>
          </div>
        </div>

        <div className="mb-8 mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="text-xs uppercase text-slate-500">
              Current Streak
            </div>

            <div className="mt-2 text-3xl font-bold">
              {stats.streakType === "WIN"
                ? "🔥"
                : stats.streakType === "LOSS"
                ? "📉"
                : "—"}{" "}
              {stats.currentStreak}
            </div>

            <div className="mt-1 text-sm text-slate-400">
              {stats.streakType === "WIN"
                ? "Winning streak"
                : stats.streakType === "LOSS"
                ? "Losing streak"
                : "No streak yet"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="text-xs uppercase text-slate-500">
              Profit Factor
            </div>

            <div className="mt-2 text-3xl font-bold text-cyan-400">
              {stats.profitFactor.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="text-xs uppercase text-slate-500">
              Best Strategy
            </div>

            <div className="mt-2 truncate text-xl font-bold text-yellow-400">
              {stats.bestStrategy}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="text-xs uppercase text-slate-500">
              Best Session
            </div>

            <div className="mt-2 truncate text-xl font-bold text-purple-400">
              {stats.bestSession}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                📈 Equity Curve & Growth
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Cumulative profit and loss across your trades
              </p>
            </div>

            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-slate-500">
                Loading dashboard...
              </div>
            ) : (
              <EquityChart trades={trades} />
            )}
          </div>

          <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                📝 Latest Trading Activity
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Your latest journal entries
              </p>
            </div>

            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-slate-500">
                Loading trades...
              </div>
            ) : latestTrades.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-slate-500">
                No trades yet.
              </div>
            ) : (
              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
                {latestTrades.map((trade) => {
                  const tradePnL = Number(trade.pnl || 0);

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-bold">
                            {trade.symbol || "Unknown"}
                          </span>

                          <span
                            className={
                              trade.direction === "Buy"
                                ? "text-sm font-medium text-emerald-400"
                                : trade.direction === "Sell"
                                ? "text-sm font-medium text-red-400"
                                : "text-sm font-medium text-slate-400"
                            }
                          >
                            {trade.direction || "—"}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-slate-500">
                          {trade.date || "No date"}
                          {" • "}
                          {trade.strategy || "No setup"}
                        </p>
                      </div>

                      <span
                        className={
                          tradePnL > 0
                            ? "shrink-0 font-bold text-emerald-400"
                            : tradePnL < 0
                            ? "shrink-0 font-bold text-red-400"
                            : "shrink-0 font-bold text-slate-400"
                        }
                      >
                        {tradePnL > 0
                          ? "+"
                          : tradePnL < 0
                          ? "-"
                          : ""}
                        ${Math.abs(tradePnL).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}