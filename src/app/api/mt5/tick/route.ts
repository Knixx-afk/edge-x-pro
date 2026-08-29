import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const bridge = process.env.MT5_BRIDGE_URL || "http://127.0.0.1:8765";

  try {
    const response = await fetch(`${bridge}/tick`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) {
      return NextResponse.json({ connected: false, error: "MT5 bridge error" }, { status: 503 });
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { connected: false, error: "MT5 bridge is offline. Start mt5_bridge.py." },
      { status: 503 }
    );
  }
}
