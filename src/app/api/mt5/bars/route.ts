import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const bridge = process.env.MT5_BRIDGE_URL || "http://127.0.0.1:8765";
  const timeframe = request.nextUrl.searchParams.get("timeframe") || "M5";
  const limit = request.nextUrl.searchParams.get("limit") || "150";

  try {
    const response = await fetch(
      `${bridge}/bars?timeframe=${encodeURIComponent(timeframe)}&limit=${encodeURIComponent(limit)}`,
      { cache: "no-store", signal: AbortSignal.timeout(2500) }
    );

    if (!response.ok) {
      return NextResponse.json({ connected: false, error: "MT5 bridge error", bars: [] }, { status: 503 });
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { connected: false, error: "MT5 bridge is offline. Start mt5_bridge.py.", bars: [] },
      { status: 503 }
    );
  }
}
