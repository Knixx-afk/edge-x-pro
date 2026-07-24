import json
import statistics
from collections import defaultdict
from itertools import combinations
from pathlib import Path


INPUT_FILE = Path(
    "data/cpi/reactions/gold_reactions.json"
)

OUTPUT_FOLDER = Path(
    "data/cpi/pattern-intelligence"
)

OUTPUT_FILE = (
    OUTPUT_FOLDER / "core_cpi_gold_patterns.json"
)


HORIZONS = [
    "1m",
    "5m",
    "15m",
    "30m",
    "1h",
    "4h",
    "24h",
]


MIN_SINGLE_SAMPLE = 4
MIN_COMBINATION_SAMPLE = 4

# Dashboard should not promote weak tiny samples.
MIN_DASHBOARD_SAMPLE = 5
MIN_DASHBOARD_PROBABILITY = 65


# ============================================================
# BASIC HELPERS
# ============================================================

def safe_number(value):

    if isinstance(value, (int, float)):
        return float(value)

    return 0.0


def percentage(count, total):

    if total == 0:
        return 0.0

    return round(
        (count / total) * 100,
        1,
    )


def confidence_label(
    sample_size,
    probability,
):

    edge = abs(
        probability - 50
    )

    if (
        sample_size >= 10
        and edge >= 20
    ):
        return "STRONG"

    if (
        sample_size >= 7
        and edge >= 15
    ):
        return "MODERATE"

    if (
        sample_size >= 5
        and edge >= 10
    ):
        return "DEVELOPING"

    return "WEAK"


# ============================================================
# EXTRACT EVENT CONDITIONS
# ============================================================

def extract_conditions(event):

    conditions = []


    # CORE CPI FUNDAMENTAL CLASSIFICATION
    #
    # Historical consensus is currently unavailable, so this engine
    # intentionally does not create surprise-based CPI conditions.
    # Technical pre-news and liquidity conditions remain fully active.

    # PRE-NEWS BEHAVIOR

    pre = event.get(
        "pre_news_behavior",
        {},
    )


    if pre.get("available"):

        day_direction = pre.get(
            "pre_news_direction"
        )

        if day_direction:

            conditions.append(
                f"DAY_DIRECTION={day_direction}"
            )


        location = pre.get(
            "location"
        )

        if location:

            conditions.append(
                f"DAY_LOCATION={location}"
            )


        periods = pre.get(
            "periods",
            {},
        )


        tf_directions = []


        for timeframe in [
            "15m",
            "30m",
            "1h",
            "4h",
        ]:

            item = periods.get(
                timeframe,
                {},
            )


            if not item.get(
                "available"
            ):
                continue


            tf_direction = item.get(
                "direction"
            )


            if tf_direction:

                conditions.append(
                    f"PRE_{timeframe.upper()}={tf_direction}"
                )


                if tf_direction in [
                    "UP",
                    "DOWN",
                ]:

                    tf_directions.append(
                        tf_direction
                    )


        # ALIGNMENT

        if len(tf_directions) >= 3:

            up_count = (
                tf_directions.count("UP")
            )

            down_count = (
                tf_directions.count("DOWN")
            )


            if up_count == len(
                tf_directions
            ):

                alignment = "ALL_UP"


            elif down_count == len(
                tf_directions
            ):

                alignment = "ALL_DOWN"


            elif up_count > down_count:

                alignment = "MOSTLY_UP"


            elif down_count > up_count:

                alignment = "MOSTLY_DOWN"


            else:

                alignment = "MIXED"


            conditions.append(
                f"PRE_NEWS_ALIGNMENT={alignment}"
            )


    # PRE-NEWS LIQUIDITY

    liquidity = event.get(
        "pre_news_liquidity",
        {},
    )


    if liquidity.get("available"):

        sequence = liquidity.get(
            "sequence"
        )

        if sequence:

            conditions.append(
                f"LIQUIDITY_SEQUENCE={sequence}"
            )


        if liquidity.get(
            "swept_upside_liquidity"
        ):

            conditions.append(
                "UPSIDE_LIQUIDITY_SWEPT"
            )


        if liquidity.get(
            "swept_downside_liquidity"
        ):

            conditions.append(
                "DOWNSIDE_LIQUIDITY_SWEPT"
            )


        if liquidity.get(
            "upside_sweep_rejected"
        ):

            conditions.append(
                "UPSIDE_SWEEP_REJECTED"
            )


        if liquidity.get(
            "downside_sweep_reclaimed"
        ):

            conditions.append(
                "DOWNSIDE_SWEEP_RECLAIMED"
            )


    return sorted(
        set(conditions)
    )


