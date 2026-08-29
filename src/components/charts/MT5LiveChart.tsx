"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type ChartResponse = {
  success: boolean;
  symbol?: string;
  timeframe?: string;
  price?: {
    bid?: number | null;
    ask?: number | null;
    last?: number | null;
  };
  candles?: Candle[];
  error?: string;
};

type Tool = "cursor" | "trend" | "horizontal";

type Point = {
  time: Time;
  price: number;
};

type TrendDrawing = {
  id: string;
  type: "trend";
  a: Point;
  b: Point;
};

type HorizontalDrawing = {
  id: string;
  type: "horizontal";
  price: number;
};

type Drawing = TrendDrawing | HorizontalDrawing;

type CursorPoint = {
  x: number;
  y: number;
  price: number | null;
};

const API_URL = "/api/mt5/chart";

export default function MT5LiveChart() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartHostRef = useRef<HTMLDivElement | null>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const initializedRef = useRef(false);
  const hasInitialDataRef = useRef(false);
  const latestRequestRef = useRef(0);

  // Refs are used inside the Lightweight Charts click callback.
  const toolRef = useRef<Tool>("cursor");
  const pendingPointRef = useRef<Point | null>(null);

  const [tool, setTool] = useState<Tool>("cursor");
  const [pendingPoint, setPendingPoint] = useState<Point | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [cursorPoint, setCursorPoint] = useState<CursorPoint | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("H4");
  const [bid, setBid] = useState<number | null>(null);
  const [ask, setAsk] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setActiveTool = useCallback((nextTool: Tool) => {
    toolRef.current = nextTool;
    pendingPointRef.current = null;
    setPendingPoint(null);
    setTool(nextTool);
  }, []);

  const addDrawingFromChartClick = useCallback(
    (param: MouseEventParams<Time>) => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      const activeTool = toolRef.current;

      if (!chart || !series || activeTool === "cursor") return;
      if (!param.point || param.time === undefined) return;

      // IMPORTANT:
      // We use Lightweight Charts' OWN click coordinates.
      // This fixes mouse/cursor mismatch caused by DOM/SVG offsets.
      const price = series.coordinateToPrice(param.point.y);

      if (price === null) return;

      const point: Point = {
        time: param.time,
        price: Number(price),
      };

      if (activeTool === "horizontal") {
        setDrawings((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            type: "horizontal",
            price: point.price,
          },
        ]);

        setRenderTick((value) => value + 1);
        return;
      }

      if (activeTool === "trend") {
        const firstPoint = pendingPointRef.current;

        if (!firstPoint) {
          pendingPointRef.current = point;
          setPendingPoint(point);
          return;
        }

        setDrawings((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            type: "trend",
            a: firstPoint,
            b: point,
          },
        ]);

        pendingPointRef.current = null;
        setPendingPoint(null);

        // Stay in Trend Line mode so you can draw multiple lines.
        setRenderTick((value) => value + 1);
      }
    },
    []
  );

  const refreshChart = useCallback(async () => {
    const requestId = ++latestRequestRef.current;

    try {
      setError("");

      const response = await fetch(
        `${API_URL}?timeframe=${encodeURIComponent(timeframe)}&t=${Date.now()}`,
        { cache: "no-store" }
      );

      const data: ChartResponse = await response.json();

      if (requestId !== latestRequestRef.current) return;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load MT5 chart data");
      }

      const candles = Array.isArray(data.candles) ? data.candles : [];

      if (seriesRef.current && candles.length > 0) {
        seriesRef.current.setData(
          candles.map((candle) => ({
            time: candle.time as Time,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
          }))
        );

        // Fit only once. Live updates must not reset your position.
        if (!hasInitialDataRef.current) {
          chartRef.current?.timeScale().fitContent();
          hasInitialDataRef.current = true;
        }

        // Redraw SVG drawings after live candles change.
        setRenderTick((value) => value + 1);
      }

      if (data.symbol) setSymbol(data.symbol);
      if (data.timeframe) setTimeframe(data.timeframe);

      setBid(data.price?.bid ?? null);
      setAsk(data.price?.ask ?? null);

      setUpdatedAt(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()) + " IST"
      );

      setLoading(false);
    } catch (err) {
      if (requestId !== latestRequestRef.current) return;

      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Failed to load MT5 chart"
      );
    }
  }, [timeframe]);

  useEffect(() => {
    const host = chartHostRef.current;
    if (!host || initializedRef.current) return;

    initializedRef.current = true;

    const chart = createChart(host, {
      width: host.clientWidth,
      height: host.clientHeight || 650,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#0b1220",
        },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#182337" },
        horzLines: { color: "#182337" },
      },
      rightPriceScale: {
        borderColor: "#263247",
      },
      timeScale: {
        borderColor: "#263247",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      // We draw our own cursor overlay using Lightweight Charts'
      // exact internal mouse coordinates. This avoids any DOM offset.
      crosshair: {
        mode: CrosshairMode.Hidden,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Drawing clicks use Lightweight Charts' exact internal coordinates.
    chart.subscribeClick(addDrawingFromChartClick);

    // Custom cursor also uses Lightweight Charts' exact internal point.
    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.point) {
        setCursorPoint(null);
        return;
      }

      const price = series.coordinateToPrice(param.point.y);

      setCursorPoint({
        x: param.point.x,
        y: param.point.y,
        price: price === null ? null : Number(price),
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Force the SVG drawing layer to follow zooming and panning.
    const redraw = () => setRenderTick((value) => value + 1);

    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);

    const resize = () => {
      const element = chartHostRef.current;
      if (!element || !chartRef.current) return;

      chartRef.current.applyOptions({
        width: element.clientWidth,
        height: element.clientHeight,
      });

      redraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    refreshChart();

    return () => {
      observer.disconnect();

      chart.unsubscribeClick(addDrawingFromChartClick);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw);

      chart.remove();

      chartRef.current = null;
      seriesRef.current = null;
      initializedRef.current = false;
      hasInitialDataRef.current = false;
    };
  }, [addDrawingFromChartClick, refreshChart]);

  useEffect(() => {
    if (!initializedRef.current) return;

    hasInitialDataRef.current = false;
    setLoading(true);
    refreshChart();
  }, [timeframe, refreshChart]);

  useEffect(() => {
    const interval = window.setInterval(refreshChart, 3000);
    return () => window.clearInterval(interval);
  }, [refreshChart]);

  const clearDrawings = () => {
    setDrawings([]);
    pendingPointRef.current = null;
    setPendingPoint(null);
    setActiveTool("cursor");
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await wrapperRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }

      // Give the browser a moment to resize the fullscreen container.
      window.setTimeout(() => {
        const host = chartHostRef.current;
        const chart = chartRef.current;

        if (host && chart) {
          chart.applyOptions({
            width: host.clientWidth,
            height: host.clientHeight,
          });
          setRenderTick((value) => value + 1);
        }
      }, 150);
    } catch {
      // Ignore browser fullscreen restrictions.
    }
  };

  // renderTick intentionally forces coordinate recalculation
  void renderTick;

  const pointToCoordinates = (point: Point) => {
    const chart = chartRef.current;
    const series = seriesRef.current;

    if (!chart || !series) return null;

    const x = chart.timeScale().timeToCoordinate(point.time);
    const y = series.priceToCoordinate(point.price);

    if (x === null || y === null) return null;

    return { x, y };
  };

  const renderDrawingLayer = () => {
    const host = chartHostRef.current;

    if (!host) return null;

    const width = host.clientWidth;
    const height = host.clientHeight;

    return (
      <svg
        className="pointer-events-none absolute inset-0 z-10"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Exact mouse cursor overlay. It never captures clicks. */}
        {cursorPoint && (
          <g className="pointer-events-none">
            <line
              x1={0}
              y1={cursorPoint.y}
              x2={width}
              y2={cursorPoint.y}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.9}
            />
            <line
              x1={cursorPoint.x}
              y1={0}
              x2={cursorPoint.x}
              y2={height}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.9}
            />
            {cursorPoint.price !== null && (
              <>
                <rect
                  x={Math.max(0, width - 92)}
                  y={Math.max(2, cursorPoint.y - 11)}
                  width={90}
                  height={22}
                  rx={4}
                  fill="#334155"
                />
                <text
                  x={width - 47}
                  y={cursorPoint.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight={700}
                >
                  {cursorPoint.price.toFixed(2)}
                </text>
              </>
            )}
          </g>
        )}

        {drawings.map((drawing) => {
          if (drawing.type === "horizontal") {
            const y = seriesRef.current?.priceToCoordinate(drawing.price);

            if (y === null || y === undefined) return null;

            return (
              <g key={drawing.id}>
                <line
                  x1={0}
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="#facc15"
                  strokeWidth={2}
                  strokeDasharray="8 5"
                />
                <rect
                  x={8}
                  y={y - 22}
                  width={88}
                  height={20}
                  rx={4}
                  fill="#111827"
                  opacity={0.92}
                />
                <text
                  x={14}
                  y={y - 8}
                  fill="#facc15"
                  fontSize={12}
                  fontWeight={700}
                >
                  {drawing.price.toFixed(2)}
                </text>
              </g>
            );
          }

          const a = pointToCoordinates(drawing.a);
          const b = pointToCoordinates(drawing.b);

          if (!a || !b) return null;

          return (
            <g key={drawing.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#facc15"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <circle cx={a.x} cy={a.y} r={5} fill="#facc15" />
              <circle cx={b.x} cy={b.y} r={5} fill="#facc15" />
            </g>
          );
        })}

        {tool === "trend" && pendingPoint
          ? (() => {
              const point = pointToCoordinates(pendingPoint);

              if (!point) return null;

              return (
                <g>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={7}
                    fill="#facc15"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  <text
                    x={point.x + 12}
                    y={point.y - 12}
                    fill="#facc15"
                    fontSize={12}
                    fontWeight={700}
                  >
                    First point
                  </text>
                </g>
              );
            })()
          : null}
      </svg>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className="flex h-[calc(100vh-120px)] min-h-[650px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#111827] shadow-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">
              {symbol} · {timeframe}
            </h2>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">
              ● LIVE
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            WinPro MT5 · Updated {updatedAt || "loading..."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {["M1", "M5", "M15", "M30", "H1", "H4"].map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                pendingPointRef.current = null;
                setPendingPoint(null);
              }}
              className={`rounded-md px-3 py-2 text-xs font-bold transition ${
                timeframe === tf
                  ? "bg-yellow-400 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {tf}
            </button>
          ))}

          <div className="mx-1 hidden h-7 w-px bg-slate-700 lg:block" />

          <button
            onClick={() => setActiveTool("cursor")}
            className={`rounded-md px-3 py-2 text-xs font-bold ${
              tool === "cursor"
                ? "bg-slate-600 text-white"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            ↖ Cursor
          </button>

          <button
            onClick={() => setActiveTool("trend")}
            className={`rounded-md px-3 py-2 text-xs font-bold ${
              tool === "trend"
                ? "bg-yellow-400 text-slate-950"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            ╱ Trend Line
          </button>

          <button
            onClick={() => setActiveTool("horizontal")}
            className={`rounded-md px-3 py-2 text-xs font-bold ${
              tool === "horizontal"
                ? "bg-yellow-400 text-slate-950"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            ─ Horizontal
          </button>

          <button
            onClick={clearDrawings}
            className="rounded-md bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-red-500/20 hover:text-red-300"
          >
            Clear
          </button>

          <button
            onClick={toggleFullscreen}
            className="rounded-md bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-600"
          >
            ⛶ Fullscreen
          </button>

          <div className="rounded-md bg-[#080f1f] px-3 py-2 text-xs">
            <span className="mr-1 text-slate-500">BID</span>
            <span className="font-bold text-red-400">
              {bid?.toFixed(2) ?? "--"}
            </span>
          </div>

          <div className="rounded-md bg-[#080f1f] px-3 py-2 text-xs">
            <span className="mr-1 text-slate-500">ASK</span>
            <span className="font-bold text-emerald-400">
              {ask?.toFixed(2) ?? "--"}
            </span>
          </div>
        </div>
      </div>

      {tool !== "cursor" && (
        <div className="border-b border-yellow-400/20 bg-yellow-400/5 px-4 py-2 text-center text-xs font-medium text-yellow-300">
          {tool === "trend"
            ? pendingPoint
              ? "Trend Line active: click the SECOND point."
              : "Trend Line active: click the FIRST point."
            : "Horizontal Line active: click the exact price level."}
        </div>
      )}

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      <div
        ref={chartHostRef}
        className="relative min-h-0 flex-1 cursor-crosshair"
      >
        {renderDrawingLayer()}

        {loading && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[#0b1220]/60 text-sm text-slate-300">
            Connecting to WinPro MT5...
          </div>
        )}
      </div>
    </div>
  );
}
