"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { Bell, BellOff, Check, ChevronDown, CircleDot, Pause, Play, Plus, RefreshCw, Trash2, Volume2, VolumeX, Wifi, WifiOff, X } from "lucide-react";

type AlertItem = {
  id: string;
  price: number;
  enabled: boolean;
  triggered: boolean;
  createdAt: number;
};

type Tick = {
  connected: boolean;
  symbol?: string;
  bid?: number;
  ask?: number;
  last?: number;
  time?: number;
  error?: string;
};

type Bar = { time: number; open: number; high: number; low: number; close: number };

const STORAGE_KEY = "edge-x-manual-price-alerts-v1";
const MAX_ALERTS = 200;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadAlerts(): AlertItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function LiveTerminalPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [newPrice, setNewPrice] = useState("");
  const [tick, setTick] = useState<Tick>({ connected: false });
  const [bars, setBars] = useState<Bar[]>([]);
  const [timeframe, setTimeframe] = useState("M5");
  const [running, setRunning] = useState(true);
  const [sound, setSound] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [lastAlert, setLastAlert] = useState<AlertItem | null>(null);
  const previousPrice = useRef<number | null>(null);

  useEffect(() => {
    setAlerts(loadAlerts());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const fetchTick = useCallback(async () => {
    try {
      const response = await fetch("/api/mt5/tick", { cache: "no-store" });
      const data = await response.json();
      setTick(data);
      if (typeof data.bid === "number") {
        const previous = previousPrice.current;
        previousPrice.current = data.bid;
        if (running && previous !== null) {
          checkAlerts(previous, data.bid);
        }
      }
    } catch {
      setTick({ connected: false, error: "Unable to reach MT5 bridge" });
    }
  }, [running, alerts]);

  const fetchBars = useCallback(async () => {
    try {
      const response = await fetch(`/api/mt5/bars?timeframe=${timeframe}&limit=120`, { cache: "no-store" });
      const data = await response.json();
      if (Array.isArray(data.bars)) setBars(data.bars);
    } catch {
      setBars([]);
    }
  }, [timeframe]);

  useEffect(() => {
    if (!running) return;
    fetchTick();
    const id = window.setInterval(fetchTick, 1000);
    return () => window.clearInterval(id);
  }, [fetchTick, running]);

  useEffect(() => {
    fetchBars();
    const id = window.setInterval(fetchBars, 5000);
    return () => window.clearInterval(id);
  }, [fetchBars]);

  function checkAlerts(previous: number, current: number) {
    const hits = alerts.filter((item) => {
      if (!item.enabled || item.triggered) return false;
      return (previous < item.price && current >= item.price) || (previous > item.price && current <= item.price);
    });
    if (!hits.length) return;

    setAlerts((currentAlerts) => currentAlerts.map((item) => hits.some((hit) => hit.id === item.id) ? { ...item, triggered: true } : item));
    setLastAlert(hits[hits.length - 1]);

    const priceText = current.toFixed(2);
    if (sound) playAlertSound();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      hits.forEach((hit) => new Notification("EDGE X PRO — XAUUSD Alert", { body: `Price reached ${hit.price.toFixed(2)} (current ${priceText})` }));
    }
  }

  async function requestNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  function addAlert() {
    const value = Number(newPrice);
    if (!Number.isFinite(value) || value <= 0 || alerts.length >= MAX_ALERTS) return;
    setAlerts((items) => [...items, { id: makeId(), price: value, enabled: true, triggered: false, createdAt: Date.now() }].sort((a, b) => a.price - b.price));
    setNewPrice("");
  }

  function removeAlert(id: string) {
    setAlerts((items) => items.filter((item) => item.id !== id));
  }

  function toggleAlert(id: string) {
    setAlerts((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item));
  }

  function rearmAlert(id: string) {
    setAlerts((items) => items.map((item) => item.id === id ? { ...item, triggered: false, enabled: true } : item));
  }

  function playAlertSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.18);
    } catch {
      // Browser may block audio until the user interacts with the page.
    }
  }

  const activeCount = alerts.filter((item) => item.enabled && !item.triggered).length;
  const triggeredCount = alerts.filter((item) => item.triggered).length;
  const currentPrice = tick.bid ?? tick.last ?? null;
  const displaySymbol = tick.symbol || "XAUUSD";

  const chart = useMemo(() => {
    const source = bars.length ? bars.slice(-100) : [];
    if (!source.length) return null;
    const min = Math.min(...source.map((bar) => bar.low));
    const max = Math.max(...source.map((bar) => bar.high));
    const padding = Math.max((max - min) * 0.08, 0.5);
    const lo = min - padding;
    const hi = max + padding;
    const width = 1000;
    const height = 430;
    const candleWidth = width / source.length;
    const y = (price: number) => height - ((price - lo) / (hi - lo)) * height;
    return { source, width, height, candleWidth, y, lo, hi };
  }, [bars]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Live XAUUSD Terminal</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tick.connected ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                {tick.connected ? "MT5 CONNECTED" : "MT5 OFFLINE"}
              </span>
            </div>
            <p className="mt-2 text-slate-400">Your manual price alerts. No TradingView alert limits.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRunning((value) => !value)} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm hover:bg-slate-800">
              {running ? <Pause size={16} /> : <Play size={16} />} {running ? "Pause" : "Resume"}
            </button>
            <button onClick={() => setSound((value) => !value)} className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 hover:bg-slate-800" title="Alert sound">
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={requestNotifications} className="flex items-center gap-2 rounded-xl bg-[#E8B54A] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110">
              <Bell size={16} /> {notificationPermission === "granted" ? "Push Enabled" : "Enable Push"}
            </button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-5">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Symbol</div>
                  <div className="text-xl font-bold">{displaySymbol}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Bid</div>
                  <div className="text-2xl font-bold tabular-nums">{currentPrice !== null ? currentPrice.toFixed(2) : "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Ask</div>
                  <div className="text-lg font-semibold tabular-nums">{tick.ask !== undefined ? tick.ask.toFixed(2) : "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Spread</div>
                  <div className="text-lg font-semibold tabular-nums">{tick.bid !== undefined && tick.ask !== undefined ? (tick.ask - tick.bid).toFixed(2) : "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notificationPermission === "granted" ? <Wifi size={16} className="text-emerald-400" /> : <WifiOff size={16} className="text-slate-500" />}
                <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1">
                  {["M1", "M5", "M15", "M30", "H1", "H4", "D1"].map((tf) => (
                    <button key={tf} onClick={() => setTimeframe(tf)} className={`rounded-md px-2.5 py-1 text-xs ${timeframe === tf ? "bg-[#E8B54A] font-semibold text-slate-950" : "text-slate-400 hover:text-white"}`}>{tf}</button>
                  ))}
                </div>
                <button onClick={fetchBars} className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800"><RefreshCw size={15} /></button>
              </div>
            </div>

            <div className="relative h-[520px] overflow-hidden rounded-xl border border-slate-800 bg-[#0b111b]">
              {chart ? (
                <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-full w-full" preserveAspectRatio="none">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const yy = ratio * chart.height;
                    const price = chart.hi - ratio * (chart.hi - chart.lo);
                    return <g key={ratio}><line x1="0" x2={chart.width} y1={yy} y2={yy} stroke="#1f2937" /><text x="8" y={yy + 14} fill="#64748b" fontSize="12">{price.toFixed(2)}</text></g>;
                  })}
                  {alerts.filter((item) => item.enabled).map((item) => {
                    if (item.price < chart.lo || item.price > chart.hi) return null;
                    const yy = chart.y(item.price);
                    return <g key={`line-${item.id}`}><line x1="0" x2={chart.width} y1={yy} y2={yy} stroke={item.triggered ? "#64748b" : "#E8B54A"} strokeDasharray="8 6" /><text x={chart.width - 110} y={yy - 6} fill={item.triggered ? "#64748b" : "#E8B54A"} fontSize="12">{item.price.toFixed(2)}</text></g>;
                  })}
                  {chart.source.map((bar, index) => {
                    const x = index * chart.candleWidth + chart.candleWidth * 0.5;
                    const openY = chart.y(bar.open);
                    const closeY = chart.y(bar.close);
                    const highY = chart.y(bar.high);
                    const lowY = chart.y(bar.low);
                    const up = bar.close >= bar.open;
                    const bodyY = Math.min(openY, closeY);
                    const bodyH = Math.max(1.5, Math.abs(closeY - openY));
                    return <g key={bar.time}><line x1={x} x2={x} y1={highY} y2={lowY} stroke={up ? "#34d399" : "#fb7185"} strokeWidth="1.2" /><rect x={x - chart.candleWidth * 0.28} y={bodyY} width={chart.candleWidth * 0.56} height={bodyH} fill={up ? "#34d399" : "#fb7185"} /></g>;
                  })}
                  {currentPrice !== null && currentPrice >= chart.lo && currentPrice <= chart.hi && <g><line x1="0" x2={chart.width} y1={chart.y(currentPrice)} y2={chart.y(currentPrice)} stroke="#38bdf8" strokeDasharray="3 4" /><text x="8" y={chart.y(currentPrice) - 7} fill="#38bdf8" fontSize="12">LIVE {currentPrice.toFixed(2)}</text></g>}
                </svg>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                  <CircleDot size={36} className="mb-3" />
                  <div className="font-semibold text-slate-300">Waiting for MT5 market data</div>
                  <div className="mt-1 text-sm">Start the EDGE X PRO MT5 bridge on your Windows trading machine.</div>
                </div>
              )}
            </div>
            {tick.error && <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{tick.error}</div>}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Manual Price Alerts</h2>
                <p className="text-xs text-slate-500">{activeCount} active · {triggeredCount} triggered · {alerts.length}/{MAX_ALERTS}</p>
              </div>
              <button onClick={() => setAlerts([])} className="text-xs text-slate-500 hover:text-red-300">Clear all</button>
            </div>

            <div className="mb-4 flex gap-2">
              <input value={newPrice} onChange={(event) => setNewPrice(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addAlert(); }} type="number" step="0.01" placeholder="Enter XAUUSD price" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-[#E8B54A]" />
              <button onClick={addAlert} disabled={!newPrice || alerts.length >= MAX_ALERTS} className="rounded-xl bg-[#E8B54A] px-3 text-slate-950 disabled:opacity-40"><Plus size={19} /></button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">TOTAL</div><div className="mt-1 font-bold">{alerts.length}</div></div>
              <div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">ACTIVE</div><div className="mt-1 font-bold text-emerald-300">{activeCount}</div></div>
              <div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-500">HIT</div><div className="mt-1 font-bold text-slate-300">{triggeredCount}</div></div>
            </div>

            <div className="max-h-[610px] space-y-2 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Enter a price above to create your first alert.</div>
              ) : alerts.map((item, index) => (
                <div key={item.id} className={`flex items-center gap-2 rounded-xl border p-3 ${item.triggered ? "border-slate-800 bg-slate-950/50 opacity-70" : item.enabled ? "border-[#E8B54A]/30 bg-[#E8B54A]/5" : "border-slate-800 bg-slate-950"}`}>
                  <div className="w-7 text-xs text-slate-600">{index + 1}</div>
                  <div className="flex-1"><div className="font-semibold tabular-nums">{item.price.toFixed(2)}</div><div className="text-[11px] text-slate-500">{item.triggered ? "Triggered — re-arm to reuse" : item.enabled ? "Watching live price" : "Disabled"}</div></div>
                  <button onClick={() => toggleAlert(item.id)} className={`rounded-lg p-2 ${item.enabled ? "text-emerald-300 hover:bg-emerald-500/10" : "text-slate-600 hover:bg-slate-800"}`} title={item.enabled ? "Disable" : "Enable"}>{item.enabled ? <Bell size={15} /> : <BellOff size={15} />}</button>
                  {item.triggered && <button onClick={() => rearmAlert(item.id)} className="rounded-lg p-2 text-[#E8B54A] hover:bg-[#E8B54A]/10" title="Re-arm"><RefreshCw size={15} /></button>}
                  <button onClick={() => removeAlert(item.id)} className="rounded-lg p-2 text-slate-600 hover:bg-red-500/10 hover:text-red-300" title="Delete"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>

            {lastAlert && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <Check className="mt-0.5 text-emerald-300" size={18} />
                <div className="flex-1 text-sm"><div className="font-semibold text-emerald-200">Alert triggered</div><div className="text-emerald-300/80">XAUUSD reached {lastAlert.price.toFixed(2)}</div></div>
                <button onClick={() => setLastAlert(null)}><X size={15} className="text-slate-500" /></button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
