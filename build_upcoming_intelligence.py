import json
import math
from datetime import datetime, timezone
from pathlib import Path


# ============================================================
# EDGE X PRO
# UPCOMING EVENT INTELLIGENCE V6.2
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
CATEGORY = "fomc"

SETUP_FILE = (
    BASE_DIR
    / "data"
    / CATEGORY
    / "context"
    / "current_setup.json"
)

PATTERN_FILE = (
    BASE_DIR
    / "data"
    / "pattern-intelligence"
    / "fed_gold_patterns.json"
)

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / CATEGORY
    / "context"
    / "upcoming_intelligence.json"
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


# ============================================================
# JSON HELPERS
# ============================================================

def load_json(path):

    if not path.exists():
        print(f"Missing file: {path}")
        return {}

    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)

        if isinstance(data, dict):
            return data

        print(f"Invalid JSON structure: {path}")

    except Exception as error:
        print(f"Failed to load: {path}")
        print(error)

    return {}


def save_json(path, data):

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(path, "w", encoding="utf-8") as file:

        json.dump(
            data,
            file,
            indent=2,
        )


def normalize(value):

    if value is None:
        return ""

    return str(value).strip().upper()


# ============================================================
# CURRENT CONDITIONS
#
# Your actual structure is:
#
# setup
#   └── technical
#         ├── day_direction
#         ├── timeframes
#         │     ├── 15m
#         │     ├── 30m
#         │     ├── 1h
#         │     └── 4h
#         └── liquidity
#
# Historical pattern format:
#
# DAY_DIRECTION=UP
# PRE_15M=UP
# PRE_30M=DOWN
# PRE_1H=DOWN
# PRE_4H=UP
# ============================================================

def get_current_conditions(setup):

    conditions = []

    # ========================================================
    # GET TECHNICAL OBJECT
    # ========================================================

    technical = setup.get(
        "technical",
        {},
    )

    if not isinstance(
        technical,
        dict,
    ):
        technical = {}

    # ========================================================
    # DAY DIRECTION
    # ========================================================

    day_direction = normalize(
        technical.get(
            "day_direction",
            "",
        )
    )

    # Fallback to day_context

    if day_direction not in (
        "UP",
        "DOWN",
    ):

        day_context = technical.get(
            "day_context",
            {},
        )

        if isinstance(
            day_context,
            dict,
        ):

            day_direction = normalize(
                day_context.get(
                    "day_direction",
                    "",
                )
            )

    if day_direction in (
        "UP",
        "DOWN",
    ):

        conditions.append(
            f"DAY_DIRECTION={day_direction}"
        )

    # ========================================================
    # TIMEFRAMES
    # ========================================================

    timeframes = technical.get(
        "timeframes",
        {},
    )

    if not isinstance(
        timeframes,
        dict,
    ):
        timeframes = {}

    timeframe_details = technical.get(
        "timeframe_details",
        {},
    )

    if not isinstance(
        timeframe_details,
        dict,
    ):
        timeframe_details = {}

    timeframe_mapping = {

        "15m": "PRE_15M",

        "30m": "PRE_30M",

        "1h": "PRE_1H",

        "4h": "PRE_4H",

    }

    for (
        timeframe,
        pattern_key,
    ) in timeframe_mapping.items():

        direction = ""

        # ----------------------------------------------------
        # PRIMARY SOURCE
        #
        # technical.timeframes
        # ----------------------------------------------------

        timeframe_value = timeframes.get(
            timeframe
        )

        if isinstance(
            timeframe_value,
            str,
        ):

            direction = normalize(
                timeframe_value
            )

        elif isinstance(
            timeframe_value,
            dict,
        ):

            direction = normalize(
                timeframe_value.get(
                    "direction",
                    "",
                )
            )

        # ----------------------------------------------------
        # FALLBACK SOURCE
        #
        # technical.timeframe_details
        # ----------------------------------------------------

        if direction not in (
            "UP",
            "DOWN",
        ):

            detail = timeframe_details.get(
                timeframe,
                {},
            )

            if isinstance(
                detail,
                dict,
            ):

                direction = normalize(
                    detail.get(
                        "direction",
                        "",
                    )
                )

        # ----------------------------------------------------
        # ADD PATTERN CONDITION
        # ----------------------------------------------------

        if direction in (
            "UP",
            "DOWN",
        ):

            conditions.append(
                f"{pattern_key}={direction}"
            )

    # ========================================================
    # LIQUIDITY
    # ========================================================

    liquidity = technical.get(
        "liquidity",
        {},
    )

    if isinstance(
        liquidity,
        dict,
    ):

        sequence = normalize(
            liquidity.get(
                "sequence",
                "",
            )
        )

        if sequence:

            conditions.append(
                f"LIQUIDITY_SEQUENCE={sequence}"
            )

    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    return list(
        dict.fromkeys(
            conditions
        )
    )


# ============================================================
# CONDITION MATCH
# ============================================================

def condition_matches(
    pattern_condition,
    current_conditions,
):

    pattern_condition = normalize(
        pattern_condition
    )

    normalized_current = {

        normalize(
            condition
        )

        for condition
        in current_conditions

    }

    return (
        pattern_condition
        in
        normalized_current
    )


# ============================================================
# CALCULATE PATTERN MATCH
# ============================================================

def calculate_pattern_match(
    pattern,
    current_conditions,
):

    pattern_conditions = pattern.get(
        "conditions",
        [],
    )

    if not isinstance(
        pattern_conditions,
        list,
    ):

        return 0, 0, 0.0

    if not pattern_conditions:

        return 0, 0, 0.0

    matched = 0

    for condition in pattern_conditions:

        if condition_matches(
            condition,
            current_conditions,
        ):

            matched += 1

    total = len(
        pattern_conditions
    )

    ratio = (
        matched
        /
        total
    )

    return (
        matched,
        total,
        ratio,
    )


# ============================================================
# EVIDENCE WEIGHT
# ============================================================

def evidence_weight(evidence):
    evidence = normalize(evidence)
    return {
        "STRONG": 1.00,
        "MODERATE": 0.75,
        "LIMITED": 0.50,
        "WEAK": 0.30,
        "NONE": 0.15,
    }.get(evidence, 0.40)


def sample_reliability(sample_size):
    try:
        n = max(0, int(sample_size))
    except (TypeError, ValueError):
        n = 0
    if n <= 0:
        return 0.10
    return min(1.0, math.sqrt(n / 25.0))


def specificity_weight(condition_count, match_ratio):
    if condition_count <= 1:
        base = 0.85
    elif condition_count == 2:
        base = 0.95
    elif condition_count == 3:
        base = 1.00
    else:
        base = 1.05
    return base * (match_ratio ** 2)


def pattern_signature(pattern):
    conditions = tuple(sorted(
        normalize(c) for c in pattern.get("conditions", [])
    ))
    return (
        str(pattern.get("horizon", "")).strip(),
        normalize(pattern.get("direction", "")),
        conditions,
    )


def deduplicate_correlated_patterns(patterns):
    best = {}
    for pattern in patterns:
        signature = pattern_signature(pattern)
        quality = (
            float(pattern.get("match_ratio", 0.0)),
            float(pattern.get("weight", 0.0)),
            int(pattern.get("sample_size", 0)),
        )
        existing = best.get(signature)
        if existing is None:
            best[signature] = pattern
            continue
        existing_quality = (
            float(existing.get("match_ratio", 0.0)),
            float(existing.get("weight", 0.0)),
            int(existing.get("sample_size", 0)),
        )
        if quality > existing_quality:
            best[signature] = pattern
    return list(best.values())


# ============================================================
# GET PATTERNS
# ============================================================

