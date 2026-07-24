import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests


# ============================================================
# EDGE X PRO
# NFP MACRO INTELLIGENCE COLLECTOR V1
#
# OFFICIAL MACRO SOURCE:
# U.S. Bureau of Labor Statistics
#
# COLLECTS:
# - CPI
# - Core CPI
# - Nonfarm Payroll Employment
# - Unemployment Rate
#
# FEATURES:
# - Short network timeout
# - Automatic retries
# - Local last-known-good cache
# - Never deletes existing technical data
# - Never replaces good cached data with failed data
# - Designed to share macro data later with CPI/NFP modules
# ============================================================


BASE_DIR = Path(__file__).resolve().parent


OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "nfp"
    / "context"
    / "current_setup.json"
)


CACHE_DIR = (
    BASE_DIR
    / "data"
    / "shared"
    / "macro"
)


CACHE_FILE = (
    CACHE_DIR
    / "bls_macro_cache.json"
)


BLS_URL = (
    "https://api.bls.gov/"
    "publicAPI/v2/timeseries/data/"
)


# ============================================================
# OFFICIAL BLS SERIES
# ============================================================

SERIES = {

    # CPI-U All Items
    "cpi":
        "CUSR0000SA0",

    # CPI-U All Items Less Food and Energy
    "core_cpi":
        "CUSR0000SA0L1E",

    # Total Nonfarm Payroll Employment
    "nfp":
        "CES0000000001",

    # Civilian Unemployment Rate
    "unemployment":
        "LNS14000000",

}


HEADERS = {

    "User-Agent":
        "Edge-X-Pro/1.0",

    "Content-Type":
        "application/json",

}


# ============================================================
# JSON HELPERS
# ============================================================

def load_json(path):

    if not path.exists():

        return {}


    try:

        with open(
            path,
            "r",
            encoding="utf-8",
        ) as file:

            data = json.load(file)


        if isinstance(data, dict):

            return data


    except Exception as error:

        print()

        print(
            f"Could not read:"
        )

        print(path)

        print(error)


    return {}


def save_json(
    path,
    data,
):

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )


    with open(
        path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            data,
            file,
            indent=2,
        )


# ============================================================
# SAFE FLOAT
# ============================================================

def safe_float(value):

    try:

        return float(value)

    except (
        TypeError,
        ValueError,
    ):

        return None


# ============================================================
# BLS PERIOD TO MONTH
# ============================================================

def period_to_month(period):

    if not period:

        return None


    if not period.startswith(
        "M"
    ):

        return None


    try:

        month = int(
            period[1:]
        )


        if 1 <= month <= 12:

            return month


    except ValueError:

        pass


    return None


# ============================================================
# FETCH BLS SERIES
# ============================================================

def fetch_bls_series():

    series_ids = list(
        SERIES.values()
    )


    current_year = datetime.now(
        timezone.utc
    ).year


    payload = {

        "seriesid":
            series_ids,

        # We need enough history to calculate
        # year-over-year CPI.

        "startyear":
            str(
                current_year - 2
            ),

        "endyear":
            str(
                current_year
            ),

    }


    for attempt in range(
        1,
        4,
    ):

        try:

            print()

            print(
                f"Connecting to official BLS API "
                f"(attempt {attempt}/3)..."
            )


            response = requests.post(

                BLS_URL,

                json=payload,

                headers=HEADERS,

                timeout=15,

            )


            response.raise_for_status()


            result = response.json()


            status = result.get(
                "status"
            )


            if status != "REQUEST_SUCCEEDED":

                print(
                    "BLS returned status:",
                    status,
                )


                print(
                    "Message:",
                    result.get(
                        "message"
                    ),
                )


                if attempt < 3:

                    time.sleep(
                        2
                    )


                continue


            series_data = (

                result
                .get(
                    "Results",
                    {}
                )
                .get(
                    "series",
                    []
                )

            )


            if not series_data:

                print(
                    "BLS returned no series data."
                )


                if attempt < 3:

                    time.sleep(
                        2
                    )


                continue


            print()

            print(
                "BLS DATA RECEIVED SUCCESSFULLY"
            )


            return series_data


        except Exception as error:

            print()

            print(
                f"BLS attempt "
                f"{attempt}/3 failed."
            )

            print(
                "Reason:",
                error,
            )


            if attempt < 3:

                print(
                    "Retrying in 2 seconds..."
                )

                time.sleep(
                    2
                )


    return None


