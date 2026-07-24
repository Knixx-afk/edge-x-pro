import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import MetaTrader5 as mt5


# ============================================================
# EDGE X PRO
# FED RATE DECISION + XAUUSD REACTION ENGINE
# ============================================================

DATABASE_FILE = Path(
    "data/economic-events/verified_events.json"
)

OUTPUT_FOLDER = Path(
    "data/verified-gold-reactions"
)

OUTPUT_FILE = (
    OUTPUT_FOLDER
    / "gold_reactions.json"
)


IST = ZoneInfo("Asia/Kolkata")

# Automatically handles GMT+2 / GMT+3 DST changes.
WINPRO_TZ = ZoneInfo("Europe/Athens")


SYMBOL_CANDIDATES = [
    "XAUUSD",
    "XAUUSDm",
    "XAUUSD.",
    "GOLD",
    "GOLDm",
]


HORIZONS = {
    "1m": timedelta(minutes=1),
    "5m": timedelta(minutes=5),
    "15m": timedelta(minutes=15),
    "30m": timedelta(minutes=30),
    "1h": timedelta(hours=1),
    "4h": timedelta(hours=4),
    "24h": timedelta(hours=24),
    "2d": timedelta(days=2),
    "3d": timedelta(days=3),
    "5d": timedelta(days=5),
}


# ============================================================
# FIND GOLD SYMBOL
# ============================================================

def find_gold_symbol():

    for symbol in SYMBOL_CANDIDATES:

        info = mt5.symbol_info(symbol)

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
                name.startswith("GOLD")
            ):

                mt5.symbol_select(
                    item.name,
                    True,
                )

                return item.name

    return None


# ============================================================
# TIME FUNCTIONS
# ============================================================

def parse_utc(value):

    value = value.replace(
        "Z",
        "+00:00",
    )

    result = datetime.fromisoformat(
        value
    )

    if result.tzinfo is None:

        result = result.replace(
            tzinfo=timezone.utc
        )

    return result.astimezone(
        timezone.utc
    )


def get_winpro_offset_hours(
    news_utc
):

    winpro = news_utc.astimezone(
        WINPRO_TZ
    )

    offset = winpro.utcoffset()

    return int(
        offset.total_seconds()
        / 3600
    )


def get_winpro_chart_time(
    news_utc
):

    return news_utc.astimezone(
        WINPRO_TZ
    )


def utc_to_mt5_api_time(
    real_utc
):

    offset_hours = (
        get_winpro_offset_hours(
            real_utc
        )
    )

    shifted = (
        real_utc
        +
        timedelta(
            hours=offset_hours
        )
    )

    return shifted.replace(
        tzinfo=timezone.utc
    )


# ============================================================
# DOWNLOAD M1 CANDLES
# ============================================================

def get_candles(
    symbol,
    real_event_utc,
):

    api_event_time = (
        utc_to_mt5_api_time(
            real_event_utc
        )
    )

    # We need enough history for:
    #
    # - day analysis
    # - pre-news liquidity
    # - 4-hour analysis
    # - 5-day post-news reaction

    start = (
        api_event_time
        -
        timedelta(
            hours=24
        )
    )

    end = (
        api_event_time
        +
        timedelta(
            days=6
        )
    )


    rates = mt5.copy_rates_range(

        symbol,

        mt5.TIMEFRAME_M1,

        start,

        end,

    )


    if (
        rates is None
        or
        len(rates) == 0
    ):

        return []


    candles = []


    for rate in rates:

        timestamp = (

            datetime.fromtimestamp(

                int(
                    rate[
                        "time"
                    ]
                ),

                tz=timezone.utc,

            )

        )


        candles.append({

            "timestamp":
                timestamp,

            "open":
                float(
                    rate[
                        "open"
                    ]
                ),

            "high":
                float(
                    rate[
                        "high"
                    ]
                ),

            "low":
                float(
                    rate[
                        "low"
                    ]
                ),

            "close":
                float(
                    rate[
                        "close"
                    ]
                ),

            "tick_volume":
                int(
                    rate[
                        "tick_volume"
                    ]
                ),

            "spread":
                int(
                    rate[
                        "spread"
                    ]
                ),

        })


    return candles


# ============================================================
# CANDLE LOOKUP
# ============================================================

def candle_at(
    candles,
    target,
):

    target = target.replace(
        second=0,
        microsecond=0,
    )


    for candle in candles:

        if (
            candle[
                "timestamp"
            ]
            ==
            target
        ):

            return candle


    return None


