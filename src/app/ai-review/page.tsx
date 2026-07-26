"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import AICoachCard from "@/components/ai/AICoachCard";
import TradeQualityCard from "@/components/ai/TradeQualityCard";
import MistakeDetectorCard from "@/components/ai/MistakeDetectorCard";

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
  emotion?: string;
  ruleFollowed?: string;
  notes?: string;
};

type Insight = {
  title: string;
  description: string;
  type: "positive" | "warning" | "danger" | "neutral";
};

export default function AIReviewPage() {
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

  const analysis = useMemo(() => {
    const totalTrades = trades.length;

    const wins = trades.filter(
      (trade) => Number(trade.pnl || 0) > 0
    );

    const losses = trades.filter(
      (trade) => Number(trade.pnl || 0) < 0
    );

    const ruleFollowedTrades = trades.filter(
      (trade) =>
        trade.ruleFollowed?.toLowerCase() === "yes"
    );

    const ruleBrokenTrades = trades.filter(
      (trade) =>
        trade.ruleFollowed?.toLowerCase() === "no"
    );

    const partialRuleTrades = trades.filter(
      (trade) =>
        trade.ruleFollowed?.toLowerCase() === "partially"
    );

    const emotionalTrades = trades.filter((trade) => {
      const emotion =
        trade.emotion?.toLowerCase() || "";

      return [
        "fomo",
        "revenge",
        "fear",
        "greedy",
      ].includes(emotion);
    });

    const revengeTrades = trades.filter(
      (trade) =>
        trade.emotion?.toLowerCase() === "revenge"
    );

    const fomoTrades = trades.filter(
      (trade) =>
        trade.emotion?.toLowerCase() === "fomo"
    );

    const calmTrades = trades.filter(
      (trade) =>
        trade.emotion?.toLowerCase() === "calm"
    );

    const disciplinedTrades = trades.filter(
      (trade) =>
        trade.ruleFollowed?.toLowerCase() === "yes"
    );

    const disciplinedWins = disciplinedTrades.filter(
      (trade) => Number(trade.pnl || 0) > 0
    );

    const emotionalPnL = emotionalTrades.reduce(
      (total, trade) =>
        total + Number(trade.pnl || 0),
      0
    );

    const disciplinedPnL = disciplinedTrades.reduce(
      (total, trade) =>
        total + Number(trade.pnl || 0),
      0
    );

    const ruleBrokenPnL = ruleBrokenTrades.reduce(
      (total, trade) =>
        total + Number(trade.pnl || 0),
      0
    );

    const totalPnL = trades.reduce(
      (total, trade) =>
        total + Number(trade.pnl || 0),
      0
    );

    const winRate =
      totalTrades > 0
        ? (wins.length / totalTrades) * 100
        : 0;

    const disciplineScore =
      totalTrades > 0
        ? (ruleFollowedTrades.length /
            totalTrades) *
          100
        : 0;

    const emotionalTradeRate =
      totalTrades > 0
        ? (emotionalTrades.length /
            totalTrades) *
          100
        : 0;

    const disciplinedWinRate =
      disciplinedTrades.length > 0
        ? (disciplinedWins.length /
            disciplinedTrades.length) *
          100
        : 0;

    /*
      STRATEGY ANALYSIS
    */

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
        trade.strategy?.trim() ||
        "No Strategy";

      if (!strategyMap[strategy]) {
        strategyMap[strategy] = {
          trades: 0,
          wins: 0,
          pnl: 0,
        };
      }

      strategyMap[strategy].trades += 1;

      strategyMap[strategy].pnl +=
        Number(trade.pnl || 0);

      if (Number(trade.pnl || 0) > 0) {
        strategyMap[strategy].wins += 1;
      }
    });

    const strategies = Object.entries(
      strategyMap
    )
      .map(([name, data]) => ({
        name,
        trades: data.trades,
        wins: data.wins,
        pnl: data.pnl,
        winRate:
          data.trades > 0
            ? (data.wins /
                data.trades) *
              100
            : 0,
      }))
      .sort(
        (a, b) =>
          b.pnl - a.pnl
      );

    const bestStrategy =
      strategies.length > 0
        ? strategies[0]
        : null;

    const worstStrategy =
      strategies.length > 1
        ? strategies[
            strategies.length - 1
          ]
        : null;

    /*
      SESSION ANALYSIS
    */

    const sessionMap: Record<
      string,
      {
        trades: number;
        pnl: number;
      }
    > = {};

    trades.forEach((trade) => {
      const session =
        trade.session ||
        "Unknown";

      if (!sessionMap[session]) {
        sessionMap[session] = {
          trades: 0,
          pnl: 0,
        };
      }

      sessionMap[session].trades += 1;

      sessionMap[session].pnl +=
        Number(trade.pnl || 0);
    });

    const sessions = Object.entries(
      sessionMap
    )
      .map(([name, data]) => ({
        name,
        trades: data.trades,
        pnl: data.pnl,
      }))
      .sort(
        (a, b) =>
          b.pnl - a.pnl
      );

    const bestSession =
      sessions.length > 0
        ? sessions[0]
        : null;

    /*
      BUILD AUTOMATIC INSIGHTS
    */

    const insights: Insight[] = [];

    if (totalTrades === 0) {
      insights.push({
        title: "Start Building Your Dataset",
        description:
          "Add trades to your Journal. EDGE X PRO will analyze your discipline, emotions, strategies and performance automatically.",
        type: "neutral",
      });
    }

    if (
      totalTrades > 0 &&
      disciplineScore >= 80
    ) {
      insights.push({
        title: "Strong Trading Discipline",
        description: `You followed your rules on ${disciplineScore.toFixed(
          0
        )}% of your recorded trades. Protect this behavior because consistency is one of your strongest performance advantages.`,
        type: "positive",
      });
    }

    if (
      totalTrades > 0 &&
      disciplineScore < 60
    ) {
      insights.push({
        title: "Discipline Needs Attention",
        description: `You fully followed your rules on only ${disciplineScore.toFixed(
          0
        )}% of your trades. Your first priority should be reducing trades that do not meet your trading plan.`,
        type: "danger",
      });
    }

    if (
      ruleBrokenTrades.length > 0 &&
      ruleBrokenPnL < 0
    ) {
      insights.push({
        title: "Breaking Rules Is Costing You Money",
        description: `Trades marked as rules not followed have produced ${formatMoney(
          ruleBrokenPnL
        )}. Eliminating these trades could significantly improve your results.`,
        type: "danger",
      });
    }

    if (
      disciplinedTrades.length > 0 &&
      disciplinedPnL > 0
    ) {
      insights.push({
        title: "Your Planned Trades Are Profitable",
        description: `Trades where you followed your rules have generated ${formatMoney(
          disciplinedPnL
        )} with a ${disciplinedWinRate.toFixed(
          1
        )}% win rate.`,
        type: "positive",
      });
    }

    if (
      emotionalTrades.length > 0 &&
      emotionalPnL < 0
    ) {
      insights.push({
        title: "Emotional Trading Is Hurting Performance",
        description: `Trades recorded with Fear, FOMO, Revenge or Greed have produced ${formatMoney(
          emotionalPnL
        )}. Consider using a mandatory checklist before entering when you notice these emotions.`,
        type: "danger",
      });
    }

    if (revengeTrades.length > 0) {
      insights.push({
        title: "Revenge Trading Detected",
        description: `You recorded ${revengeTrades.length} revenge trade${
          revengeTrades.length === 1
            ? ""
            : "s"
        }. Consider using a mandatory cooldown after every loss before taking another position.`,
        type: "danger",
      });
    }

    if (fomoTrades.length > 0) {
      insights.push({
        title: "FOMO Entries Detected",
        description: `${fomoTrades.length} trade${
          fomoTrades.length === 1
            ? " was"
            : "s were"
        } marked as FOMO. Missing a setup is usually less damaging than entering without your planned confirmation.`,
        type: "warning",
      });
    }

    if (
      emotionalTradeRate >= 30
    ) {
      insights.push({
        title: "High Emotional Trade Frequency",
        description: `${emotionalTradeRate.toFixed(
          0
        )}% of your trades were taken while recording a high-risk emotional state. Reducing this percentage should be a major focus.`,
        type: "warning",
      });
    }

    if (
      bestStrategy &&
      bestStrategy.trades >= 2
    ) {
      insights.push({
        title: "Best Performing Setup",
        description: `${bestStrategy.name} is currently your strongest recorded strategy with ${formatMoney(
          bestStrategy.pnl
        )} net P&L and a ${bestStrategy.winRate.toFixed(
          1
        )}% win rate across ${bestStrategy.trades} trades.`,
        type: "positive",
      });
    }

    if (
      worstStrategy &&
      worstStrategy.pnl < 0
    ) {
      insights.push({
        title: "Strategy Underperformance",
        description: `${worstStrategy.name} is currently your weakest setup with ${formatMoney(
          worstStrategy.pnl
        )} net P&L. Review these trades before continuing to risk normally on this setup.`,
        type: "warning",
      });
    }

    if (
      bestSession &&
      bestSession.trades >= 2
    ) {
      insights.push({
        title: "Strongest Trading Session",
        description: `${bestSession.name} is currently your best-performing session with ${formatMoney(
          bestSession.pnl
        )} across ${bestSession.trades} trades.`,
        type: "positive",
      });
    }

    if (
      totalTrades > 0 &&
      totalTrades < 20
    ) {
      insights.push({
        title: "Small Sample Size",
        description: `You currently have ${totalTrades} recorded trade${
          totalTrades === 1
            ? ""
            : "s"
        }. Performance patterns become more reliable as your journal grows. Avoid making major strategy decisions from a very small sample.`,
        type: "neutral",
      });
    }

    return {
      totalTrades,
      wins: wins.length,
      losses: losses.length,
      totalPnL,
      winRate,
      disciplineScore,
      emotionalTradeRate,
      emotionalTrades:
        emotionalTrades.length,
      revengeTrades:
        revengeTrades.length,
      fomoTrades:
        fomoTrades.length,
      calmTrades:
        calmTrades.length,
      ruleFollowed:
        ruleFollowedTrades.length,
      ruleBroken:
        ruleBrokenTrades.length,
      partialRules:
        partialRuleTrades.length,
      disciplinedPnL,
      emotionalPnL,
      strategies,
      sessions,
      insights,
    };
  }, [trades]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        {/* HEADER */}

        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">
                  AI Review
                </h1>

                <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                  BETA
                </span>
              </div>

              <p className="mt-2 text-slate-400">
                Automated analysis of your trading behavior,
                discipline and performance.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Trades Analyzed
              </p>

              <p className="mt-1 text-2xl font-bold text-yellow-400">
                {analysis.totalTrades}
              </p>
            </div>
          </div>
        </div>

        {/* SCORES */}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ScoreCard
            title="Discipline Score"
            value={`${analysis.disciplineScore.toFixed(
              0
            )}%`}
            description="Trades where all rules were followed"
            status={
              analysis.disciplineScore >= 80
                ? "good"
                : analysis.disciplineScore >= 60
                ? "medium"
                : "bad"
            }
          />

          <ScoreCard
            title="Win Rate"
            value={`${analysis.winRate.toFixed(
              1
            )}%`}
            description="Percentage of profitable trades"
            status={
              analysis.winRate >= 50
                ? "good"
                : analysis.winRate >= 40
                ? "medium"
                : "bad"
            }
          />

          <ScoreCard
            title="Emotional Trades"
            value={`${analysis.emotionalTradeRate.toFixed(
              0
            )}%`}
            description="Trades involving high-risk emotions"
            status={
              analysis.emotionalTradeRate <= 10
                ? "good"
                : analysis.emotionalTradeRate <= 25
                ? "medium"
                : "bad"
            }
          />

          <ScoreCard
            title="Net Performance"
            value={formatMoney(
              analysis.totalPnL
            )}
            description="Total recorded journal P&L"
            status={
              analysis.totalPnL > 0
                ? "good"
                : analysis.totalPnL < 0
                ? "bad"
                : "medium"
            }
          />
        </div>

        {/* AI SUMMARY */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-yellow-400/20 bg-slate-900">
          <div className="border-b border-slate-800 bg-gradient-to-r from-yellow-400/10 to-transparent p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-xl text-slate-950">
                ✨
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  EDGE X Performance Review
                </h2>

                <p className="text-sm text-slate-400">
                  Automatically generated from your Journal data
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {analysis.totalTrades ===
            0 ? (
              <p className="leading-7 text-slate-300">
                No trades are available for analysis yet.
                Add trades to your Journal and your review
                will appear automatically.
              </p>
            ) : (
              <p className="leading-8 text-slate-300">
                You have recorded{" "}
                <strong className="text-white">
                  {analysis.totalTrades}
                </strong>{" "}
                trades with a{" "}
                <strong className="text-white">
                  {analysis.winRate.toFixed(
                    1
                  )}
                  %
                </strong>{" "}
                win rate and{" "}
                <strong
                  className={
                    analysis.totalPnL >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {formatMoney(
                    analysis.totalPnL
                  )}
                </strong>{" "}
                net performance. Your current discipline
                score is{" "}
                <strong className="text-yellow-400">
                  {analysis.disciplineScore.toFixed(
                    0
                  )}
                  %
                </strong>
                . You recorded{" "}
                <strong className="text-white">
                  {analysis.emotionalTrades}
                </strong>{" "}
                high-risk emotional trades. Continue recording
                every trade accurately—the quality of your
                review improves as your dataset grows.
              </p>
            )}
          </div>
        </section>

        {/* INSIGHTS */}

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">
              Performance Insights
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Patterns detected from your trading journal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {analysis.insights.map(
              (insight, index) => (
                <InsightCard
                  key={`${insight.title}-${index}`}
                  insight={insight}
                />
              )
            )}
          </div>
        </section>

        {/* PSYCHOLOGY */}

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel
            title="Trading Psychology"
            subtitle="How your emotional state affects your execution"
          >
            <div className="space-y-4">
              <DataRow
                label="Calm Trades"
                value={analysis.calmTrades}
                valueClass="text-emerald-400"
              />

              <DataRow
                label="FOMO Trades"
                value={analysis.fomoTrades}
                valueClass="text-yellow-400"
              />

              <DataRow
                label="Revenge Trades"
                value={analysis.revengeTrades}
                valueClass="text-red-400"
              />

              <DataRow
                label="High-Risk Emotional Trades"
                value={analysis.emotionalTrades}
                valueClass="text-red-400"
              />

              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    Emotional Trade P&L
                  </span>

                  <span
                    className={
                      analysis.emotionalPnL >= 0
                        ? "font-bold text-emerald-400"
                        : "font-bold text-red-400"
                    }
                  >
                    {formatMoney(
                      analysis.emotionalPnL
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Rule Execution"
            subtitle="Measure how consistently you follow your trading plan"
          >
            <div className="space-y-4">
              <DataRow
                label="Rules Followed"
                value={analysis.ruleFollowed}
                valueClass="text-emerald-400"
              />

              <DataRow
                label="Partially Followed"
                value={analysis.partialRules}
                valueClass="text-yellow-400"
              />

              <DataRow
                label="Rules Broken"
                value={analysis.ruleBroken}
                valueClass="text-red-400"
              />

              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    Disciplined Trade P&L
                  </span>

                  <span
                    className={
                      analysis.disciplinedPnL >= 0
                        ? "font-bold text-emerald-400"
                        : "font-bold text-red-400"
                    }
                  >
                    {formatMoney(
                      analysis.disciplinedPnL
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* STRATEGIES */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Strategy Intelligence
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Compare your setups by profitability and win rate.
            </p>
          </div>

          {analysis.strategies.length ===
          0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800">
                    <TableHead>
                      Strategy
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
                  {analysis.strategies.map(
                    (strategy) => (
                      <tr
                        key={strategy.name}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <TableCell>
                          <span className="font-semibold text-white">
                            {strategy.name}
                          </span>
                        </TableCell>

                        <TableCell>
                          {strategy.trades}
                        </TableCell>

                        <TableCell>
                          {strategy.winRate.toFixed(
                            1
                          )}
                          %
                        </TableCell>

                        <TableCell>
                          <span
                            className={
                              strategy.pnl >= 0
                                ? "font-bold text-emerald-400"
                                : "font-bold text-red-400"
                            }
                          >
                            {formatMoney(
                              strategy.pnl
                            )}
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

        {/* AI IMAGE REVIEW COMING NEXT */}

        <section className="mt-8 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-5xl">
              🧠
            </div>

            <h2 className="mt-4 text-2xl font-bold">
              AI Chart Review
            </h2>

            <p className="mt-3 leading-7 text-slate-400">
              The next upgrade will allow EDGE X PRO to review
              your saved trade screenshots and combine chart
              context with your Journal data.
            </p>

            <div className="mt-5 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-400">
              Coming in the AI integration stage
            </div>
          </div>
        </section>
        <div className="mt-8">
          <AICoachCard trades={trades} />
        </div>
        <div className="mt-8">
  {trades.length > 0 && (
    <TradeQualityCard
      trade={{
        rr: 2,
        riskPercent: trades[trades.length - 1].risk ?? 1,
        followedPlan:
          trades[trades.length - 1].ruleFollowed?.toLowerCase() === "yes",
        respectedStopLoss: true,
        emotions: trades[trades.length - 1].emotion ?? "",
        outcome:
          (trades[trades.length - 1].pnl ?? 0) > 0
            ? "WIN"
            : (trades[trades.length - 1].pnl ?? 0) < 0
            ? "LOSS"
            : "BE",
      }}
    />
  )}
</div>
        <div className="mt-8">
          {trades.length > 0 && (
            <MistakeDetectorCard trades={trades} />
          )}
        </div>
      </main>
    </div>
  );
}

function formatMoney(
  value: number
) {
  if (value > 0) {
    return `+$${value.toFixed(
      2
    )}`;
  }

  if (value < 0) {
    return `-$${Math.abs(
      value
    ).toFixed(2)}`;
  }

  return "$0.00";
}

function ScoreCard({
  title,
  value,
  description,
  status,
}: {
  title: string;
  value: string;
  description: string;
  status:
    | "good"
    | "medium"
    | "bad";
}) {
  const valueClass =
    status === "good"
      ? "text-emerald-400"
      : status === "medium"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function InsightCard({
  insight,
}: {
  insight: Insight;
}) {
  const styles = {
    positive: {
      icon: "✓",
      border:
        "border-emerald-500/20",
      background:
        "bg-emerald-500/5",
      iconBackground:
        "bg-emerald-500/10",
      iconText:
        "text-emerald-400",
    },

    warning: {
      icon: "!",
      border:
        "border-yellow-500/20",
      background:
        "bg-yellow-500/5",
      iconBackground:
        "bg-yellow-500/10",
      iconText:
        "text-yellow-400",
    },

    danger: {
      icon: "!",
      border:
        "border-red-500/20",
      background:
        "bg-red-500/5",
      iconBackground:
        "bg-red-500/10",
      iconText:
        "text-red-400",
    },

    neutral: {
      icon: "i",
      border:
        "border-blue-500/20",
      background:
        "bg-blue-500/5",
      iconBackground:
        "bg-blue-500/10",
      iconText:
        "text-blue-400",
    },
  };

  const style =
    styles[insight.type];

  return (
    <div
      className={`rounded-2xl border p-5 ${style.border} ${style.background}`}
    >
      <div className="flex gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${style.iconBackground} ${style.iconText}`}
        >
          {style.icon}
        </div>

        <div>
          <h3 className="font-bold text-white">
            {insight.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {insight.description}
          </p>
        </div>
      </div>
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

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function DataRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span
        className={`text-lg font-bold ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center text-slate-500">
      Add more trades to generate analysis.
    </div>
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