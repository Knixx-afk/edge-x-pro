import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Candle = {
  timestamp: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume: number;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "No CSV file was uploaded.",
        },
        {
          status: 400,
        }
      );
    }

    if (!uploadedFile.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        {
          success: false,
          error: "Please upload an MT5 CSV file.",
        },
        {
          status: 400,
        }
      );
    }

    const fileText = await uploadedFile.text();

    const candles = parseMT5CSV(fileText);

    if (candles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No valid XAUUSD candles were found. Export the data from MT5 as CSV.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Save the normalized data locally.

      Later our News Intelligence engine will read
      this file and match candles against exact
      economic release timestamps.
    */

    const dataDirectory = path.join(
      process.cwd(),
      "data"
    );

    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, {
        recursive: true,
      });
    }

    const outputPath = path.join(
      dataDirectory,
      "xauusd-m1.json"
    );

    fs.writeFileSync(
      outputPath,
      JSON.stringify(candles),
      "utf8"
    );

    return NextResponse.json({
      success: true,

      message:
        "XAUUSD CFD historical data imported successfully.",

      source:
        "User MT5 Broker Data",

      originalFile:
        uploadedFile.name,

      candlesImported:
        candles.length,

      firstCandle:
        candles[0],

      lastCandle:
        candles[candles.length - 1],

      storedAs:
        "data/xauusd-m1.json",
    });
  } catch (error) {
    console.error(
      "XAUUSD import error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to import XAUUSD historical data.",
      },
      {
        status: 500,
      }
    );
  }
}

function parseMT5CSV(
  text: string
): Candle[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const candles: Candle[] = [];

  /*
    Common MT5 export:

    <DATE>    <TIME>    <OPEN>    <HIGH>
    <LOW>     <CLOSE>   <TICKVOL>
    <VOL>     <SPREAD>

    MT5 may export with tabs, commas or semicolons.
  */

  for (const line of lines) {
    const columns = splitLine(line);

    if (columns.length < 6) {
      continue;
    }

    const cleanedColumns =
      columns.map(cleanHeader);

    /*
      Skip the header row.
    */

    if (
      cleanedColumns.some(
        (value) =>
          value === "date" ||
          value === "<date>"
      )
    ) {
      continue;
    }

    const date = columns[0]
      ?.replace(/[<>]/g, "")
      .trim();

    const clockTime = columns[1]
      ?.replace(/[<>]/g, "")
      .trim();

    const open = Number(columns[2]);
    const high = Number(columns[3]);
    const low = Number(columns[4]);
    const close = Number(columns[5]);

    const tickVolume =
      columns.length > 6
        ? Number(columns[6]) || 0
        : 0;

    if (
      !date ||
      !clockTime ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }

    const normalizedDate =
      normalizeDate(date);

    if (!normalizedDate) {
      continue;
    }

    /*
      IMPORTANT:

      This timestamp is stored without applying a
      timezone conversion.

      Your broker's server timezone will be configured
      separately before matching news release times.
    */

    const timestamp =
      `${normalizedDate}T${clockTime}`;

    const parsedTime =
      new Date(timestamp).getTime();

    if (!Number.isFinite(parsedTime)) {
      continue;
    }

    candles.push({
      timestamp,

      time: parsedTime,

      open,

      high,

      low,

      close,

      tickVolume,
    });
  }

  candles.sort(
    (a, b) =>
      a.time - b.time
  );

  /*
    Remove duplicate timestamps.
  */

  const unique =
    new Map<string, Candle>();

  for (const candle of candles) {
    unique.set(
      candle.timestamp,
      candle
    );
  }

  return Array.from(
    unique.values()
  ).sort(
    (a, b) =>
      a.time - b.time
  );
}

function splitLine(
  line: string
) {
  if (line.includes("\t")) {
    return line.split("\t");
  }

  if (line.includes(";")) {
    return line.split(";");
  }

  return line.split(",");
}

function cleanHeader(
  value: string
) {
  return value
    .replace(/[<>"]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeDate(
  value: string
) {
  const cleaned =
    value.trim();

  /*
    MT5 commonly uses:

    YYYY.MM.DD
  */

  const dotFormat =
    cleaned.match(
      /^(\d{4})\.(\d{2})\.(\d{2})$/
    );

  if (dotFormat) {
    return `${dotFormat[1]}-${dotFormat[2]}-${dotFormat[3]}`;
  }

  /*
    Also support:

    YYYY-MM-DD
  */

  const dashFormat =
    cleaned.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (dashFormat) {
    return cleaned;
  }

  return null;
}