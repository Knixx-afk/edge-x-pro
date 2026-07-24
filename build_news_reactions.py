import csv
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


# ============================================================
# EDGE X PRO - HISTORICAL NEWS REACTION ENGINE
# ============================================================

DATA_FOLDER = Path("data") / "xauusd"
OUTPUT_FOLDER = Path("data") / "news-reactions"

IST = ZoneInfo("Asia/Kolkata")

HORIZONS = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
    "24h": 1440,
}


# ============================================================
# EVENT DATABASE
#
# IMPORTANT:
# Add only VERIFIED events here.
#
# All event times below must be IST.
#
# The test event is intentionally not populated with
# actual/forecast values until those values are verified.
# ============================================================

EVENTS = [
    {
        "id": "CPI-2026-07-14",

        "event": "CPI",

        "date": "2026-07-14",

        "time_ist": "18:00",

        "actual": None,

        "forecast": None,

        "previous": None,
    },
]


# ============================================================
# LOAD ALL AVAILABLE M1 CSV FILES
# ============================================================

def load_candles():

    files = sorted(
        DATA_FOLDER.glob(
            "xauusd_m1_*.csv"
        )
    )

    if not files:

        raise FileNotFoundError(
            "No XAUUSD M1 CSV files found inside data/xauusd."
        )

    candles = {}

    print()

    print(
        f"Found {len(files)} XAUUSD data file(s)."
    )

    for file_path in files:

        print(
            f"Loading {file_path.name}"
        )

        with open(
            file_path,
            "r",
            encoding="utf-8",
        ) as file:

            reader = csv.DictReader(
                file
            )

            for row in reader:

                timestamp = (
                    row[
                        "timestamp_ist"
                    ]
                )

                candles[
                    timestamp
                ] = {
                    "timestamp_utc":
                        row[
                            "timestamp_utc"
                        ],

                    "timestamp_ist":
                        timestamp,

                    "open":
                        float(
                            row["open"]
                        ),

                    "high":
                        float(
                            row["high"]
                        ),

                    "low":
                        float(
                            row["low"]
                        ),

                    "close":
                        float(
                            row["close"]
                        ),
                }

    print(
        f"Loaded {len(candles):,} M1 candles."
    )

    return candles


# ============================================================
# FUNDAMENTAL NEWS CLASSIFICATION
# ============================================================

def classify_news(
    event,
    actual,
    forecast,
):

    if (
        actual is None
        or forecast is None
    ):

        return {
            "bias":
                "UNCLASSIFIED",

            "expected_gold_direction":
                None,

            "surprise":
                None,
        }

    surprise = (
        actual
        - forecast
    )

    event = (
        event.upper()
    )

    # --------------------------------------------------------
    # CPI / PPI
    #
    # Higher than expected inflation:
    # normally USD / yields positive
    # normally gold negative initially.
    #
    # Lower than expected inflation:
    # normally gold positive initially.
    # --------------------------------------------------------

    if event in [
        "CPI",
        "CORE_CPI",
        "PPI",
        "CORE_PPI",
    ]:

        if actual < forecast:

            return {
                "bias":
                    "GOLD_POSITIVE",

                "expected_gold_direction":
                    "UP",

                "surprise":
                    round(
                        surprise,
                        4,
                    ),
            }

        if actual > forecast:

            return {
                "bias":
                    "GOLD_NEGATIVE",

                "expected_gold_direction":
                    "DOWN",

                "surprise":
                    round(
                        surprise,
                        4,
                    ),
            }

    # --------------------------------------------------------
    # NFP
    #
    # Weaker employment than expected:
    # generally gold positive.
    #
    # Stronger employment:
    # generally gold negative.
    # --------------------------------------------------------

    if event == "NFP":

        if actual < forecast:

            return {
                "bias":
                    "GOLD_POSITIVE",

                "expected_gold_direction":
                    "UP",

                "surprise":
                    round(
                        surprise,
                        2,
                    ),
            }

        if actual > forecast:

            return {
                "bias":
                    "GOLD_NEGATIVE",

                "expected_gold_direction":
                    "DOWN",

                "surprise":
                    round(
                        surprise,
                        2,
                    ),
            }

    # --------------------------------------------------------
    # UNEMPLOYMENT
    #
    # Higher unemployment:
    # generally gold positive.
    #
    # Lower unemployment:
    # generally gold negative.
    # --------------------------------------------------------

    if event == "UNEMPLOYMENT":

        if actual > forecast:

            return {
                "bias":
                    "GOLD_POSITIVE",

                "expected_gold_direction":
                    "UP",

                "surprise":
                    round(
                        surprise,
                        4,
                    ),
            }

        if actual < forecast:

            return {
                "bias":
                    "GOLD_NEGATIVE",

                "expected_gold_direction":
                    "DOWN",

                "surprise":
                    round(
                        surprise,
                        4,
                    ),
            }

    return {
        "bias":
            "NEUTRAL",

        "expected_gold_direction":
            None,

        "surprise":
            round(
                surprise,
                4,
            ),
    }


