"use client";

import { useEffect, useMemo, useState } from "react";

type Reaction = {
  success?: boolean;
  events?: string[];

  time_validation?: {
    news_time_ist?: string;
    winpro_chart_time?: string;
  };

  pre_news_behavior?: {
    available?: boolean;
    pre_news_direction?: string;
    pre_news_move_usd?: number;
    location?: string;
  };

  impulse_candle?: {
    body_move_usd?: number;
    body_direction?: string;
    full_range_usd?: number;
    maximum_up_from_open_usd?: number;
    maximum_down_from_open_usd?: number;
  };

  reactions?: Record<
    string,
    {
      available?: boolean;
      move_usd?: number;
      direction?: string;
      maximum_up_usd?: number;
      maximum_down_usd?: number;
    }
  >;
};

type ApiData = {
  reactions?: Reaction[];
};

const HORIZONS = ["1m", "5m", "15m", "30m", "1h", "4h", "24h", "5d"];

function money(value?: number) {
  if (typeof value !== "number") return "—";

  const sign = value > 0 ? "+" : "";

  return `${sign}$${value.toFixed(2)}`;
}

export default function NewsReactionsPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/gold-reactions", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}`
          );
        }

        const json = await response.json();

        setData(json);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load reaction data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const validReactions = useMemo(() => {
    if (!data?.reactions) return [];

    return data.reactions
      .filter((item) => item.success === true)
      .sort((a, b) => {
        const timeA =
          a.time_validation?.news_time_ist || "";

        const timeB =
          b.time_validation?.news_time_ist || "";

        return timeB.localeCompare(timeA);
      })
      .slice(0, 33);
  }, [data]);

  const stats = useMemo(() => {
    const total = validReactions.length;

    if (!total) {
      return {
        total: 0,
        bullishImpulse: 0,
        bearishImpulse: 0,
        averageRange: 0,
      };
    }

    let bullishImpulse = 0;
    let bearishImpulse = 0;
    let totalRange = 0;
    let rangeCount = 0;

    for (const reaction of validReactions) {
      const direction =
        reaction.impulse_candle?.body_direction;

      if (direction === "UP") {
        bullishImpulse++;
      }

      if (direction === "DOWN") {
        bearishImpulse++;
      }

      const range =
        reaction.impulse_candle?.full_range_usd;

      if (typeof range === "number") {
        totalRange += range;
        rangeCount++;
      }
    }

    return {
      total,
      bullishImpulse,
      bearishImpulse,

      averageRange:
        rangeCount > 0
          ? totalRange / rangeCount
          : 0,
    };
  }, [validReactions]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] p-8 text-white">
        Loading verified gold reactions...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#020617] p-8 text-white">
        <h1 className="text-3xl font-bold">
          News Reactions
        </h1>

        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] p-8 text-white">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Gold News Reactions
          </h1>

          <p className="mt-2 text-slate-400">
            Historical XAUUSD reaction analysis using
            only the latest 33 successfully matched
            events.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard
            title="Valid Events"
            value={stats.total.toString()}
          />

          <StatCard
            title="Bullish M1 Impulses"
            value={stats.bullishImpulse.toString()}
          />

          <StatCard
            title="Bearish M1 Impulses"
            value={stats.bearishImpulse.toString()}
          />

          <StatCard
            title="Average M1 Range"
            value={`$${stats.averageRange.toFixed(2)}`}
          />
        </div>

        <div className="space-y-5">
          {validReactions.map((reaction, index) => {
            const eventName =
              reaction.events?.join(" + ") ||
              "Economic Event";

            const date =
              reaction.time_validation?.news_time_ist;

            return (
              <div
                key={`${date}-${index}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-yellow-400">
                      {eventName}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      IST:{" "}
                      {date
                        ? new Date(date).toLocaleString(
                            "en-IN"
                          )
                        : "Unknown"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-slate-400">
                      M1 News Range
                    </div>

                    <div className="text-2xl font-bold">
                      {money(
                        reaction.impulse_candle
                          ?.full_range_usd
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <InfoBox
                    title="Before News"
                    value={
                      reaction.pre_news_behavior
                        ?.pre_news_direction || "—"
                    }
                    detail={money(
                      reaction.pre_news_behavior
                        ?.pre_news_move_usd
                    )}
                  />

                  <InfoBox
                    title="Day Location"
                    value={
                      reaction.pre_news_behavior
                        ?.location?.replaceAll(
                          "_",
                          " "
                        ) || "—"
                    }
                  />

                  <InfoBox
                    title="M1 Body"
                    value={
                      reaction.impulse_candle
                        ?.body_direction || "—"
                    }
                    detail={money(
                      reaction.impulse_candle
                        ?.body_move_usd
                    )}
                  />

                  <InfoBox
                    title="M1 Full Range"
                    value={money(
                      reaction.impulse_candle
                        ?.full_range_usd
                    )}
                  />
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">
                    <thead>
                      <tr className="border-b border-slate-700 text-sm text-slate-400">
                        <th className="p-3">
                          Time
                        </th>

                        <th className="p-3">
                          Net Move
                        </th>

                        <th className="p-3">
                          Direction
                        </th>

                        <th className="p-3">
                          Max Up
                        </th>

                        <th className="p-3">
                          Max Down
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {HORIZONS.map((horizon) => {
                        const item =
                          reaction.reactions?.[
                            horizon
                          ];

                        return (
                          <tr
                            key={horizon}
                            className="border-b border-slate-800"
                          >
                            <td className="p-3 font-semibold">
                              {horizon}
                            </td>

                            <td className="p-3">
                              {item?.available
                                ? money(
                                    item.move_usd
                                  )
                                : "Unavailable"}
                            </td>

                            <td className="p-3">
                              {item?.direction ||
                                "—"}
                            </td>

                            <td className="p-3">
                              {item?.available
                                ? money(
                                    item.maximum_up_usd
                                  )
                                : "—"}
                            </td>

                            <td className="p-3">
                              {item?.available
                                ? money(
                                    item.maximum_down_usd
                                  )
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {validReactions.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            No successful reaction records found.
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm text-slate-400">
        {title}
      </div>

      <div className="mt-2 text-3xl font-bold text-yellow-400">
        {value}
      </div>
    </div>
  );
}

function InfoBox({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4">
      <div className="text-xs uppercase text-slate-500">
        {title}
      </div>

      <div className="mt-2 font-bold">
        {value}
      </div>

      {detail && (
        <div className="mt-1 text-sm text-slate-400">
          {detail}
        </div>
      )}
    </div>
  );
}