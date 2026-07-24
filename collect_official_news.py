import json
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


# ============================================================
# EDGE X PRO
# OFFICIAL ECONOMIC DATA COLLECTOR
#
# REAL DATA ONLY
#
# SOURCE:
# U.S. Bureau of Labor Statistics Public Data API
#
# This file collects monthly economic observations.
#
# IMPORTANT:
# Economic observation dates are NOT automatically treated
# as release dates.
#
# Exact verified release timestamps will be attached
# separately before XAUUSD reaction analysis.
# ============================================================


START_YEAR = 2021
END_YEAR = 2026


OUTPUT_FOLDER = (
    Path("data")
    / "economic-events"
)


OUTPUT_FILE = (
    OUTPUT_FOLDER
    / "verified_events.json"
)


IST = ZoneInfo(
    "Asia/Kolkata"
)


# ============================================================
# OFFICIAL BLS SERIES
# ============================================================


SERIES = {

    # --------------------------------------------------------
    # CPI
    # Consumer Price Index for All Urban Consumers
    # All Items
    # Seasonally Adjusted
    # --------------------------------------------------------

    "CPI": {
        "series_id":
            "CUSR0000SA0",

        "name":
            "Consumer Price Index",

        "unit":
            "Index",
    },


    # --------------------------------------------------------
    # CORE CPI
    # All items less food and energy
    # Seasonally Adjusted
    # --------------------------------------------------------

    "CORE_CPI": {
        "series_id":
            "CUSR0000SA0L1E",

        "name":
            "Core Consumer Price Index",

        "unit":
            "Index",
    },


    # --------------------------------------------------------
    # UNEMPLOYMENT RATE
    # Civilian unemployment rate
    # Seasonally Adjusted
    # --------------------------------------------------------

    "UNEMPLOYMENT": {
        "series_id":
            "LNS14000000",

        "name":
            "Unemployment Rate",

        "unit":
            "Percent",
    },


    # --------------------------------------------------------
    # NONFARM PAYROLLS
    # Total Nonfarm Employment
    # Seasonally Adjusted
    #
    # Values are employment levels.
    # Monthly NFP change will be calculated from consecutive
    # observations.
    # --------------------------------------------------------

    "NFP_LEVEL": {
        "series_id":
            "CES0000000001",

        "name":
            "Total Nonfarm Payroll Employment",

        "unit":
            "Thousands",
    },
}


# ============================================================
# BLS API
# ============================================================


BLS_API = (
    "https://api.bls.gov/"
    "publicAPI/v2/timeseries/data/"
)


# ============================================================
# DOWNLOAD ONE BLS SERIES
# ============================================================


