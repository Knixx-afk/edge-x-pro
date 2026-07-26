"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Activity,
  Droplets,
} from "lucide-react";

type Category = "fomc" | "cpi" | "nfp";

type Pattern = {
  conditions?: string[];
  readable_conditions?: string[];
  horizon?: string;
  sample_size?: number;
  up_count?: number;
  down_count?: number;

  dominant_direction?: string;
  dominant_probability?: number;

  direction?: string;
  probability?: number;

  matched_conditions?: number;
  condition_count?: number;
  match_ratio?: number;
  weight?: number;

  average_move_usd?: number;
  median_move_usd?: number;
  magnitude_consistency?: string;
  evidence_strength?: string;
  summary?: string;
};

type PatternData = {
  available?: boolean;

  engine?: {
    historical_event_count?: number;
    historical_events?: number;
    total_patterns_analyzed?: number;
    patterns_analyzed?: number;
    dashboard_pattern_count?: number;
    clean_findings?: number;
  };

  historical_event_count?: number;
  total_patterns_analyzed?: number;
  dashboard_pattern_count?: number;
  clean_findings?: number;

  dashboard_summary?: {
    immediate?: Pattern[];
    short_term?: Pattern[];
    medium_term?: Pattern[];
    daily?: Pattern[];
    liquidity?: Pattern[];
  };

  top_patterns?: Pattern[];

  matched_pattern_count?: number;
  historical_matches?: number;
  patterns?: Pattern[];
  matched_patterns?: Pattern[];

  horizons?: Record<string, HorizonPrediction>;
  horizon_predictions?: Record<string, HorizonPrediction>;
};
  
type HorizonPrediction = {
  direction?: string;
  confidence?: number;
  consensus?: number;
  evidence?: string;
  pattern_count?: number;
  up_probability?: number;
  down_probability?: number;
};

type UpcomingIntelligence = {
  available?: boolean;
  category?: string;
  event_name?: string;
  generated_at_utc?: string;

  current_conditions?: string[];

  historical_matches?: number;
  matched_pattern_count?: number;
  matched_patterns?: Pattern[];

  horizon_predictions?: Record<
    string,
    HorizonPrediction
  >;

  technical_summary?: {
    bias?: string;
    confidence?: number;
    historical_matches?: number;

    horizons?: Record<
      string,
      HorizonPrediction
    >;

    // Old compatibility fields
    matching_pattern_count?: number;

    horizon_predictions?: Record<
      string,
      HorizonPrediction
    >;
  };

  fundamental_summary?: {
    bias?: string;
    confidence?: number;
    score?: number;
    maximum_score?: number;
    reasons?: string[];

    inputs?: Record<
      string,
      unknown
    >;
  };

  edge_x_prediction?: {
    bias?: string;

    // Old compatibility field
    prediction?: string;

    confidence?: number;

    technical_weight?: number;
    fundamental_weight?: number;

    technical_bias?: string;
    technical_confidence?: number;

    fundamental_bias?: string;
    fundamental_confidence?: number;

    alignment?: string;
    combined_score?: number;
  };

  technical_intelligence?: {
    available?: boolean;
    matched_pattern_count?: number;
    patterns?: Pattern[];

    horizons?: Record<
      string,
      HorizonPrediction
    >;
  };
};

type PeriodMove = {
  available?: boolean;
  move_usd?: number;
  direction?: string;
  maximum_up_usd?: number;
  maximum_down_usd?: number;
  highest_price?: number;
  lowest_price?: number;
  close?: number;
};

type PrePeriod = {
  available?: boolean;
  move_usd?: number;
  direction?: string;
};

type Liquidity = {
  available?: boolean;
  sequence?: string;
  swept_upside_liquidity?: boolean;
  swept_downside_liquidity?: boolean;
  upside_sweep_rejected?: boolean;
  downside_sweep_reclaimed?: boolean;
};

type Reaction = {
  success?: boolean;
  events?: string[];

  numbers?: {
    change_bps?: number;
    decision?: string;
  };

  release?: {
    previous?: string;
    actual?: string;
    result?: string;
  };

  time_validation?: {
    news_time_ist?: string;
    winpro_chart_time?: string;
  };

  pre_news_behavior?: {
    available?: boolean;
    day_open?: number;
    price_before_news?: number;
    pre_news_move_usd?: number;
    pre_news_direction?: string;
    day_high_before_news?: number;
    day_low_before_news?: number;
    pre_news_range_usd?: number;
    range_position_percent?: number;
    location?: string;
    periods?: Record<string, PrePeriod>;
  };

  pre_news_liquidity?: Liquidity;

  impulse_candle?: {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    body_move_usd?: number;
    body_direction?: string;
    full_range_usd?: number;
    maximum_up_from_open_usd?: number;
    maximum_down_from_open_usd?: number;
  };

  reactions?: Record<
    string,
    PeriodMove
  >;
};

