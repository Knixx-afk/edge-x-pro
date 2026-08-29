"use client";

import { useMemo, useState } from "react";

type Props = {
  symbol?: string;
  height?: number;
};

const timeframes = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "1D", value: "D" },
];

export default function TradingViewChart({
  symbol = "OANDA:XAUUSD",
  height = 620,
}: Props) {
  const [interval, setInterval] = useState("15");
  const [fullscreen, setFullscreen] = useState(false);

  const chartUrl = useMemo(() => {
    const params = new URLSearchParams({
      symbol,
      interval,
      theme: "dark",
      style: "1",
      timezone: "Asia/Kolkata",
      withdateranges: "1",
      hide_side_toolbar: "0",
      allow_symbol_change: "1",
      saveimage: "1",
      toolbarbg: "#111827",
      details: "1",
      hotlist: "1",
      calendar: "1",
      studies: "[]",
      locale: "en",
      utm_source: "edge_x_pro",
      utm_medium: "widget",
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [symbol, interval]);

  return (
    <section
      className={
        fullscreen
          ? "fixed inset-0 z-[100] flex flex-col bg-slate-950 p-4"
          : "rounded-2xl border border-slate-800 bg-slate-900 p-5"
      }
    >
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            Live Market Chart
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {symbol.replace(":", " • ")} · TradingView
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {timeframes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setInterval(item.value)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                interval === item.value
                  ? "bg-yellow-400 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setFullscreen((value) => !value)}
            className="ml-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:border-yellow-400"
          >
            {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
        style={{
          height: fullscreen ? "calc(100vh - 120px)" : `${height}px`,
        }}
      >
        <iframe
          key={`${symbol}-${interval}`}
          title="EDGE X PRO Live Trading Chart"
          src={chartUrl}
          className="h-full w-full border-0"
          allowFullScreen
        />
      </div>

      {!fullscreen && (
        <p className="mt-3 text-xs text-slate-500">
          Market chart data is provided through the TradingView widget.
        </p>
      )}
    </section>
  );
}
