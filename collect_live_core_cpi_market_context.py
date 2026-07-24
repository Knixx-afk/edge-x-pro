import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests


# ============================================================
# EDGE X PRO
# LIVE CORE CPI MARKET CONTEXT COLLECTOR V1
#
# COLLECTS:
# - DXY / US Dollar Index
# - US 10-Year Treasury Yield
#
# ANALYZES:
# - 1 day direction
# - 5 day direction
# - 20 day direction
# - Overall market direction
#
# SAFETY:
# - Short timeout
# - Retries
# - Local cache fallback
# - Preserves existing macro / technical data
# ============================================================


BASE_DIR = Path(__file__).resolve().parent


OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "cpi"
    / "context"
    / "current_setup.json"
)


CACHE_DIR = (
    BASE_DIR
    / "data"
    / "shared"
    / "markets"
)


CACHE_FILE = (
    CACHE_DIR
    / "core_cpi_market_cache.json"
)


# Yahoo Finance chart API symbols.
#
# DXY:
# DX-Y.NYB
#
# US10Y:
# ^TNX
#
# IMPORTANT:
# ^TNX is quoted in yield percentage terms.
# Example: 4.25 means approximately 4.25%.

SYMBOLS = {

    "dxy":
        "DX-Y.NYB",

    "us10y":
        "^TNX",

}