# ============================================================
# NORMALIZE BLS SERIES
# ============================================================

def normalize_bls_series(
    raw_series,
):

    normalized = {}


    reverse_lookup = {

        series_id:
            name

        for (
            name,
            series_id
        )

        in SERIES.items()

    }


    for series in raw_series:

        series_id = series.get(
            "seriesID"
        )


        name = reverse_lookup.get(
            series_id
        )


        if not name:

            continue


        observations = []


        for item in series.get(
            "data",
            []
        ):

            period = item.get(
                "period"
            )


            month = period_to_month(
                period
            )


            # Ignore annual average periods such as M13.

            if month is None:

                continue


            try:

                year = int(
                    item.get(
                        "year"
                    )
                )

            except (
                TypeError,
                ValueError,
            ):

                continue


            value = safe_float(
                item.get(
                    "value"
                )
            )


            if value is None:

                continue


            date_string = (

                f"{year:04d}-"
                f"{month:02d}-01"

            )


            observations.append({

                "date":
                    date_string,

                "year":
                    year,

                "month":
                    month,

                "value":
                    value,

            })


        observations.sort(

            key=lambda item:
                item["date"]

        )


        normalized[
            name
        ] = observations


    return normalized


# ============================================================
# CPI CALCULATION
# ============================================================

def calculate_cpi_metrics(
    observations,
):

    if len(
        observations
    ) < 13:

        return None


    current = observations[
        -1
    ]


    previous_month = observations[
        -2
    ]


    # Find exact same month
    # one year earlier.

    previous_year = None


    target_year = (

        current[
            "year"
        ]

        -

        1

    )


    target_month = current[
        "month"
    ]


    for observation in observations:

        if (

            observation[
                "year"
            ]
            ==
            target_year

            and

            observation[
                "month"
            ]
            ==
            target_month

        ):

            previous_year = observation

            break


    if previous_year is None:

        return None


    if (

        previous_month[
            "value"
        ]
        ==
        0

        or

        previous_year[
            "value"
        ]
        ==
        0

    ):

        return None


    mom = (

        (
            current[
                "value"
            ]

            /

            previous_month[
                "value"
            ]

        )

        -

        1

    ) * 100


    yoy = (

        (
            current[
                "value"
            ]

            /

            previous_year[
                "value"
            ]

        )

        -

        1

    ) * 100


    return {

        # Official CPI releases conventionally display percentage changes
        # to one decimal place. Keep raw calculations separately for internal
        # diagnostics while exposing official-style rounded values.
        "actual_mom":
            round(
                mom,
                1,
            ),

        "actual_yoy":
            round(
                yoy,
                1,
            ),

        "raw_mom":
            round(
                mom,
                4,
            ),

        "raw_yoy":
            round(
                yoy,
                4,
            ),

        "index":
            current[
                "value"
            ],

        "release_period":
            current[
                "date"
            ],

        "source":
            "U.S. Bureau of Labor Statistics",

    }


# ============================================================
# INFLATION TREND
# ============================================================

def determine_inflation_trend(
    observations,
):

    current = calculate_cpi_metrics(
        observations
    )


    previous = calculate_cpi_metrics(
        observations[
            :-1
        ]
    )


    if (

        not current

        or

        not previous

    ):

        return "UNKNOWN"


    difference = (

        current[
            "actual_yoy"
        ]

        -

        previous[
            "actual_yoy"
        ]

    )


    if difference > 0.05:

        return "RISING"


    if difference < -0.05:

        return "COOLING"


    return "STABLE"


