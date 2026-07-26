"use client";

import { TrendingUp, TrendingDown, Clock, Brain } from "lucide-react";

type DashboardHeaderProps = {
  bias?: "Bullish" | "Bearish" | "Neutral";
  confidence?: number;
  nextEvent?: string;
  countdown?: string;
};

export default function DashboardHeader({
  bias = "Bullish",
  confidence = 84,
  nextEvent = "Core CPI",
  countdown = "2d 04h 15m",
}: DashboardHeaderProps) {
  const isBullish = bias === "Bullish";
  const isBearish = bias === "Bearish";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold text-white">
            EDGE X PRO
          </h1>

          <p className="mt-2 text-slate-400">
            Institutional XAUUSD Intelligence Dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl bg-slate-950 border border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Brain size={18}/>
              AI Bias
            </div>

            <div
              className={`mt-3 flex items-center gap-2 text-xl font-bold ${
                isBullish
                  ? "text-emerald-400"
                  : isBearish
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {isBullish ? (
                <TrendingUp size={22}/>
              ) : (
                <TrendingDown size={22}/>
              )}

              {bias}
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 px-5 py-4">
            <div className="text-sm text-slate-400">
              AI Confidence
            </div>

            <div className="mt-3 text-2xl font-bold text-yellow-400">
              {confidence}%
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock size={18}/>
              Next Event
            </div>

            <div className="mt-2 font-bold">
              {nextEvent}
            </div>

            <div className="text-emerald-400 text-sm">
              {countdown}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}