# ============================================================
# GET CANDLE AT EXACT IST MINUTE
# ============================================================

def get_candle(
    candles,
    timestamp,
):

    key = (
        timestamp.strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    )

    return candles.get(
        key
    )


# ============================================================
# GET CANDLES BETWEEN TWO TIMES
# ============================================================

def get_window(
    candles,
    start,
    end,
):

    result = []

    current = start

    while current < end:

        candle = get_candle(
            candles,
            current,
        )

        if candle:

            result.append(
                candle
            )

        current = (
            current.replace(
                second=0,
                microsecond=0,
            )
        )

        from datetime import timedelta

        current += timedelta(
            minutes=1
        )

    return result


# ============================================================
# ANALYZE ONE HORIZON
# ============================================================

def analyze_horizon(
    candles,
    event_time,
    reference_price,
    minutes,
):

    from datetime import timedelta

    end_time = (
        event_time
        + timedelta(
            minutes=minutes
        )
    )

    window = get_window(
        candles,
        event_time,
        end_time,
    )

    if not window:

        return {
            "available":
                False
        }

    final_price = (
        window[-1]["close"]
    )

    highest = max(
        candle["high"]
        for candle
        in window
    )

    lowest = min(
        candle["low"]
        for candle
        in window
    )

    move = (
        final_price
        - reference_price
    )

    if move > 0:

        direction = "UP"

    elif move < 0:

        direction = "DOWN"

    else:

        direction = "FLAT"

    return {
        "available":
            True,

        "close":
            round(
                final_price,
                3,
            ),

        "move":
            round(
                move,
                3,
            ),

        "move_percent":
            round(
                (
                    move
                    / reference_price
                )
                * 100,
                4,
            ),

        "direction":
            direction,

        "max_high":
            round(
                highest,
                3,
            ),

        "max_low":
            round(
                lowest,
                3,
            ),

        "max_up":
            round(
                highest
                - reference_price,
                3,
            ),

        "max_down":
            round(
                lowest
                - reference_price,
                3,
            ),
    }


# ============================================================
# ANALYZE ONE NEWS EVENT
# ============================================================