def get_patterns(pattern_data):

    patterns = pattern_data.get(
        "top_patterns",
        [],
    )

    if isinstance(
        patterns,
        list,
    ):

        return patterns

    return []


# ============================================================
# FIND MATCHED PATTERNS
# ============================================================

def find_matched_patterns(
    patterns,
    current_conditions,
):

    matched_patterns = []

    for pattern in patterns:

        if not isinstance(
            pattern,
            dict,
        ):
            continue

        (
            matched_count,
            condition_count,
            match_ratio,
        ) = calculate_pattern_match(
            pattern,
            current_conditions,
        )

        if condition_count <= 0:
            continue

        # ====================================================
        # MATCH RULE
        #
        # Single-condition pattern:
        # Must match exactly.
        #
        # Multi-condition pattern:
        # At least 50% must match.
        # ====================================================

        if condition_count == 1:

            minimum_match = 1.0

        else:

            minimum_match = 0.50

        if match_ratio < minimum_match:
            continue

        direction = normalize(
            pattern.get(
                "dominant_direction",
                "",
            )
        )

        if direction not in (
            "UP",
            "DOWN",
        ):
            continue

        # ====================================================
        # PROBABILITY
        # ====================================================

        try:

            probability = float(
                pattern.get(
                    "dominant_probability",
                    50.0,
                )
            )

        except (
            TypeError,
            ValueError,
        ):

            probability = 50.0

        # ====================================================
        # SAMPLE SIZE
        # ====================================================

        try:

            sample_size = int(
                pattern.get(
                    "sample_size",
                    0,
                )
            )

        except (
            TypeError,
            ValueError,
        ):

            sample_size = 0

        # ====================================================
        # HORIZON
        # ====================================================

        horizon = str(
            pattern.get(
                "horizon",
                "",
            )
        ).strip()

        if horizon not in HORIZONS:
            continue

        # ====================================================
        # EVIDENCE
        # ====================================================

        evidence = normalize(
            pattern.get(
                "evidence_strength",
                "NONE",
            )
        )

        # ====================================================
        # PATTERN WEIGHT
        # ====================================================

        probability_edge = max(
            0.0,
            (
                probability
                -
                50.0
            )
            /
            50.0,
        )

        sample_weight = sample_reliability(sample_size)

        specificity = specificity_weight(
            condition_count,
            match_ratio,
        )

        weight = (
            max(0.05, probability_edge)
            * evidence_weight(evidence)
            * sample_weight
            * specificity
        )

        matched_patterns.append({

            "horizon":
                horizon,

            "direction":
                direction,

            "probability":
                probability,

            "sample_size":
                sample_size,

            "evidence_strength":
                evidence,

            "matched_conditions":
                matched_count,

            "condition_count":
                condition_count,

            "match_ratio":
                round(
                    match_ratio,
                    3,
                ),

            "weight":
                round(
                    weight,
                    6,
                ),

            "conditions":
                pattern.get(
                    "conditions",
                    [],
                ),

            "readable_conditions":
                pattern.get(
                    "readable_conditions",
                    [],
                ),

            "summary":
                pattern.get(
                    "summary",
                    "",
                ),

            "pattern_score":
                pattern.get(
                    "pattern_score",
                    0,
                ),

            "average_move_usd":
                pattern.get(
                    "average_move_usd"
                ),

            "median_move_usd":
                pattern.get(
                    "median_move_usd"
                ),

            "average_max_up_usd":
                pattern.get(
                    "average_max_up_usd"
                ),

            "average_max_down_usd":
                pattern.get(
                    "average_max_down_usd"
                ),

        })

    matched_patterns = deduplicate_correlated_patterns(
        matched_patterns
    )

    # Highest-quality matches first

    matched_patterns.sort(

        key=lambda item: (

            item.get(
                "match_ratio",
                0,
            ),

            item.get(
                "weight",
                0,
            ),

            item.get(
                "sample_size",
                0,
            ),

        ),

        reverse=True,

    )

    return matched_patterns


# ============================================================
# BUILD HORIZON PREDICTIONS
# ============================================================

def build_horizon_predictions(matched_patterns):

    predictions = {}
    evidence_rank = {
        "NONE": 0,
        "WEAK": 1,
        "LIMITED": 2,
        "MODERATE": 3,
        "STRONG": 4,
    }

    for horizon in HORIZONS:

        horizon_patterns = [
            p for p in matched_patterns
            if p.get("horizon") == horizon
        ]

        if not horizon_patterns:
            predictions[horizon] = {
                "direction": "NO_CLEAR_EDGE",
                "confidence": 50.0,
                "consensus": 50.0,
                "evidence": "NONE",
                "pattern_count": 0,
                "up_probability": 50.0,
                "down_probability": 50.0,
                "conflict_score": 0.0,
            }
            continue

        up_support = 0.0
        down_support = 0.0
        up_votes = 0
        down_votes = 0
        evidence_levels = []

        for pattern in horizon_patterns:
            probability = float(pattern.get("probability", 50.0))
            weight = float(pattern.get("weight", 0.0))
            direction = pattern.get("direction")

            edge = max(
                0.0,
                min(1.0, (probability - 50.0) / 50.0),
            )
            support = edge * weight

            if direction == "UP":
                up_support += support
                up_votes += 1
            elif direction == "DOWN":
                down_support += support
                down_votes += 1

            evidence_levels.append(
                pattern.get("evidence_strength", "NONE")
            )

        # Raw pattern agreement: separate from model confidence.
        total_votes = up_votes + down_votes
        consensus = (
            max(up_votes, down_votes) / total_votes * 100.0
            if total_votes > 0 else 50.0
        )

        total_support = up_support + down_support

        if total_support > 0:
            up_probability = up_support / total_support * 100.0
            down_probability = 100.0 - up_probability
            balance = (up_support - down_support) / total_support
            conflict_score = (1.0 - abs(balance)) * 100.0
        else:
            up_probability = 50.0
            down_probability = 50.0
            balance = 0.0
            conflict_score = 0.0

        # Confidence depends on weighted evidence strength and directional
        # agreement. It is deliberately capped below 100%.
        support_strength = 1.0 - math.exp(-total_support)
        confidence = 50.0 + (
            abs(balance)
            * support_strength
            * 40.0
        )
        confidence = min(90.0, max(50.0, confidence))

        if confidence < 55.0:
            direction = "NO_CLEAR_EDGE"
        elif balance > 0:
            direction = "UP"
        elif balance < 0:
            direction = "DOWN"
        else:
            direction = "NO_CLEAR_EDGE"

        evidence = max(
            evidence_levels,
            key=lambda x: evidence_rank.get(normalize(x), 0),
            default="NONE",
        )

        predictions[horizon] = {
            "direction": direction,
            "confidence": round(confidence, 1),
            "consensus": round(consensus, 1),
            "evidence": normalize(evidence),
            "pattern_count": len(horizon_patterns),
            "up_probability": round(up_probability, 1),
            "down_probability": round(down_probability, 1),
            "conflict_score": round(conflict_score, 1),
        }

    return predictions


# ============================================================
# TECHNICAL SUMMARY
# ============================================================

