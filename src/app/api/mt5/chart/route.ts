import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

function runPython(scriptPath: string, timeframe: string) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      "python",
      [scriptPath, "--timeframe", timeframe],
      {
        cwd: process.cwd(),
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }

        resolve(stdout);
      }
    );
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedTimeframe = (
      searchParams.get("timeframe") || "M1"
    ).toUpperCase();

    const allowedTimeframes = ["M1", "M5", "M15", "M30", "H1", "H4"];

    const timeframe = allowedTimeframes.includes(requestedTimeframe)
      ? requestedTimeframe
      : "M1";

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "get_mt5_chart.py"
    );

    const output = await runPython(scriptPath, timeframe);

    const data = JSON.parse(output);

    return NextResponse.json(
      {
        ...data,
        timeframe,
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
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch MT5 chart data",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
