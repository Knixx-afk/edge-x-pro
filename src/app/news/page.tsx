"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";

type EventCategory =
  | "CPI"
  | "PPI"
  | "NFP"
  | "UNEMPLOYMENT"
  | "FOMC";

type EconomicEvent = {
  id: string;
  date: string;
  time: string;
  currency: string;
  event: string;
  category: EventCategory;
  impact: "High";
  previous: string;
  forecast: string;
  actual: string;
  source: string;
  sourceUrl: string;
  relevance: string;
};

type HistoryPoint = {
  year: number;
  month: number;
  monthName: string;
  value: number;
  rawValue: string;
  monthlyChange: number | null;
  payrollChange: number | null;
};

type HistoryResult = {
  eventType: string;
  name: string;
  seriesId: string;
  unit: string;
  latest: HistoryPoint | null;
  history: HistoryPoint[];
};

const HISTORY_TYPE: Record<string, string> = {
  "Consumer Price Index (CPI)": "CPI",
  "Core CPI": "CORE_CPI",
  "Producer Price Index (PPI)": "PPI",
  "Core PPI": "CORE_PPI",
  "Nonfarm Payrolls (NFP)": "NFP",
  "Unemployment Rate": "UNEMPLOYMENT",
};

export default function NewsPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [selectedEvent, setSelectedEvent] =
    useState<EconomicEvent | null>(null);

  const [history, setHistory] = useState<HistoryResult | null>(
    null
  );

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEvent) {
      setHistory(null);
      return;
    }

    loadHistory(selectedEvent);
  }, [selectedEvent]);

  async function loadEvents() {
    try {
      setLoadingEvents(true);
      setError("");

      const response = await fetch("/api/economic-calendar", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Could not load economic events."
        );
      }

      const loadedEvents: EconomicEvent[] = data.events || [];

      setEvents(loadedEvents);

      if (loadedEvents.length > 0) {
        setSelectedEvent(loadedEvents[0]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load economic events."
      );
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadHistory(event: EconomicEvent) {
    const eventType = HISTORY_TYPE[event.event];

    if (!eventType) {
      setHistory(null);
      setHistoryError(
        event.category === "FOMC"
          ? "FOMC historical data will be connected separately."
          : "Historical data is not available for this event yet."
      );
      return;
    }

    try {
      setLoadingHistory(true);
      setHistoryError("");
      setHistory(null);

      const response = await fetch(
        `/api/economic-history?event=${encodeURIComponent(
          eventType
        )}&years=5`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Could not load historical data."
        );
      }

      setHistory(data.results?.[0] || null);
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Could not load historical data."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  const highImpactCount = events.length;

  const latestValue = useMemo(() => {
    if (!history?.latest) {
      return "—";
    }

    return formatTradingValue(
      selectedEvent?.event || "",
      history.latest
    );
  }, [history, selectedEvent]);

  const nextEvent = events[0];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">
                XAUUSD News Intelligence
              </h1>

              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-400">
                HIGH IMPACT ONLY
              </span>
            </div>

            <p className="mt-2 text-slate-400">
              CPI, PPI, NFP, Unemployment and FOMC intelligence
              focused on gold trading.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Data Status
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

              <span className="text-sm font-semibold text-emerald-400">
                Official Data Connected
              </span>
            </div>
          </div>
        </div>

        {/* TOP CARDS */}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Upcoming Events"
            value={String(events.length)}
          />

          <StatCard
            title="High Impact"
            value={String(highImpactCount)}
            valueClass="text-red-400"
          />

          <StatCard
            title="Primary Market"
            value="XAUUSD"
            valueClass="text-yellow-400"
          />

          <StatCard
            title="Next Event"
            value={
              nextEvent
                ? `${nextEvent.date}`
                : "—"
            }
            small
          />
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        )}

        {/* MAIN GRID */}

        <div className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-[1.35fr_1fr]">
          {/* CALENDAR */}

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 p-6">
              <h2 className="text-xl font-bold">
                Upcoming High-Impact News
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Only major USD events selected for XAUUSD analysis.
              </p>
            </div>

            {loadingEvents ? (
              <div className="flex min-h-[350px] items-center justify-center text-slate-400">
                Loading economic calendar...
              </div>
            ) : events.length === 0 ? (
              <div className="flex min-h-[350px] items-center justify-center text-slate-500">
                No upcoming events found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40">
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Previous</TableHead>
                      <TableHead>Forecast</TableHead>
                      <TableHead>Actual</TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {events.map((event) => {
                      const selected =
                        selectedEvent?.id === event.id;

                      return (
                        <tr
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`cursor-pointer border-b border-slate-800 transition last:border-0 hover:bg-slate-800/60 ${
                            selected
                              ? "bg-yellow-400/5"
                              : ""
                          }`}
                        >
                          <TableCell>{event.date}</TableCell>

                          <TableCell>
                            <span className="font-bold">
                              {event.time}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div>
                              <p className="font-semibold text-white">
                                {event.event}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                USD / XAUUSD
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                              HIGH
                            </span>
                          </TableCell>

                          <TableCell>
                            {selected &&
                            history?.latest
                              ? latestValue
                              : event.previous}
                          </TableCell>

                          <TableCell>
                            <span className="text-yellow-400">
                              {event.forecast}
                            </span>
                          </TableCell>

                          <TableCell>
                            {event.actual}
                          </TableCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* EVENT INTELLIGENCE */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            {!selectedEvent ? (
              <div className="flex min-h-[400px] items-center justify-center text-slate-500">
                Select an event.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-400">
                    USD
                  </span>

                  <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                    HIGH IMPACT
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-bold">
                  {selectedEvent.event}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {selectedEvent.date} at {selectedEvent.time}
                </p>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <ValueBox
                    label="Previous"
                    value={
                      loadingHistory
                        ? "Loading..."
                        : latestValue
                    }
                  />

                  <ValueBox
                    label="Forecast"
                    value={selectedEvent.forecast}
                  />

                  <ValueBox
                    label="Actual"
                    value={selectedEvent.actual}
                  />
                </div>

                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    XAUUSD Relevance
                  </p>

                  <p className="mt-2 font-bold text-yellow-400">
                    {selectedEvent.relevance}
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Historical Source
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    {history
                      ? "U.S. Bureau of Labor Statistics"
                      : selectedEvent.source}
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-xl bg-yellow-400/50 px-5 py-3 font-bold text-slate-950"
                >
                  AI Prediction Engine — Next Step
                </button>
              </>
            )}
          </section>
        </div>

        {/* HISTORICAL DATA */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Historical Same-Event Data
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Official historical results for{" "}
                  {selectedEvent?.event || "the selected event"}.
                </p>
              </div>

              {history && (
                <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">
                  BLS VERIFIED DATA
                </span>
              )}
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex min-h-[300px] items-center justify-center text-slate-400">
              Loading official historical data...
            </div>
          ) : historyError ? (
            <div className="flex min-h-[250px] items-center justify-center p-8 text-center text-slate-500">
              {historyError}
            </div>
          ) : !history ? (
            <div className="flex min-h-[250px] items-center justify-center text-slate-500">
              No historical data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40">
                    <TableHead>Period</TableHead>
                    <TableHead>Official Value</TableHead>
                    <TableHead>Reported Change</TableHead>
                    <TableHead>Direction</TableHead>
                  </tr>
                </thead>

                <tbody>
                  {history.history
                    .slice(0, 12)
                    .map((item, index) => {
                      const tradingValue =
                        formatTradingValue(
                          selectedEvent?.event || "",
                          item
                        );

                      const change =
                        getRelevantChange(
                          selectedEvent?.event || "",
                          item
                        );

                      return (
                        <tr
                          key={`${item.year}-${item.month}-${index}`}
                          className="border-b border-slate-800 last:border-0"
                        >
                          <TableCell>
                            <span className="font-semibold text-white">
                              {item.monthName} {item.year}
                            </span>
                          </TableCell>

                          <TableCell>
                            {formatOfficialValue(
                              selectedEvent?.event || "",
                              item
                            )}
                          </TableCell>

                          <TableCell>
                            <span className="font-bold text-white">
                              {tradingValue}
                            </span>
                          </TableCell>

                          <TableCell>
                            <DirectionBadge
                              value={change}
                            />
                          </TableCell>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* PREVIEW OF NEXT ENGINE */}

        <section className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
          <h2 className="text-xl font-bold text-yellow-400">
            AI XAUUSD Pre-News Intelligence
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            The next engine will combine historical economic
            releases, historical gold reactions, current market
            conditions and pre-event expectations to generate
            probability-based bullish, bearish and neutral
            scenarios.
          </p>
        </section>
      </main>
    </div>
  );
}

function formatTradingValue(
  eventName: string,
  item: HistoryPoint
) {
  if (eventName === "Nonfarm Payrolls (NFP)") {
    if (item.payrollChange === null) {
      return "—";
    }

    const sign =
      item.payrollChange > 0 ? "+" : "";

    return `${sign}${item.payrollChange}K`;
  }

  if (eventName === "Unemployment Rate") {
    return `${item.value}%`;
  }

  if (item.monthlyChange === null) {
    return "—";
  }

  const sign =
    item.monthlyChange > 0 ? "+" : "";

  return `${sign}${item.monthlyChange.toFixed(2)}%`;
}

function formatOfficialValue(
  eventName: string,
  item: HistoryPoint
) {
  if (eventName === "Unemployment Rate") {
    return `${item.value}%`;
  }

  if (eventName === "Nonfarm Payrolls (NFP)") {
    return `${item.value.toLocaleString()}K`;
  }

  return item.value.toFixed(3);
}

function getRelevantChange(
  eventName: string,
  item: HistoryPoint
) {
  if (eventName === "Nonfarm Payrolls (NFP)") {
    return item.payrollChange;
  }

  if (eventName === "Unemployment Rate") {
    return null;
  }

  return item.monthlyChange;
}

function DirectionBadge({
  value,
}: {
  value: number | null;
}) {
  if (value === null) {
    return (
      <span className="text-slate-500">
        —
      </span>
    );
  }

  if (value > 0) {
    return (
      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
        ▲ INCREASE
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
        ▼ DECREASE
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
      UNCHANGED
    </span>
  );
}

function StatCard({
  title,
  value,
  valueClass = "text-white",
  small = false,
}: {
  title: string;
  value: string;
  valueClass?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p
        className={`mt-2 font-bold ${valueClass} ${
          small
            ? "text-xl"
            : "text-3xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ValueBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4 text-center">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-5 py-4 text-sm text-slate-300">
      {children}
    </td>
  );
}