def analyze_event(
    candles,
    event,
):

    timestamp_string = (
        event["date"]
        + " "
        + event["time_ist"]
        + ":00"
    )

    event_time = datetime.strptime(
        timestamp_string,
        "%Y-%m-%d %H:%M:%S",
    ).replace(
        tzinfo=IST
    )

    impulse = get_candle(
        candles,
        event_time,
    )

    if not impulse:

        return {
            "id":
                event["id"],

            "event":
                event["event"],

            "date":
                event["date"],

            "time_ist":
                event["time_ist"],

            "success":
                False,

            "error":
                "Exact M1 impulse candle not found.",
        }

    classification = (
        classify_news(
            event["event"],
            event["actual"],
            event["forecast"],
        )
    )

    reference_price = (
        impulse["open"]
    )

    impulse_move = (
        impulse["close"]
        - impulse["open"]
    )

    if impulse_move > 0:

        impulse_direction = (
            "UP"
        )

    elif impulse_move < 0:

        impulse_direction = (
            "DOWN"
        )

    else:

        impulse_direction = (
            "FLAT"
        )

    expected_direction = (
        classification[
            "expected_gold_direction"
        ]
    )

    reactions = {}

    for (
        label,
        minutes,
    ) in HORIZONS.items():

        reaction = (
            analyze_horizon(
                candles,
                event_time,
                reference_price,
                minutes,
            )
        )

        if (
            reaction[
                "available"
            ]
            and expected_direction
        ):

            reaction[
                "aligned_with_news"
            ] = (
                reaction[
                    "direction"
                ]
                == expected_direction
            )

        else:

            reaction[
                "aligned_with_news"
            ] = None

        reactions[
            label
        ] = reaction

    impulse_range = (
        impulse["high"]
        - impulse["low"]
    )

    impulse_body = abs(
        impulse[
            "close"
        ]
        - impulse[
            "open"
        ]
    )

    upper_wick = (
        impulse["high"]
        - max(
            impulse["open"],
            impulse["close"],
        )
    )

    lower_wick = (
        min(
            impulse["open"],
            impulse["close"],
        )
        - impulse["low"]
    )

    return {
        "id":
            event["id"],

        "event":
            event["event"],

        "success":
            True,

        "release": {
            "date":
                event["date"],

            "time_ist":
                event[
                    "time_ist"
                ],

            "timestamp_ist":
                timestamp_string,

            "actual":
                event["actual"],

            "forecast":
                event["forecast"],

            "previous":
                event["previous"],
        },

        "fundamental_analysis":
            classification,

        "impulse_candle": {

            "open":
                impulse["open"],

            "high":
                impulse["high"],

            "low":
                impulse["low"],

            "close":
                impulse["close"],

            "direction":
                impulse_direction,

            "move":
                round(
                    impulse_move,
                    3,
                ),

            "range":
                round(
                    impulse_range,
                    3,
                ),

            "body":
                round(
                    impulse_body,
                    3,
                ),

            "upper_wick":
                round(
                    upper_wick,
                    3,
                ),

            "lower_wick":
                round(
                    lower_wick,
                    3,
                ),

            "aligned_with_news":
                (
                    impulse_direction
                    == expected_direction
                )
                if expected_direction
                else None,
        },

        "reactions":
            reactions,
    }


# ============================================================
# BUILD DATABASE
# ============================================================

def main():

    print()
    print(
        "=============================================="
    )

    print(
        "EDGE X PRO - NEWS REACTION ENGINE"
    )

    print(
        "=============================================="
    )

    candles = (
        load_candles()
    )

    results = []

    for event in EVENTS:

        print()

        print(
            f"Analyzing "
            f"{event['event']} "
            f"{event['date']} "
            f"{event['time_ist']} IST"
        )

        result = (
            analyze_event(
                candles,
                event,
            )
        )

        results.append(
            result
        )

        if result[
            "success"
        ]:

            print(
                "Impulse candle found."
            )

        else:

            print(
                result["error"]
            )

    OUTPUT_FOLDER.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_file = (
        OUTPUT_FOLDER
        / "historical_news_reactions.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            {
                "timezone":
                    "Asia/Kolkata",

                "instrument":
                    "XAUUSD",

                "price_source":
                    "Dukascopy Spot Gold",

                "events":
                    results,
            },
            file,
            indent=2,
        )

    print()

    print(
        "=============================================="
    )

    print(
        "ANALYSIS COMPLETE"
    )

    print(
        "=============================================="
    )

    print()

    print(
        f"Saved to:"
    )

    print(
        output_file.resolve()
    )


if __name__ == "__main__":
    main()