import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "verified-gold-reactions",
      "gold_reactions.json"
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          error: "gold_reactions.json not found",
          path: filePath,
        },
        { status: 404 }
      );
    }

    const fileData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileData);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Gold reactions API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load gold reaction data",
      },
      { status: 500 }
    );
  }
}