def build_technical_summary(
    horizon_predictions,
):

    # Higher timeframes receive more influence, but no single horizon can
    # dominate the complete technical score.
    timeframe_weights = {
        "1m": 0.05,
        "5m": 0.08,
        "15m": 0.12,
        "30m": 0.15,
        "1h": 0.18,
        "4h": 0.20,
        "24h": 0.22,
    }

    evidence_weights = {
        "STRONG": 1.00,
        "MODERATE": 0.85,
        "LIMITED": 0.70,
        "WEAK": 0.55,
        "NONE": 0.40,
    }

    bullish_support = 0.0
    bearish_support = 0.0
    active_weight = 0.0

    for horizon, prediction in horizon_predictions.items():

        direction = normalize(
            prediction.get(
                "direction",
                "NO_CLEAR_EDGE",
            )
        )

        confidence = float(
            prediction.get(
                "confidence",
                50.0,
            )
        )

        evidence = normalize(
            prediction.get(
                "evidence",
                "NONE",
            )
        )

        tf_weight = timeframe_weights.get(
            horizon,
            0.10,
        )

        evidence_weight_value = evidence_weights.get(
            evidence,
            0.50,
        )

        # Only confidence above random contributes directional edge.
        confidence_edge = max(
            0.0,
            min(
                1.0,
                (confidence - 50.0) / 40.0,
            ),
        )

        effective_weight = (
            tf_weight
            *
            evidence_weight_value
        )

        active_weight += effective_weight

        support = (
            confidence_edge
            *
            effective_weight
        )

        if direction == "UP":
            bullish_support += support

        elif direction == "DOWN":
            bearish_support += support

    total_directional_support = (
        bullish_support
        +
        bearish_support
    )

    if (
        active_weight <= 0
        or
        total_directional_support <= 0
    ):
        return {
            "bias": "NO_CLEAR_EDGE",
            "confidence": 50.0,
            "bullish_support": 0.0,
            "bearish_support": 0.0,
            "conflict_score": 0.0,
        }

    # Directional balance makes opposing horizons reduce the result.
    directional_balance = (
        bearish_support
        -
        bullish_support
    ) / total_directional_support

    # Strength measures how much reliable evidence exists across all horizons.
    evidence_strength = min(
        1.0,
        total_directional_support
        /
        active_weight,
    )

    conflict_score = (
        1.0
        -
        abs(
            directional_balance
        )
    ) * 100.0

    # Overall technical confidence is deliberately conservative:
    # - directional agreement matters
    # - actual horizon confidence matters
    # - evidence quality matters
    # - conflicting timeframes reduce confidence
    # - hard cap prevents unrealistic 95-100% technical certainty
    confidence_edge = (
        abs(
            directional_balance
        )
        *
        evidence_strength
        *
        35.0
    )

    confidence = (
        50.0
        +
        confidence_edge
    )

    confidence = min(
        85.0,
        max(
            50.0,
            confidence,
        ),
    )

    if confidence < 55.0:
        bias = "NO_CLEAR_EDGE"

    elif directional_balance > 0:
        bias = "BEARISH"

    elif directional_balance < 0:
        bias = "BULLISH"

    else:
        bias = "NO_CLEAR_EDGE"

    return {
        "bias":
            bias,

        "confidence":
            round(
                confidence,
                1,
            ),

        "bullish_support":
            round(
                bullish_support,
                4,
            ),

        "bearish_support":
            round(
                bearish_support,
                4,
            ),

        "conflict_score":
            round(
                conflict_score,
                1,
            ),
    }


# ============================================================
# FUNDAMENTAL SUMMARY
# ============================================================

def build_fundamental_summary(setup):

    fundamental = setup.get(
        "fundamental",
        {},
    )

    if not isinstance(
        fundamental,
        dict,
    ):

        fundamental = {}

    markets = fundamental.get(
        "markets",
        {},
    )

    if not isinstance(
        markets,
        dict,
    ):

        markets = {}

    score = 0.0

    maximum_score = 0.0

    reasons = []

    inputs = {}

    # ========================================================
    # INFLATION
    # ========================================================

    inflation = normalize(
        fundamental.get(
            "inflation_trend",
            "UNKNOWN",
        )
    )

    inputs[
        "inflation_trend"
    ] = inflation

    if inflation not in (
        "",
        "UNKNOWN",
    ):

        maximum_score += 2.0

        if inflation == "COOLING":

            score += 2.0

            reasons.append(
                "Cooling inflation may support easier Fed policy."
            )

        elif inflation == "RISING":

            score -= 2.0

            reasons.append(
                "Rising inflation may keep Fed policy restrictive."
            )

    # ========================================================
    # LABOR MARKET
    # ========================================================

    labor = normalize(
        fundamental.get(
            "labor_market",
            "UNKNOWN",
        )
    )

    inputs[
        "labor_market"
    ] = labor

    if labor not in (
        "",
        "UNKNOWN",
    ):

        maximum_score += 2.0

        if labor == "WEAKENING":

            score += 2.0

            reasons.append(
                "Weakening labor conditions may support lower rates."
            )

        elif labor == "STRONG":

            score -= 2.0

            reasons.append(
                "Strong labor conditions may support higher rates."
            )

    # ========================================================
    # DXY
    # ========================================================

    dxy = markets.get(
        "dxy",
        {},
    )

    if not isinstance(
        dxy,
        dict,
    ):

        dxy = {}

    dxy_direction = normalize(
        dxy.get(
            "direction",
            fundamental.get(
                "dollar_bias",
                "UNKNOWN",
            ),
        )
    )

    inputs[
        "dxy_direction"
    ] = dxy_direction

    inputs[
        "dxy_value"
    ] = dxy.get(
        "value"
    )

    if dxy_direction not in (
        "",
        "UNKNOWN",
    ):

        maximum_score += 3.0

        if dxy_direction == "FALLING":

            score += 3.0

            reasons.append(
                "Falling US dollar supports gold."
            )

        elif dxy_direction == "RISING":

            score -= 3.0

            reasons.append(
                "Rising US dollar pressures gold."
            )

    # ========================================================
    # US10Y
    # ========================================================

    us10y = markets.get(
        "us10y",
        {},
    )

    if not isinstance(
        us10y,
        dict,
    ):

        us10y = {}

    yield_direction = normalize(
        us10y.get(
            "direction",
            fundamental.get(
                "treasury_yields",
                "UNKNOWN",
            ),
        )
    )

    inputs[
        "us10y_direction"
    ] = yield_direction

    inputs[
        "us10y_value"
    ] = us10y.get(
        "value"
    )

    if yield_direction not in (
        "",
        "UNKNOWN",
    ):

        maximum_score += 3.0

        if yield_direction == "FALLING":

            score += 3.0

            reasons.append(
                "Falling Treasury yields support gold."
            )

        elif yield_direction == "RISING":

            score -= 3.0

            reasons.append(
                "Rising Treasury yields pressure gold."
            )

    # ========================================================
    # NO DATA
    # ========================================================

    if maximum_score <= 0:

        return {

            "bias":
                "NO_CLEAR_EDGE",

            "confidence":
                50.0,

            "score":
                0.0,

            "maximum_score":
                0.0,

            "reasons": [
                "Insufficient live fundamental data."
            ],

            "inputs":
                inputs,

        }

    # ========================================================
    # FINAL FUNDAMENTAL SCORE
    # ========================================================

    normalized_score = (
        score
        /
        maximum_score
    )

    if normalized_score >= 0.20:

        bias = "BULLISH"

    elif normalized_score <= -0.20:

        bias = "BEARISH"

    else:

        bias = (
            "NO_CLEAR_EDGE"
        )

    confidence = (

        50.0

        +

        abs(
            normalized_score
        )

        *

        45.0

    )

    confidence = min(
        95.0,
        confidence,
    )

    return {

        "bias":
            bias,

        "confidence":
            round(
                confidence,
                1,
            ),

        "score":
            round(
                score,
                2,
            ),

        "maximum_score":
            round(
                maximum_score,
                2,
            ),

        "reasons":
            reasons,

        "inputs":
            inputs,

    }


# ============================================================
# SIGNED BIAS SCORE
# ============================================================

def signed_bias_score(
    bias,
    confidence,
):

    bias = normalize(
        bias
    )

    try:

        confidence = float(
            confidence
        )

    except (
        TypeError,
        ValueError,
    ):

        confidence = 50.0

    edge = max(
        0.0,
        confidence
        -
        50.0,
    )

    if bias in (
        "BULLISH",
        "UP",
    ):

        return edge

    if bias in (
        "BEARISH",
        "DOWN",
    ):

        return -edge

    return 0.0