const HORIZONS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "24h",
  "2d",
  "3d",
  "5d",
];

const UPCOMING_HORIZONS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "24h",
];

const CATEGORIES: {
  id: Category;
  label: string;
  description: string;
}[] = [
  {
    id: "fomc",
    label: "FOMC",
    description:
      "Federal Reserve rate decisions",
  },
  {
    id: "cpi",
    label: "CPI",
    description:
      "US inflation releases",
  },
  {
    id: "nfp",
    label: "NFP",
    description:
      "US employment releases",
  },
];

function money(
  value?: number
) {
  if (
    typeof value !== "number"
  ) {
    return "—";
  }

  if (value > 0) {
    return `+$${value.toFixed(
      2
    )}`;
  }

  if (value < 0) {
    return `-$${Math.abs(
      value
    ).toFixed(2)}`;
  }

  return "$0.00";
}

function price(
  value?: number
) {
  if (
    typeof value !== "number"
  ) {
    return "—";
  }

  return `$${value.toFixed(
    2
  )}`;
}

function cleanText(
  value?: string
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "Date unavailable";
  }

  return new Date(
    value
  ).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function directionClass(
  direction?: string
) {
  if (
    direction === "UP" ||
    direction === "BULLISH"
  ) {
    return "text-emerald-400";
  }

  if (
    direction === "DOWN" ||
    direction === "BEARISH"
  ) {
    return "text-red-400";
  }

  return "text-slate-300";
}

function predictionClass(
  value?: string
) {
  if (
    value === "BULLISH" ||
    value === "UP"
  ) {
    return "text-emerald-400";
  }

  if (
    value === "BEARISH" ||
    value === "DOWN"
  ) {
    return "text-red-400";
  }

  return "text-yellow-400";
}

function predictionStrength(
  bias?: string,
  confidence?: number
) {
  if (!bias) {
    return "No Prediction";
  }

  const normalized =
    cleanText(bias);

  if (
    bias === "NO_CLEAR_EDGE"
  ) {
    return "No Clear Edge";
  }

  const score =
    confidence ?? 50;

  if (score >= 67.5) {
    return `Strong ${normalized}`;
  }

  if (score >= 57.5) {
    return `Moderate ${normalized}`;
  }

  return `Weak ${normalized}`;
}

