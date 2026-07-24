import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


# ============================================================
# EDGE X PRO
# FEDERAL FUNDS RATE DECISION DATABASE
#
# IMPORTANT:
# These are FOMC POLICY DECISION release timestamps.
# They are NOT FOMC minutes release dates.
#
# Release time:
# 2:00 PM America/New_York
#
# Price action is attached later by:
# download_event_windows.py
# ============================================================


OUTPUT_FOLDER = Path("data/economic-events")
OUTPUT_FILE = OUTPUT_FOLDER / "verified_events.json"

NY = ZoneInfo("America/New_York")
IST = ZoneInfo("Asia/Kolkata")


# ============================================================
# FED RATE DECISIONS
#
# Format:
#
# date,
# previous lower,
# previous upper,
# new lower,
# new upper
#
# This dataset starts from June 2022 because your usable
# historical XAUUSD file begins around June 2022.
# ============================================================


DECISIONS = [

    # 2022

    ("2022-06-15", 0.75, 1.00, 1.50, 1.75),
    ("2022-07-27", 1.50, 1.75, 2.25, 2.50),
    ("2022-09-21", 2.25, 2.50, 3.00, 3.25),
    ("2022-11-02", 3.00, 3.25, 3.75, 4.00),
    ("2022-12-14", 3.75, 4.00, 4.25, 4.50),

    # 2023

    ("2023-02-01", 4.25, 4.50, 4.50, 4.75),
    ("2023-03-22", 4.50, 4.75, 4.75, 5.00),
    ("2023-05-03", 4.75, 5.00, 5.00, 5.25),
    ("2023-06-14", 5.00, 5.25, 5.00, 5.25),
    ("2023-07-26", 5.00, 5.25, 5.25, 5.50),
    ("2023-09-20", 5.25, 5.50, 5.25, 5.50),
    ("2023-11-01", 5.25, 5.50, 5.25, 5.50),
    ("2023-12-13", 5.25, 5.50, 5.25, 5.50),

    # 2024

    ("2024-01-31", 5.25, 5.50, 5.25, 5.50),
    ("2024-03-20", 5.25, 5.50, 5.25, 5.50),
    ("2024-05-01", 5.25, 5.50, 5.25, 5.50),
    ("2024-06-12", 5.25, 5.50, 5.25, 5.50),
    ("2024-07-31", 5.25, 5.50, 5.25, 5.50),
    ("2024-09-18", 5.25, 5.50, 4.75, 5.00),
    ("2024-11-07", 4.75, 5.00, 4.50, 4.75),
    ("2024-12-18", 4.50, 4.75, 4.25, 4.50),

    # 2025

    ("2025-01-29", 4.25, 4.50, 4.25, 4.50),
    ("2025-03-19", 4.25, 4.50, 4.25, 4.50),
    ("2025-05-07", 4.25, 4.50, 4.25, 4.50),
    ("2025-06-18", 4.25, 4.50, 4.25, 4.50),
    ("2025-07-30", 4.25, 4.50, 4.25, 4.50),

    # Verified 2025 easing sequence

    ("2025-09-17", 4.25, 4.50, 4.00, 4.25),
    ("2025-10-29", 4.00, 4.25, 3.75, 4.00),
    ("2025-12-10", 3.75, 4.00, 3.50, 3.75),

    # 2026

    ("2026-01-28", 3.50, 3.75, 3.50, 3.75),
    ("2026-03-18", 3.50, 3.75, 3.50, 3.75),
    ("2026-04-29", 3.50, 3.75, 3.50, 3.75),
    ("2026-06-17", 3.50, 3.75, 3.50, 3.75),
]


def decision_type(
    previous_lower,
    previous_upper,
    actual_lower,
    actual_upper,
):

    previous_mid = (
        previous_lower
        +
        previous_upper
    ) / 2

    actual_mid = (
        actual_lower
        +
        actual_upper
    ) / 2

    change_bps = round(
        (
            actual_mid
            -
            previous_mid
        )
        *
        100
    )

    if change_bps > 0:

        decision = "HIKE"

    elif change_bps < 0:

        decision = "CUT"

    else:

        decision = "HOLD"

    return (
        decision,
        change_bps,
    )


