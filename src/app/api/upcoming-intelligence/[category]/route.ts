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

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      category: string;
    }>;
  }
) {
  try {
    const { category } =
      await context.params;

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
            "Invalid category.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // CATEGORY-SPECIFIC UPCOMING INTELLIGENCE FILE
    //
    // FOMC:
    // data/fomc/context/upcoming_intelligence.json
    //
    // CPI:
    // data/cpi/context/upcoming_intelligence.json
    //
    // NFP:
    // data/nfp/context/upcoming_intelligence.json
    // ========================================================

    const filePath =
      path.join(
        process.cwd(),
        "data",
        normalizedCategory,
        "context",
        "upcoming_intelligence.json"
      );

    console.log(
      `[Upcoming Intelligence] ${normalizedCategory}:`,
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
        `[Upcoming Intelligence] File not found:`,
        filePath
      );

      return NextResponse.json(
        {
          available: false,

          category:
            normalizedCategory,

          historical_matches:
            0,

          matched_pattern_count:
            0,

          matched_patterns:
            [],

          horizon_predictions:
            {},

          technical_intelligence: {
            available:
              false,

            matched_pattern_count:
              0,

            patterns:
              [],

            horizons:
              {},
          },

          message:
            "Upcoming intelligence has not been generated yet.",
        },
        {
          status: 200,
        }
      );
    }

    // ========================================================
    // LOAD UPCOMING INTELLIGENCE JSON
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
    // TECHNICAL SUMMARY
    // ========================================================

    const technicalSummary =
      data?.technical_summary ??
      {};

    // ========================================================
    // FIND MATCHED PATTERN ARRAY
    // ========================================================

    const matchedPatterns =
      Array.isArray(
        data?.matched_patterns
      )
        ? data.matched_patterns

        : Array.isArray(
              data
                ?.technical_intelligence
                ?.patterns
            )
          ? data
              .technical_intelligence
              .patterns

          : Array.isArray(
                data
                  ?.technical_summary
                  ?.matched_patterns
              )
            ? data
                .technical_summary
                .matched_patterns

            : [];

    // ========================================================
    // HISTORICAL MATCH COUNT
    // ========================================================

    const historicalMatches =
      Number(
        technicalSummary
          ?.historical_matches ??

        data
          ?.matched_pattern_count ??

        data
          ?.historical_matches ??

        data
          ?.technical_intelligence
          ?.matched_pattern_count ??

        matchedPatterns.length ??

        0
      );

    // ========================================================
    // HORIZON PREDICTIONS
    // ========================================================

    const horizonPredictions =
      data
        ?.horizon_predictions ??

      technicalSummary
        ?.horizons ??

      data
        ?.technical_intelligence
        ?.horizons ??

      {};

    // ========================================================
    // NORMALIZED TECHNICAL INTELLIGENCE
    // ========================================================

    const technicalIntelligence = {
      available:
        historicalMatches > 0 ||
        matchedPatterns.length > 0,

      matched_pattern_count:
        historicalMatches,

      patterns:
        matchedPatterns,

      horizons:
        horizonPredictions,
    };

    // ========================================================
    // FINAL NORMALIZED RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        ...data,

        available:
          true,

        category:
          normalizedCategory,

        historical_matches:
          historicalMatches,

        matched_pattern_count:
          historicalMatches,

        matched_patterns:
          matchedPatterns,

        technical_summary: {
          ...technicalSummary,

          historical_matches:
            historicalMatches,

          matched_pattern_count:
            historicalMatches,

          horizons:
            horizonPredictions,
        },

        technical_intelligence:
          technicalIntelligence,

        horizon_predictions:
          horizonPredictions,
      }
    );
  } catch (error) {
    console.error(
      "Upcoming intelligence API error:",
      error
    );

    return NextResponse.json(
      {
        available:
          false,

        historical_matches:
          0,

        matched_pattern_count:
          0,

        matched_patterns:
          [],

        horizon_predictions:
          {},

        technical_intelligence: {
          available:
            false,

          matched_pattern_count:
            0,

          patterns:
            [],

          horizons:
            {},
        },

        error:
          "Unable to load upcoming intelligence.",
      },
      {
        status: 500,
      }
    );
  }
}