def candle_at_or_before(

    candles,

    target,

    max_gap_minutes=5,

):

    result = None


    for candle in candles:

        if (
            candle[
                "timestamp"
            ]
            <=
            target
        ):

            result = candle

        else:

            break


    if result is None:

        return None


    gap_minutes = (

        target

        -

        result[
            "timestamp"
        ]

    ).total_seconds() / 60


    if (
        gap_minutes
        >
        max_gap_minutes
    ):

        return None


    return result


# ============================================================
# DIRECTION
# ============================================================

def direction(
    move
):

    if move > 0:

        return "UP"


    if move < 0:

        return "DOWN"


    return "FLAT"


# ============================================================
# PRE-NEWS DAY ANALYSIS
# ============================================================

def calculate_pre_news(

    candles,

    api_event_time,

):

    day_start = (

        api_event_time.replace(

            hour=0,

            minute=0,

            second=0,

            microsecond=0,

        )

    )


    pre_news = [

        candle

        for candle in candles

        if (

            day_start

            <=

            candle[
                "timestamp"
            ]

            <

            api_event_time

        )

    ]


    if not pre_news:

        return {

            "available":
                False

        }


    day_open = (
        pre_news[
            0
        ][
            "open"
        ]
    )


    price_before_news = (
        pre_news[
            -1
        ][
            "close"
        ]
    )


    day_high = max(

        candle[
            "high"
        ]

        for candle in pre_news

    )


    day_low = min(

        candle[
            "low"
        ]

        for candle in pre_news

    )


    day_move = (

        price_before_news

        -

        day_open

    )


    day_range = (

        day_high

        -

        day_low

    )


    if day_range > 0:

        position = (

            (

                price_before_news

                -

                day_low

            )

            /

            day_range

        ) * 100


    else:

        position = 50


    if position >= 80:

        location = (
            "NEAR_DAY_HIGH"
        )


    elif position <= 20:

        location = (
            "NEAR_DAY_LOW"
        )


    elif position >= 60:

        location = (
            "UPPER_DAY_RANGE"
        )


    elif position <= 40:

        location = (
            "LOWER_DAY_RANGE"
        )


    else:

        location = (
            "MIDDLE_DAY_RANGE"
        )


    periods = {}


    for (
        label,
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


        start_target = (

            api_event_time

            -

            timedelta(
                minutes=minutes
            )

        )


        start_candle = (

            candle_at_or_before(

                candles,

                start_target,

                max_gap_minutes=5,

            )

        )


        end_candle = (

            candle_at_or_before(

                candles,

                api_event_time

                -

                timedelta(
                    minutes=1
                ),

                max_gap_minutes=5,

            )

        )


        if (

            start_candle is None

            or

            end_candle is None

        ):

            periods[
                label
            ] = {

                "available":
                    False

            }

            continue


        move = (

            end_candle[
                "close"
            ]

            -

            start_candle[
                "close"
            ]

        )


        periods[
            label
        ] = {

            "available":
                True,

            "move_usd":
                round(
                    move,
                    3,
                ),

            "direction":
                direction(
                    move
                ),

        }


    return {

        "available":
            True,


        "day_open":

            round(
                day_open,
                3,
            ),


        "price_before_news":

            round(
                price_before_news,
                3,
            ),


        "pre_news_move_usd":

            round(
                day_move,
                3,
            ),


        "pre_news_direction":

            direction(
                day_move
            ),


        "day_high_before_news":

            round(
                day_high,
                3,
            ),


        "day_low_before_news":

            round(
                day_low,
                3,
            ),


        "pre_news_range_usd":

            round(
                day_range,
                3,
            ),


        "range_position_percent":

            round(
                position,
                1,
            ),


        "location":

            location,


        "periods":

            periods,

    }


# ============================================================
# PRE-NEWS LIQUIDITY ENGINE
# ============================================================

def detect_pre_news_liquidity(

    candles,

    api_event_time,

):

    # --------------------------------------------------------
    # REFERENCE RANGE
    #
    # 4h before news -> 1h before news
    #
    # The final hour is then checked for sweeps.
    # --------------------------------------------------------

    reference_start = (

        api_event_time

        -

        timedelta(
            hours=4
        )

    )


    sweep_start = (

        api_event_time

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

            <

            api_event_time

        )

    ]


    if (

        not reference

        or

        not final_hour

    ):

        return {

            "available":
                False

        }


    reference_high = max(

        candle[
            "high"
        ]

        for candle in reference

    )


    reference_low = min(

        candle[
            "low"
        ]

        for candle in reference

    )


    final_hour_high = max(

        candle[
            "high"
        ]

        for candle in final_hour

    )


    final_hour_low = min(

        candle[
            "low"
        ]

        for candle in final_hour

    )


    price_before_news = (

        final_hour[
            -1
        ][
            "close"
        ]

    )


    # --------------------------------------------------------
    # LIQUIDITY SWEEP DETECTION
    # --------------------------------------------------------

    swept_upside = (

        final_hour_high

        >

        reference_high

    )


    swept_downside = (

        final_hour_low

        <

        reference_low

    )


    # --------------------------------------------------------
    # RECLAIM / REJECTION
    # --------------------------------------------------------

    upside_sweep_rejected = (

        swept_upside

        and

        price_before_news

        <

        reference_high

    )


    downside_sweep_reclaimed = (

        swept_downside

        and

        price_before_news

        >

        reference_low

    )


    # --------------------------------------------------------
    # SEQUENCE CLASSIFICATION
    # --------------------------------------------------------

    if (

        downside_sweep_reclaimed

        and

        not upside_sweep_rejected

    ):

        sequence = (
            "DOWNSIDE_SWEEP_RECLAIM"
        )


    elif (

        upside_sweep_rejected

        and

        not downside_sweep_reclaimed

    ):

        sequence = (
            "UPSIDE_SWEEP_REJECT"
        )


    elif (

        swept_downside

        and

        swept_upside

    ):

        sequence = (
            "BOTH_SIDES_SWEPT"
        )


    elif swept_downside:

        sequence = (
            "DOWNSIDE_LIQUIDITY_TAKEN"
        )


    elif swept_upside:

        sequence = (
            "UPSIDE_LIQUIDITY_TAKEN"
        )


    else:

        sequence = (
            "NO_RECENT_SWEEP"
        )


    # --------------------------------------------------------
    # DISTANCES FROM LIQUIDITY
    # --------------------------------------------------------

    distance_to_reference_high = (

        reference_high

        -

        price_before_news

    )


    distance_to_reference_low = (

        price_before_news

        -

        reference_low

    )


    return {

        "available":
            True,


        "reference_window":

            "4H_TO_1H_BEFORE_NEWS",


        "sweep_window":

            "FINAL_1H_BEFORE_NEWS",


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


        "price_before_news":

            round(
                price_before_news,
                3,
            ),


        "swept_upside_liquidity":

            swept_upside,


        "swept_downside_liquidity":

            swept_downside,


        "upside_sweep_rejected":

            upside_sweep_rejected,


        "downside_sweep_reclaimed":

            downside_sweep_reclaimed,


        "distance_to_reference_high_usd":

            round(
                distance_to_reference_high,
                3,
            ),


        "distance_to_reference_low_usd":

            round(
                distance_to_reference_low,
                3,
            ),


        "sequence":

            sequence,

    }


