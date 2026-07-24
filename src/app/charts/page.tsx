"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
  session?: string;
  strategy?: string;
};

export default function ChartsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("edge-x-trades");

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setTrades(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load trades:", error);
      setTrades([]);
    }
  }, []);

  const chartData = useMemo(() => {
    /*
      IMPORTANT:
      New trades are currently saved at the beginning of the array.
      For performance charts we sort them from oldest to newest.
    */

    const sortedTrades = [...trades].sort((a, b) => {
      const first = `${a.date || ""} ${a.time || ""}`;
      const second = `${b.date || ""} ${b.time || ""}`;

      return first.localeCompare(second);
    });

    /*
      CUMULATIVE P&L
    */

    let cumulativePnL = 0;
    let peakEquity = 0;

    const cumulativeData = [
      {
        trade: 0,
        pnl: 0,
        drawdown: 0,
        label: "Start",
      },
    ];

    sortedTrades.forEach((trade, index) => {
      cumulativePnL += Number(trade.pnl || 0);

      if (cumulativePnL > peakEquity) {
        peakEquity = cumulativePnL;
      }

      const drawdown = peakEquity - cumulativePnL;

      cumulativeData.push({
        trade: index + 1,
        pnl: Number(cumulativePnL.toFixed(2)),
        drawdown: Number(drawdown.toFixed(2)),
        label: trade.date || `Trade ${index + 1}`,
      });
    });

    /*
      DAILY P&L
    */

    const dailyMap: Record<string, number> = {};

    sortedTrades.forEach((trade) => {
      const date = trade.date || "Unknown";

      if (!dailyMap[date]) {
        dailyMap[date] = 0;
      }

      dailyMap[date] += Number(trade.pnl || 0);
    });

    const dailyData = Object.entries(dailyMap).map(
      ([date, pnl]) => ({
        date,
        pnl: Number(pnl.toFixed(2)),
      })
    );

    /*
      SYMBOL PERFORMANCE
    */

    const symbolMap: Record<
      string,
      {
        pnl: number;
        trades: number;
        wins: number;
      }
    > = {};

    trades.forEach((trade) => {
      const symbol = trade.symbol || "Unknown";

      if (!symbolMap[symbol]) {
        symbolMap[symbol] = {
          pnl: 0,
          trades: 0,
          wins: 0,
        };
      }

      symbolMap[symbol].pnl += Number(trade.pnl || 0);
      symbolMap[symbol].trades += 1;

      if (Number(trade.pnl || 0) > 0) {
        symbolMap[symbol].wins += 1;
      }
    });

    const symbolData = Object.entries(symbolMap)
      .map(([symbol, data]) => ({
        symbol,
        pnl: Number(data.pnl.toFixed(2)),
        trades: data.trades,
        winRate:
          data.trades > 0
            ? Number(
                (
                  (data.wins / data.trades) *
                  100
                ).toFixed(1)
              )
            : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    /*
      SESSION PERFORMANCE
    */

    const sessionMap: Record<string, number> = {};

    trades.forEach((trade) => {
      const session = trade.session || "Unknown";

      if (!sessionMap[session]) {
        sessionMap[session] = 0;
      }

      sessionMap[session] += Number(trade.pnl || 0);
    });

    const sessionData = Object.entries(sessionMap)
      .map(([session, pnl]) => ({
        session,
        pnl: Number(pnl.toFixed(2)),
      }))
      .sort((a, b) => b.pnl - a.pnl);

    /*
      INDIVIDUAL TRADE P&L
    */

    const individualTradeData = sortedTrades.map(
      (trade, index) => ({
        trade: index + 1,
        pnl: Number(trade.pnl || 0),
        symbol: trade.symbol || "Unknown",
        date: trade.date || "",
      })
    );

    return {
      cumulativeData,
      dailyData,
      symbolData,
      sessionData,
      individualTradeData,
    };
  }, [trades]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        {/* HEADER */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Performance Charts
          </h1>

          <p className="mt-2 text-slate-400">
            Visualize your trading performance and discover
            patterns in your results.
          </p>
        </div>

        {trades.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-16 text-center">
            <div className="text-5xl">📊</div>

            <h2 className="mt-5 text-2xl font-bold">
              No trading data yet
            </h2>

            <p className="mt-2 text-slate-400">
              Add trades to your Journal and your performance
              charts will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            {/* MAIN EQUITY CURVE */}

            <ChartPanel
              title="Equity Curve"
              subtitle="Your cumulative profit and loss after every trade"
            >
              <div className="h-[420px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={chartData.cumulativeData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="mainEquityGradient"
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
                      tickFormatter={(value) =>
                        `$${value}`
                      }
                    />

                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [
                        formatMoney(Number(value)),
                        "Cumulative P&L",
                      ]}
                      labelFormatter={(value) =>
                        value === 0
                          ? "Starting Point"
                          : `Trade #${value}`
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="pnl"
                      stroke="#facc15"
                      strokeWidth={3}
                      fill="url(#mainEquityGradient)"
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>

            {/* DAILY P&L + TRADE RESULTS */}

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ChartPanel
                title="Daily P&L"
                subtitle="Your total profit or loss for each trading day"
              >
                <div className="h-[340px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={chartData.dailyData}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          `$${value}`
                        }
                      />

                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          formatMoney(Number(value)),
                          "Daily P&L",
                        ]}
                      />

                      <Bar
                        dataKey="pnl"
                        radius={[6, 6, 0, 0]}
                      >
                        {chartData.dailyData.map(
                          (entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.pnl >= 0
                                  ? "#10b981"
                                  : "#ef4444"
                              }
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel
                title="Trade-by-Trade Results"
                subtitle="See every winning and losing trade individually"
              >
                <div className="h-[340px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={
                        chartData.individualTradeData
                      }
                    >
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
                        tickFormatter={(value) =>
                          `$${value}`
                        }
                      />

                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          formatMoney(Number(value)),
                          "Trade P&L",
                        ]}
                        labelFormatter={(value) =>
                          `Trade #${value}`
                        }
                      />

                      <Bar
                        dataKey="pnl"
                        radius={[5, 5, 0, 0]}
                      >
                        {chartData.individualTradeData.map(
                          (entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.pnl >= 0
                                  ? "#10b981"
                                  : "#ef4444"
                              }
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </div>

            {/* DRAWDOWN */}

            <div className="mt-6">
              <ChartPanel
                title="Drawdown Curve"
                subtitle="Shows how far your account falls below its previous performance peak"
              >
                <div className="h-[340px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={chartData.cumulativeData}
                    >
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
                        tickFormatter={(value) =>
                          `$${value}`
                        }
                      />

                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          `$${Number(value).toFixed(2)}`,
                          "Drawdown",
                        ]}
                        labelFormatter={(value) =>
                          value === 0
                            ? "Starting Point"
                            : `Trade #${value}`
                        }
                      />

                      <Line
                        type="monotone"
                        dataKey="drawdown"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{
                          r: 6,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </div>

            {/* SYMBOL + SESSION */}

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ChartPanel
                title="Performance by Symbol"
                subtitle="Discover which markets make or lose you the most money"
              >
                <div className="h-[350px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={chartData.symbolData}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="symbol"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          `$${value}`
                        }
                      />

                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          formatMoney(Number(value)),
                          "Net P&L",
                        ]}
                      />

                      <Bar
                        dataKey="pnl"
                        radius={[6, 6, 0, 0]}
                      >
                        {chartData.symbolData.map(
                          (entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.pnl >= 0
                                  ? "#10b981"
                                  : "#ef4444"
                              }
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>

              <ChartPanel
                title="Performance by Session"
                subtitle="Compare your results across trading sessions"
              >
                <div className="h-[350px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={chartData.sessionData}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="session"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          `$${value}`
                        }
                      />

                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          formatMoney(Number(value)),
                          "Net P&L",
                        ]}
                      />

                      <Bar
                        dataKey="pnl"
                        radius={[6, 6, 0, 0]}
                      >
                        {chartData.sessionData.map(
                          (entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.pnl >= 0
                                  ? "#10b981"
                                  : "#ef4444"
                              }
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </div>

            {/* SYMBOL TABLE */}

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold">
                  Symbol Breakdown
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Detailed results for every market you trade.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <TableHead>
                        Symbol
                      </TableHead>

                      <TableHead>
                        Trades
                      </TableHead>

                      <TableHead>
                        Win Rate
                      </TableHead>

                      <TableHead>
                        Net P&L
                      </TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {chartData.symbolData.map(
                      (symbol) => (
                        <tr
                          key={symbol.symbol}
                          className="border-b border-slate-800 last:border-0"
                        >
                          <TableCell>
                            <span className="font-bold text-white">
                              {symbol.symbol}
                            </span>
                          </TableCell>

                          <TableCell>
                            {symbol.trades}
                          </TableCell>

                          <TableCell>
                            {symbol.winRate.toFixed(1)}%
                          </TableCell>

                          <TableCell>
                            <span
                              className={
                                symbol.pnl >= 0
                                  ? "font-bold text-emerald-400"
                                  : "font-bold text-red-400"
                              }
                            >
                              {formatMoney(symbol.pnl)}
                            </span>
                          </TableCell>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#020617",
  border: "1px solid #334155",
  borderRadius: "10px",
  color: "#ffffff",
};

function formatMoney(value: number) {
  if (value > 0) {
    return `+$${value.toFixed(2)}`;
  }

  if (value < 0) {
    return `-$${Math.abs(value).toFixed(2)}`;
  }

  return "$0.00";
}

function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {subtitle}
        </p>
      </div>

      {children}
    </section>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
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