# ============================================================
# GET OUTCOME
# ============================================================

def get_outcome(
    event,
    horizon,
):

    reaction = (
        event
        .get("reactions", {})
        .get(horizon, {})
    )


    if not reaction.get(
        "available"
    ):

        return None


    move = safe_number(
        reaction.get(
            "move_usd"
        )
    )


    if move > 0:

        move_direction = "UP"

    elif move < 0:

        move_direction = "DOWN"

    else:

        move_direction = "FLAT"


    return {

        "direction":
            move_direction,

        "move_usd":
            move,

        "maximum_up_usd":
            safe_number(
                reaction.get(
                    "maximum_up_usd"
                )
            ),

        "maximum_down_usd":
            safe_number(
                reaction.get(
                    "maximum_down_usd"
                )
            ),

    }


# ============================================================
# SUMMARIZE PATTERN
# ============================================================

def summarize_pattern(
    conditions,
    events,
    horizon,
):

    outcomes = []


    for event in events:

        event_conditions = set(
            extract_conditions(event)
        )


        if not set(
            conditions
        ).issubset(
            event_conditions
        ):

            continue


        outcome = get_outcome(
            event,
            horizon,
        )


        if outcome:

            outcomes.append(
                outcome
            )


    sample_size = len(
        outcomes
    )


    if sample_size == 0:

        return None


    up_count = sum(
        item["direction"] == "UP"
        for item in outcomes
    )


    down_count = sum(
        item["direction"] == "DOWN"
        for item in outcomes
    )


    flat_count = sum(
        item["direction"] == "FLAT"
        for item in outcomes
    )


    up_probability = percentage(
        up_count,
        sample_size,
    )


    down_probability = percentage(
        down_count,
        sample_size,
    )


    if up_probability > down_probability:

        dominant_direction = "UP"

        dominant_probability = (
            up_probability
        )


    elif down_probability > up_probability:

        dominant_direction = "DOWN"

        dominant_probability = (
            down_probability
        )


    else:

        dominant_direction = "MIXED"

        dominant_probability = max(
            up_probability,
            down_probability,
        )


    moves = [
        item["move_usd"]
        for item in outcomes
    ]


    average_move = (
        sum(moves)
        / sample_size
    )


    median_move = (
        statistics.median(moves)
    )


    average_max_up = (
        sum(
            item["maximum_up_usd"]
            for item in outcomes
        )
        / sample_size
    )


    average_max_down = (
        sum(
            item["maximum_down_usd"]
            for item in outcomes
        )
        / sample_size
    )


    # ========================================================
    # DIRECTION / MAGNITUDE CONSISTENCY
    # ========================================================

    if dominant_direction == "UP":

        dominant_moves = [
            move
            for move in moves
            if move > 0
        ]

        opposite_moves = [
            move
            for move in moves
            if move < 0
        ]


        magnitude_conflict = (
            average_move < 0
            or median_move < 0
        )


    elif dominant_direction == "DOWN":

        dominant_moves = [
            abs(move)
            for move in moves
            if move < 0
        ]

        opposite_moves = [
            move
            for move in moves
            if move > 0
        ]


        magnitude_conflict = (
            average_move > 0
            or median_move > 0
        )


    else:

        dominant_moves = []
        opposite_moves = []

        magnitude_conflict = True


    average_winning_magnitude = (

        sum(dominant_moves)
        / len(dominant_moves)

        if dominant_moves

        else 0.0

    )


    average_opposite_magnitude = (

        sum(
            abs(move)
            for move in opposite_moves
        )
        / len(opposite_moves)

        if opposite_moves

        else 0.0

    )


    # ========================================================
    # MOVE CONSISTENCY
    # ========================================================

    if dominant_direction == "UP":

        median_supports_direction = (
            median_move > 0
        )

        average_supports_direction = (
            average_move > 0
        )


    elif dominant_direction == "DOWN":

        median_supports_direction = (
            median_move < 0
        )

        average_supports_direction = (
            average_move < 0
        )


    else:

        median_supports_direction = False
        average_supports_direction = False


    if (
        average_supports_direction
        and median_supports_direction
    ):

        magnitude_consistency = (
            "ALIGNED"
        )


    elif (
        average_supports_direction
        or median_supports_direction
    ):

        magnitude_consistency = (
            "PARTIAL"
        )


    else:

        magnitude_consistency = (
            "CONFLICT"
        )


    return {

        "conditions":
            list(conditions),

        "condition_count":
            len(conditions),

        "horizon":
            horizon,

        "sample_size":
            sample_size,

        "up_count":
            up_count,

        "down_count":
            down_count,

        "flat_count":
            flat_count,

        "up_probability":
            up_probability,

        "down_probability":
            down_probability,

        "dominant_direction":
            dominant_direction,

        "dominant_probability":
            dominant_probability,

        "average_move_usd":
            round(
                average_move,
                3,
            ),

        "median_move_usd":
            round(
                median_move,
                3,
            ),

        "average_max_up_usd":
            round(
                average_max_up,
                3,
            ),

        "average_max_down_usd":
            round(
                average_max_down,
                3,
            ),

        "average_winning_magnitude_usd":
            round(
                average_winning_magnitude,
                3,
            ),

        "average_opposite_magnitude_usd":
            round(
                average_opposite_magnitude,
                3,
            ),

        "magnitude_conflict":
            magnitude_conflict,

        "magnitude_consistency":
            magnitude_consistency,

        "evidence_strength":
            confidence_label(
                sample_size,
                dominant_probability,
            ),

    }


