"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import EquityChart from "../components/EquityChart";

type Trade = {
  id: number;
  date?: string;
  time?: string;
  symbol?: string;
  direction?: string;
  pnl?: number;
  risk?: number;
  entry?: number;
  stopLoss?: number;
  strategy?: string;
  session?: string;
};

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("edge-x-trades");

      if (saved) {
        const parsedTrades = JSON.parse(saved);

        if (Array.isArray(parsedTrades)) {
          setTrades(parsedTrades);
        }
      }
    } catch (error) {
      console.error("Failed to load trades:", error);
      setTrades([]);
    }
  }, []);

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

    return {
      totalTrades,
      wins: winningTrades.length,
      losses: losingTrades.length,
      breakeven: breakevenTrades.length,
      netProfit,
      winRate,
      profitFactor,
    };
  }, [trades]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-hidden p-8">
        <Header />

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

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                📈 Equity Curve
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Cumulative profit and loss across your trades
              </p>
            </div>

            <EquityChart trades={trades} />
          </div>

          <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                📝 Recent Trades
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Your latest journal entries
              </p>
            </div>

            {trades.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-slate-500">
                No trades yet.
              </div>
            ) : (
              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
                {trades.slice(0, 6).map((trade) => {
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
                        {tradePnL > 0 ? "+" : tradePnL < 0 ? "-" : ""}
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