# ============================================================
# EDGE X COMBINED PREDICTION
# ============================================================

def build_edge_x_prediction(
    technical_summary,
    fundamental_summary,
):

    technical_bias = technical_summary.get(
        "bias",
        "NO_CLEAR_EDGE",
    )

    technical_confidence = technical_summary.get(
        "confidence",
        50.0,
    )

    fundamental_bias = fundamental_summary.get(
        "bias",
        "NO_CLEAR_EDGE",
    )

    fundamental_confidence = fundamental_summary.get(
        "confidence",
        50.0,
    )

    technical_score = (

        signed_bias_score(
            technical_bias,
            technical_confidence,
        )

        *

        0.60

    )

    fundamental_score = (

        signed_bias_score(
            fundamental_bias,
            fundamental_confidence,
        )

        *

        0.40

    )

    combined_score = (
        technical_score
        +
        fundamental_score
    )

    if combined_score > 2.0:

        bias = "BULLISH"

    elif combined_score < -2.0:

        bias = "BEARISH"

    else:

        bias = (
            "NO_CLEAR_EDGE"
        )

    confidence = min(

        95.0,

        50.0

        +

        abs(
            combined_score
        ),

    )

    if (
        technical_bias
        ==
        fundamental_bias

        and

        technical_bias
        !=
        "NO_CLEAR_EDGE"
    ):

        alignment = "ALIGNED"

    elif (
        technical_bias
        ==
        "NO_CLEAR_EDGE"

        or

        fundamental_bias
        ==
        "NO_CLEAR_EDGE"
    ):

        alignment = "PARTIAL"

    else:

        alignment = "CONFLICTING"

    return {

        "bias":
            bias,

        "confidence":
            round(
                confidence,
                1,
            ),

        "technical_bias":
            technical_bias,

        "technical_confidence":
            technical_confidence,

        "fundamental_bias":
            fundamental_bias,

        "fundamental_confidence":
            fundamental_confidence,

        "technical_weight":
            60,

        "fundamental_weight":
            40,

        "alignment":
            alignment,

        "combined_score":
            round(
                combined_score,
                2,
            ),

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
        "UPCOMING EVENT INTELLIGENCE V6.2"
    )

    print(
        "=" * 65
    )

    # ========================================================
    # LOAD SETUP
    # ========================================================

    setup = load_json(
        SETUP_FILE
    )

    if not setup:

        print(
            "Current setup not available."
        )

        return

    # ========================================================
    # LOAD PATTERNS
    # ========================================================

    pattern_data = load_json(
        PATTERN_FILE
    )

    if not pattern_data:

        print(
            "Pattern intelligence not available."
        )

        return

    patterns = get_patterns(
        pattern_data
    )

    print()

    print(
        "Patterns loaded:",
        len(
            patterns
        ),
    )

    # ========================================================
    # CURRENT CONDITIONS
    # ========================================================

    current_conditions = get_current_conditions(
        setup
    )

    print()

    print(
        "CURRENT CONDITIONS"
    )

    print(
        "-" * 65
    )

    for condition in current_conditions:

        print(
            condition
        )

    # ========================================================
    # MATCH PATTERNS
    # ========================================================

    matched_patterns = find_matched_patterns(
        patterns,
        current_conditions,
    )

    print()

    print(
        "MATCHED PATTERNS:",
        len(
            matched_patterns
        ),
    )

    # ========================================================
    # HORIZONS
    # ========================================================

    horizon_predictions = build_horizon_predictions(
        matched_patterns
    )

    # ========================================================
    # TECHNICAL
    # ========================================================

    technical_summary = build_technical_summary(
        horizon_predictions,
    )

    # ========================================================
    # FUNDAMENTAL
    # ========================================================

    fundamental_summary = build_fundamental_summary(
        setup
    )

    # ========================================================
    # COMBINED
    # ========================================================

    edge_x_prediction = build_edge_x_prediction(
        technical_summary,
        fundamental_summary,
    )

    # ========================================================
    # OUTPUT
    # ========================================================

    output = {

        "category":
            CATEGORY,

        "generated_at_utc":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "current_conditions":
            current_conditions,

        "matched_pattern_count":
            len(
                matched_patterns
            ),

        "matched_patterns":
            matched_patterns,

        "horizon_predictions":
            horizon_predictions,

        "technical_summary":
            technical_summary,

        "fundamental_summary":
            fundamental_summary,

        "edge_x_prediction":
            edge_x_prediction,

        "technical_intelligence": {

            "available":
                len(
                    matched_patterns
                ) > 0,

            "matched_pattern_count":
                len(
                    matched_patterns
                ),

            "patterns":
                matched_patterns,

            "horizons":
                horizon_predictions,

        },

        "methodology": {

            "technical_weight":
                60,

            "fundamental_weight":
                40,

        },

    }

    # ========================================================
    # SAVE
    # ========================================================

    save_json(
        OUTPUT_FILE,
        output,
    )

    # ========================================================
    # PRINT RESULTS
    # ========================================================

    print()

    print(
        "=" * 65
    )

    print(
        "TECHNICAL"
    )

    print(
        "=" * 65
    )

    print(

        technical_summary[
            "bias"
        ],

        technical_summary[
            "confidence"
        ],

    )

    print()

    print(

        "Historical Matches:",

        technical_summary[
            "historical_matches"
        ],

    )

    print()

    print(
        "=" * 65
    )

    print(
        "FUNDAMENTAL"
    )

    print(
        "=" * 65
    )

    print(

        fundamental_summary[
            "bias"
        ],

        fundamental_summary[
            "confidence"
        ],

    )

    print()

    print(

        "Score:",

        fundamental_summary[
            "score"
        ],

        "/",

        fundamental_summary[
            "maximum_score"
        ],

    )

    print()

    print(
        "INPUTS"
    )

    for (
        key,
        value,
    ) in fundamental_summary.get(
        "inputs",
        {},
    ).items():

        print(
            f"{key} = {value}"
        )

    print()

    print(
        "REASONS"
    )

    for reason in fundamental_summary.get(
        "reasons",
        [],
    ):

        print(
            "-",
            reason,
        )

    print()

    print(
        "=" * 65
    )

    print(
        "EDGE X COMBINED PREDICTION"
    )

    print(
        "=" * 65
    )

    print(

        edge_x_prediction[
            "bias"
        ],

        edge_x_prediction[
            "confidence"
        ],

    )

    print()

    print(

        "Technical:",

        edge_x_prediction[
            "technical_bias"
        ],

        edge_x_prediction[
            "technical_confidence"
        ],

    )

    print(

        "Fundamental:",

        edge_x_prediction[
            "fundamental_bias"
        ],

        edge_x_prediction[
            "fundamental_confidence"
        ],

    )

    print()

    print(

        "ALIGNMENT:",

        edge_x_prediction[
            "alignment"
        ],

    )

    # ========================================================
    # HORIZON RESULTS
    # ========================================================

    print()

    print(
        "HORIZON PREDICTIONS"
    )

    print(
        "-" * 65
    )

    for horizon in HORIZONS:

        prediction = horizon_predictions[
            horizon
        ]

        print(

            f"{horizon} : "
            f"{prediction['direction']} | "
            f"Consensus: {prediction['consensus']} % | "
            f"Confidence: {prediction['confidence']} % | "
            f"Evidence: "
            f"{prediction['evidence']} | "
            f"Patterns: "
            f"{prediction['pattern_count']}"

        )

    print()

    print(
        "Saved:"
    )

    print(
        OUTPUT_FILE
    )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    main()import json