# ============================================================
# READABLE CONDITIONS
# ============================================================

def readable_condition(
    condition
):

    replacements = {

                "DAY_DIRECTION=":
            "Pre-news day: ",

        "DAY_LOCATION=":
            "Price location: ",

        "PRE_NEWS_ALIGNMENT=":
            "Timeframe alignment: ",

        "LIQUIDITY_SEQUENCE=":
            "Liquidity: ",

        "PRE_15M=":
            "15m before news: ",

        "PRE_30M=":
            "30m before news: ",

        "PRE_1H=":
            "1h before news: ",

        "PRE_4H=":
            "4h before news: ",

    }


    for old, new in replacements.items():

        if condition.startswith(old):

            value = (
                condition[
                    len(old):
                ]
                .replace(
                    "_",
                    " ",
                )
            )


            return (
                new + value
            )


    return (
        condition
        .replace(
            "_",
            " ",
        )
        .title()
    )


def add_readable_text(
    pattern
):

    readable = [

        readable_condition(
            condition
        )

        for condition in pattern[
            "conditions"
        ]

    ]


    pattern[
        "readable_conditions"
    ] = readable


    conditions_text = (
        " + ".join(readable)
    )


    warning = ""


    if pattern[
        "magnitude_consistency"
    ] == "CONFLICT":

        warning = (
            " Directional hit rate conflicts "
            "with average/median move."
        )


    elif pattern[
        "magnitude_consistency"
    ] == "PARTIAL":

        warning = (
            " Move magnitude is only "
            "partially consistent."
        )


    pattern[
        "summary"
    ] = (

        f"{conditions_text} -> "
        f"{pattern['dominant_direction']} "
        f"after {pattern['horizon']} in "
        f"{pattern['dominant_probability']}% "
        f"of {pattern['sample_size']} cases. "
        f"Average move "
        f"{pattern['average_move_usd']:+.2f} USD. "
        f"Median move "
        f"{pattern['median_move_usd']:+.2f} USD."
        f"{warning}"

    )


    return pattern


# ============================================================
# PATTERN SCORE
# ============================================================

def pattern_score(
    pattern
):

    probability = (
        pattern[
            "dominant_probability"
        ]
    )


    sample_size = (
        pattern[
            "sample_size"
        ]
    )


    probability_edge = max(
        probability - 50,
        0,
    )


    # Larger sample receives more weight,
    # but capped so huge generic samples
    # do not completely dominate.

    sample_weight = min(
        sample_size,
        20,
    )


    score = (
        probability_edge
        * sample_weight
    )


    # Reward aligned average + median.

    consistency = (
        pattern[
            "magnitude_consistency"
        ]
    )


    if consistency == "ALIGNED":

        score += 50


    elif consistency == "PARTIAL":

        score += 10


    elif consistency == "CONFLICT":

        score -= 100


    # Small bonus for specific patterns,
    # but not enough to overpower sample size.

    score += (
        pattern[
            "condition_count"
        ]
        * 3
    )


    return round(
        score,
        2,
    )


