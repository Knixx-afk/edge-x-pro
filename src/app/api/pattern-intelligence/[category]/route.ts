import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_CATEGORIES = [
  "fomc",
  "cpi",
  "nfp",
];

const PATTERN_FILES: Record<string, string[]> = {
  fomc: [
    "data",
    "pattern-intelligence",
    "fed_gold_patterns.json",
  ],

  cpi: [
    "data",
    "cpi",
    "pattern-intelligence",
    "core_cpi_gold_patterns.json",
  ],

  nfp: [
    "data",
    "nfp",
    "pattern-intelligence",
    "nfp_gold_patterns.json",
  ],
};

const FALLBACK_HISTORICAL_COUNTS: Record<string, number> = {
  fomc: 33,
  cpi: 39,
  nfp: 39,
};

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      category: string;
    }>;
  }
) {
  try {
    const { category } = await context.params;

    const normalizedCategory =
      category.toLowerCase();

    // ========================================================
    // VALIDATE CATEGORY
    // ========================================================

    if (
      !ALLOWED_CATEGORIES.includes(
        normalizedCategory
      )
    ) {
      return NextResponse.json(
        {
          available: false,
          error:
            "Invalid pattern intelligence category.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // GET CATEGORY-SPECIFIC PATTERN FILE
    // ========================================================

    const fileParts =
      PATTERN_FILES[
        normalizedCategory
      ];

    const filePath =
      path.join(
        process.cwd(),
        ...fileParts
      );

    console.log(
      `[Pattern Intelligence] ${normalizedCategory}:`,
      filePath
    );

    // ========================================================
    // FILE DOES NOT EXIST
    // ========================================================

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      console.warn(
        `[Pattern Intelligence] File not found:`,
        filePath
      );

      return NextResponse.json(
        {
          available: false,

          category:
            normalizedCategory,

          historical_event_count:
            0,

          total_patterns_analyzed:
            0,

          dashboard_pattern_count:
            0,

          clean_findings:
            0,

          top_patterns:
            [],

          patterns:
            [],

          dashboard_summary: {
            immediate: [],
            short_term: [],
            medium_term: [],
            daily: [],
            liquidity: [],
          },

          file_path:
            filePath,
        },
        {
          status: 200,
        }
      );
    }

    // ========================================================
    // LOAD PATTERN DATABASE
    // ========================================================

    const fileContent =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    const data =
      JSON.parse(
        fileContent
      );

    // ========================================================
    // FALLBACK HISTORICAL EVENT COUNT
    // ========================================================

    const fallbackHistoricalCount =
      FALLBACK_HISTORICAL_COUNTS[
        normalizedCategory
      ] ?? 0;

    // ========================================================
    // FORMAT 1:
    // DATABASE IS A DIRECT ARRAY
    // ========================================================

    if (
      Array.isArray(
        data
      )
    ) {
      return NextResponse.json(
        {
          available: true,

          category:
            normalizedCategory,

          historical_event_count:
            fallbackHistoricalCount,

          total_patterns_analyzed:
            data.length,

          dashboard_pattern_count:
            data.length,

          clean_findings:
            data.length,

          top_patterns:
            data,

          patterns:
            data,

          dashboard_summary:
            buildDashboardSummary(
              data
            ),
        }
      );
    }

    // ========================================================
    // FORMAT 2:
    // FULL PATTERN INTELLIGENCE DATABASE
    // ========================================================

    const engine =
      data?.engine ?? {};

    // ========================================================
    // FIND PATTERN ARRAY
    // ========================================================

    const topPatterns =
      Array.isArray(
        data?.top_patterns
      )
        ? data.top_patterns

        : Array.isArray(
              data?.clean_patterns
            )
          ? data.clean_patterns

          : Array.isArray(
                data?.dashboard_patterns
              )
            ? data.dashboard_patterns

            : Array.isArray(
                  data?.patterns
                )
              ? data.patterns

              : [];

    // ========================================================
    // HISTORICAL EVENT COUNT
    // ========================================================

    const historicalEventCount =
      Number(
        data
          ?.historical_event_count ??

        engine
          ?.historical_event_count ??

        engine
          ?.historical_events ??

        fallbackHistoricalCount
      );

    // ========================================================
    // TOTAL PATTERNS ANALYZED
    // ========================================================

    const totalPatternsAnalyzed =
      Number(
        data
          ?.total_patterns_analyzed ??

        engine
          ?.total_patterns_analyzed ??

        engine
          ?.patterns_analyzed ??

        topPatterns.length
      );

    // ========================================================
    // CLEAN / DASHBOARD FINDINGS
    // ========================================================

    const cleanFindings =
      Number(
        data
          ?.dashboard_pattern_count ??

        data
          ?.clean_findings ??

        engine
          ?.dashboard_pattern_count ??

        engine
          ?.clean_findings ??

        topPatterns.length
      );

    // ========================================================
    // DASHBOARD SUMMARY
    // ========================================================

    const dashboardSummary =
      data?.dashboard_summary ??
      buildDashboardSummary(
        topPatterns
      );

    // ========================================================
    // FINAL NORMALIZED RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        ...data,

        available: true,

        category:
          normalizedCategory,

        historical_event_count:
          historicalEventCount,

        total_patterns_analyzed:
          totalPatternsAnalyzed,

        dashboard_pattern_count:
          cleanFindings,

        clean_findings:
          cleanFindings,

        top_patterns:
          topPatterns,

        patterns:
          topPatterns,

        dashboard_summary:
          dashboardSummary,
      }
    );
  } catch (error) {
    console.error(
      "Pattern intelligence API error:",
      error
    );

    return NextResponse.json(
      {
        available: false,

        historical_event_count:
          0,

        total_patterns_analyzed:
          0,

        dashboard_pattern_count:
          0,

        clean_findings:
          0,

        top_patterns:
          [],

        patterns:
          [],

        dashboard_summary: {
          immediate: [],
          short_term: [],
          medium_term: [],
          daily: [],
          liquidity: [],
        },

        error:
          "Unable to load pattern intelligence.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// BUILD DASHBOARD SUMMARY
// ============================================================

function buildDashboardSummary(
  patterns: any[]
) {
  const summary = {
    immediate: [] as any[],
    short_term: [] as any[],
    medium_term: [] as any[],
    daily: [] as any[],
    liquidity: [] as any[],
  };

  for (
    const pattern
    of patterns
  ) {
    const horizon =
      String(
        pattern?.horizon ??
        ""
      ).toLowerCase();

    const conditions =
      Array.isArray(
        pattern?.conditions
      )
        ? pattern.conditions
        : [];

    // ========================================================
    // LIQUIDITY PATTERNS
    // ========================================================

    const isLiquidity =
      conditions.some(
        (
          condition: unknown
        ) => {
          const value =
            String(
              condition
            ).toUpperCase();

          return (
            value.includes(
              "LIQUIDITY"
            ) ||
            value.includes(
              "SWEEP"
            ) ||
            value.includes(
              "RECLAIM"
            ) ||
            value.includes(
              "REJECT"
            )
          );
        }
      );

    if (
      isLiquidity
    ) {
      summary
        .liquidity
        .push(
          pattern
        );
    }

    // ========================================================
    // HORIZON GROUPS
    // ========================================================

    if (
      horizon === "1m" ||
      horizon === "5m"
    ) {
      summary
        .immediate
        .push(
          pattern
        );
    }

    else if (
      horizon === "15m" ||
      horizon === "30m"
    ) {
      summary
        .short_term
        .push(
          pattern
        );
    }

    else if (
      horizon === "1h" ||
      horizon === "4h"
    ) {
      summary
        .medium_term
        .push(
          pattern
        );
    }

    else if (
      horizon === "24h"
    ) {
      summary
        .daily
        .push(
          pattern
        );
    }
  }

  return summary;
}