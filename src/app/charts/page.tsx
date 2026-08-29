"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MT5LiveChart from "@/components/charts/MT5LiveChart";

const timeframes = ["M1", "M5", "M15", "M30", "H1", "H4"];

export default function ChartsPage() {
  const [timeframe, setTimeframe] = useState("M1");

  return (
    <div className="flex min-h-screen bg-[#070d1b] text-white">
      <Sidebar />
      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-yellow-400">EDGE X PRO</p>
            <h1 className="mt-2 text-3xl font-extrabold lg:text-4xl">Live Charts</h1>
            <p className="mt-2 text-slate-400">
              Real-time XAUUSD market data directly from your WinPro MT5 broker.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
              MT5 LIVE DATA
            </div>
            <p className="mt-1 text-xs text-slate-400">Winprofx Limited · XAUUSD</p>
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-800 bg-[#111a2d] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-white">Chart Timeframe</h2>
              <p className="mt-1 text-sm text-slate-500">Select the timeframe for your market analysis.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {timeframes.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTimeframe(item)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    timeframe === item
                      ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/10"
                      : "border border-slate-700 bg-[#070d1b] text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <MT5LiveChart />

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <InfoCard title="Live Broker Data" value="WinPro MT5" description="Prices and candles come directly from the MT5 terminal used by EDGE X PRO." accent="text-emerald-400" />
          <InfoCard title="Primary Instrument" value="XAUUSD" description="Gold CFD market data from your configured Winprofx Limited account." accent="text-yellow-400" />
          <InfoCard title="Automatic Refresh" value="Every 3 Seconds" description="EDGE X PRO automatically requests fresh MT5 candles and current bid/ask prices." accent="text-cyan-400" />
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-[#111a2d] p-6">
          <h2 className="text-xl font-bold text-white">EDGE X PRO Chart Roadmap</h2>
          <p className="mt-2 text-sm text-slate-400">
            The live broker chart is now the foundation. Next we can connect your trading intelligence directly to this chart.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <RoadmapItem number="01" title="Saved Trades" text="Display your journal entries on the chart." />
            <RoadmapItem number="02" title="Trade Levels" text="Show Entry, Stop Loss and Take Profit." />
            <RoadmapItem number="03" title="News Events" text="Mark CPI, NFP and FOMC events." />
            <RoadmapItem number="04" title="EDGE X Signals" text="Overlay your technical intelligence." />
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoCard({ title, value, description, accent }: { title: string; value: string; description: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111a2d] p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <h3 className={`mt-3 text-xl font-extrabold ${accent}`}>{value}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function RoadmapItem({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-xl bg-[#070d1b] p-4">
      <span className="text-xs font-black text-yellow-400">{number}</span>
      <h3 className="mt-2 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-slate-500">{text}</p>
    </div>
  );
}