# ============================================================
# GENERATE PATTERNS
# ============================================================

def build_patterns(
    events
):

    all_conditions = set()


    for event in events:

        all_conditions.update(
            extract_conditions(
                event
            )
        )


    patterns = []


    # ========================================================
    # SINGLE FACTORS
    # ========================================================

    for condition in sorted(
        all_conditions
    ):


        for horizon in HORIZONS:


            result = summarize_pattern(

                [condition],

                events,

                horizon,

            )


            if not result:

                continue


            if (
                result["sample_size"]
                <
                MIN_SINGLE_SAMPLE
            ):

                continue


            patterns.append(
                add_readable_text(
                    result
                )
            )


    # ========================================================
    # TWO-FACTOR COMBINATIONS
    # ========================================================

    combo_counts = defaultdict(
        int
    )


    for event in events:

        conditions = extract_conditions(
            event
        )


        for combo in combinations(
            conditions,
            2,
        ):

            combo_counts[
                combo
            ] += 1


    valid_combos = [

        combo

        for combo, count
        in combo_counts.items()

        if (
            count
            >=
            MIN_COMBINATION_SAMPLE
        )

    ]


    for combo in valid_combos:


        for horizon in HORIZONS:


            result = summarize_pattern(

                combo,

                events,

                horizon,

            )


            if not result:

                continue


            if (
                result["sample_size"]
                <
                MIN_COMBINATION_SAMPLE
            ):

                continue


            patterns.append(
                add_readable_text(
                    result
                )
            )


    return patterns


# ============================================================
# REMOVE DUPLICATE / OVERLAPPING DASHBOARD FINDINGS
# ============================================================

def clean_dashboard_patterns(
    patterns,
    limit=50,
):

    candidates = [

        pattern

        for pattern in patterns

        if (

            pattern[
                "sample_size"
            ]
            >=
            MIN_DASHBOARD_SAMPLE

            and

            pattern[
                "dominant_probability"
            ]
            >=
            MIN_DASHBOARD_PROBABILITY

            and

            pattern[
                "dominant_direction"
            ]
            in [
                "UP",
                "DOWN",
            ]

        )

    ]


    candidates.sort(

        key=lambda item: (

            item[
                "pattern_score"
            ],

            item[
                "sample_size"
            ],

            item[
                "dominant_probability"
            ],

        ),

        reverse=True,

    )


    selected = []


    for candidate in candidates:

        duplicate = False


        candidate_conditions = set(
            candidate[
                "conditions"
            ]
        )


        for existing in selected:

            if (
                candidate[
                    "horizon"
                ]
                !=
                existing[
                    "horizon"
                ]
            ):

                continue


            if (
                candidate[
                    "dominant_direction"
                ]
                !=
                existing[
                    "dominant_direction"
                ]
            ):

                continue


            existing_conditions = set(
                existing[
                    "conditions"
                ]
            )


            # Remove exact duplicates.

            if (
                candidate_conditions
                ==
                existing_conditions
            ):

                duplicate = True
                break


            # If a two-factor setup gives almost
            # the same result as its simpler
            # one-factor parent, prefer the one
            # with the better score.

            overlap = len(

                candidate_conditions
                &
                existing_conditions

            )


            if overlap > 0:

                probability_difference = abs(

                    candidate[
                        "dominant_probability"
                    ]

                    -

                    existing[
                        "dominant_probability"
                    ]

                )


                if (
                    probability_difference
                    <= 3
                ):

                    duplicate = True
                    break


        if not duplicate:

            selected.append(
                candidate
            )


        if len(selected) >= limit:

            break


    return selected


# ============================================================
# GROUP DASHBOARD FINDINGS
# ============================================================