import math
from datetime import datetime, timezone
from pathlib import Path


# ============================================================
# EDGE X PRO
# UPCOMING EVENT INTELLIGENCE V6.2
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
CATEGORY = "fomc"

SETUP_FILE = (
    BASE_DIR
    / "data"
    / CATEGORY
    / "context"
    / "current_setup.json"
)

PATTERN_FILE = (
    BASE_DIR
    / "data"
    / "pattern-intelligence"
    / "fed_gold_patterns.json"
)

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / CATEGORY
    / "context"
    / "upcoming_intelligence.json"
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


# ============================================================
# JSON HELPERS
# ============================================================

def load_json(path):

    if not path.exists():
        print(f"Missing file: {path}")
        return {}

    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)

        if isinstance(data, dict):
            return data

        print(f"Invalid JSON structure: {path}")

    except Exception as error:
        print(f"Failed to load: {path}")
        print(error)

    return {}


def save_json(path, data):

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(path, "w", encoding="utf-8") as file:

        json.dump(
            data,
            file,
            indent=2,
        )


def normalize(value):

    if value is None:
        return ""

    return str(value).strip().upper()


# ============================================================
# CURRENT CONDITIONS
#
# Your actual structure is:
#
# setup
#   └── technical
#         ├── day_direction
#         ├── timeframes
#         │     ├── 15m
#         │     ├── 30m
#         │     ├── 1h
#         │     └── 4h
#         └── liquidity
#
# Historical pattern format:
#
# DAY_DIRECTION=UP
# PRE_15M=UP
# PRE_30M=DOWN
# PRE_1H=DOWN
# PRE_4H=UP
# ============================================================

def get_current_conditions(setup):

    conditions = []

    # ========================================================
    # GET TECHNICAL OBJECT
    # ========================================================

    technical = setup.get(
        "technical",
        {},
    )

    if not isinstance(
        technical,
        dict,
    ):
        technical = {}

    # ========================================================
    # DAY DIRECTION
    # ========================================================

    day_direction = normalize(
        technical.get(
            "day_direction",
            "",
        )
    )

    # Fallback to day_context

    if day_direction not in (
        "UP",
        "DOWN",
    ):

        day_context = technical.get(
            "day_context",
            {},
        )

        if isinstance(
            day_context,
            dict,
        ):

            day_direction = normalize(
                day_context.get(
                    "day_direction",
                    "",
                )
            )

    if day_direction in (
        "UP",
        "DOWN",
    ):

        conditions.append(
            f"DAY_DIRECTION={day_direction}"
        )

    # ========================================================
    # TIMEFRAMES
    # ========================================================

    timeframes = technical.get(
        "timeframes",
        {},
    )

    if not isinstance(
        timeframes,
        dict,
    ):
        timeframes = {}

    timeframe_details = technical.get(
        "timeframe_details",
        {},
    )

    if not isinstance(
        timeframe_details,
        dict,
    ):
        timeframe_details = {}

    timeframe_mapping = {

        "15m": "PRE_15M",

        "30m": "PRE_30M",

        "1h": "PRE_1H",

        "4h": "PRE_4H",

    }

    for (
        timeframe,
        pattern_key,
    ) in timeframe_mapping.items():

        direction = ""

        # ----------------------------------------------------
        # PRIMARY SOURCE
        #
        # technical.timeframes
        # ----------------------------------------------------

        timeframe_value = timeframes.get(
            timeframe
        )

        if isinstance(
            timeframe_value,
            str,
        ):

            direction = normalize(
                timeframe_value
            )

        elif isinstance(
            timeframe_value,
            dict,
        ):

            direction = normalize(
                timeframe_value.get(
                    "direction",
                    "",
                )
            )

        # ----------------------------------------------------
        # FALLBACK SOURCE
        #
        # technical.timeframe_details
        # ----------------------------------------------------

        if direction not in (
            "UP",
            "DOWN",
        ):

            detail = timeframe_details.get(
                timeframe,
                {},
            )

            if isinstance(
                detail,
                dict,
            ):

                direction = normalize(
                    detail.get(
                        "direction",
                        "",
                    )
                )

        # ----------------------------------------------------
        # ADD PATTERN CONDITION
        # ----------------------------------------------------

        if direction in (
            "UP",
            "DOWN",
        ):

            conditions.append(
                f"{pattern_key}={direction}"
            )

    # ========================================================
    # LIQUIDITY
    # ========================================================

    liquidity = technical.get(
        "liquidity",
        {},
    )

    if isinstance(
        liquidity,
        dict,
    ):

        sequence = normalize(
            liquidity.get(
                "sequence",
                "",
            )
        )

        if sequence:

            conditions.append(
                f"LIQUIDITY_SEQUENCE={sequence}"
            )

    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    return list(
        dict.fromkeys(
            conditions
        )
    )


# ============================================================
# CONDITION MATCH
# ============================================================

def condition_matches(
    pattern_condition,
    current_conditions,
):

    pattern_condition = normalize(
        pattern_condition
    )

    normalized_current = {

        normalize(
            condition
        )

        for condition
        in current_conditions

    }

    return (
        pattern_condition
        in
        normalized_current
    )


# ============================================================
# CALCULATE PATTERN MATCH
# ============================================================

def calculate_pattern_match(
    pattern,
    current_conditions,
):

    pattern_conditions = pattern.get(
        "conditions",
        [],
    )

    if not isinstance(
        pattern_conditions,
        list,
    ):

        return 0, 0, 0.0

    if not pattern_conditions:

        return 0, 0, 0.0

    matched = 0

    for condition in pattern_conditions:

        if condition_matches(
            condition,
            current_conditions,
        ):

            matched += 1

    total = len(
        pattern_conditions
    )

    ratio = (
        matched
        /
        total
    )

    return (
        matched,
        total,
        ratio,
    )


# ============================================================
# EVIDENCE WEIGHT
# ============================================================

def evidence_weight(evidence):
    evidence = normalize(evidence)
    return {
        "STRONG": 1.00,
        "MODERATE": 0.75,
        "LIMITED": 0.50,
        "WEAK": 0.30,
        "NONE": 0.15,
    }.get(evidence, 0.40)


def sample_reliability(sample_size):
    try:
        n = max(0, int(sample_size))
    except (TypeError, ValueError):
        n = 0
    if n <= 0:
        return 0.10
    return min(1.0, math.sqrt(n / 25.0))


def specificity_weight(condition_count, match_ratio):
    if condition_count <= 1:
        base = 0.85
    elif condition_count == 2:
        base = 0.95
    elif condition_count == 3:
        base = 1.00
    else:
        base = 1.05
    return base * (match_ratio ** 2)


def pattern_signature(pattern):
    conditions = tuple(sorted(
        normalize(c) for c in pattern.get("conditions", [])
    ))
    return (
        str(pattern.get("horizon", "")).strip(),
        normalize(pattern.get("direction", "")),
        conditions,
    )


def deduplicate_correlated_patterns(patterns):
    best = {}
    for pattern in patterns:
        signature = pattern_signature(pattern)
        quality = (
            float(pattern.get("match_ratio", 0.0)),
            float(pattern.get("weight", 0.0)),
            int(pattern.get("sample_size", 0)),
        )
        existing = best.get(signature)
        if existing is None:
            best[signature] = pattern
            continue
        existing_quality = (
            float(existing.get("match_ratio", 0.0)),
            float(existing.get("weight", 0.0)),
            int(existing.get("sample_size", 0)),
        )
        if quality > existing_quality:
            best[signature] = pattern
    return list(best.values())


# ============================================================
# GET PATTERNS
# ============================================================

def get_patterns(pattern_data):

    patterns = pattern_data.get(
        "top_patterns",
        [],
    )

    if isinstance(
        patterns,
        list,
    ):

        return patterns

    return []


