"use client";

import { buildAICoach } from "@/lib/aiCoach";

type Trade = {
  pnl?: number;
  session?: string;
  strategy?: string;
  date?: string;
};

export default function AICoachCard({
  trades,
}: {
  trades: Trade[];
}) {
  const report = buildAICoach(trades);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold">
          AI Coach
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Personalized coaching based on your trading history.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CoachItem
          title="Best Session"
          value={report.bestSession}
          color="text-emerald-400"
        />

        <CoachItem
          title="Worst Session"
          value={report.worstSession}
          color="text-red-400"
        />

        <CoachItem
          title="Best Strategy"
          value={report.bestStrategy}
          color="text-emerald-400"
        />

        <CoachItem
          title="Worst Strategy"
          value={report.worstStrategy}
          color="text-red-400"
        />
      </div>

      <div className="mt-6 rounded-xl bg-slate-950 p-4">
        <h3 className="mb-3 font-semibold">
          AI Recommendations
        </h3>

        <ul className="space-y-2 text-sm text-slate-300">
          {report.message.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CoachItem({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className={`mt-2 text-lg font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}