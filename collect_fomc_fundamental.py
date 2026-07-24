import json
from datetime import datetime, timezone
from pathlib import Path


CATEGORY = "fomc"

SETUP_FILE = Path(
    "data/fomc/context/current_setup.json"
)

FUNDAMENTAL_FILE = Path(
    "data/fomc/context/fundamental_context.json"
)


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


def normalize(value):
    if value is None:
        return None

    return str(value).strip().upper()


def calculate_fundamental_bias(
    fundamental,
):
    bullish = 0
    bearish = 0

    reasons = []

    expected_decision = normalize(
        fundamental.get(
            "expected_decision"
        )
    )

    dollar_bias = normalize(
        fundamental.get(
            "dollar_bias"
        )
    )

    treasury_yields = normalize(
        fundamental.get(
            "treasury_yields"
        )
    )

    inflation_trend = normalize(
        fundamental.get(
            "inflation_trend"
        )
    )

    labor_market = normalize(
        fundamental.get(
            "labor_market"
        )
    )

    geopolitical_risk = normalize(
        fundamental.get(
            "geopolitical_risk"
        )
    )


    # FED EXPECTATION

    if expected_decision == "CUT":
        bullish += 2
        reasons.append(
            "Expected Fed cut supports gold."
        )

    elif expected_decision == "HIKE":
        bearish += 2
        reasons.append(
            "Expected Fed hike pressures gold."
        )

    elif expected_decision == "HOLD":
        reasons.append(
            "Expected hold is neutral by itself; guidance becomes important."
        )


    # DOLLAR

    if dollar_bias == "WEAK":
        bullish += 2
        reasons.append(
            "Weak US dollar supports gold."
        )

    elif dollar_bias == "STRONG":
        bearish += 2
        reasons.append(
            "Strong US dollar pressures gold."
        )


    # TREASURY YIELDS

    if treasury_yields == "FALLING":
        bullish += 2
        reasons.append(
            "Falling Treasury yields support gold."
        )

    elif treasury_yields == "RISING":
        bearish += 2
        reasons.append(
            "Rising Treasury yields pressure gold."
        )


    # INFLATION

    if inflation_trend == "COOLING":
        bullish += 1
        reasons.append(
            "Cooling inflation supports easier Fed expectations."
        )

    elif inflation_trend == "HOT":
        bearish += 1
        reasons.append(
            "Hot inflation supports tighter Fed expectations."
        )


    # LABOR MARKET

    if labor_market == "WEAKENING":
        bullish += 1
        reasons.append(
            "Weakening labor market supports easier policy expectations."
        )

    elif labor_market == "STRONG":
        bearish += 1
        reasons.append(
            "Strong labor market can support tighter policy."
        )


    # GEOPOLITICAL RISK

    if geopolitical_risk == "HIGH":
        bullish += 2
        reasons.append(
            "Elevated geopolitical risk supports safe-haven demand."
        )


    total = bullish + bearish


    if total == 0:
        bias = "NO_CLEAR_EDGE"
        confidence = 0

    else:
        bullish_percent = (
            bullish / total
        ) * 100

        bearish_percent = (
            bearish / total
        ) * 100

        if bullish_percent >= 60:
            bias = "BULLISH"
            confidence = bullish_percent

        elif bearish_percent >= 60:
            bias = "BEARISH"
            confidence = bearish_percent

        else:
            bias = "MIXED"
            confidence = max(
                bullish_percent,
                bearish_percent,
            )


    return {
        "bias":
            bias,

        "confidence":
            round(
                confidence,
                1,
            ),

        "bullish_score":
            bullish,

        "bearish_score":
            bearish,

        "reasons":
            reasons,
    }


def create_template():

    return {
        "category":
            "fomc",

        "event_name":
            "Upcoming FOMC Rate Decision",

        "event_time_utc":
            None,

        "schedule": {
            "status":
                "NOT_SET",

            "source":
                None,
        },

        "fed": {
            "current_rate":
                None,

            "expected_rate":
                None,

            "expected_decision":
                None,

            "expected_change_bps":
                None,

            "market_cut_probability":
                None,

            "market_hold_probability":
                None,

            "market_hike_probability":
                None,
        },

        "inflation": {
            "latest_cpi_actual":
                None,

            "latest_cpi_forecast":
                None,

            "latest_core_cpi_actual":
                None,

            "latest_pce_actual":
                None,

            "trend":
                None,
        },

        "labor": {
            "latest_nfp_actual":
                None,

            "latest_nfp_forecast":
                None,

            "unemployment_rate":
                None,

            "trend":
                None,
        },

        "markets": {
            "dollar_bias":
                None,

            "treasury_yields":
                None,

            "dxy_value":
                None,

            "us10y_yield":
                None,
        },

        "geopolitical": {
            "risk_level":
                None,

            "notes":
                [],
        },

        "fed_communication": {
            "tone":
                None,

            "notes":
                [],
        },

        "additional_notes":
            [],
    }