# ============================================================
# POST-NEWS REACTION
# ============================================================

def calculate_reaction(

    candles,

    api_event_time,

    reference_price,

    horizon,

):

    target = (

        api_event_time

        +

        horizon

    )


    if (

        horizon

        <=

        timedelta(
            hours=4
        )

    ):

        max_gap = 5


    else:

        max_gap = 90


    final = (

        candle_at_or_before(

            candles,

            target,

            max_gap_minutes=max_gap,

        )

    )


    if final is None:

        return {

            "available":
                False

        }


    window = [

        candle

        for candle in candles

        if (

            api_event_time

            <=

            candle[
                "timestamp"
            ]

            <=

            final[
                "timestamp"
            ]

        )

    ]


    if not window:

        return {

            "available":
                False

        }


    final_price = (

        final[
            "close"
        ]

    )


    move = (

        final_price

        -

        reference_price

    )


    highest = max(

        candle[
            "high"
        ]

        for candle in window

    )


    lowest = min(

        candle[
            "low"
        ]

        for candle in window

    )


    return {

        "available":
            True,


        "close":

            round(
                final_price,
                3,
            ),


        "move_usd":

            round(
                move,
                3,
            ),


        "direction":

            direction(
                move
            ),


        "maximum_up_usd":

            round(

                highest

                -

                reference_price,

                3,

            ),


        "maximum_down_usd":

            round(

                lowest

                -

                reference_price,

                3,

            ),


        "highest_price":

            round(
                highest,
                3,
            ),


        "lowest_price":

            round(
                lowest,
                3,
            ),

    }