def build_event(
    item,
):

    (
        date_string,
        previous_lower,
        previous_upper,
        actual_lower,
        actual_upper,
    ) = item


    year, month, day = map(
        int,
        date_string.split("-"),
    )


    # FOMC policy statement release:
    # 2:00 PM New York time.

    release_et = datetime(

        year,
        month,
        day,

        14,
        0,

        tzinfo=NY,

    )


    release_utc = (
        release_et
        .astimezone(
            timezone.utc
        )
    )


    release_ist = (
        release_et
        .astimezone(
            IST
        )
    )


    (
        action,
        change_bps,
    ) = decision_type(

        previous_lower,
        previous_upper,

        actual_lower,
        actual_upper,

    )


    return {

        "events": [

            "FED Interest Rate Decision"

        ],


        "category":

            "FED_RATE_DECISION",


        "verified":

            True,


        "timestamp_et":

            release_et.isoformat(),


        "timestamp_utc":

            release_utc.isoformat(),


        "timestamp_ist":

            release_ist.isoformat(),


        "date_ist":

            release_ist.strftime(
                "%Y-%m-%d"
            ),


        "time_ist":

            release_ist.strftime(
                "%H:%M"
            ),


        "reference_periods": [

            release_et.strftime(
                "%B %Y"
            )

        ],


        "numbers": {

            "previous_target_lower":

                previous_lower,


            "previous_target_upper":

                previous_upper,


            "actual_target_lower":

                actual_lower,


            "actual_target_upper":

                actual_upper,


            "change_bps":

                change_bps,


            "decision":

                action,

        },


        "release": {

            "previous":

                (
                    f"{previous_lower:.2f}%"
                    f"-"
                    f"{previous_upper:.2f}%"
                ),


            "actual":

                (
                    f"{actual_lower:.2f}%"
                    f"-"
                    f"{actual_upper:.2f}%"
                ),


            "result":

                (
                    f"{action} "
                    f"{change_bps:+d} bps"
                ),

        },


        "official_source":

            (
                "Board of Governors "
                "of the Federal Reserve System"
            ),

    }


def main():

    print()

    print(
        "=========================================="
    )

    print(
        "EDGE X PRO"
    )

    print(
        "FED RATE DECISION DATABASE"
    )

    print(
        "=========================================="
    )


    events = [

        build_event(
            item
        )

        for item in DECISIONS

    ]


    # Latest 33 only.

    events.sort(

        key=lambda event:

            event[
                "timestamp_utc"
            ],

        reverse=True,

    )


    events = events[:33]


    # Put back into chronological order
    # for the MT5 reaction engine.

    events.sort(

        key=lambda event:

            event[
                "timestamp_utc"
            ]

    )


    output = {

        "database_name":

            (
                "EDGE X PRO "
                "Federal Funds Rate Decisions"
            ),


        "event_type":

            "FED_RATE_DECISION",


        "total_verified_events":

            len(
                events
            ),


        "total_download_groups":

            len(
                events
            ),


        "time_policy": {

            "decision_release":

                "2:00 PM America/New_York",

            "internal":

                "UTC",

            "display":

                "Asia/Kolkata",

            "winpro":

                (
                    "Converted later by reaction engine "
                    "using historical GMT+2/GMT+3"
                ),

        },


        "events":

            events,


        # Existing reaction engine reads this key.

        "download_groups":

            events,

    }


    OUTPUT_FOLDER.mkdir(

        parents=True,

        exist_ok=True,

    )


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
        "FED decisions:",
        len(events),
    )


    print()

    for event in events:

        numbers = event[
            "numbers"
        ]

        print(

            event[
                "timestamp_ist"
            ],

            "|",

            numbers[
                "decision"
            ],

            numbers[
                "change_bps"
            ],

            "bps",

            "|",

            event[
                "release"
            ][
                "previous"
            ],

            "->",

            event[
                "release"
            ][
                "actual"
            ],

        )


    print()

    print(
        "Saved:"
    )

    print(

        OUTPUT_FILE.resolve()

    )


if __name__ == "__main__":

    main()