# ============================================================
# FIND MATCHED PATTERNS
# ============================================================

def find_matched_patterns(
    patterns,
    current_conditions,
):

    matched_patterns = []

    for pattern in patterns:

        if not isinstance(
            pattern,
            dict,
        ):
            continue

        (
            matched_count,
            condition_count,
            match_ratio,
        ) = calculate_pattern_match(
            pattern,
            current_conditions,
        )

        if condition_count <= 0:
            continue

        # ====================================================
        # MATCH RULE
        #
        # Single-condition pattern:
        # Must match exactly.
        #
        # Multi-condition pattern:
        # At least 50% must match.
        # ====================================================

        if condition_count == 1:

            minimum_match = 1.0

        else:

            minimum_match = 0.50

        if match_ratio < minimum_match:
            continue

        direction = normalize(
            pattern.get(
                "dominant_direction",
                "",
            )
        )

        if direction not in (
            "UP",
            "DOWN",
        ):
            continue

        # ====================================================
        # PROBABILITY
        # ====================================================

        try:

            probability = float(
                pattern.get(
                    "dominant_probability",
                    50.0,
                )
            )

        except (
            TypeError,
            ValueError,
        ):

            probability = 50.0

        # ====================================================
        # SAMPLE SIZE
        # ====================================================

        try:

            sample_size = int(
                pattern.get(
                    "sample_size",
                    0,
                )
            )

        except (
            TypeError,
            ValueError,
        ):

            sample_size = 0

        # ====================================================
        # HORIZON
        # ====================================================

        horizon = str(
            pattern.get(
                "horizon",
                "",
            )
        ).strip()

        if horizon not in HORIZONS:
            continue

        # ====================================================
        # EVIDENCE
        # ====================================================

        evidence = normalize(
            pattern.get(
                "evidence_strength",
                "NONE",
            )
        )

        # ====================================================
        # PATTERN WEIGHT
        # ====================================================

        probability_edge = max(
            0.0,
            (
                probability
                -
                50.0
            )
            /
            50.0,
        )

        sample_weight = sample_reliability(sample_size)

        specificity = specificity_weight(
            condition_count,
            match_ratio,
        )

        weight = (
            max(0.05, probability_edge)
            * evidence_weight(evidence)
            * sample_weight
            * specificity
        )

        matched_patterns.append({

            "horizon":
                horizon,

            "direction":
                direction,

            "probability":
                probability,

            "sample_size":
                sample_size,

            "evidence_strength":
                evidence,

            "matched_conditions":
                matched_count,

            "condition_count":
                condition_count,

            "match_ratio":
                round(
                    match_ratio,
                    3,
                ),

            "weight":
                round(
                    weight,
                    6,
                ),

            "conditions":
                pattern.get(
                    "conditions",
                    [],
                ),

            "readable_conditions":
                pattern.get(
                    "readable_conditions",
                    [],
                ),

            "summary":
                pattern.get(
                    "summary",
                    "",
                ),

            "pattern_score":
                pattern.get(
                    "pattern_score",
                    0,
                ),

            "average_move_usd":
                pattern.get(
                    "average_move_usd"
                ),

            "median_move_usd":
                pattern.get(
                    "median_move_usd"
                ),

            "average_max_up_usd":
                pattern.get(
                    "average_max_up_usd"
                ),

            "average_max_down_usd":
                pattern.get(
                    "average_max_down_usd"
                ),

        })

    matched_patterns = deduplicate_correlated_patterns(
        matched_patterns
    )

    # Highest-quality matches first

    matched_patterns.sort(

        key=lambda item: (

            item.get(
                "match_ratio",
                0,
            ),

            item.get(
                "weight",
                0,
            ),

            item.get(
                "sample_size",
                0,
            ),

        ),

        reverse=True,

    )

    return matched_patterns


# ============================================================
# BUILD HORIZON PREDICTIONS
# ============================================================

def build_horizon_predictions(matched_patterns):

    predictions = {}
    evidence_rank = {
        "NONE": 0,
        "WEAK": 1,
        "LIMITED": 2,
        "MODERATE": 3,
        "STRONG": 4,
    }

    for horizon in HORIZONS:

        horizon_patterns = [
            p for p in matched_patterns
            if p.get("horizon") == horizon
        ]

        if not horizon_patterns:
            predictions[horizon] = {
                "direction": "NO_CLEAR_EDGE",
                "confidence": 50.0,
                "consensus": 50.0,
                "evidence": "NONE",
                "pattern_count": 0,
                "up_probability": 50.0,
                "down_probability": 50.0,
                "conflict_score": 0.0,
            }
            continue

        up_support = 0.0
        down_support = 0.0
        up_votes = 0
        down_votes = 0
        evidence_levels = []

        for pattern in horizon_patterns:
            probability = float(pattern.get("probability", 50.0))
            weight = float(pattern.get("weight", 0.0))
            direction = pattern.get("direction")

            edge = max(
                0.0,
                min(1.0, (probability - 50.0) / 50.0),
            )
            support = edge * weight

            if direction == "UP":
                up_support += support
                up_votes += 1
            elif direction == "DOWN":
                down_support += support
                down_votes += 1

            evidence_levels.append(
                pattern.get("evidence_strength", "NONE")
            )

        # Raw pattern agreement: separate from model confidence.
        total_votes = up_votes + down_votes
        consensus = (
            max(up_votes, down_votes) / total_votes * 100.0
            if total_votes > 0 else 50.0
        )

        total_support = up_support + down_support

        if total_support > 0:
            up_probability = up_support / total_support * 100.0
            down_probability = 100.0 - up_probability
            balance = (up_support - down_support) / total_support
            conflict_score = (1.0 - abs(balance)) * 100.0
        else:
            up_probability = 50.0
            down_probability = 50.0
            balance = 0.0
            conflict_score = 0.0

        # Confidence depends on weighted evidence strength and directional
        # agreement. It is deliberately capped below 100%.
        support_strength = 1.0 - math.exp(-total_support)
        confidence = 50.0 + (
            abs(balance)
            * support_strength
            * 40.0
        )
        confidence = min(90.0, max(50.0, confidence))

        if confidence < 55.0:
            direction = "NO_CLEAR_EDGE"
        elif balance > 0:
            direction = "UP"
        elif balance < 0:
            direction = "DOWN"
        else:
            direction = "NO_CLEAR_EDGE"

        evidence = max(
            evidence_levels,
            key=lambda x: evidence_rank.get(normalize(x), 0),
            default="NONE",
        )

        predictions[horizon] = {
            "direction": direction,
            "confidence": round(confidence, 1),
            "consensus": round(consensus, 1),
            "evidence": normalize(evidence),
            "pattern_count": len(horizon_patterns),
            "up_probability": round(up_probability, 1),
            "down_probability": round(down_probability, 1),
            "conflict_score": round(conflict_score, 1),
        }

    return predictions


# ============================================================
# TECHNICAL SUMMARY
# ============================================================