def group_findings(
    patterns
):

    groups = {

        "immediate":
            [],

        "short_term":
            [],

        "medium_term":
            [],

        "daily":
            [],

        "liquidity":
            [],

    }


    for pattern in patterns:


        horizon = pattern[
            "horizon"
        ]


        if horizon in [
            "1m",
            "5m",
        ]:

            groups[
                "immediate"
            ].append(
                pattern
            )


        elif horizon in [
            "15m",
            "30m",
        ]:

            groups[
                "short_term"
            ].append(
                pattern
            )


        elif horizon in [
            "1h",
            "4h",
        ]:

            groups[
                "medium_term"
            ].append(
                pattern
            )


        elif horizon == "24h":

            groups[
                "daily"
            ].append(
                pattern
            )


        if any(

            (
                "LIQUIDITY"
                in condition

                or

                "SWEEP"
                in condition

            )

            for condition in pattern[
                "conditions"
            ]

        ):

            groups[
                "liquidity"
            ].append(
                pattern
            )


    # Keep the dashboard concise.

    for key in groups:

        groups[
            key
        ] = (

            groups[
                key
            ][
                :10
            ]

        )


    return groups


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
        "CORE CPI PATTERN INTELLIGENCE ENGINE V1"
    )

    print(
        "============================================"
    )


    if not INPUT_FILE.exists():

        print()
        print(
            "ERROR: Cannot find"
        )

        print(
            INPUT_FILE.resolve()
        )

        return


    # LOAD DATABASE

    with open(

        INPUT_FILE,

        "r",

        encoding="utf-8",

    ) as file:

        database = json.load(
            file
        )


    events = [

        event

        for event in database.get(
            "reactions",
            [],
        )

        if event.get(
            "success"
        )

    ]


    print()
    print(
        "Historical events loaded:",
        len(events),
    )


    # BUILD PATTERNS

    print()
    print(
        "Analyzing historical relationships..."
    )


    all_patterns = build_patterns(
        events
    )


    # SCORE

    for pattern in all_patterns:

        pattern[
            "pattern_score"
        ] = pattern_score(
            pattern
        )


    all_patterns.sort(

        key=lambda item: (
            item[
                "pattern_score"
            ],
            item[
                "sample_size"
            ],
        ),

        reverse=True,

    )


    # CLEAN DASHBOARD FINDINGS

    dashboard_patterns = (
        clean_dashboard_patterns(
            all_patterns,
            limit=50,
        )
    )


    dashboard_groups = (
        group_findings(
            dashboard_patterns
        )
    )


    # MAGNITUDE CONFLICTS

    conflicts = [

        pattern

        for pattern in all_patterns

        if pattern[
            "magnitude_consistency"
        ]
        ==
        "CONFLICT"

    ]


    # SAVE

    OUTPUT_FOLDER.mkdir(

        parents=True,

        exist_ok=True,

    )


    output = {

        "engine":
            "EDGE_X_CORE_CPI_PATTERN_INTELLIGENCE_V1",

        "event_type":
            "CORE_CPI",

        "historical_event_count":
            len(events),

        "fundamental_surprise_classification":
            "DISABLED_UNTIL_VERIFIED_CONSENSUS",

        "total_patterns_analyzed":
            len(all_patterns),

        "dashboard_pattern_count":
            len(dashboard_patterns),

        "methodology": {

            "minimum_dashboard_sample":
                MIN_DASHBOARD_SAMPLE,

            "minimum_dashboard_probability":
                MIN_DASHBOARD_PROBABILITY,

            "uses_average_move":
                True,

            "uses_median_move":
                True,

            "detects_magnitude_conflicts":
                True,

            "deduplicates_similar_patterns":
                True,

            "warning":
                (
                    "Historical associations are not "
                    "guaranteed predictions and do not "
                    "prove causation."
                ),

        },

        "dashboard_summary":
            dashboard_groups,

        "top_patterns":
            dashboard_patterns,

        "magnitude_conflicts":
            conflicts[:100],

        "all_patterns":
            all_patterns,

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


    # TERMINAL OUTPUT

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


    print()
    print(
        "Total patterns:",
        len(all_patterns),
    )


    print(
        "Clean dashboard patterns:",
        len(dashboard_patterns),
    )


    print(
        "Magnitude conflicts detected:",
        len(conflicts),
    )


    print()
    print(
        "TOP CLEAN TECHNICAL FINDINGS"
    )

    print(
        "--------------------------------------------"
    )


    for index, pattern in enumerate(

        dashboard_patterns[:15],

        start=1,

    ):

        print()

        print(
            f"{index}."
        )

        print(
            pattern[
                "summary"
            ]
        )

        print(

            "Evidence:",

            pattern[
                "evidence_strength"
            ],

            "| Consistency:",

            pattern[
                "magnitude_consistency"
            ],

            "| Score:",

            pattern[
                "pattern_score"
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