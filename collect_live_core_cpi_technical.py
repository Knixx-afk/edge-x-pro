import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import MetaTrader5 as mt5


# ============================================================
# EDGE X PRO
# LIVE CORE CPI TECHNICAL COLLECTOR
# ============================================================

CATEGORY = "cpi"

SETUP_FILE = Path(
    f"data/{CATEGORY}/context/current_setup.json"
)

IST = ZoneInfo("Asia/Kolkata")


SYMBOL_CANDIDATES = [
    "XAUUSD",
    "XAUUSDm",
    "XAUUSD.",
    "GOLD",
    "GOLDm",
]


# ============================================================
# JSON
# ============================================================

def load_json(path):

    if not path.exists():
        return {}

    with open(
        path,
        "r",
        encoding="utf-8",
    ) as file:

        return json.load(file)


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
# FIND GOLD SYMBOL
# ============================================================

def find_gold_symbol():

    for symbol in SYMBOL_CANDIDATES:

        info = mt5.symbol_info(
            symbol
        )

        if info is not None:

            mt5.symbol_select(
                symbol,
                True,
            )

            return symbol


    symbols = mt5.symbols_get()


    if symbols:

        for item in symbols:

            name = item.name.upper()

            if (
                "XAUUSD" in name
                or
                name.startswith(
                    "GOLD"
                )
            ):

                mt5.symbol_select(
                    item.name,
                    True,
                )

                return item.name


    return None


# ============================================================
# GET M1 CANDLES
# ============================================================

def get_m1_candles(
    symbol,
):

    # We use MT5's latest available candles directly.
    # This avoids guessing broker timezone for the live model.

    rates = mt5.copy_rates_from_pos(

        symbol,

        mt5.TIMEFRAME_M1,

        0,

        1500,

    )


    if (
        rates is None
        or
        len(rates) == 0
    ):

        return []


    candles = []


    for rate in rates:

        candles.append({

            "timestamp":

                datetime.fromtimestamp(

                    int(
                        rate["time"]
                    ),

                    tz=timezone.utc,

                ),


            "open":

                float(
                    rate["open"]
                ),


            "high":

                float(
                    rate["high"]
                ),


            "low":

                float(
                    rate["low"]
                ),


            "close":

                float(
                    rate["close"]
                ),

        })


    candles.sort(

        key=lambda candle:
            candle["timestamp"]

    )


    return candles


# ============================================================
# DIRECTION
# ============================================================

def direction(
    move,
    flat_threshold=0.01,
):

    if move > flat_threshold:

        return "UP"


    if move < -flat_threshold:

        return "DOWN"


    return "FLAT"


# ============================================================
# FIND CANDLE AT OR BEFORE
# ============================================================

def candle_at_or_before(
    candles,
    target,
):

    result = None


    for candle in candles:

        if (
            candle["timestamp"]
            <=
            target
        ):

            result = candle

        else:

            break


    return result


# ============================================================
# TIMEFRAME MOVEMENT
# ============================================================

def calculate_timeframe_direction(
    candles,
    current_time,
    minutes,
):

    target = (

        current_time

        -

        timedelta(
            minutes=minutes
        )

    )


    start_candle = (

        candle_at_or_before(

            candles,

            target,

        )

    )


    if start_candle is None:

        return {

            "direction":
                None,

            "move_usd":
                None,

        }


    current_price = (

        candles[-1][
            "close"
        ]

    )


    move = (

        current_price

        -

        start_candle[
            "close"
        ]

    )


    return {

        "direction":

            direction(
                move
            ),


        "move_usd":

            round(
                move,
                3,
            ),

    }


# ============================================================
# CURRENT TRADING-DAY ANALYSIS
# ============================================================

