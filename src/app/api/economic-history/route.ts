import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type EventType =
  | "CPI"
  | "CORE_CPI"
  | "PPI"
  | "CORE_PPI"
  | "NFP"
  | "UNEMPLOYMENT";

type BLSDataPoint = {
  year: string;
  period: string;
  periodName: string;
  value: string;
};

type BLSSeries = {
  seriesID?: string;
  data?: BLSDataPoint[];
};

type BLSResponse = {
  status?: string;
  message?: string[];
  Results?: {
    series?: BLSSeries[];
  };
};

type SeriesConfig = {
  seriesId: string;
  name: string;
  unit: string;
  calculation:
    | "percent-change"
    | "payroll-change"
    | "direct-percent";
};

/*
  IMPORTANT:

  CPI and Core CPI now use SEASONALLY ADJUSTED series.

  CPI:
  CUSR0000SA0
  All Items CPI-U, Seasonally Adjusted

  CORE CPI:
  CUSR0000SA0L1E
  CPI excluding Food and Energy,
  Seasonally Adjusted

  PPI:
  WPSFD4
  Final Demand PPI, Seasonally Adjusted

  CORE PPI:
  WPSFD49104
  Final Demand excluding Food, Energy
  and Trade Services, Seasonally Adjusted

  NFP:
  CES0000000001
  Total Nonfarm Payroll Employment,
  Seasonally Adjusted

  UNEMPLOYMENT:
  LNS14000000
  Unemployment Rate,
  Seasonally Adjusted
*/