def main():

    print()
    print(
        "============================================"
    )

    print(
        "EDGE X PRO"
    )

    print(
        "FOMC FUNDAMENTAL CONTEXT COLLECTOR"
    )

    print(
        "============================================"
    )


    if not FUNDAMENTAL_FILE.exists():

        template = create_template()

        save_json(
            FUNDAMENTAL_FILE,
            template,
        )

        print()
        print(
            "Fundamental context template created:"
        )

        print(
            FUNDAMENTAL_FILE.resolve()
        )

        print()
        print(
            "The file is ready for automated source collection."
        )

        return


    context = load_json(
        FUNDAMENTAL_FILE
    )


    setup = load_json(
        SETUP_FILE
    )


    if not setup:
        setup = {
            "category":
                CATEGORY,

            "technical":
                {},
        }


    fed = context.get(
        "fed",
        {}
    )

    inflation = context.get(
        "inflation",
        {}
    )

    labor = context.get(
        "labor",
        {}
    )

    markets = context.get(
        "markets",
        {}
    )

    geopolitical = context.get(
        "geopolitical",
        {}
    )

    communication = context.get(
        "fed_communication",
        {}
    )


    fundamental = {
        "collected_at_utc":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "expected_decision":
            normalize(
                fed.get(
                    "expected_decision"
                )
            ),

        "previous_rate":
            fed.get(
                "current_rate"
            ),

        "expected_rate":
            fed.get(
                "expected_rate"
            ),

        "expected_change_bps":
            fed.get(
                "expected_change_bps"
            ),

        "market_probabilities": {
            "cut":
                fed.get(
                    "market_cut_probability"
                ),

            "hold":
                fed.get(
                    "market_hold_probability"
                ),

            "hike":
                fed.get(
                    "market_hike_probability"
                ),
        },

        "dollar_bias":
            normalize(
                markets.get(
                    "dollar_bias"
                )
            ),

        "treasury_yields":
            normalize(
                markets.get(
                    "treasury_yields"
                )
            ),

        "dxy_value":
            markets.get(
                "dxy_value"
            ),

        "us10y_yield":
            markets.get(
                "us10y_yield"
            ),

        "inflation_trend":
            normalize(
                inflation.get(
                    "trend"
                )
            ),

        "inflation_data":
            inflation,

        "labor_market":
            normalize(
                labor.get(
                    "trend"
                )
            ),

        "labor_data":
            labor,

        "geopolitical_risk":
            normalize(
                geopolitical.get(
                    "risk_level"
                )
            ),

        "geopolitical_notes":
            geopolitical.get(
                "notes",
                []
            ),

        "fed_tone":
            normalize(
                communication.get(
                    "tone"
                )
            ),

        "fed_communication_notes":
            communication.get(
                "notes",
                []
            ),

        "additional_notes":
            context.get(
                "additional_notes",
                []
            ),
    }


    model = calculate_fundamental_bias(
        fundamental
    )


    fundamental[
        "preliminary_model"
    ] = model


    setup[
        "event_name"
    ] = context.get(
        "event_name",
        "Upcoming FOMC Rate Decision",
    )


    setup[
        "event_time_utc"
    ] = context.get(
        "event_time_utc"
    )


    setup[
        "fundamental"
    ] = fundamental


    save_json(
        SETUP_FILE,
        setup,
    )


    print()
    print(
        "FUNDAMENTAL CONTEXT UPDATED"
    )


    print()
    print(
        "Upcoming Event:",
        setup.get(
            "event_name"
        ),
    )


    print(
        "Event Time UTC:",
        setup.get(
            "event_time_utc"
        ),
    )


    print()
    print(
        "Expected Decision:",
        fundamental.get(
            "expected_decision"
        ),
    )


    print(
        "Dollar:",
        fundamental.get(
            "dollar_bias"
        ),
    )


    print(
        "Treasury Yields:",
        fundamental.get(
            "treasury_yields"
        ),
    )


    print(
        "Inflation:",
        fundamental.get(
            "inflation_trend"
        ),
    )


    print(
        "Labor:",
        fundamental.get(
            "labor_market"
        ),
    )


    print(
        "Geopolitical Risk:",
        fundamental.get(
            "geopolitical_risk"
        ),
    )


    print()
    print(
        "Preliminary Fundamental Bias:",
        model[
            "bias"
        ],
        model[
            "confidence"
        ],
        "%",
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