def build_technical_summary(
    horizon_predictions,
):

    # Higher timeframes receive more influence, but no single horizon can
    # dominate the complete technical score.
    timeframe_weights = {
        "1m": 0.05,
        "5m": 0.08,
        "15m": 0.12,
        "30m": 0.15,
        "1h": 0.18,
        "4h": 0.20,
        "24h": 0.22,
    }

    evidence_weights = {
        "STRONG": 1.00,
        "MODERATE": 0.85,
        "LIMITED": 0.70,
        "WEAK": 0.55,
        "NONE": 0.40,
    }

    bullish_support = 0.0
    bearish_support = 0.0
    active_weight = 0.0

    for horizon, prediction in horizon_predictions.items():

        direction = normalize(
            prediction.get(
                "direction",
                "NO_CLEAR_EDGE",
            )
        )

        confidence = float(
            prediction.get(
                "confidence",
                50.0,
            )
        )

        evidence = normalize(
            prediction.get(
                "evidence",
                "NONE",
            )
        )

        tf_weight = timeframe_weights.get(
            horizon,
            0.10,
        )

        evidence_weight_value = evidence_weights.get(
            evidence,
            0.50,
        )

        # Only confidence above random contributes directional edge.
        confidence_edge = max(
            0.0,
            min(
                1.0,
                (confidence - 50.0) / 40.0,
            ),
        )

        effective_weight = (
            tf_weight
            *
            evidence_weight_value
        )

        active_weight += effective_weight

        support = (
            confidence_edge
            *
            effective_weight
        )

        if direction == "UP":
            bullish_support += support

        elif direction == "DOWN":
            bearish_support += support

    total_directional_support = (
        bullish_support
        +
        bearish_support
    )

    if (
        active_weight <= 0
        or
        total_directional_support <= 0
    ):
        return {
            "bias": "NO_CLEAR_EDGE",
            "confidence": 50.0,
            "bullish_support": 0.0,
            "bearish_support": 0.0,
            "conflict_score": 0.0,
        }

    # Directional balance makes opposing horizons reduce the result.
    directional_balance = (
        bearish_support
        -
        bullish_support
    ) / total_directional_support

    # Strength measures how much reliable evidence exists across all horizons.
    evidence_strength = min(
        1.0,
        total_directional_support
        /
        active_weight,
    )

    conflict_score = (
        1.0
        -
        abs(
            directional_balance
        )
    ) * 100.0

    # Overall technical confidence is deliberately conservative:
    # - directional agreement matters
    # - actual horizon confidence matters
    # - evidence quality matters
    # - conflicting timeframes reduce confidence
    # - hard cap prevents unrealistic 95-100% technical certainty
    confidence_edge = (
        abs(
            directional_balance
        )
        *
        evidence_strength
        *
        35.0
    )

    confidence = (
        50.0
        +
        confidence_edge
    )

    confidence = min(
        85.0,
        max(
            50.0,
            confidence,
        ),
    )

    if confidence < 55.0:
        bias = "NO_CLEAR_EDGE"

    elif directional_balance > 0:
        bias = "BEARISH"

    elif directional_balance < 0:
        bias = "BULLISH"

    else:
        bias = "NO_CLEAR_EDGE"

    return {
        "bias":
            bias,

        "confidence":
            round(
                confidence,
                1,
            ),

        "bullish_support":
            round(
                bullish_support,
                4,
            ),

        "bearish_support":
            round(
                bearish_support,
                4,
            ),

        "conflict_score":
            round(
                conflict_score,
                1,
            ),
    }


# ============================================================
# FUNDAMENTAL SUMMARY
# ============================================================

def build_fundamental_summary(setup):

    fundamental = setup.get(
        "fundamental",
        {},
    )

    if not isinstance(
        fundamental,
        dict,
    ):

        fundamental = {}

    markets = fundamental.get(
        "markets",
        {},
    )

    if not isinstance(
        markets,
        dict,
    ):

        markets = {}

    score = 0.0

    maximum_score = 0.0

    reasons = []

    inputs = {}

    # ========================================================
    # INFLATION
    # ========================================================

    inflation = normalize(
        fundamental.get(
            "inflation_trend",
            "UNKNOWN",
        )
    )

    inputs[
        "inflation_trend"
    ] = inflation

    if inflation not in (
        "",
        "UNKNOWN",
    ):

        maximum_score += 2.0

        if inflation == "COOLING":

            score += 2.0

            reasons.append(
                "Cooling inflation may support easier Fed policy."
            )

        elif inflation == "RISING":

            score -= 2.0

            reasons.append(
                "Rising inflation may keep Fed policy restrictive."
            )

    # ========================================================
    # LABOR MARKET
    # ========================================================

    labor = normalize(
        fundamental.get(
            "labor_market",
            "UNKNOWN",
        )
    )

    inputs[
        "labor_market"
    ] = labor

    if labor not in (
        "",
        "UNKNOWN",
    ):

        maximum_score += 2.0

        if labor == "WEAKENING":

            score += 2.0

            reasons.append(
                "Weakening labor conditions may support lower rates."
            )

        elif labor == "STRONG":

            score -= 2.0

            reasons.append(
                "Strong labor conditions may support higher rates."
            )

    # ========================================================
    # DXY
    # ========================================================

    dxy = markets.get(
        "dxy",
        {},
    )

    if not isinstance(
        dxy,
        dict,
    ):

        dxy = {}

    dxy_direction = normalize(
        dxy.get(
            "direction",
            fundamental.get(
                "dollar_bias",
                "UNKNOWN",
            ),
        )
    )

    inputs[
        "dxy_direction"
    ] = dxy_direction

    inputs[
        "dxy_value"
    ] = dxy.get(
        "value"
    )

    if dxy_direction not in (
        "",
        "UNKNOWN",
    ):

        maximum_score += 3.0

        if dxy_direction == "FALLING":

            score += 3.0

            reasons.append(
                "Falling US dollar supports gold."
            )

        elif dxy_direction == "RISING":

            score -= 3.0

            reasons.append(
                "Rising US dollar pressures gold."
            )

    # ========================================================
    # US10Y
    # ========================================================

    us10y = markets.get(
        "us10y",
        {},
    )

    if not isinstance(
        us10y,
        dict,
    ):

        us10y = {}

    yield_direction = normalize(
        us10y.get(
            "direction",
            fundamental.get(
                "treasury_yields",
                "UNKNOWN",
            ),
        )
    )

    inputs[
        "us10y_direction"
    ] = yield_direction

    inputs[
        "us10y_value"
    ] = us10y.get(
        "value"
    )

    if yield_direction not in (
        "",
        "UNKNOWN",
    ):

        maximum_score += 3.0

        if yield_direction == "FALLING":

            score += 3.0

            reasons.append(
                "Falling Treasury yields support gold."
            )

        elif yield_direction == "RISING":

            score -= 3.0

            reasons.append(
                "Rising Treasury yields pressure gold."
            )

    # ========================================================
    # NO DATA
    # ========================================================

    if maximum_score <= 0:

        return {

            "bias":
                "NO_CLEAR_EDGE",

            "confidence":
                50.0,

            "score":
                0.0,

            "maximum_score":
                0.0,

            "reasons": [
                "Insufficient live fundamental data."
            ],

            "inputs":
                inputs,

        }

    # ========================================================
    # FINAL FUNDAMENTAL SCORE
    # ========================================================

    normalized_score = (
        score
        /
        maximum_score
    )

    if normalized_score >= 0.20:

        bias = "BULLISH"

    elif normalized_score <= -0.20:

        bias = "BEARISH"

    else:

        bias = (
            "NO_CLEAR_EDGE"
        )

    confidence = (

        50.0

        +

        abs(
            normalized_score
        )

        *

        45.0

    )

    confidence = min(
        95.0,
        confidence,
    )

    return {

        "bias":
            bias,

        "confidence":
            round(
                confidence,
                1,
            ),

        "score":
            round(
                score,
                2,
            ),

        "maximum_score":
            round(
                maximum_score,
                2,
            ),

        "reasons":
            reasons,

        "inputs":
            inputs,

    }


# ============================================================
# SIGNED BIAS SCORE
# ============================================================

def signed_bias_score(
    bias,
    confidence,
):

    bias = normalize(
        bias
    )

    try:

        confidence = float(
            confidence
        )

    except (
        TypeError,
        ValueError,
    ):

        confidence = 50.0

    edge = max(
        0.0,
        confidence
        -
        50.0,
    )

    if bias in (
        "BULLISH",
        "UP",
    ):

        return edge

    if bias in (
        "BEARISH",
        "DOWN",
    ):

        return -edge

    return 0.0


