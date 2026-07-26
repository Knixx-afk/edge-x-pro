"use client";

import { detectMistakes } from "@/lib/mistakeDetector";

type Trade = {
  pnl?: number;
  risk?: number;
  emotion?: string;
  ruleFollowed?: string;
  planned?: boolean;
};

export default function MistakeDetectorCard({
  trades,
}: {
  trades: Trade[];
}) {
  const report = detectMistakes(trades);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold">
          AI Mistake Detector
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Detect recurring trading mistakes automatically.
        </p>
      </div>

      <div className="space-y-3">
        {report.mistakes.map((mistake, index) => (
          <div
            key={index}
            className="rounded-lg border border-red-900 bg-red-950/40 p-4"
          >
            <p className="text-red-300">
              ⚠ {mistake}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}