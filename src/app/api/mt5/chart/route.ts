import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4"];

export async function GET(request: NextRequest) {
  const bridge =
    process.env.MT5_BRIDGE_URL || "http://127.0.0.1:8765";

  const requestedTimeframe = (
    request.nextUrl.searchParams.get("timeframe") || "M1"
  ).toUpperCase();

  const timeframe = ALLOWED_TIMEFRAMES.includes(requestedTimeframe)
    ? requestedTimeframe
    : "M1";

  try {
    // Get candles from your MT5 bridge
    const barsResponse = await fetch(
      `${bridge}/bars?timeframe=${encodeURIComponent(
        timeframe
      )}&limit=300`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!barsResponse.ok) {
      throw new Error("MT5 bridge returned an error while loading candles");
    }

    const barsData = await barsResponse.json();

    // Get live bid/ask price
    const tickResponse = await fetch(`${bridge}/tick`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    let price = {
      bid: null as number | null,
      ask: null as number | null,
      last: null as number | null,
    };

    if (tickResponse.ok) {
      const tickData = await tickResponse.json();

      price = {
        bid:
          typeof tickData.bid === "number"
            ? tickData.bid
            : null,

        ask:
          typeof tickData.ask === "number"
            ? tickData.ask
            : null,

        last:
          typeof tickData.last === "number"
            ? tickData.last
            : null,
      };
    }

    const bars = Array.isArray(barsData.bars)
      ? barsData.bars
      : [];

    const candles = bars.map(
      (bar: {
        time: number;
        open: number;
        high: number;
        low: number;
        close: number;
      }) => ({
        time: Number(bar.time),
        open: Number(bar.open),
        high: Number(bar.high),
        low: Number(bar.low),
        close: Number(bar.close),
      })
    );

    return NextResponse.json(
      {
        success: true,
        connected: true,
        symbol: barsData.symbol || "XAUUSD",
        timeframe,
        price,
        candles,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("MT5 chart API error:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        symbol: "XAUUSD",
        timeframe,
        price: {
          bid: null,
          ask: null,
          last: null,
        },
        candles: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to MT5 bridge",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}