# ============================================================
# NFP CALCULATION
# ============================================================

def calculate_nfp(
    observations,
):

    if len(
        observations
    ) < 3:

        return None


    latest = observations[
        -1
    ]


    previous = observations[
        -2
    ]


    before_previous = observations[
        -3
    ]


    latest_change = (

        latest[
            "value"
        ]

        -

        previous[
            "value"
        ]

    )


    previous_change = (

        previous[
            "value"
        ]

        -

        before_previous[
            "value"
        ]

    )


    return {

        "actual":
            round(
                latest_change,
                0,
            ),

        "previous":
            round(
                previous_change,
                0,
            ),

        # Consensus will be connected later.

        "forecast":
            None,

        "release_period":
            latest[
                "date"
            ],

        "unit":
            "thousand jobs",

        "source":
            "U.S. Bureau of Labor Statistics",

    }


# ============================================================
# UNEMPLOYMENT
# ============================================================

def calculate_unemployment(
    observations,
):

    if not observations:

        return None


    latest = observations[
        -1
    ]


    previous = (

        observations[
            -2
        ]

        if len(
            observations
        ) >= 2

        else None

    )


    return {

        "actual":
            latest[
                "value"
            ],

        "previous":
            (

                previous[
                    "value"
                ]

                if previous

                else None

            ),

        "forecast":
            None,

        "release_period":
            latest[
                "date"
            ],

        "unit":
            "percent",

        "source":
            "U.S. Bureau of Labor Statistics",

    }


# ============================================================
# LABOR TREND
# ============================================================

def determine_labor_trend(
    nfp_observations,
    unemployment_observations,
):

    if (

        len(
            nfp_observations
        )
        <
        3

        or

        len(
            unemployment_observations
        )
        <
        2

    ):

        return "UNKNOWN"


    latest_nfp = (

        nfp_observations[
            -1
        ][
            "value"
        ]

        -

        nfp_observations[
            -2
        ][
            "value"
        ]

    )


    previous_nfp = (

        nfp_observations[
            -2
        ][
            "value"
        ]

        -

        nfp_observations[
            -3
        ][
            "value"
        ]

    )


    latest_unemployment = (

        unemployment_observations[
            -1
        ][
            "value"
        ]

    )


    previous_unemployment = (

        unemployment_observations[
            -2
        ][
            "value"
        ]

    )


    if (

        latest_nfp
        >
        previous_nfp

        and

        latest_unemployment
        <=
        previous_unemployment

    ):

        return "STRONG"


    if (

        latest_nfp
        <
        previous_nfp

        or

        latest_unemployment
        >
        previous_unemployment

    ):

        return "WEAKENING"


    return "STABLE"


# ============================================================
# BUILD MACRO DATA
# ============================================================

def build_macro_data(
    normalized,
):

    cpi_observations = normalized.get(
        "cpi",
        [],
    )


    core_cpi_observations = normalized.get(
        "core_cpi",
        [],
    )


    nfp_observations = normalized.get(
        "nfp",
        [],
    )


    unemployment_observations = normalized.get(
        "unemployment",
        [],
    )


    macro = {}


    cpi = calculate_cpi_metrics(
        cpi_observations
    )


    if cpi:

        cpi[
            "forecast"
        ] = None


        macro[
            "cpi"
        ] = cpi


    core_cpi = calculate_cpi_metrics(
        core_cpi_observations
    )


    if core_cpi:

        core_cpi[
            "forecast"
        ] = None


        macro[
            "core_cpi"
        ] = core_cpi


    nfp = calculate_nfp(
        nfp_observations
    )


    if nfp:

        macro[
            "nfp"
        ] = nfp


    unemployment = calculate_unemployment(
        unemployment_observations
    )


    if unemployment:

        macro[
            "unemployment"
        ] = unemployment


    inflation_trend = (

        determine_inflation_trend(
            cpi_observations
        )

    )


    labor_market = (

        determine_labor_trend(

            nfp_observations,

            unemployment_observations,

        )

    )


    return {

        "macro":
            macro,

        "inflation_trend":
            inflation_trend,

        "labor_market":
            labor_market,

        "updated_at_utc":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "source_status":
            "LIVE_BLS",

    }


