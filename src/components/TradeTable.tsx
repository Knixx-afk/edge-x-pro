"use client";

import TradeQualityCard from "@/components/ai/TradeQualityCard";
import MistakeDetectorCard from "@/components/ai/MistakeDetectorCard";

type Trade = {
  id?: number;
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
  planned?: boolean;
  notes?: string;
};

export default function TradeDetailsDrawer({
  trade,
  trades,
  open,
  onClose,
}: {
  trade: Trade | null;
  trades: Trade[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !trade) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl">

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Trade Details
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 rounded-xl bg-slate-900 p-5">

          <Info label="Date" value={trade.date} />

          <Info label="Time" value={trade.time} />

          <Info label="Symbol" value={trade.symbol} />

          <Info label="Direction" value={trade.direction} />

          <Info
            label="P&L"
            value={`$${Number(trade.pnl || 0).toFixed(2)}`}
          />

          <Info label="Session" value={trade.session} />

          <Info label="Strategy" value={trade.strategy} />

        </div>

        <div className="mt-6">
  <TradeQualityCard
    trade={{
      rr: 2,
      riskPercent: trade.risk ?? 1,
      followedPlan:
        trade.ruleFollowed?.toLowerCase() === "yes",
      respectedStopLoss: true,
      emotions: trade.emotion ?? "",
      outcome:
        (trade.pnl ?? 0) > 0
          ? "WIN"
          : (trade.pnl ?? 0) < 0
          ? "LOSS"
          : "BE",
    }}
  />
</div>

        <div className="mt-6">
          <MistakeDetectorCard trades={trades} />
        </div>

        <div className="mt-6 rounded-xl bg-slate-900 p-5">

          <h3 className="mb-3 text-lg font-semibold">
            Journal Notes
          </h3>

          <p className="text-slate-300 whitespace-pre-wrap">
            {trade.notes || "No notes added."}
          </p>

        </div>

      </aside>
    </>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div className="flex justify-between border-b border-slate-800 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">
        {value || "-"}
      </span>
    </div>
  );
}