# ============================================================
# EDGE X COMBINED PREDICTION
# ============================================================

def build_edge_x_prediction(
    technical_summary,
    fundamental_summary,
):

    technical_bias = technical_summary.get(
        "bias",
        "NO_CLEAR_EDGE",
    )

    technical_confidence = technical_summary.get(
        "confidence",
        50.0,
    )

    fundamental_bias = fundamental_summary.get(
        "bias",
        "NO_CLEAR_EDGE",
    )

    fundamental_confidence = fundamental_summary.get(
        "confidence",
        50.0,
    )

    technical_score = (

        signed_bias_score(
            technical_bias,
            technical_confidence,
        )

        *

        0.60

    )

    fundamental_score = (

        signed_bias_score(
            fundamental_bias,
            fundamental_confidence,
        )

        *

        0.40

    )

    combined_score = (
        technical_score
        +
        fundamental_score
    )

    if combined_score > 2.0:

        bias = "BULLISH"

    elif combined_score < -2.0:

        bias = "BEARISH"

    else:

        bias = (
            "NO_CLEAR_EDGE"
        )

    confidence = min(

        95.0,

        50.0

        +

        abs(
            combined_score
        ),

    )

    if (
        technical_bias
        ==
        fundamental_bias

        and

        technical_bias
        !=
        "NO_CLEAR_EDGE"
    ):

        alignment = "ALIGNED"

    elif (
        technical_bias
        ==
        "NO_CLEAR_EDGE"

        or

        fundamental_bias
        ==
        "NO_CLEAR_EDGE"
    ):

        alignment = "PARTIAL"

    else:

        alignment = "CONFLICTING"

    return {

        "bias":
            bias,

        "confidence":
            round(
                confidence,
                1,
            ),

        "technical_bias":
            technical_bias,

        "technical_confidence":
            technical_confidence,

        "fundamental_bias":
            fundamental_bias,

        "fundamental_confidence":
            fundamental_confidence,

        "technical_weight":
            60,

        "fundamental_weight":
            40,

        "alignment":
            alignment,

        "combined_score":
            round(
                combined_score,
                2,
            ),

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
        "UPCOMING EVENT INTELLIGENCE V6.2"
    )

    print(
        "=" * 65
    )

    # ========================================================
    # LOAD SETUP
    # ========================================================

    setup = load_json(
        SETUP_FILE
    )

    if not setup:

        print(
            "Current setup not available."
        )

        return

    # ========================================================
    # LOAD PATTERNS
    # ========================================================

    pattern_data = load_json(
        PATTERN_FILE
    )

    if not pattern_data:

        print(
            "Pattern intelligence not available."
        )

        return

    patterns = get_patterns(
        pattern_data
    )

    print()

    print(
        "Patterns loaded:",
        len(
            patterns
        ),
    )

    # ========================================================
    # CURRENT CONDITIONS
    # ========================================================

    current_conditions = get_current_conditions(
        setup
    )

    print()

    print(
        "CURRENT CONDITIONS"
    )

    print(
        "-" * 65
    )

    for condition in current_conditions:

        print(
            condition
        )

    # ========================================================
    # MATCH PATTERNS
    # ========================================================

    matched_patterns = find_matched_patterns(
        patterns,
        current_conditions,
    )

    print()

    print(
        "MATCHED PATTERNS:",
        len(
            matched_patterns
        ),
    )

    # ========================================================
    # HORIZONS
    # ========================================================

    horizon_predictions = build_horizon_predictions(
        matched_patterns
    )

    # ========================================================
    # TECHNICAL
    # ========================================================

    technical_summary = build_technical_summary(
        horizon_predictions,
    )

    # ========================================================
    # FUNDAMENTAL
    # ========================================================

    fundamental_summary = build_fundamental_summary(
        setup
    )

    # ========================================================
    # COMBINED
    # ========================================================

    edge_x_prediction = build_edge_x_prediction(
        technical_summary,
        fundamental_summary,
    )

    # ========================================================
    # OUTPUT
    # ========================================================

    output = {

        "category":
            CATEGORY,

        "generated_at_utc":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "current_conditions":
            current_conditions,

        "matched_pattern_count":
            len(
                matched_patterns
            ),

        "matched_patterns":
            matched_patterns,

        "horizon_predictions":
            horizon_predictions,

        "technical_summary":
            technical_summary,

        "fundamental_summary":
            fundamental_summary,

        "edge_x_prediction":
            edge_x_prediction,

        "technical_intelligence": {

            "available":
                len(
                    matched_patterns
                ) > 0,

            "matched_pattern_count":
                len(
                    matched_patterns
                ),

            "patterns":
                matched_patterns,

            "horizons":
                horizon_predictions,

        },

        "methodology": {

            "technical_weight":
                60,

            "fundamental_weight":
                40,

        },

    }

    # ========================================================
    # SAVE
    # ========================================================

    save_json(
        OUTPUT_FILE,
        output,
    )

    # ========================================================
    # PRINT RESULTS
    # ========================================================

    print()

    print(
        "=" * 65
    )

    print(
        "TECHNICAL"
    )

    print(
        "=" * 65
    )

    print(

        technical_summary[
            "bias"
        ],

        technical_summary[
            "confidence"
        ],

    )

    print()

    print(

        "Historical Matches:",

        technical_summary[
            "historical_matches"
        ],

    )

    print()

    print(
        "=" * 65
    )

    print(
        "FUNDAMENTAL"
    )

    print(
        "=" * 65
    )

    print(

        fundamental_summary[
            "bias"
        ],

        fundamental_summary[
            "confidence"
        ],

    )

    print()

    print(

        "Score:",

        fundamental_summary[
            "score"
        ],

        "/",

        fundamental_summary[
            "maximum_score"
        ],

    )

    print()

    print(
        "INPUTS"
    )

    for (
        key,
        value,
    ) in fundamental_summary.get(
        "inputs",
        {},
    ).items():

        print(
            f"{key} = {value}"
        )

    print()

    print(
        "REASONS"
    )

    for reason in fundamental_summary.get(
        "reasons",
        [],
    ):

        print(
            "-",
            reason,
        )

    print()

    print(
        "=" * 65
    )

    print(
        "EDGE X COMBINED PREDICTION"
    )

    print(
        "=" * 65
    )

    print(

        edge_x_prediction[
            "bias"
        ],

        edge_x_prediction[
            "confidence"
        ],

    )

    print()

    print(

        "Technical:",

        edge_x_prediction[
            "technical_bias"
        ],

        edge_x_prediction[
            "technical_confidence"
        ],

    )

    print(

        "Fundamental:",

        edge_x_prediction[
            "fundamental_bias"
        ],

        edge_x_prediction[
            "fundamental_confidence"
        ],

    )

    print()

    print(

        "ALIGNMENT:",

        edge_x_prediction[
            "alignment"
        ],

    )

    # ========================================================
    # HORIZON RESULTS
    # ========================================================

    print()

    print(
        "HORIZON PREDICTIONS"
    )

    print(
        "-" * 65
    )

    for horizon in HORIZONS:

        prediction = horizon_predictions[
            horizon
        ]

        print(

            f"{horizon} : "
            f"{prediction['direction']} | "
            f"Consensus: {prediction['consensus']} % | "
            f"Confidence: {prediction['confidence']} % | "
            f"Evidence: "
            f"{prediction['evidence']} | "
            f"Patterns: "
            f"{prediction['pattern_count']}"

        )

    print()

    print(
        "Saved:"
    )

    print(
        OUTPUT_FILE
    )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    main()