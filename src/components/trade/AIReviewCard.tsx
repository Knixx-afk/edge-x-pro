"use client";

import {
  calculateTradeQuality,
  type Trade,
} from "@/lib/tradeQuality";

type Props = {
  trade: Trade;
};

export default function AIReviewCard({ trade }: Props) {
  const review = calculateTradeQuality(trade);
  
  const scoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 75) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cyan-400">
            🤖 AI Trade Review
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Automatic analysis generated from your trade.
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase text-slate-500">
            Edge Score
          </div>

          <div
            className={`text-4xl font-black ${scoreColor(
  review.score
)}`}
>
  {review.score}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ScoreCard
          title="Risk"
          value={review.riskScore}
        />

        <ScoreCard
          title="Execution"
          value={review.executionScore}
        />

        <ScoreCard
          title="Psychology"
          value={review.psychologyScore}
        />

        <ScoreCard
          title="Discipline"
          value={review.disciplineScore}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Section
          title="✅ Strengths"
          color="text-emerald-400"
          items={review.strengths}
          empty="No strengths detected."
        />

        <Section
          title="⚠️ Mistakes"
          color="text-red-400"
          items={review.weaknesses}
          empty="No major mistakes detected."
        />

        <Section
          title="💡 Recommendations"
          color="text-yellow-400"
          items={review.recommendations}
          empty="Keep following your trading plan."
        />
      </div>

      <div className="mt-8 rounded-xl bg-slate-950 p-5">
        <h3 className="font-semibold text-cyan-400">
          AI Summary
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          {review.summary}
        </p>
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  const color =
    value >= 90
      ? "text-emerald-400"
      : value >= 75
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="rounded-xl bg-slate-950 p-5 text-center">
      <div className="text-xs uppercase text-slate-500">
        {title}
      </div>

      <div className={`mt-3 text-3xl font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  color,
  items,
  empty,
}: {
  title: string;
  color: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-5">
      <h3 className={`font-bold ${color}`}>
        {title}
      </h3>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="text-sm text-slate-300"
            >
              • {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}