# ============================================================
# ANALYZE ONE FED DECISION
# ============================================================

def analyze(

    group,

    candles,

):

    real_event_utc = (

        parse_utc(

            group[
                "timestamp_utc"
            ]

        )

    )


    api_event_time = (

        utc_to_mt5_api_time(

            real_event_utc

        )

    )


    impulse = (

        candle_at(

            candles,

            api_event_time,

        )

    )


    if impulse is None:

        return {

            "success":
                False,


            "events":

                group.get(
                    "events",
                    [],
                ),


            "numbers":

                group.get(
                    "numbers",
                    {},
                ),


            "release":

                group.get(
                    "release",
                    {},
                ),


            "error":

                (
                    "Exact Winpro MT5 "
                    "news candle unavailable."
                ),

        }


    # ========================================================
    # BEFORE NEWS
    # ========================================================

    pre_news = (

        calculate_pre_news(

            candles,

            api_event_time,

        )

    )


    # ========================================================
    # PRE-NEWS LIQUIDITY
    # ========================================================

    pre_news_liquidity = (

        detect_pre_news_liquidity(

            candles,

            api_event_time,

        )

    )


    # ========================================================
    # M1 NEWS CANDLE
    # ========================================================

    open_price = (
        impulse[
            "open"
        ]
    )


    high = (
        impulse[
            "high"
        ]
    )


    low = (
        impulse[
            "low"
        ]
    )


    close = (
        impulse[
            "close"
        ]
    )


    body_move = (

        close

        -

        open_price

    )


    full_range = (

        high

        -

        low

    )


    maximum_up = (

        high

        -

        open_price

    )


    maximum_down = (

        low

        -

        open_price

    )


    # ========================================================
    # POST-NEWS REACTIONS
    # ========================================================

    reactions = {}


    for (
        label,
        horizon,
    ) in HORIZONS.items():


        reactions[
            label
        ] = (

            calculate_reaction(

                candles,

                api_event_time,

                open_price,

                horizon,

            )

        )


    # ========================================================
    # FIRST-HOUR DAY LIQUIDITY SWEEP
    # ========================================================

    post_news_behavior = {}


    if pre_news.get(
        "available"
    ):


        first_hour = [

            candle

            for candle in candles

            if (

                api_event_time

                <=

                candle[
                    "timestamp"
                ]

                <=

                api_event_time

                +

                timedelta(
                    hours=1
                )

            )

        ]


        if first_hour:


            first_hour_high = max(

                candle[
                    "high"
                ]

                for candle in first_hour

            )


            first_hour_low = min(

                candle[
                    "low"
                ]

                for candle in first_hour

            )


            post_news_behavior = {

                "swept_pre_news_day_high":

                    first_hour_high

                    >

                    pre_news[
                        "day_high_before_news"
                    ],


                "swept_pre_news_day_low":

                    first_hour_low

                    <

                    pre_news[
                        "day_low_before_news"
                    ],

            }


    # ========================================================
    # COMPLETE EVENT RESULT
    # ========================================================

    return {

        "success":
            True,


        # ====================================================
        # EVENT
        # ====================================================

        "events":

            group.get(
                "events",
                [],
            ),


        "category":

            group.get(
                "category"
            ),


        "reference_periods":

            group.get(
                "reference_periods",
                [],
            ),


        # ====================================================
        # FED DECISION
        # ====================================================

        "numbers":

            group.get(
                "numbers",
                {},
            ),


        "release":

            group.get(
                "release",
                {},
            ),


        "official_source":

            group.get(
                "official_source"
            ),


        # ====================================================
        # TIME
        # ====================================================

        "time_validation": {

            "news_time_utc":

                real_event_utc
                .isoformat(),


            "news_time_ist":

                real_event_utc
                .astimezone(
                    IST
                )
                .isoformat(),


            "winpro_chart_time":

                get_winpro_chart_time(
                    real_event_utc
                )
                .isoformat(),


            "winpro_offset_hours":

                get_winpro_offset_hours(
                    real_event_utc
                ),


            "mt5_api_news_candle_time":

                impulse[
                    "timestamp"
                ]
                .isoformat(),


            "corrected_winpro_match":

                (
                    impulse[
                        "timestamp"
                    ]

                    ==

                    api_event_time
                ),

        },


        # ====================================================
        # TECHNICAL CONTEXT BEFORE NEWS
        # ====================================================

        "pre_news_behavior":

            pre_news,


        # ====================================================
        # LIQUIDITY CONTEXT BEFORE NEWS
        # ====================================================

        "pre_news_liquidity":

            pre_news_liquidity,


        # ====================================================
        # NEWS CANDLE
        # ====================================================

        "impulse_candle": {

            "open":

                round(
                    open_price,
                    3,
                ),


            "high":

                round(
                    high,
                    3,
                ),


            "low":

                round(
                    low,
                    3,
                ),


            "close":

                round(
                    close,
                    3,
                ),


            "body_move_usd":

                round(
                    body_move,
                    3,
                ),


            "body_direction":

                direction(
                    body_move
                ),


            "full_range_usd":

                round(
                    full_range,
                    3,
                ),


            "maximum_up_from_open_usd":

                round(
                    maximum_up,
                    3,
                ),


            "maximum_down_from_open_usd":

                round(
                    maximum_down,
                    3,
                ),


            "tick_volume":

                impulse[
                    "tick_volume"
                ],


            "broker_spread_points":

                impulse[
                    "spread"
                ],

        },


        # ====================================================
        # POST-NEWS LIQUIDITY
        # ====================================================

        "post_news_behavior":

            post_news_behavior,


        # ====================================================
        # POST-NEWS PRICE REACTIONS
        # ====================================================

        "reactions":

            reactions,

    }


