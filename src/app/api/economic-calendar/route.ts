import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type NewsEvent = {
  id: string;
  date: string;
  time: string;
  currency: "USD";
  event: string;
  category:
    | "CPI"
    | "PPI"
    | "NFP"
    | "UNEMPLOYMENT"
    | "FOMC";
  impact: "High";
  previous: string;
  forecast: string;
  actual: string;
  source: string;
  sourceUrl: string;
  relevance: string;
};

/*
  IMPORTANT

  This route uses official scheduled release dates.

  Historical ACTUAL values will be connected in the
  next route using BLS time-series data.

  Forecast/consensus data is not published by BLS/Fed,
  so it will later come from our research/analysis layer.
*/

export async function GET() {
  try {
    const now = new Date();

    /*
      EDGE X PRO NEWS DATABASE

      Add upcoming official release dates here.

      The next upgrade will automatically update these
      schedules from official sources.
    */

    const events: NewsEvent[] = [
      {
        id: "employment-2026-08-07",
        date: "2026-08-07",
        time: "08:30",
        currency: "USD",
        event: "Nonfarm Payrolls (NFP)",
        category: "NFP",
        impact: "High",
        previous: "Loading historical data...",
        forecast: "Research pending",
        actual: "Pending",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl:
          "https://www.bls.gov/news.release/empsit.htm",
        relevance: "Very High — USD / XAUUSD",
      },

      {
        id: "unemployment-2026-08-07",
        date: "2026-08-07",
        time: "08:30",
        currency: "USD",
        event: "Unemployment Rate",
        category: "UNEMPLOYMENT",
        impact: "High",
        previous: "Loading historical data...",
        forecast: "Research pending",
        actual: "Pending",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl:
          "https://www.bls.gov/news.release/empsit.htm",
        relevance: "Very High — USD / XAUUSD",
      },

      {
        id: "cpi-2026-08-12",
        date: "2026-08-12",
        time: "08:30",
        currency: "USD",
        event: "Consumer Price Index (CPI)",
        category: "CPI",
        impact: "High",
        previous: "Loading historical data...",
        forecast: "Research pending",
        actual: "Pending",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl:
          "https://www.bls.gov/news.release/cpi.htm",
        relevance: "Very High — USD / XAUUSD",
      },

      {
        id: "core-cpi-2026-08-12",
        date: "2026-08-12",
        time: "08:30",
        currency: "USD",
        event: "Core CPI",
        category: "CPI",
        impact: "High",
        previous: "Loading historical data...",
        forecast: "Research pending",
        actual: "Pending",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl:
          "https://www.bls.gov/news.release/cpi.htm",
        relevance: "Very High — USD / XAUUSD",
      },

      {
        id: "ppi-2026-08-13",
        date: "2026-08-13",
        time: "08:30",
        currency: "USD",
        event: "Producer Price Index (PPI)",
        category: "PPI",
        impact: "High",
        previous: "Loading historical data...",
        forecast: "Research pending",
        actual: "Pending",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl:
          "https://www.bls.gov/news.release/ppi.htm",
        relevance: "High — USD / XAUUSD",
      },

      {
        id: "core-ppi-2026-08-13",
        date: "2026-08-13",
        time: "08:30",
        currency: "USD",
        event: "Core PPI",
        category: "PPI",
        impact: "High",
        previous: "Loading historical data...",
        forecast: "Research pending",
        actual: "Pending",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl:
          "https://www.bls.gov/news.release/ppi.htm",
        relevance: "High — USD / XAUUSD",
      },

      /*
        FOMC dates are handled separately because
        Fed announcement times differ from BLS releases.

        Add/update upcoming meetings here while we build
        the automatic Fed schedule reader.
      */
    ];

    /*
      Keep future events only.
    */

    const upcomingEvents = events
      .filter((event) => {
        const eventDate = new Date(
          `${event.date}T${event.time}:00-04:00`
        );

        return eventDate.getTime() >= now.getTime();
      })
      .sort((a, b) => {
        const first = `${a.date} ${a.time}`;
        const second = `${b.date} ${b.time}`;

        return first.localeCompare(second);
      });

    return NextResponse.json({
      success: true,

      provider: "EDGE X PRO Official Sources",

      dataMode: "Official US Economic Data",

      market: "XAUUSD",

      currencies: ["USD"],

      categories: [
        "CPI",
        "PPI",
        "NFP",
        "UNEMPLOYMENT",
        "FOMC",
      ],

      count: upcomingEvents.length,

      events: upcomingEvents,

      generatedAt: new Date().toISOString(),

      notice:
        "Forecast consensus and AI probability analysis are added by the research layer and are not official government forecasts.",
    });
  } catch (error) {
    console.error(
      "EDGE X economic calendar error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Failed to load EDGE X PRO economic calendar.",
      },
      {
        status: 500,
      }
    );
  }
}