const seriesMap: Record<EventType, SeriesConfig> = {
  CPI: {
    seriesId: "CUSR0000SA0",
    name: "Consumer Price Index (CPI)",
    unit: "%",
    calculation: "percent-change",
  },

  CORE_CPI: {
    seriesId: "CUSR0000SA0L1E",
    name: "Core CPI",
    unit: "%",
    calculation: "percent-change",
  },

  PPI: {
    seriesId: "WPSFD4",
    name: "Producer Price Index (PPI)",
    unit: "%",
    calculation: "percent-change",
  },

  CORE_PPI: {
    seriesId: "WPSFD49104",
    name: "Core PPI",
    unit: "%",
    calculation: "percent-change",
  },

  NFP: {
    seriesId: "CES0000000001",
    name: "Nonfarm Payrolls (NFP)",
    unit: "K",
    calculation: "payroll-change",
  },

  UNEMPLOYMENT: {
    seriesId: "LNS14000000",
    name: "Unemployment Rate",
    unit: "%",
    calculation: "direct-percent",
  },
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const requestedEvent =
      params.get("event")?.toUpperCase() as
        | EventType
        | undefined;

    const requestedYears = Number(
      params.get("years") || "5"
    );

    const years = Math.min(
      Math.max(
        Number.isFinite(requestedYears)
          ? requestedYears
          : 5,
        1
      ),
      20
    );

    const currentYear = new Date().getFullYear();

    /*
      Fetch one extra year.

      We need the previous month to calculate
      January's month-over-month change correctly.
    */

    const startYear = currentYear - years - 1;

    const eventTypes: EventType[] =
      requestedEvent && seriesMap[requestedEvent]
        ? [requestedEvent]
        : [
            "CPI",
            "CORE_CPI",
            "PPI",
            "CORE_PPI",
            "NFP",
            "UNEMPLOYMENT",
          ];

    const seriesIds = eventTypes.map(
      (type) => seriesMap[type].seriesId
    );

    const response = await fetch(
      "https://api.bls.gov/publicAPI/v2/timeseries/data/",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          seriesid: seriesIds,
          startyear: String(startYear),
          endyear: String(currentYear),
        }),

        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "BLS API returned an HTTP error.",
          providerStatus: response.status,
        },
        {
          status: response.status,
        }
      );
    }

    const data =
      (await response.json()) as BLSResponse;

    if (data.status !== "REQUEST_SUCCEEDED") {
      return NextResponse.json(
        {
          success: false,
          error: "BLS API request failed.",
          message: data.message || [],
        },
        {
          status: 502,
        }
      );
    }

    const returnedSeries =
      data.Results?.series || [];

    const results = eventTypes.map((eventType) => {
      const config = seriesMap[eventType];

      const series = returnedSeries.find(
        (item) =>
          item.seriesID === config.seriesId
      );

      const monthlyData = (series?.data || [])
        .filter((item) =>
          /^M(0[1-9]|1[0-2])$/.test(item.period)
        )
        .map((item) => ({
          year: Number(item.year),

          month: Number(
            item.period.replace("M", "")
          ),

          monthName: item.periodName,

          value: Number(item.value),

          rawValue: item.value,
        }))
        .filter((item) =>
          Number.isFinite(item.value)
        )
        .sort((a, b) => {
          if (a.year !== b.year) {
            return a.year - b.year;
          }

          return a.month - b.month;
        });

      const calculatedHistory =
        monthlyData.map((item, index) => {
          const previous =
            monthlyData[index - 1];

          let reportedValue: number | null =
            null;

          let monthlyChange: number | null =
            null;

          let payrollChange: number | null =
            null;

          /*
            CPI / CORE CPI / PPI / CORE PPI

            Calculate month-over-month percentage
            change from seasonally adjusted indexes.
          */

          if (
            config.calculation ===
              "percent-change" &&
            previous &&
            previous.value !== 0
          ) {
            monthlyChange =
              ((item.value - previous.value) /
                previous.value) *
              100;

            reportedValue = Number(
              monthlyChange.toFixed(1)
            );
          }

          /*
            NFP

            BLS payroll level is measured in
            thousands.

            Monthly NFP = current employment level
            minus previous month's employment level.
          */

          if (
            config.calculation ===
              "payroll-change" &&
            previous
          ) {
            payrollChange =
              item.value - previous.value;

            reportedValue = Math.round(
              payrollChange
            );
          }

          /*
            Unemployment is already reported
            directly as a percentage.
          */

          if (
            config.calculation ===
            "direct-percent"
          ) {
            reportedValue = item.value;
          }

          return {
            year: item.year,

            month: item.month,

            monthName: item.monthName,

            value: item.value,

            rawValue: item.rawValue,

            monthlyChange:
              monthlyChange === null
                ? null
                : Number(
                    monthlyChange.toFixed(2)
                  ),

            payrollChange:
              payrollChange === null
                ? null
                : Math.round(payrollChange),

            reportedValue,

            displayValue:
              reportedValue === null
                ? "—"
                : config.calculation ===
                  "payroll-change"
                ? `${
                    reportedValue > 0 ? "+" : ""
                  }${reportedValue}K`
                : `${reportedValue.toFixed(1)}%`,
          };
        });

      /*
        Remove the extra year that was fetched
        only for calculation purposes.
      */

      const visibleHistory =
        calculatedHistory
          .filter(
            (item) =>
              item.year >=
              currentYear - years
          )
          .reverse();

      return {
        eventType,

        name: config.name,

        seriesId: config.seriesId,

        unit: config.unit,

        calculation:
          config.calculation,

        latest:
          visibleHistory[0] || null,

        history:
          visibleHistory.slice(0, 60),
      };
    });

    return NextResponse.json({
      success: true,

      provider:
        "U.S. Bureau of Labor Statistics",

      source:
        "BLS Public Data API",

      dataType:
        "Seasonally Adjusted Trading-Relevant Series",

      results,

      generatedAt:
        new Date().toISOString(),

      methodology: {
        CPI:
          "Month-over-month change calculated from seasonally adjusted CPI-U.",

        CORE_CPI:
          "Month-over-month change calculated from seasonally adjusted CPI excluding food and energy.",

        PPI:
          "Month-over-month change calculated from seasonally adjusted Final Demand PPI.",

        CORE_PPI:
          "Month-over-month change calculated from seasonally adjusted Final Demand excluding food, energy and trade services.",

        NFP:
          "Monthly payroll change calculated from seasonally adjusted total nonfarm employment.",

        UNEMPLOYMENT:
          "Official seasonally adjusted unemployment rate.",
      },
    });
  } catch (error) {
    console.error(
      "Economic history API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Failed to load historical economic data.",
      },
      {
        status: 500,
      }
    );
  }
}