# ============================================================
# PRINT RESULT
# ============================================================

def print_event_result(
    result
):

    release = result.get(
        "release",
        {},
    )


    numbers = result.get(
        "numbers",
        {},
    )


    print()


    print(
        "FED RATE DECISION"
    )


    print(
        "Previous:",
        release.get(
            "previous",
            "N/A",
        ),
    )


    print(
        "Actual:",
        release.get(
            "actual",
            "N/A",
        ),
    )


    print(
        "Decision:",
        numbers.get(
            "decision",
            "N/A",
        ),
    )


    print(
        "Change:",
        numbers.get(
            "change_bps",
            "N/A",
        ),
        "bps",
    )


    # ========================================================
    # PRE-NEWS
    # ========================================================

    pre = result.get(
        "pre_news_behavior",
        {},
    )


    if pre.get(
        "available"
    ):


        print()


        print(
            "BEFORE NEWS"
        )


        print(
            "Day Open:",
            pre[
                "day_open"
            ],
        )


        print(
            "Price Before:",
            pre[
                "price_before_news"
            ],
        )


        print(
            "Day Direction:",
            pre[
                "pre_news_direction"
            ],
        )


        print(
            "Day Move:",
            f"{pre['pre_news_move_usd']:+.3f}",
        )


        print(
            "Location:",
            pre[
                "location"
            ],
        )


    # ========================================================
    # LIQUIDITY
    # ========================================================

    liquidity = result.get(
        "pre_news_liquidity",
        {},
    )


    if liquidity.get(
        "available"
    ):


        print()


        print(
            "PRE-NEWS LIQUIDITY"
        )


        print(
            "Sequence:",
            liquidity[
                "sequence"
            ],
        )


        print(
            "Upside swept:",
            liquidity[
                "swept_upside_liquidity"
            ],
        )


        print(
            "Downside swept:",
            liquidity[
                "swept_downside_liquidity"
            ],
        )


        print(
            "Upside rejected:",
            liquidity[
                "upside_sweep_rejected"
            ],
        )


        print(
            "Downside reclaimed:",
            liquidity[
                "downside_sweep_reclaimed"
            ],
        )


    # ========================================================
    # M1
    # ========================================================

    impulse = result[
        "impulse_candle"
    ]


    print()


    print(
        "M1 NEWS CANDLE"
    )


    print(
        "Direction:",
        impulse[
            "body_direction"
        ],
    )


    print(
        "Body:",
        f"{impulse['body_move_usd']:+.3f}",
    )


    print(
        "Range:",
        f"{impulse['full_range_usd']:.3f}",
    )


    # ========================================================
    # POST NEWS
    # ========================================================

    print()


    print(
        "AFTER NEWS"
    )


    for horizon in HORIZONS:


        reaction = (

            result[
                "reactions"
            ]
            [
                horizon
            ]

        )


        if reaction.get(
            "available"
        ):


            print(

                horizon,

                "|",

                f"{reaction['move_usd']:+.3f}",

                reaction[
                    "direction"
                ],

                "| Max Up:",

                f"{reaction['maximum_up_usd']:+.3f}",

                "| Max Down:",

                f"{reaction['maximum_down_usd']:+.3f}",

            )


        else:


            print(

                horizon,

                "| UNAVAILABLE"

            )


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
        "FED + GOLD TECHNICAL SEQUENCE ENGINE"
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


    account = (
        mt5.account_info()
    )


    print()


    print(
        "MT5 connected."
    )


    if account:


        print(
            "Broker:",
            account.company,
        )


    # ========================================================
    # FIND GOLD
    # ========================================================

    symbol = (
        find_gold_symbol()
    )


    if symbol is None:


        print(
            "Gold symbol not found."
        )


        mt5.shutdown()


        return


    print(
        "Gold symbol:",
        symbol,
    )


    # ========================================================
    # LOAD FED EVENTS
    # ========================================================

    with open(

        DATABASE_FILE,

        "r",

        encoding="utf-8",

    ) as file:


        database = (

            json.load(
                file
            )

        )


    groups = [

        group

        for group in database.get(

            "download_groups",

            [],

        )

        if group.get(
            "verified"
        )

    ]


    print()


    print(

        "Verified FED decisions:",

        len(
            groups
        ),

    )


    # ========================================================
    # ANALYZE
    # ========================================================

    results = []


    for (

        index,

        group,

    ) in enumerate(

        groups,

        start=1,

    ):


        real_utc = (

            parse_utc(

                group[
                    "timestamp_utc"
                ]

            )

        )


        winpro_chart = (

            get_winpro_chart_time(

                real_utc

            )

        )


        print()


        print(
            "--------------------------------------------"
        )


        print(

            f"[{index}/{len(groups)}]",

            " + ".join(

                group.get(

                    "events",

                    [],

                )

            ),

        )


        print(

            "NEWS IST:",

            real_utc

            .astimezone(
                IST
            )

            .strftime(

                "%Y-%m-%d %H:%M"

            ),

        )


        print(

            "WINPRO CHART:",

            winpro_chart

            .strftime(

                "%Y-%m-%d %H:%M %z"

            ),

        )


        candles = (

            get_candles(

                symbol,

                real_utc,

            )

        )


        print(

            "M1 candles:",

            len(
                candles
            ),

        )


        result = (

            analyze(

                group,

                candles,

            )

        )


        results.append(
            result
        )


        if not result.get(
            "success"
        ):


            print(

                "FAILED:",

                result.get(
                    "error"
                ),

            )


            continue


        print_event_result(
            result
        )


    # ========================================================
    # SAVE
    # ========================================================

    OUTPUT_FOLDER.mkdir(

        parents=True,

        exist_ok=True,

    )


    successful = sum(

        1

        for result in results

        if result.get(
            "success"
        )

    )


    output = {

        "generated_at_ist":

            datetime.now(
                IST
            )
            .isoformat(),


        "database_type":

            (
                "FED_RATE_DECISION_"
                "XAUUSD_TECHNICAL_SEQUENCE_DATABASE"
            ),


        "instrument":

            symbol,


        "market":

            "XAUUSD CFD",


        "price_source":

            "Winpro MetaTrader 5",


        "broker":

            account.company

            if account

            else None,


        "successful_reactions":

            successful,


        "total_verified_windows":

            len(
                groups
            ),


        "technical_model": {

            "pre_news_liquidity_reference":

                (
                    "Range from 4 hours before "
                    "news until 1 hour before news"
                ),


            "liquidity_sweep_window":

                (
                    "Final 1 hour before news"
                ),


            "warning":

                (
                    "Liquidity is defined by this "
                    "specific historical model and "
                    "should not be interpreted as "
                    "every possible SMC liquidity concept."
                ),

        },


        "reactions":

            results,

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


    mt5.shutdown()


    # ========================================================
    # FINISH
    # ========================================================

    print()


    print(
        "============================================"
    )


    print(
        "ANALYSIS COMPLETE"
    )


    print(
        "============================================"
    )


    print(

        "Successful reactions:",

        successful,

        "/",

        len(
            groups
        ),

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