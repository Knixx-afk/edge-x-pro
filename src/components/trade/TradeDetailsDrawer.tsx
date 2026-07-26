"use client";

import { useState, useEffect } from "react";
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
  chartImages?: string[];
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

  const [currentImage, setCurrentImage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const images = trade.chartImages || [];

  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowLeft")
        setCurrentImage((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight")
        setCurrentImage((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen, images.length]);


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

        <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-900 p-6">

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


        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <h3 className="mb-4 text-xl font-bold">Trade Screenshots</h3>
          {images.length ? (
            <>
              <div className="relative">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-white text-sm">Image {currentImage + 1} / {images.length}</div>

          <img
                  src={images[currentImage]}
                  onClick={()=>setFullscreen(true)} className="h-80 w-full rounded-xl object-contain bg-slate-950 cursor-pointer transition hover:scale-[1.01]"
                />
                <button onClick={() => setCurrentImage((currentImage-1+images.length)%images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2">◀</button>
                <button onClick={() => setCurrentImage((currentImage+1)%images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2">▶</button>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto scroll-smooth pb-2">
                {images.map((img,i)=>(
                  <img key={i} src={img} onClick={()=>{setCurrentImage(i);setFullscreen(true);}} className={`h-20 w-28 cursor-pointer rounded-lg object-cover border-2 ${i===currentImage?"border-yellow-400":"border-slate-700"}`} />
                ))}
              </div>
            </>
          ):(
            <p className="text-slate-400 text-lg">No screenshots available.</p>
          )}
        </div>

        <div className="mt-8"><h3 className="mb-4 text-2xl font-bold text-white">AI Trade Analysis</h3>
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

        <div className="mt-8">
          <MistakeDetectorCard trades={trades} />
        </div>

        <div className="mt-6 rounded-xl bg-slate-900 p-5">

          <h3 className="mb-3 text-lg font-semibold">
            Trading Journal
          </h3>

          <p className="whitespace-pre-wrap text-xl leading-10 text-slate-100">
            {trade.notes || "No notes added."}
          </p>

        </div>

      </aside>

      {fullscreen && images.length>0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-sm" onTouchStart={(e)=>setTouchStartX(e.touches[0].clientX)} onTouchEnd={(e)=>{if(touchStartX===null)return; const dx=e.changedTouches[0].clientX-touchStartX; if(dx>60)setCurrentImage((currentImage-1+images.length)%images.length); if(dx<-60)setCurrentImage((currentImage+1)%images.length); setTouchStartX(null);}} onClick={()=>{setFullscreen(false);setZoom(1);}}>
          <button
            onClick={()=>{setFullscreen(false);setZoom(1);}}
            className="absolute right-6 top-6 rounded-lg bg-slate-800 px-4 py-2 text-xl font-bold hover:bg-slate-700"
          >
            ✕
          </button>

          <button
            onClick={(e)=>{e.stopPropagation();setCurrentImage((currentImage-1+images.length)%images.length);}}
            className="absolute left-6 text-4xl"
          >
            ◀
          </button>

          <img
            src={images[currentImage]}
            onClick={(e)=>e.stopPropagation()}
            style={{transform:`scale(${zoom})`}}
            onWheel={(e)=>{
              e.preventDefault();
              setZoom(z=>Math.max(1,Math.min(5,z+(e.deltaY<0?0.2:-0.2))));
            }}
            onDoubleClick={() => setZoom(z=>z===1?2:1)}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain cursor-zoom-in transition-all duration-500 ease-in-out"
          />

          <button
            onClick={(e)=>{e.stopPropagation();setCurrentImage((currentImage+1)%images.length);}}
            className="absolute right-6 text-4xl"
          >
            ▶
          </button>
        
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 rounded-xl bg-slate-800/70 backdrop-blur-xl border border-slate-600 p-3">
            <button onClick={(e)=>{e.stopPropagation();setZoom(z=>Math.min(5,z+0.25));}} className="rounded bg-slate-700 px-3 py-2">＋</button>
            <button onClick={(e)=>{e.stopPropagation();setZoom(z=>Math.max(1,z-0.25));}} className="rounded bg-slate-700 px-3 py-2">－</button>
            <button onClick={(e)=>{e.stopPropagation();setZoom(1);}} className="rounded bg-slate-700 px-3 py-2">Reset</button>
          </div>

        </div>
      )}

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
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-sm uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-bold text-white">
        {value || "-"}
      </div>
    </div>
  );
}