HEADERS = {

    "User-Agent":
        (
            "Mozilla/5.0 "
            "(Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "Chrome/130 Safari/537.36"
        ),

    "Accept":
        "application/json,text/plain,*/*",

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
            "Could not read:"
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
# FETCH YAHOO MARKET DATA
# ============================================================


def fetch_market_data(
    symbol,
):

    url = (

        "https://query1.finance.yahoo.com/"
        "v8/finance/chart/"
        f"{symbol}"

    )


    params = {

        "range":
            "3mo",

        "interval":
            "1d",

        "includePrePost":
            "false",

        "events":
            "div,splits",

    }


    for attempt in range(
        1,
        4,
    ):

        try:

            print()

            print(

                f"Fetching {symbol} "
                f"(attempt {attempt}/3)..."

            )


            response = requests.get(

                url,

                params=params,

                headers=HEADERS,

                timeout=10,

            )


            response.raise_for_status()


            payload = response.json()


            chart = payload.get(
                "chart",
                {},
            )


            error = chart.get(
                "error"
            )


            if error:

                print(

                    "Yahoo returned error:"

                )

                print(
                    error
                )

                continue


            results = chart.get(
                "result"
            )


            if not results:

                print(

                    "No market results returned."

                )

                continue


            result = results[
                0
            ]


            timestamps = result.get(
                "timestamp",
                [],
            )


            indicators = result.get(
                "indicators",
                {},
            )


            quote_list = indicators.get(
                "quote",
                [],
            )


            if not quote_list:

                print(

                    "No quote data returned."

                )

                continue


            closes = quote_list[
                0
            ].get(
                "close",
                [],
            )


            observations = []


            for (
                timestamp,
                close,
            ) in zip(
                timestamps,
                closes,
            ):

                if close is None:

                    continue


                try:

                    close = float(
                        close
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue


                date_string = (

                    datetime.fromtimestamp(

                        timestamp,

                        timezone.utc,

                    )

                    .date()

                    .isoformat()

                )


                observations.append({

                    "date":
                        date_string,

                    "close":
                        close,

                })


            if observations:

                print(

                    f"OK: {symbol}"

                )


                print(

                    "Latest:",

                    observations[
                        -1
                    ][
                        "close"
                    ],

                )


                return observations


        except Exception as error:

            print()

            print(

                f"Attempt "
                f"{attempt}/3 failed."

            )


            print(

                "Reason:",

                error,

            )


            if attempt < 3:

                time.sleep(
                    2
                )


    return []


# ============================================================
# PERCENTAGE CHANGE
# ============================================================


def percentage_change(
    current,
    previous,
):

    if (

        current is None

        or

        previous is None

        or

        previous == 0

    ):

        return None


    return (

        (
            current
            -
            previous
        )

        /

        previous

    ) * 100


# ============================================================
# GET LOOKBACK VALUE
# ============================================================


def get_lookback_value(
    observations,
    days_back,
):

    if not observations:

        return None


    target_index = (

        len(
            observations
        )

        -

        1

        -

        days_back

    )


    if target_index < 0:

        return None


    return observations[
        target_index
    ][
        "close"
    ]


# ============================================================
# DIRECTION FROM CHANGE
# ============================================================


def direction_from_change(
    change,
    threshold,
):

    if change is None:

        return "UNKNOWN"


    if change >= threshold:

        return "RISING"


    if change <= -threshold:

        return "FALLING"


    return "FLAT"


# ============================================================
# BUILD MARKET ANALYSIS
# ============================================================


def analyze_market(
    observations,
    market_name,
):

    if not observations:

        return None


    latest = observations[
        -1
    ]


    current = latest[
        "close"
    ]


    previous_1d = get_lookback_value(

        observations,

        1,

    )


    previous_5d = get_lookback_value(

        observations,

        5,

    )


    previous_20d = get_lookback_value(

        observations,

        20,

    )


    change_1d = percentage_change(

        current,

        previous_1d,

    )


    change_5d = percentage_change(

        current,

        previous_5d,

    )


    change_20d = percentage_change(

        current,

        previous_20d,

    )


    # Different thresholds are used because
    # DXY and US10Y have different volatility.

    if market_name == "dxy":

        threshold_1d = 0.10

        threshold_5d = 0.25

        threshold_20d = 0.50


    else:

        threshold_1d = 0.50

        threshold_5d = 1.00

        threshold_20d = 2.00


    direction_1d = direction_from_change(

        change_1d,

        threshold_1d,

    )


    direction_5d = direction_from_change(

        change_5d,

        threshold_5d,

    )


    direction_20d = direction_from_change(

        change_20d,

        threshold_20d,

    )


    # ========================================================
    # WEIGHTED OVERALL DIRECTION
    #
    # 1D  = 20%
    # 5D  = 35%
    # 20D = 45%
    # ========================================================


    direction_scores = {

        "RISING":
            1,

        "FLAT":
            0,

        "FALLING":
            -1,

        "UNKNOWN":
            0,

    }


    overall_score = (

        direction_scores[
            direction_1d
        ]

        *

        0.20

        +

        direction_scores[
            direction_5d
        ]

        *

        0.35

        +

        direction_scores[
            direction_20d
        ]

        *

        0.45

    )


    if overall_score >= 0.30:

        overall_direction = (
            "RISING"
        )


    elif overall_score <= -0.30:

        overall_direction = (
            "FALLING"
        )


    else:

        overall_direction = (
            "MIXED"
        )


    return {

        "value":
            round(
                current,
                4,
            ),

        "date":
            latest[
                "date"
            ],

        "direction":
            overall_direction,

        "direction_1d":
            direction_1d,

        "direction_5d":
            direction_5d,

        "direction_20d":
            direction_20d,

        "change_1d_percent":
            (
                round(
                    change_1d,
                    3,
                )

                if change_1d
                is not None

                else None
            ),

        "change_5d_percent":
            (
                round(
                    change_5d,
                    3,
                )

                if change_5d
                is not None

                else None
            ),

        "change_20d_percent":
            (
                round(
                    change_20d,
                    3,
                )

                if change_20d
                is not None

                else None
            ),

        "source":
            "Yahoo Finance chart data",

    }


# ============================================================
# GOLD IMPACT
# ============================================================


def calculate_gold_market_bias(
    dxy,
    us10y,
):

    score = 0

    reasons = []


    # ========================================================
    # DXY
    #
    # Falling dollar generally supports gold.
    # Rising dollar generally pressures gold.
    # ========================================================


    dxy_direction = (

        dxy.get(
            "direction"
        )

        if dxy

        else "UNKNOWN"

    )


    if dxy_direction == "FALLING":

        score += 2

        reasons.append(

            "Falling US dollar supports gold."

        )


    elif dxy_direction == "RISING":

        score -= 2

        reasons.append(

            "Rising US dollar pressures gold."

        )


    elif dxy_direction == "MIXED":

        reasons.append(

            "US dollar trend is mixed."

        )


    # ========================================================
    # US10Y
    #
    # Falling yields generally support gold.
    # Rising yields generally pressure gold.
    # ========================================================


    yield_direction = (

        us10y.get(
            "direction"
        )

        if us10y

        else "UNKNOWN"

    )


    if yield_direction == "FALLING":

        score += 2

        reasons.append(

            "Falling Treasury yields support gold."

        )


    elif yield_direction == "RISING":

        score -= 2

        reasons.append(

            "Rising Treasury yields pressure gold."

        )


    elif yield_direction == "MIXED":

        reasons.append(

            "Treasury yield trend is mixed."

        )


    # ========================================================
    # FINAL MARKET BIAS
    # ========================================================


    if score >= 3:

        bias = (
            "STRONGLY_BULLISH"
        )


    elif score >= 1:

        bias = (
            "BULLISH"
        )


    elif score <= -3:

        bias = (
            "STRONGLY_BEARISH"
        )


    elif score <= -1:

        bias = (
            "BEARISH"
        )


    else:

        bias = (
            "NEUTRAL"
        )


    return {

        "bias":
            bias,

        "score":
            score,

        "reasons":
            reasons,

    }


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
        "LIVE CORE CPI MARKET CONTEXT COLLECTOR V1"
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

            "ERROR: current_setup.json "
            "could not be loaded."

        )

        return


    # ========================================================
    # FETCH DXY
    # ========================================================


    print()

    print(
        "COLLECTING DXY..."
    )


    dxy_raw = fetch_market_data(

        SYMBOLS[
            "dxy"
        ]

    )


    dxy = analyze_market(

        dxy_raw,

        "dxy",

    )


    # ========================================================
    # FETCH US10Y
    # ========================================================


    print()

    print(
        "COLLECTING US10Y..."
    )


    us10y_raw = fetch_market_data(

        SYMBOLS[
            "us10y"
        ]

    )


    us10y = analyze_market(

        us10y_raw,

        "us10y",

    )


    # ========================================================
    # LOAD PREVIOUS CACHE
    # ========================================================


    previous_cache = load_json(

        CACHE_FILE

    )


    # ========================================================
    # FALLBACK TO CACHE
    # ========================================================


    if not dxy:

        print()

        print(

            "Live DXY unavailable."

        )


        dxy = previous_cache.get(

            "dxy"

        )


        if dxy:

            print(

                "Using cached DXY."

            )


    if not us10y:

        print()

        print(

            "Live US10Y unavailable."

        )


        us10y = previous_cache.get(

            "us10y"

        )


        if us10y:

            print(

                "Using cached US10Y."

            )


    # ========================================================
    # BUILD GOLD MARKET BIAS
    # ========================================================


    gold_market_bias = (

        calculate_gold_market_bias(

            dxy,

            us10y,

        )

    )


    # ========================================================
    # BUILD CACHE
    # ========================================================


    cache_data = {

        "dxy":
            dxy,

        "us10y":
            us10y,

        "gold_market_bias":
            gold_market_bias,

        "updated_at_utc":

            datetime.now(
                timezone.utc
            ).isoformat(),

    }


    # Save cache only when we have
    # at least some valid market data.

    if dxy or us10y:

        save_json(

            CACHE_FILE,

            cache_data,

        )


    # ========================================================
    # UPDATE CORE CPI SETUP
    # ========================================================


    fundamental = setup.setdefault(

        "fundamental",

        {}

    )


    markets = fundamental.setdefault(

        "markets",

        {}

    )


    if dxy:

        markets[
            "dxy"
        ] = dxy


        # Existing prediction engine expects
        # this simple field.

        fundamental[
            "dollar_bias"
        ] = dxy.get(

            "direction",

            "UNKNOWN",

        )


    if us10y:

        markets[
            "us10y"
        ] = us10y


        fundamental[
            "treasury_yields"
        ] = us10y.get(

            "direction",

            "UNKNOWN",

        )


    fundamental[
        "gold_market_bias"
    ] = gold_market_bias


    fundamental[
        "market_context_updated_at_utc"
    ] = (

        datetime.now(
            timezone.utc
        ).isoformat()

    )


    # ========================================================
    # DATA QUALITY
    # ========================================================


    quality = fundamental.setdefault(

        "data_quality",

        {}

    )


    quality[
        "dxy_data"
    ] = bool(
        dxy
    )


    quality[
        "us10y_data"
    ] = bool(
        us10y
    )


    quality[
        "market_data"
    ] = bool(

        dxy

        and

        us10y

    )


    # ========================================================
    # SAVE
    # ========================================================


    save_json(

        OUTPUT_FILE,

        setup,

    )


    # ========================================================
    # RESULTS
    # ========================================================


    print()

    print(
        "=" * 65
    )

    print(
        "MARKET CONTEXT COLLECTION COMPLETE"
    )

    print(
        "=" * 65
    )


    print()

    print(
        "DXY:"
    )


    if dxy:

        print(

            "Value:",

            dxy.get(
                "value"
            ),

        )


        print(

            "Overall:",

            dxy.get(
                "direction"
            ),

        )


        print(

            "1D:",

            dxy.get(
                "direction_1d"
            ),

            dxy.get(
                "change_1d_percent"
            ),

            "%",

        )


        print(

            "5D:",

            dxy.get(
                "direction_5d"
            ),

            dxy.get(
                "change_5d_percent"
            ),

            "%",

        )


        print(

            "20D:",

            dxy.get(
                "direction_20d"
            ),

            dxy.get(
                "change_20d_percent"
            ),

            "%",

        )


    else:

        print(
            "UNAVAILABLE"
        )


    print()

    print(
        "US10Y:"
    )


    if us10y:

        print(

            "Value:",

            us10y.get(
                "value"
            ),

        )


        print(

            "Overall:",

            us10y.get(
                "direction"
            ),

        )


        print(

            "1D:",

            us10y.get(
                "direction_1d"
            ),

            us10y.get(
                "change_1d_percent"
            ),

            "%",

        )


        print(

            "5D:",

            us10y.get(
                "direction_5d"
            ),

            us10y.get(
                "change_5d_percent"
            ),

            "%",

        )


        print(

            "20D:",

            us10y.get(
                "direction_20d"
            ),

            us10y.get(
                "change_20d_percent"
            ),

            "%",

        )


    else:

        print(
            "UNAVAILABLE"
        )


    print()

    print(
        "GOLD MARKET BIAS:"
    )


    print(

        gold_market_bias.get(
            "bias"
        )

    )


    print(

        "Score:",

        gold_market_bias.get(
            "score"
        ),

    )


    print()

    print(
        "REASONS:"
    )


    for reason in gold_market_bias.get(

        "reasons",

        [],

    ):

        print(

            "-",

            reason,

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
        "Cache:"
    )


    print(

        CACHE_FILE

    )


# ============================================================
# START
# ============================================================


if __name__ == "__main__":

    main()