def calculate_day_context(
    candles,
):

    if not candles:

        return None


    latest = candles[-1]


    # MT5 timestamps are used consistently here.
    # We define the current broker-data day from the
    # date represented by the latest M1 candle.

    latest_date = (

        latest[
            "timestamp"
        ].date()

    )


    day_candles = [

        candle

        for candle in candles

        if (

            candle[
                "timestamp"
            ].date()

            ==

            latest_date

        )

    ]


    if not day_candles:

        return None


    day_open = (

        day_candles[
            0
        ][
            "open"
        ]

    )


    current_price = (

        day_candles[
            -1
        ][
            "close"
        ]

    )


    day_high = max(

        candle["high"]

        for candle in day_candles

    )


    day_low = min(

        candle["low"]

        for candle in day_candles

    )


    move = (

        current_price

        -

        day_open

    )


    day_range = (

        day_high

        -

        day_low

    )


    if day_range > 0:

        range_position = (

            (
                current_price
                -
                day_low
            )

            /

            day_range

        ) * 100


    else:

        range_position = 50


    if range_position >= 80:

        location = (
            "NEAR_DAY_HIGH"
        )


    elif range_position <= 20:

        location = (
            "NEAR_DAY_LOW"
        )


    elif range_position >= 60:

        location = (
            "UPPER_DAY_RANGE"
        )


    elif range_position <= 40:

        location = (
            "LOWER_DAY_RANGE"
        )


    else:

        location = (
            "MIDDLE_DAY_RANGE"
        )


    return {

        "day_open":

            round(
                day_open,
                3,
            ),


        "current_price":

            round(
                current_price,
                3,
            ),


        "day_high":

            round(
                day_high,
                3,
            ),


        "day_low":

            round(
                day_low,
                3,
            ),


        "day_move_usd":

            round(
                move,
                3,
            ),


        "day_direction":

            direction(
                move
            ),


        "day_range_usd":

            round(
                day_range,
                3,
            ),


        "range_position_percent":

            round(
                range_position,
                1,
            ),


        "day_location":

            location,

    }


# ============================================================
# LIVE LIQUIDITY MODEL
# ============================================================

def detect_live_liquidity(
    candles,
):

    if len(candles) < 240:

        return {

            "available":
                False,

        }


    # Keep this definition identical to the historical model:
    #
    # Reference range:
    # 4 hours ago -> 1 hour ago
    #
    # Sweep window:
    # final 1 hour -> current time


    latest_time = (

        candles[-1][
            "timestamp"
        ]

    )


    reference_start = (

        latest_time

        -

        timedelta(
            hours=4
        )

    )


    sweep_start = (

        latest_time

        -

        timedelta(
            hours=1
        )

    )


    reference = [

        candle

        for candle in candles

        if (

            reference_start

            <=

            candle[
                "timestamp"
            ]

            <

            sweep_start

        )

    ]


    final_hour = [

        candle

        for candle in candles

        if (

            sweep_start

            <=

            candle[
                "timestamp"
            ]

            <=

            latest_time

        )

    ]


    if (
        not reference
        or
        not final_hour
    ):

        return {

            "available":
                False,

        }


    reference_high = max(

        candle["high"]

        for candle in reference

    )


    reference_low = min(

        candle["low"]

        for candle in reference

    )


    final_hour_high = max(

        candle["high"]

        for candle in final_hour

    )


    final_hour_low = min(

        candle["low"]

        for candle in final_hour

    )


    current_price = (

        final_hour[-1][
            "close"
        ]

    )


    upside_swept = (

        final_hour_high

        >

        reference_high

    )


    downside_swept = (

        final_hour_low

        <

        reference_low

    )


    upside_rejected = (

        upside_swept

        and

        current_price

        <

        reference_high

    )


    downside_reclaimed = (

        downside_swept

        and

        current_price

        >

        reference_low

    )


    # Same sequence labels as historical data.

    if (

        downside_reclaimed

        and

        not upside_rejected

    ):

        sequence = (
            "DOWNSIDE_SWEEP_RECLAIM"
        )


    elif (

        upside_rejected

        and

        not downside_reclaimed

    ):

        sequence = (
            "UPSIDE_SWEEP_REJECT"
        )


    elif (

        downside_swept

        and

        upside_swept

    ):

        sequence = (
            "BOTH_SIDES_SWEPT"
        )


    elif downside_swept:

        sequence = (
            "DOWNSIDE_LIQUIDITY_TAKEN"
        )


    elif upside_swept:

        sequence = (
            "UPSIDE_LIQUIDITY_TAKEN"
        )


    else:

        sequence = (
            "NO_RECENT_SWEEP"
        )


    return {

        "available":
            True,


        "sequence":

            sequence,


        "upside_swept":

            upside_swept,


        "downside_swept":

            downside_swept,


        "upside_rejected":

            upside_rejected,


        "downside_reclaimed":

            downside_reclaimed,


        "reference_high":

            round(
                reference_high,
                3,
            ),


        "reference_low":

            round(
                reference_low,
                3,
            ),


        "final_hour_high":

            round(
                final_hour_high,
                3,
            ),


        "final_hour_low":

            round(
                final_hour_low,
                3,
            ),


        "current_price":

            round(
                current_price,
                3,
            ),

    }


# ============================================================
# MAIN
# ============================================================

