import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = ["fomc", "cpi", "nfp"];

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

    if (
      !ALLOWED_CATEGORIES.includes(
        normalizedCategory
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid news category.",
        },
        {
          status: 400,
        }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "data",
      normalizedCategory,
      "reactions",
      "gold_reactions.json"
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          category: normalizedCategory,
          available: false,
          reactions: [],
          message: `${normalizedCategory.toUpperCase()} reaction database has not been created yet.`,
        },
        {
          status: 200,
        }
      );
    }

    const fileContent =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    const data =
      JSON.parse(fileContent);

    return NextResponse.json({
      ...data,

      category:
        normalizedCategory,

      available:
        true,
    });

  } catch (error) {
    console.error(
      "News reactions API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load reaction database.",
      },
      {
        status: 500,
      }
    );
  }
}