# ============================================================
# CACHE
# ============================================================

def load_cache():

    return load_json(
        CACHE_FILE
    )


def save_cache(
    data,
):

    save_json(
        CACHE_FILE,
        data,
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print(
        "=" * 65
    )

    print(
        "EDGE X PRO"
    )

    print(
        "NFP MACRO INTELLIGENCE COLLECTOR V1"
    )

    print(
        "=" * 65
    )


    setup = load_json(
        OUTPUT_FILE
    )


    if not setup:

        print()

        print(
            "ERROR:"
        )

        print(
            "current_setup.json "
            "could not be loaded."
        )

        return


    # ========================================================
    # TRY LIVE BLS
    # ========================================================

    raw_series = fetch_bls_series()


    macro_package = None


    if raw_series:

        normalized = normalize_bls_series(
            raw_series
        )


        macro_package = build_macro_data(
            normalized
        )


        if macro_package.get(
            "macro"
        ):

            save_cache(
                macro_package
            )


            print()

            print(
                "Macro cache updated."
            )


    # ========================================================
    # FALL BACK TO CACHE
    # ========================================================

    if (

        not macro_package

        or

        not macro_package.get(
            "macro"
        )

    ):

        print()

        print(
            "Live BLS data unavailable."
        )

        print(
            "Checking local cache..."
        )


        cached = load_cache()


        if cached:

            macro_package = cached


            macro_package[
                "source_status"
            ] = (
                "CACHE_FALLBACK"
            )


            print(
                "Using last-known-good "
                "macro cache."
            )


        else:

            print(
                "No macro cache available."
            )


            macro_package = {

                "macro":
                    {},

                "inflation_trend":
                    "UNKNOWN",

                "labor_market":
                    "UNKNOWN",

                "source_status":
                    "UNAVAILABLE",

            }


    # ========================================================
    # PRESERVE ALL EXISTING NFP DATA
    # ========================================================

    fundamental = setup.setdefault(
        "fundamental",
        {},
    )


    existing_macro = fundamental.setdefault(
        "macro",
        {},
    )


    # Only update fields that were
    # successfully collected.

    for (
        key,
        value
    ) in macro_package.get(
        "macro",
        {},
    ).items():

        existing_macro[
            key
        ] = value


    fundamental[
        "inflation_trend"
    ] = macro_package.get(

        "inflation_trend",

        fundamental.get(
            "inflation_trend",
            "UNKNOWN",
        ),

    )


    fundamental[
        "labor_market"
    ] = macro_package.get(

        "labor_market",

        fundamental.get(
            "labor_market",
            "UNKNOWN",
        ),

    )


    # ========================================================
    # MARKET STRUCTURE PLACEHOLDERS
    #
    # DXY + US10Y will be connected in
    # the dedicated live market collector.
    # ========================================================

    markets = fundamental.setdefault(
        "markets",
        {},
    )


    markets.setdefault(

        "dxy",

        {

            "value":
                None,

            "direction":
                "UNKNOWN",

            "source":
                "NOT_CONNECTED",

        },

    )


    markets.setdefault(

        "us10y",

        {

            "value":
                None,

            "direction":
                "UNKNOWN",

            "source":
                "NOT_CONNECTED",

        },

    )


    # ========================================================
    # DATA QUALITY
    # ========================================================

    quality = fundamental.setdefault(
        "data_quality",
        {},
    )


    macro_data = macro_package.get(
        "macro",
        {},
    )


    quality[
        "cpi_data"
    ] = bool(
        macro_data.get(
            "cpi"
        )
    )


    quality[
        "core_cpi_data"
    ] = bool(
        macro_data.get(
            "core_cpi"
        )
    )


    quality[
        "nfp_data"
    ] = bool(
        macro_data.get(
            "nfp"
        )
    )


    quality[
        "unemployment_data"
    ] = bool(
        macro_data.get(
            "unemployment"
        )
    )


    quality[
        "macro_data"
    ] = all([

        quality[
            "cpi_data"
        ],

        quality[
            "core_cpi_data"
        ],

        quality[
            "nfp_data"
        ],

        quality[
            "unemployment_data"
        ],

    ])


    fundamental[
        "macro_source_status"
    ] = macro_package.get(
        "source_status",
        "UNKNOWN",
    )


    fundamental[
        "macro_updated_at_utc"
    ] = macro_package.get(

        "updated_at_utc",

        datetime.now(
            timezone.utc
        ).isoformat(),

    )


    # ========================================================
    # SAVE NFP SETUP
    # ========================================================

    save_json(
        OUTPUT_FILE,
        setup,
    )


    # ========================================================
    # TERMINAL RESULTS
    # ========================================================

    print()

    print(
        "=" * 65
    )

    print(
        "MACRO INTELLIGENCE COMPLETE"
    )

    print(
        "=" * 65
    )


    print()

    print(
        "SOURCE:"
    )

    print(
        fundamental.get(
            "macro_source_status"
        )
    )


    print()

    print(
        "INFLATION TREND:"
    )

    print(
        fundamental.get(
            "inflation_trend",
            "UNKNOWN",
        )
    )


    print()

    print(
        "LABOR MARKET:"
    )

    print(
        fundamental.get(
            "labor_market",
            "UNKNOWN",
        )
    )


    # --------------------------------------------------------
    # CPI
    # --------------------------------------------------------

    cpi_result = existing_macro.get(
        "cpi",
        {},
    )


    print()

    print(
        "LATEST CPI:"
    )


    if cpi_result:

        print(

            "YoY:",

            cpi_result.get(
                "actual_yoy"
            ),

            "%",

        )


        print(

            "MoM:",

            cpi_result.get(
                "actual_mom"
            ),

            "%",

        )


        print(

            "Period:",

            cpi_result.get(
                "release_period"
            ),

        )


    else:

        print(
            "UNKNOWN"
        )


    # --------------------------------------------------------
    # CORE CPI
    # --------------------------------------------------------

    core_result = existing_macro.get(
        "core_cpi",
        {},
    )


    print()

    print(
        "LATEST CORE CPI:"
    )


    if core_result:

        print(

            "YoY:",

            core_result.get(
                "actual_yoy"
            ),

            "%",

        )


        print(

            "MoM:",

            core_result.get(
                "actual_mom"
            ),

            "%",

        )


    else:

        print(
            "UNKNOWN"
        )


    # --------------------------------------------------------
    # NFP
    # --------------------------------------------------------

    nfp_result = existing_macro.get(
        "nfp",
        {},
    )


    print()

    print(
        "LATEST NFP:"
    )


    if nfp_result:

        print(

            nfp_result.get(
                "actual"
            ),

            "thousand jobs",

        )


        print(

            "Previous:",

            nfp_result.get(
                "previous"
            ),

        )


    else:

        print(
            "UNKNOWN"
        )


    # --------------------------------------------------------
    # UNEMPLOYMENT
    # --------------------------------------------------------

    unemployment_result = (

        existing_macro.get(
            "unemployment",
            {},
        )

    )


    print()

    print(
        "UNEMPLOYMENT:"
    )


    if unemployment_result:

        print(

            unemployment_result.get(
                "actual"
            ),

            "%",

        )


        print(

            "Previous:",

            unemployment_result.get(
                "previous"
            ),

            "%",

        )


    else:

        print(
            "UNKNOWN"
        )


    print()

    print(
        "Saved:"
    )

    print(
        OUTPUT_FILE
    )


    print()

    print(
        "Shared cache:"
    )

    print(
        CACHE_FILE
    )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    main()