def main():


    print()
    print(
        "============================================"
    )

    print(
        "EDGE X PRO"
    )

    print(
        "LIVE CORE CPI TECHNICAL COLLECTOR"
    )

    print(
        "============================================"
    )


    # ========================================================
    # CONNECT MT5
    # ========================================================

    if not mt5.initialize():

        print()
        print(
            "MT5 CONNECTION FAILED"
        )

        print(
            mt5.last_error()
        )

        return


    account = mt5.account_info()


    if account:

        print()
        print(
            "Broker:",
            account.company,
        )


    # ========================================================
    # FIND XAUUSD
    # ========================================================

    symbol = find_gold_symbol()


    if symbol is None:

        print()
        print(
            "XAUUSD symbol not found."
        )

        mt5.shutdown()

        return


    print(
        "Symbol:",
        symbol,
    )


    # ========================================================
    # DOWNLOAD LIVE M1
    # ========================================================

    candles = get_m1_candles(
        symbol
    )


    if not candles:

        print()
        print(
            "No M1 candles received."
        )

        mt5.shutdown()

        return


    latest_time = (

        candles[-1][
            "timestamp"
        ]

    )


    print(
        "M1 candles:",
        len(candles),
    )


    print(
        "Latest MT5 candle:",
        latest_time.isoformat(),
    )


    # ========================================================
    # DAY CONTEXT
    # ========================================================

    day_context = (

        calculate_day_context(
            candles
        )

    )


    if day_context is None:

        print(
            "Unable to calculate day context."
        )

        mt5.shutdown()

        return


    # ========================================================
    # TIMEFRAME CONTEXT
    # ========================================================

    timeframe_details = {}


    timeframe_directions = {}


    for (
        timeframe,
        minutes,
    ) in [

        (
            "15m",
            15,
        ),

        (
            "30m",
            30,
        ),

        (
            "1h",
            60,
        ),

        (
            "4h",
            240,
        ),

    ]:


        result = (

            calculate_timeframe_direction(

                candles,

                latest_time,

                minutes,

            )

        )


        timeframe_details[
            timeframe
        ] = result


        timeframe_directions[
            timeframe
        ] = (

            result[
                "direction"
            ]

        )


    # ========================================================
    # LIQUIDITY
    # ========================================================

    liquidity = (

        detect_live_liquidity(
            candles
        )

    )


    # ========================================================
    # LOAD CURRENT SETUP
    # ========================================================

    setup = load_json(
        SETUP_FILE
    )


    if not setup:

        setup = {

            "category":
                CATEGORY,

            "event_name":
                "US Core CPI",

            "event_time_utc":
                None,

            "fundamental":
                {},

        }


    # Preserve everything else, especially fundamental data.

    setup[
        "technical"
    ] = {

        "collected_at_utc":

            datetime.now(
                timezone.utc
            ).isoformat(),


        "symbol":

            symbol,


        "broker":

            (
                account.company

                if account

                else None
            ),


        "latest_candle_time_utc":

            latest_time.isoformat(),


        "day_direction":

            day_context[
                "day_direction"
            ],


        "day_location":

            day_context[
                "day_location"
            ],


        "day_context":

            day_context,


        "timeframes":

            timeframe_directions,


        "timeframe_details":

            timeframe_details,


        "liquidity":

            liquidity,

    }


    # ========================================================
    # SAVE
    # ========================================================

    save_json(

        SETUP_FILE,

        setup,

    )


    mt5.shutdown()


    # ========================================================
    # TERMINAL RESULT
    # ========================================================

    print()
    print(
        "============================================"
    )

    print(
        "LIVE TECHNICAL COLLECTION COMPLETE"
    )

    print(
        "============================================"
    )


    print()
    print(
        "Current Price:",
        day_context[
            "current_price"
        ],
    )


    print(
        "Day Direction:",
        day_context[
            "day_direction"
        ],
    )


    print(
        "Day Location:",
        day_context[
            "day_location"
        ],
    )


    print()
    print(
        "TIMEFRAMES"
    )


    for timeframe in [
        "15m",
        "30m",
        "1h",
        "4h",
    ]:

        result = (

            timeframe_details[
                timeframe
            ]

        )


        print(

            timeframe,

            ":",

            result[
                "direction"
            ],

            "| Move:",

            result[
                "move_usd"
            ],

        )


    print()
    print(
        "LIQUIDITY"
    )


    print(
        "Sequence:",
        liquidity.get(
            "sequence"
        ),
    )


    print(
        "Upside swept:",
        liquidity.get(
            "upside_swept"
        ),
    )


    print(
        "Downside swept:",
        liquidity.get(
            "downside_swept"
        ),
    )


    print(
        "Upside rejected:",
        liquidity.get(
            "upside_rejected"
        ),
    )


    print(
        "Downside reclaimed:",
        liquidity.get(
            "downside_reclaimed"
        ),
    )


    print()
    print(
        "Updated:"
    )

    print(
        SETUP_FILE.resolve()
    )


if __name__ == "__main__":

    main()