def download_bls_series(
    series_id,
    start_year,
    end_year,
):

    payload = {

        "seriesid": [
            series_id
        ],

        "startyear":
            str(start_year),

        "endyear":
            str(end_year),
    }


    encoded_payload = (
        json.dumps(
            payload
        )
        .encode(
            "utf-8"
        )
    )


    request = (
        urllib.request.Request(

            BLS_API,

            data=
                encoded_payload,

            headers={

                "Content-Type":
                    "application/json",

                "User-Agent":
                    "EDGE-X-PRO/1.0",
            },

            method="POST",
        )
    )


    try:

        with urllib.request.urlopen(
            request,
            timeout=60,
        ) as response:

            raw = (
                response
                .read()
                .decode(
                    "utf-8"
                )
            )


    except urllib.error.HTTPError as error:

        raise RuntimeError(

            f"BLS API HTTP error: "
            f"{error.code}"

        )


    except Exception as error:

        raise RuntimeError(

            f"Could not connect to "
            f"BLS API: {error}"

        )


    try:

        result = (
            json.loads(
                raw
            )
        )


    except json.JSONDecodeError:

        raise RuntimeError(

            "BLS API returned "
            "invalid JSON."

        )


    status = (
        result.get(
            "status"
        )
    )


    if (
        status
        != "REQUEST_SUCCEEDED"
    ):

        message = (
            result.get(
                "message"
            )
        )

        raise RuntimeError(

            f"BLS API request failed: "
            f"{message}"

        )


    series_results = (

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


    if not series_results:

        return []


    return (

        series_results[0]
        .get(
            "data",
            []
        )

    )


# ============================================================
# NORMALIZE BLS MONTHLY DATA
# ============================================================


def normalize_monthly_data(
    event_type,
    config,
    raw_data,
):

    observations = []


    for item in raw_data:

        period = (
            item.get(
                "period",
                ""
            )
        )


        # Ignore annual average M13.

        if (
            not period.startswith(
                "M"
            )
            or period == "M13"
        ):

            continue


        try:

            year = int(
                item[
                    "year"
                ]
            )


            month = int(
                period[
                    1:
                ]
            )


            value = float(
                item[
                    "value"
                ]
            )


        except (
            ValueError,
            TypeError,
            KeyError,
        ):

            continue


        observations.append({

            "event_type":
                event_type,

            "series_id":
                config[
                    "series_id"
                ],

            "name":
                config[
                    "name"
                ],

            "unit":
                config[
                    "unit"
                ],

            "reference_year":
                year,

            "reference_month":
                month,

            "reference_period":

                f"{year}-"
                f"{month:02d}",

            "value":
                value,

            "source":
                "U.S. Bureau of Labor Statistics",

            "source_type":
                "OFFICIAL",

            "verified_actual":
                True,

            # -----------------------------------------------
            # These are intentionally empty.
            #
            # We will NOT pretend the reference month is
            # the release date.
            # -----------------------------------------------

            "release_date_et":
                None,

            "release_time_et":
                None,

            "timestamp_utc":
                None,

            "date_ist":
                None,

            "time_ist":
                None,

            "timestamp_ist":
                None,

            "release_time_verified":
                False,

            "forecast":
                None,

            "forecast_source":
                None,

            "forecast_verified":
                False,

            "previous":
                None,

            "gold_bias":
                "UNCLASSIFIED",

            "price_reaction_ready":
                False,
        })


    observations.sort(

        key=lambda item: (

            item[
                "reference_year"
            ],

            item[
                "reference_month"
            ],
        )
    )


    return observations


# ============================================================
# CALCULATE NFP MONTHLY CHANGE
# ============================================================


def calculate_nfp_changes(
    level_data,
):

    changes = []


    for index in range(
        1,
        len(
            level_data
        )
    ):

        previous = (
            level_data[
                index - 1
            ]
        )


        current = (
            level_data[
                index
            ]
        )


        change = (

            current[
                "value"
            ]

            -

            previous[
                "value"
            ]

        )


        changes.append({

            "event_type":
                "NFP",

            "series_id":
                "CES0000000001",

            "name":
                "Nonfarm Payrolls",

            "unit":
                "Thousands Change",

            "reference_year":
                current[
                    "reference_year"
                ],

            "reference_month":
                current[
                    "reference_month"
                ],

            "reference_period":
                current[
                    "reference_period"
                ],

            "value":
                round(
                    change,
                    1
                ),

            "employment_level":
                current[
                    "value"
                ],

            "previous_employment_level":
                previous[
                    "value"
                ],

            "source":
                "U.S. Bureau of Labor Statistics",

            "source_type":
                "OFFICIAL",

            "verified_actual":
                True,

            "release_date_et":
                None,

            "release_time_et":
                None,

            "timestamp_utc":
                None,

            "date_ist":
                None,

            "time_ist":
                None,

            "timestamp_ist":
                None,

            "release_time_verified":
                False,

            "forecast":
                None,

            "forecast_source":
                None,

            "forecast_verified":
                False,

            "previous":
                None,

            "gold_bias":
                "UNCLASSIFIED",

            "price_reaction_ready":
                False,
        })


    return changes


# ============================================================
# ADD PREVIOUS VALUES
# ============================================================


def add_previous_values(
    observations,
):

    for index in range(
        len(
            observations
        )
    ):

        if index == 0:

            observations[
                index
            ][
                "previous"
            ] = None

            continue


        observations[
            index
        ][
            "previous"
        ] = (

            observations[
                index - 1
            ][
                "value"
            ]

        )


    return observations


# ============================================================
# COLLECT ONE SERIES
# ============================================================


def collect_series(
    event_type,
    config,
):

    print()

    print(
        f"Downloading "
        f"{config['name']}..."
    )


    raw_data = (

        download_bls_series(

            config[
                "series_id"
            ],

            START_YEAR,

            END_YEAR,

        )

    )


    normalized = (

        normalize_monthly_data(

            event_type,

            config,

            raw_data,

        )

    )


    print(

        f"Received "
        f"{len(normalized)} "
        f"official observations."

    )


    return normalized


# ============================================================
# MAIN
# ============================================================


def main():

    print()

    print(
        "=============================================="
    )

    print(
        "EDGE X PRO"
    )

    print(
        "OFFICIAL ECONOMIC DATA COLLECTOR"
    )

    print(
        "=============================================="
    )

    print()

    print(
        "Source:"
    )

    print(
        "U.S. Bureau of Labor Statistics"
    )

    print()

    print(
        "IMPORTANT:"
    )

    print(
        "This stage collects real official "
        "economic observations."
    )

    print()

    print(
        "It does NOT guess historical "
        "release timestamps."
    )


    database = {

        "CPI":
            [],

        "CORE_CPI":
            [],

        "NFP":
            [],

        "UNEMPLOYMENT":
            [],

        "PPI":
            [],

        "CORE_PPI":
            [],

        "FOMC":
            [],
    }


    # ========================================================
    # CPI
    # ========================================================


    try:

        database[
            "CPI"
        ] = (

            collect_series(

                "CPI",

                SERIES[
                    "CPI"
                ],

            )

        )


        database[
            "CPI"
        ] = (

            add_previous_values(

                database[
                    "CPI"
                ]

            )

        )


    except Exception as error:

        print()

        print(
            f"CPI ERROR: {error}"
        )


    # ========================================================
    # CORE CPI
    # ========================================================


    try:

        database[
            "CORE_CPI"
        ] = (

            collect_series(

                "CORE_CPI",

                SERIES[
                    "CORE_CPI"
                ],

            )

        )


        database[
            "CORE_CPI"
        ] = (

            add_previous_values(

                database[
                    "CORE_CPI"
                ]

            )

        )


    except Exception as error:

        print()

        print(
            f"CORE CPI ERROR: {error}"
        )


    # ========================================================
    # UNEMPLOYMENT
    # ========================================================


    try:

        database[
            "UNEMPLOYMENT"
        ] = (

            collect_series(

                "UNEMPLOYMENT",

                SERIES[
                    "UNEMPLOYMENT"
                ],

            )

        )


        database[
            "UNEMPLOYMENT"
        ] = (

            add_previous_values(

                database[
                    "UNEMPLOYMENT"
                ]

            )

        )


    except Exception as error:

        print()

        print(
            f"UNEMPLOYMENT ERROR: {error}"
        )


    # ========================================================
    # NFP
    # ========================================================


    try:

        nfp_levels = (

            collect_series(

                "NFP_LEVEL",

                SERIES[
                    "NFP_LEVEL"
                ],

            )

        )


        database[
            "NFP"
        ] = (

            calculate_nfp_changes(

                nfp_levels

            )

        )


        database[
            "NFP"
        ] = (

            add_previous_values(

                database[
                    "NFP"
                ]

            )

        )


        print()

        print(

            f"Calculated "
            f"{len(database['NFP'])} "
            f"NFP monthly changes."

        )


    except Exception as error:

        print()

        print(
            f"NFP ERROR: {error}"
        )


    # ========================================================
    # SAFETY CHECK
    #
    # NEVER overwrite our database with nothing.
    # ========================================================


    total_records = sum(

        len(
            values
        )

        for values
        in database.values()

    )


    if (
        total_records == 0
    ):

        print()

        print(
            "=============================================="
        )

        print(
            "COLLECTION FAILED"
        )

        print(
            "=============================================="
        )

        print()

        print(
            "No verified economic data "
            "was collected."
        )

        print()

        print(
            "Existing verified_events.json "
            "was NOT overwritten."
        )

        return


    # ========================================================
    # SAVE
    # ========================================================


    OUTPUT_FOLDER.mkdir(

        parents=True,

        exist_ok=True,

    )


    output = {

        "generated_at_ist":

            datetime.now(
                tz=IST
            ).isoformat(),

        "data_policy":

            "REAL_VERIFIED_DATA_ONLY",

        "display_timezone":

            "Asia/Kolkata",

        "internal_timezone":

            "UTC",

        "start_year":

            START_YEAR,

        "end_year":

            END_YEAR,

        "official_source":

            "U.S. Bureau of Labor Statistics",

        "important_note":

            (
                "Economic observations are verified "
                "official data. Exact historical release "
                "timestamps must be verified separately "
                "before any XAUUSD price reaction is "
                "calculated."
            ),

        "record_count":

            total_records,

        "events":

            database,
    }


    with open(

        OUTPUT_FILE,

        "w",

        encoding="utf-8",

    ) as file:

        json.dump(

            output,

            file,

            indent=2,

        )


    print()

    print(
        "=============================================="
    )

    print(
        "OFFICIAL DATA COLLECTION COMPLETE"
    )

    print(
        "=============================================="
    )

    print()

    print(
        f"Total verified observations: "
        f"{total_records}"
    )

    print()

    print(
        f"CPI: "
        f"{len(database['CPI'])}"
    )

    print(

        f"Core CPI: "
        f"{len(database['CORE_CPI'])}"

    )

    print(

        f"NFP: "
        f"{len(database['NFP'])}"

    )

    print(

        f"Unemployment: "
        f"{len(database['UNEMPLOYMENT'])}"

    )

    print()

    print(
        "PPI and FOMC:"
    )

    print(
        "Will be added in the next verified-data stage."
    )

    print()

    print(
        "Saved to:"
    )

    print(
        OUTPUT_FILE.resolve()
    )


if __name__ == "__main__":

    main()