export default function NewsReactions() {
  const [
    category,
    setCategory,
  ] =
    useState<Category>(
      "fomc"
    );

  const [
    rawData,
    setRawData,
  ] =
    useState<any>(
      null
    );

  const [
    patternData,
    setPatternData,
  ] =
    useState<
      PatternData | null
    >(
      null
    );

  const [
    upcomingIntelligence,
    setUpcomingIntelligence,
  ] =
    useState<
      UpcomingIntelligence | null
    >(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    technicalOpen,
    setTechnicalOpen,
  ] =
    useState(
      true
    );

  const [
    historicalOpen,
    setHistoricalOpen,
  ] =
    useState(
      false
    );

  const [
    openEvents,
    setOpenEvents,
  ] =
    useState<
      Record<
        number,
        boolean
      >
    >(
      {}
    );

  useEffect(
    () => {
      async function loadCategory() {
        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          setRawData(
            null
          );

          setPatternData(
            null
          );

          setUpcomingIntelligence(
            null
          );

          setOpenEvents(
            {}
          );

          const [
            reactionResponse,
            patternResponse,
            upcomingResponse,
          ] =
            await Promise.all(
              [
                fetch(
                  `/api/news-reactions/${category}`,
                  {
                    cache:
                      "no-store",
                  }
                ),

                fetch(
                  `/api/pattern-intelligence/${category}`,
                  {
                    cache:
                      "no-store",
                  }
                ),

                fetch(
                  `/api/upcoming-intelligence/${category}`,
                  {
                    cache:
                      "no-store",
                  }
                ),
              ]
            );

          if (
            !reactionResponse.ok
          ) {
            throw new Error(
              `Reaction API returned ${reactionResponse.status}`
            );
          }

          if (
            !patternResponse.ok
          ) {
            throw new Error(
              `Pattern API returned ${patternResponse.status}`
            );
          }

          const reactionJson =
            await reactionResponse.json();

          const patternJson =
            await patternResponse.json();

          const upcomingJson =
            upcomingResponse.ok
              ? await upcomingResponse.json()
              : {
                  available:
                    false,
                };

          setRawData(
            reactionJson
          );

          setPatternData(
            patternJson
          );

          setUpcomingIntelligence(
            upcomingJson
          );
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Unable to load database."
          );
        } finally {
          setLoading(
            false
          );
        }
      }

      loadCategory();
    },
    [
      category,
    ]
  );

  const events: Reaction[] =
    useMemo(
      () => {
        let source: Reaction[] =
          [];

        if (
          Array.isArray(
            rawData
          )
        ) {
          source =
            rawData;
        } else if (
          Array.isArray(
            rawData
              ?.reactions
          )
        ) {
          source =
            rawData.reactions;
        }

        return source
          .filter(
            (
              event
            ) =>
              event.success ===
              true
          )
          .sort(
            (
              a,
              b
            ) => {
              const dateA =
                a
                  .time_validation
                  ?.news_time_ist ||
                "";

              const dateB =
                b
                  .time_validation
                  ?.news_time_ist ||
                "";

              return dateB.localeCompare(
                dateA
              );
            }
          );
      },
      [
        rawData,
      ]
    );

  const summary =
    useMemo(
      () => {
        let hikes =
          0;

        let cuts =
          0;

        let holds =
          0;

        let up =
          0;

        let down =
          0;

        let totalRange =
          0;

        for (
          const event
          of events
        ) {
          const decision =
            event
              .numbers
              ?.decision;

          if (
            decision ===
            "HIKE"
          ) {
            hikes++;
          }

          if (
            decision ===
            "CUT"
          ) {
            cuts++;
          }

          if (
            decision ===
            "HOLD"
          ) {
            holds++;
          }

          const direction =
            event
              .impulse_candle
              ?.body_direction;

          if (
            direction ===
            "UP"
          ) {
            up++;
          }

          if (
            direction ===
            "DOWN"
          ) {
            down++;
          }

          totalRange +=
            event
              .impulse_candle
              ?.full_range_usd ||
            0;
        }

        return {
          hikes,
          cuts,
          holds,
          up,
          down,

          averageRange:
            events.length >
            0
              ? totalRange /
                events.length
              : 0,
        };
      },
      [
        events,
      ]
    );

  const activeCategory =
    CATEGORIES.find(
      (
        item
      ) =>
        item.id ===
        category
    );

  const historicalMatches =
    upcomingIntelligence
      ?.technical_summary
      ?.historical_matches ??
    upcomingIntelligence
      ?.matched_pattern_count ??
    upcomingIntelligence
      ?.technical_intelligence
      ?.matched_pattern_count ??
    upcomingIntelligence
      ?.technical_summary
      ?.matching_pattern_count ??
    upcomingIntelligence
      ?.matched_patterns
      ?.length ??
    0;

  const horizonPredictions =
    upcomingIntelligence
      ?.horizon_predictions ??
    upcomingIntelligence
      ?.technical_summary
      ?.horizons ??
    upcomingIntelligence
      ?.technical_summary
      ?.horizon_predictions ??
    upcomingIntelligence
      ?.technical_intelligence
      ?.horizons ??
    {};

  const edgeXBias =
    upcomingIntelligence
      ?.edge_x_prediction
      ?.bias ??
    upcomingIntelligence
      ?.edge_x_prediction
      ?.prediction;

  const currentMatchedPatterns =
    upcomingIntelligence
      ?.technical_intelligence
      ?.patterns ??
    upcomingIntelligence
      ?.matched_patterns ??
    patternData
      ?.matched_patterns ??
    patternData
      ?.patterns ??
    [];

  const currentMatchCount =
    upcomingIntelligence
      ?.technical_intelligence
      ?.matched_pattern_count ??
    upcomingIntelligence
      ?.matched_pattern_count ??
    patternData
      ?.matched_pattern_count ??
    currentMatchedPatterns.length;

  function toggleEvent(
    index: number
  ) {
    setOpenEvents(
      (
        current
      ) => ({
        ...current,

        [index]:
          !current[
            index
          ],
      })
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white">
      <div className="mx-auto max-w-[1700px]">

        {/* HEADER */}

        <div className="mb-7">
          <h1 className="text-3xl font-bold">
            EDGE X News
            Intelligence
          </h1>

          <p className="mt-2 text-slate-400">
            Historical XAUUSD
            reaction intelligence
            for major US economic
            events.
          </p>
        </div>

        {/* CATEGORY TABS */}

        <div className="mb-7 flex flex-wrap gap-3">
          {CATEGORIES.map(
            (
              item
            ) => (
              <button
                key={
                  item.id
                }
                onClick={() =>
                  setCategory(
                    item.id
                  )
                }
                className={`rounded-xl border px-6 py-3 transition ${
                  category ===
                  item.id
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="font-bold">
                  {
                    item.label
                  }
                </div>

                <div className="text-xs opacity-70">
                  {
                    item.description
                  }
                </div>
              </button>
            )
          )}
        </div>

        {/* LOADING */}

        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            Loading{" "}
            {category.toUpperCase()}{" "}
            intelligence...
          </div>
        )}

        {/* ERROR */}

        {!loading &&
          error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-red-300">
              {error}
            </div>
          )}

        {!loading &&
          !error &&
          events.length ===
            0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {category.toUpperCase()}
              </div>

              <div className="mt-3 text-slate-400">
                Historical
                database has not
                been added yet.
              </div>

              <div className="mt-2 text-sm text-slate-500">
                The architecture
                is ready. This
                category will
                remain completely
                separate from the
                other news
                databases.
              </div>
            </div>
          )}

        {!loading &&
          !error &&
          events.length >
            0 && (
            <>

              {/* DATABASE HEADER */}

              <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-xl font-bold text-yellow-400">
                  {
                    activeCategory
                      ?.label
                  }{" "}
                  Historical
                  Intelligence
                </div>

                <div className="mt-1 text-sm text-slate-400">
                  {
                    activeCategory
                      ?.description
                  }{" "}
                  analyzed
                  independently
                  from other event
                  types.
                </div>
              </div>

              {/* TOP STATS */}

              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <TopCard
                  title="Historical Events"
                  value={String(
                    events.length
                  )}
                />

                <TopCard
                  title="M1 Up"
                  value={String(
                    summary.up
                  )}
                />

                <TopCard
                  title="M1 Down"
                  value={String(
                    summary.down
                  )}
                />

                <TopCard
                  title="Average M1 Range"
                  value={money(
                    summary.averageRange
                  )}
                />

                <TopCard
                  title="Patterns Analyzed"
                  value={String(
                    patternData?.total_patterns_analyzed ??
                    patternData?.engine?.total_patterns_analyzed ??
                    patternData?.engine?.patterns_analyzed ??
                    0
                 )}
                />

                <TopCard
                  title="Clean Findings"
                  value={String(
                    patternData?.clean_findings ??
                    patternData?.dashboard_pattern_count ??
                    patternData?.engine?.clean_findings ??
                    patternData?.engine?.dashboard_pattern_count ??
                    patternData?.top_patterns?.length ??
                    0
                 )}
                />

              </div>

              {/* UPCOMING EVENT INTELLIGENCE */}

              {upcomingIntelligence
                ?.available && (
                <div className="mt-6">
                  <div className="mb-4">
                    <div className="text-2xl font-bold">
                      Upcoming Event
                      Intelligence
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      Current market
                      conditions compared
                      with historical{" "}
                      {category.toUpperCase()}{" "}
                      patterns and macro
                      context.
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-3">

                    {/* TECHNICAL */}

                    <UpcomingCard
                      title="Technical Summary"
                      bias={
                        upcomingIntelligence
                          .technical_summary
                          ?.bias
                      }
                      confidence={
                        upcomingIntelligence
                          .technical_summary
                          ?.confidence
                      }
                    >
                      <InfoRow
                        title="Historical Matches"
                        value={String(
                          historicalMatches
                        )}
                      />

                      <div className="mt-3 space-y-2">
                        {UPCOMING_HORIZONS.map(
                          (
                            horizon
                          ) => {
                            const prediction =
                              horizonPredictions[
                                horizon
                              ];

                            if (
                              !prediction
                            ) {
                              return null;
                            }

                            return (
                              <InfoRow
                                key={
                                  horizon
                                }
                                title={
                                  horizon
                                }
                                value={(() => {
                                  const patternCount =
                                    prediction.pattern_count ?? 0;
                                  const confidence =
                                    prediction.confidence ?? 50;
                                  const direction =
                                    cleanText(prediction.direction);

                                  if (patternCount === 0) {
                                    return `${direction} · No historical patterns`;
                                  }

                                  if (patternCount === 1) {
                                    if (
                                      prediction.direction ===
                                      "NO_CLEAR_EDGE"
                                    ) {
                                      return `${direction} · Single Pattern`;
                                    }

                                    return `${direction} · Single Pattern · ${confidence}% confidence`;
                                  }

                                  const consensus =
                                    prediction.consensus ??
                                    (prediction.direction === "UP"
                                      ? prediction.up_probability
                                      : prediction.direction === "DOWN"
                                        ? prediction.down_probability
                                        : undefined) ??
                                    50;

                                  return `${direction} · ${consensus}% consensus · ${confidence}% confidence · ${patternCount} patterns`;
                                })()}
                              />
                            );
                          }
                        )}
                      </div>
                    </UpcomingCard>

                    {/* FUNDAMENTAL */}

                    <UpcomingCard
                      title="Fundamental Summary"
                      bias={
                        upcomingIntelligence
                          .fundamental_summary
                          ?.bias
                      }
                      confidence={
                        upcomingIntelligence
                          .fundamental_summary
                          ?.confidence
                      }
                    >
                      <div className="space-y-3">
                        {upcomingIntelligence
                          .fundamental_summary
                          ?.reasons
                          ?.length ? (
                          upcomingIntelligence
                            .fundamental_summary
                            .reasons.map(
                              (
                                reason,
                                index
                              ) => (
                                <div
                                  key={
                                    index
                                  }
                                  className="rounded-lg bg-slate-950 p-3 text-sm text-slate-300"
                                >
                                  {
                                    reason
                                  }
                                </div>
                              )
                            )
                        ) : (
                          <div className="text-sm text-slate-500">
                            No sufficient
                            fundamental
                            evidence is
                            currently
                            available.
                          </div>
                        )}
                      </div>
                    </UpcomingCard>

                    {/* EDGE X */}

                    <div className="rounded-2xl border border-yellow-400/40 bg-gradient-to-b from-yellow-400/10 to-slate-900 p-5">
                      <div className="text-sm font-bold uppercase tracking-wider text-yellow-400">
                        EDGE X Prediction
                      </div>

                      <div
                        className={`mt-5 text-3xl font-black ${predictionClass(
                          edgeXBias
                        )}`}
                      >
                        {predictionStrength(
                          edgeXBias,
                          upcomingIntelligence
                            ?.edge_x_prediction
                            ?.confidence
                        )}
                      </div>

                      <div className="mt-2 text-sm text-slate-400">
                        Model Confidence
                      </div>

                      <div className="mt-1 text-2xl font-bold">
                        {upcomingIntelligence
                          .edge_x_prediction
                          ?.confidence ??
                          0}
                        %
                      </div>

                      <div className="mt-6 space-y-3">
                        <InfoRow
                          title="Technical Bias"
                          value={cleanText(
                            upcomingIntelligence
                              .edge_x_prediction
                              ?.technical_bias
                          )}
                        />

                        <InfoRow
                          title="Fundamental Bias"
                          value={cleanText(
                            upcomingIntelligence
                              .edge_x_prediction
                              ?.fundamental_bias
                          )}
                        />

                        <InfoRow
                          title="Technical Weight"
                          value={`${
                            upcomingIntelligence
                              .edge_x_prediction
                              ?.technical_weight ??
                            0
                          }%`}
                        />

                        <InfoRow
                          title="Fundamental Weight"
                          value={`${
                            upcomingIntelligence
                              .edge_x_prediction
                              ?.fundamental_weight ??
                            0
                          }%`}
                        />

                        <InfoRow
                          title="Alignment"
                          value={cleanText(
                            upcomingIntelligence
                              .edge_x_prediction
                              ?.alignment
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TECHNICAL INTELLIGENCE */}

              <div className="mt-6 overflow-hidden rounded-2xl border border-yellow-500/30 bg-slate-900">
                <button
                  onClick={() =>
                    setTechnicalOpen(
                      !technicalOpen
                    )
                  }
                  className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <Brain className="text-yellow-400" />

                    <div>
                      <div className="text-xl font-bold text-yellow-400">
                        Technical
                        Intelligence
                      </div>

                      <div className="mt-1 text-sm text-slate-400">
                        Automatically
                        discovered
                        historical
                        relationships
                        from{" "}
                        {
                          events.length
                        }{" "}
                        {
                          activeCategory
                            ?.label
                        }{" "}
                        events.
                      </div>
                    </div>
                  </div>

                  {technicalOpen ? (
                    <ChevronDown />
                  ) : (
                    <ChevronRight />
                  )}
                </button>

                {technicalOpen && (
                  <div className="border-t border-slate-800 p-5">
                    <div className="space-y-8">

                      {/* CURRENT LIVE MATCHES */}

                      {currentMatchedPatterns.length >
                      0 ? (
                        <PatternSection
                          title="Current Matching Patterns"
                          subtitle={`${currentMatchCount} historical pattern matches for the current live setup`}
                          icon={
                            <Brain
                              size={
                                18
                              }
                            />
                          }
                          patterns={
                            currentMatchedPatterns
                          }
                        />
                      ) : (
                        <div className="rounded-xl bg-slate-950 p-6 text-slate-400">
                          No current
                          historical
                          pattern matches
                          are available.
                        </div>
                      )}

                      {/* HISTORICAL CLEAN FINDINGS */}

                      {patternData
                        ?.dashboard_summary ? (
                        <>
                          <PatternSection
                            title="Immediate Reaction"
                            subtitle="Historical 1m–5m behavior"
                            icon={
                              <Activity
                                size={
                                  18
                                }
                              />
                            }
                            patterns={
                              patternData
                                .dashboard_summary
                                ?.immediate ||
                              []
                            }
                          />

                          <PatternSection
                            title="Short-Term Reaction"
                            subtitle="Historical 15m–30m behavior"
                            patterns={
                              patternData
                                .dashboard_summary
                                ?.short_term ||
                              []
                            }
                          />

                          <PatternSection
                            title="Medium-Term Reaction"
                            subtitle="Historical 1h–4h behavior"
                            patterns={
                              patternData
                                .dashboard_summary
                                ?.medium_term ||
                              []
                            }
                          />

                          <PatternSection
                            title="24-Hour Reaction"
                            subtitle="Historical daily follow-through"
                            patterns={
                              patternData
                                .dashboard_summary
                                ?.daily ||
                              []
                            }
                          />

                          <PatternSection
                            title="Liquidity Intelligence"
                            subtitle="Pre-news sweep, reclaim and rejection relationships"
                            icon={
                              <Droplets
                                size={
                                  18
                                }
                              />
                            }
                            patterns={
                              patternData
                                .dashboard_summary
                                ?.liquidity ||
                              []
                            }
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* HISTORICAL SUMMARY */}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                <button
                  onClick={() =>
                    setHistoricalOpen(
                      !historicalOpen
                    )
                  }
                  className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-800/50"
                >
                  <div>
                    <div className="text-xl font-bold">
                      Historical Database
                      Summary
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      Overall statistics
                      for this event
                      category only.
                    </div>
                  </div>

                  {historicalOpen ? (
                    <ChevronDown />
                  ) : (
                    <ChevronRight />
                  )}
                </button>

                {historicalOpen && (
                  <div className="grid gap-4 border-t border-slate-800 p-5 md:grid-cols-3 xl:grid-cols-6">
                    <SummaryBox
                      title="Events"
                      value={String(
                        events.length
                      )}
                    />

                    <SummaryBox
                      title="M1 Up"
                      value={String(
                        summary.up
                      )}
                    />

                    <SummaryBox
                      title="M1 Down"
                      value={String(
                        summary.down
                      )}
                    />

                    {category ===
                      "fomc" && (
                      <>
                        <SummaryBox
                          title="Hikes"
                          value={String(
                            summary.hikes
                          )}
                        />

                        <SummaryBox
                          title="Cuts"
                          value={String(
                            summary.cuts
                          )}
                        />

                        <SummaryBox
                          title="Holds"
                          value={String(
                            summary.holds
                          )}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* EVENT LIST */}

              <div className="mt-8 space-y-4">
                {events.map(
                  (
                    event,
                    index
                  ) => {
                    const open =
                      !!openEvents[
                        index
                      ];

                    const pre =
                      event
                        .pre_news_behavior;

                    const liquidity =
                      event
                        .pre_news_liquidity;

                    const impulse =
                      event
                        .impulse_candle;

                    return (
                      <div
                        key={
                          index
                        }
                        className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                      >
                        <button
                          onClick={() =>
                            toggleEvent(
                              index
                            )
                          }
                          className="w-full p-5 text-left hover:bg-slate-800/50"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              {open ? (
                                <ChevronDown />
                              ) : (
                                <ChevronRight />
                              )}

                              <div>
                                <div className="font-bold text-yellow-400">
                                  {event
                                    .events
                                    ?.join(
                                      " + "
                                    ) ||
                                    category.toUpperCase()}
                                </div>

                                <div className="mt-1 text-sm text-slate-400">
                                  {formatDate(
                                    event
                                      .time_validation
                                      ?.news_time_ist
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-7">
                              <MiniValue
                                title="Pre-News"
                                value={
                                  pre
                                    ?.pre_news_direction ||
                                  "—"
                                }
                              />

                              <MiniValue
                                title="Location"
                                value={cleanText(
                                  pre
                                    ?.location
                                )}
                              />

                              <MiniValue
                                title="Liquidity"
                                value={cleanText(
                                  liquidity
                                    ?.sequence
                                )}
                              />

                              <MiniValue
                                title="M1"
                                value={`${
                                  impulse
                                    ?.body_direction ||
                                  "—"
                                } ${money(
                                  impulse
                                    ?.body_move_usd
                                )}`}
                              />

                              <MiniValue
                                title="M1 Range"
                                value={money(
                                  impulse
                                    ?.full_range_usd
                                )}
                              />
                            </div>
                          </div>
                        </button>

                        {open && (
                          <div className="border-t border-slate-800 p-6">

                            {/* RELEASE DATA */}

                            <SectionTitle>
                              Released Data
                            </SectionTitle>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <DataBox
                                title="Previous"
                                value={
                                  event
                                    .release
                                    ?.previous ||
                                  "—"
                                }
                              />

                              <DataBox
                                title="Actual"
                                value={
                                  event
                                    .release
                                    ?.actual ||
                                  "—"
                                }
                              />

                              <DataBox
                                title="Decision"
                                value={
                                  event
                                    .numbers
                                    ?.decision ||
                                  "—"
                                }
                              />

                              <DataBox
                                title="Change"
                                value={
                                  typeof event
                                    .numbers
                                    ?.change_bps ===
                                  "number"
                                    ? `${event.numbers.change_bps} BPS`
                                    : "—"
                                }
                              />
                            </div>

                            {/* PRE NEWS */}

                            <SectionTitle>
                              Price Action
                              Before News
                            </SectionTitle>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <DataBox
                                title="Day Open"
                                value={price(
                                  pre
                                    ?.day_open
                                )}
                              />

                              <DataBox
                                title="Price Before News"
                                value={price(
                                  pre
                                    ?.price_before_news
                                )}
                              />

                              <DataBox
                                title="Day Move"
                                value={money(
                                  pre
                                    ?.pre_news_move_usd
                                )}
                                sub={
                                  pre
                                    ?.pre_news_direction
                                }
                              />

                              <DataBox
                                title="Location"
                                value={cleanText(
                                  pre
                                    ?.location
                                )}
                              />

                              <DataBox
                                title="Day High"
                                value={price(
                                  pre
                                    ?.day_high_before_news
                                )}
                              />

                              <DataBox
                                title="Day Low"
                                value={price(
                                  pre
                                    ?.day_low_before_news
                                )}
                              />

                              <DataBox
                                title="Day Range"
                                value={money(
                                  pre
                                    ?.pre_news_range_usd
                                )}
                              />

                              <DataBox
                                title="Range Position"
                                value={
                                  typeof pre
                                    ?.range_position_percent ===
                                  "number"
                                    ? `${pre.range_position_percent.toFixed(
                                        1
                                      )}%`
                                    : "—"
                                }
                              />
                            </div>

                            {/* LIQUIDITY */}

                            <SectionTitle>
                              Pre-News
                              Liquidity
                            </SectionTitle>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                              <DataBox
                                title="Sequence"
                                value={cleanText(
                                  liquidity
                                    ?.sequence
                                )}
                              />

                              <BooleanBox
                                title="Upside Swept"
                                value={
                                  liquidity
                                    ?.swept_upside_liquidity
                                }
                              />

                              <BooleanBox
                                title="Downside Swept"
                                value={
                                  liquidity
                                    ?.swept_downside_liquidity
                                }
                              />

                              <BooleanBox
                                title="Upside Rejected"
                                value={
                                  liquidity
                                    ?.upside_sweep_rejected
                                }
                              />

                              <BooleanBox
                                title="Downside Reclaimed"
                                value={
                                  liquidity
                                    ?.downside_sweep_reclaimed
                                }
                              />
                            </div>

                            {/* M1 */}

                            <SectionTitle>
                              Exact M1 News
                              Candle
                            </SectionTitle>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <DataBox
                                title="Open"
                                value={price(
                                  impulse
                                    ?.open
                                )}
                              />

                              <DataBox
                                title="High"
                                value={price(
                                  impulse
                                    ?.high
                                )}
                              />

                              <DataBox
                                title="Low"
                                value={price(
                                  impulse
                                    ?.low
                                )}
                              />

                              <DataBox
                                title="Close"
                                value={price(
                                  impulse
                                    ?.close
                                )}
                              />

                              <DataBox
                                title="Body Move"
                                value={money(
                                  impulse
                                    ?.body_move_usd
                                )}
                                sub={
                                  impulse
                                    ?.body_direction
                                }
                              />

                              <DataBox
                                title="Full Range"
                                value={money(
                                  impulse
                                    ?.full_range_usd
                                )}
                              />

                              <DataBox
                                title="Maximum Up"
                                value={money(
                                  impulse
                                    ?.maximum_up_from_open_usd
                                )}
                              />

                              <DataBox
                                title="Maximum Down"
                                value={money(
                                  impulse
                                    ?.maximum_down_from_open_usd
                                )}
                              />
                            </div>

                            {/* REACTIONS */}

                            <SectionTitle>
                              Price Movement
                              After News
                            </SectionTitle>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1000px]">
                                <thead>
                                  <tr className="border-b border-slate-700 text-left text-xs uppercase text-slate-500">
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
                                      Close
                                    </th>

                                    <th className="p-3">
                                      Max Up
                                    </th>

                                    <th className="p-3">
                                      Max Down
                                    </th>

                                    <th className="p-3">
                                      Highest
                                    </th>

                                    <th className="p-3">
                                      Lowest
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {HORIZONS.map(
                                    (
                                      horizon
                                    ) => {
                                      const reaction =
                                        event
                                          .reactions?.[
                                          horizon
                                        ];

                                      return (
                                        <tr
                                          key={
                                            horizon
                                          }
                                          className="border-b border-slate-800"
                                        >
                                          <td className="p-3 font-bold text-yellow-400">
                                            {
                                              horizon
                                            }
                                          </td>

                                          <td
                                            className={`p-3 font-bold ${directionClass(
                                              reaction
                                                ?.direction
                                            )}`}
                                          >
                                            {reaction
                                              ?.available
                                              ? money(
                                                  reaction
                                                    .move_usd
                                                )
                                              : "Unavailable"}
                                          </td>

                                          <td
                                            className={`p-3 ${directionClass(
                                              reaction
                                                ?.direction
                                            )}`}
                                          >
                                            {reaction
                                              ?.direction ||
                                              "—"}
                                          </td>

                                          <td className="p-3">
                                            {price(
                                              reaction
                                                ?.close
                                            )}
                                          </td>

                                          <td className="p-3 text-emerald-400">
                                            {money(
                                              reaction
                                                ?.maximum_up_usd
                                            )}
                                          </td>

                                          <td className="p-3 text-red-400">
                                            {money(
                                              reaction
                                                ?.maximum_down_usd
                                            )}
                                          </td>

                                          <td className="p-3">
                                            {price(
                                              reaction
                                                ?.highest_price
                                            )}
                                          </td>

                                          <td className="p-3">
                                            {price(
                                              reaction
                                                ?.lowest_price
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    }
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </>
          )}
      </div>
    </div>
  );
}

function UpcomingCard({
  title,
  bias,
  confidence,
  children,
}: {
  title: string;
  bias?: string;
  confidence?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm font-bold uppercase tracking-wider text-slate-400">
        {title}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div
          className={`text-2xl font-bold ${predictionClass(
            bias
          )}`}
        >
          {cleanText(
            bias
          )}
        </div>

        <div className="text-right">
          <div className="text-xl font-bold">
            {confidence ??
              0}
            %
          </div>

          <div className="text-xs text-slate-500">
            Confidence
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-800 pt-5">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-950 p-3">
      <span className="text-sm text-slate-500">
        {title}
      </span>

      <span className="text-right text-sm font-bold">
        {value}
      </span>
    </div>
  );
}

function PatternSection({
  title,
  subtitle,
  patterns,
  icon,
}: {
  title: string;
  subtitle: string;
  patterns: Pattern[];
  icon?: React.ReactNode;
}) {
  if (
    !patterns.length
  ) {
    return null;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}

        <div>
          <div className="font-bold">
            {title}
          </div>

          <div className="text-xs text-slate-500">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {patterns.map(
          (
            pattern,
            index
          ) => {
            const patternDirection =
              pattern
                .dominant_direction ??
              pattern
                .direction;

            const patternProbability =
              pattern
                .dominant_probability ??
              pattern
                .probability;

            const readableConditions =
              pattern
                .readable_conditions
                ?.length
                ? pattern.readable_conditions
                : pattern.conditions;

            return (
              <div
                key={`${pattern.horizon}-${index}`}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    className={`text-lg font-bold ${directionClass(
                      patternDirection
                    )}`}
                  >
                    {cleanText(
                      patternDirection
                    )}{" "}
                    after{" "}
                    {
                      pattern.horizon
                    }
                  </div>

                  <div className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-bold">
                    {typeof patternProbability ===
                    "number"
                      ? patternProbability.toFixed(
                          1
                        )
                      : "—"}
                    %
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-300">
                  {readableConditions
                    ?.map(
                      (
                        condition
                      ) =>
                        cleanText(
                          condition
                        )
                    )
                    .join(
                      " + "
                    ) ||
                    "No condition details available"}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <SmallStat
                    title="Sample"
                    value={String(
                      pattern
                        .sample_size ??
                        0
                    )}
                  />

                  <SmallStat
                    title="Average"
                    value={money(
                      pattern
                        .average_move_usd
                    )}
                  />

                  <SmallStat
                    title="Median"
                    value={money(
                      pattern
                        .median_move_usd
                    )}
                  />

                  <SmallStat
                    title="Evidence"
                    value={
                      pattern
                        .evidence_strength ||
                      pattern
                        .magnitude_consistency ||
                      "—"
                    }
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

function TopCard({
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

      <div className="mt-2 text-2xl font-bold text-yellow-400">
        {value}
      </div>
    </div>
  );
}

function SummaryBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4">
      <div className="text-xs text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}

function MiniValue({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">
        {title}
      </div>

      <div className="mt-1 max-w-[180px] text-sm font-bold">
        {value}
      </div>
    </div>
  );
}

function SmallStat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">
        {title}
      </div>

      <div className="mt-1 text-sm font-bold">
        {value}
      </div>
    </div>
  );
}

function DataBox({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4">
      <div className="text-xs uppercase text-slate-500">
        {title}
      </div>

      <div className="mt-2 font-bold">
        {value}
      </div>

      {sub && (
        <div
          className={`mt-1 text-sm font-semibold ${directionClass(
            sub
          )}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function BooleanBox({
  title,
  value,
}: {
  title: string;
  value?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4">
      <div className="text-xs uppercase text-slate-500">
        {title}
      </div>

      <div
        className={`mt-2 font-bold ${
          value
            ? "text-yellow-400"
            : "text-slate-500"
        }`}
      >
        {value
          ? "YES"
          : "NO"}
      </div>
    </div>
  );
}

function SectionTitle({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <h3 className="mb-4 mt-8 border-l-4 border-yellow-400 pl-3 text-lg font-bold">
      {children}
    </h3>
  );
}