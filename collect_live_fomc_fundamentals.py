import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from html import unescape


# ============================================================
# EDGE X PRO
# LIVE FOMC FUNDAMENTAL COLLECTOR V3.1
# ============================================================

OUTPUT_FILE = (
    Path("data")
    / "fomc"
    / "context"
    / "current_setup.json"
)

TARGET_RANGE_URL = (
    "https://www.federalreserve.gov/"
    "monetarypolicy/openmarket.htm"
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 Chrome/130 Safari/537.36"
)


# ============================================================
# FOMC SCHEDULE
#
# Decision date = second day of scheduled meeting.
# ============================================================

FOMC_SCHEDULE = [
    {
        "start": "2026-01-27",
        "decision": "2026-01-28",
    },
    {
        "start": "2026-03-17",
        "decision": "2026-03-18",
    },
    {
        "start": "2026-04-28",
        "decision": "2026-04-29",
    },
    {
        "start": "2026-06-16",
        "decision": "2026-06-17",
    },
    {
        "start": "2026-07-28",
        "decision": "2026-07-29",
    },
    {
        "start": "2026-09-15",
        "decision": "2026-09-16",
    },
    {
        "start": "2026-10-27",
        "decision": "2026-10-28",
    },
    {
        "start": "2026-12-08",
        "decision": "2026-12-09",
    },
    {
        "start": "2027-01-26",
        "decision": "2027-01-27",
    },
]


# ============================================================
# FILE HELPERS
# ============================================================

def load_existing():

    if not OUTPUT_FILE.exists():
        return {}

    try:

        with open(
            OUTPUT_FILE,
            "r",
            encoding="utf-8",
        ) as file:

            data = json.load(file)

        if isinstance(data, dict):
            return data

    except Exception as error:

        print()
        print("Unable to read existing setup:")
        print(error)

    return {}


def save_json(data):

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            data,
            file,
            indent=2,
        )


# ============================================================
# WEB FETCH
# ============================================================

def fetch_page(url):

    try:

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html",
            },
        )

        with urllib.request.urlopen(
            request,
            timeout=20,
        ) as response:

            return (
                response
                .read()
                .decode(
                    "utf-8",
                    errors="ignore",
                )
            )

    except Exception as error:

        print()
        print("Fetch failed:")
        print(url)
        print(error)

        return None


# ============================================================
# HTML CLEANER
# ============================================================

def clean_html(html):

    if not html:
        return ""

    text = re.sub(
        r"<script.*?</script>",
        " ",
        html,
        flags=re.I | re.S,
    )

    text = re.sub(
        r"<style.*?</style>",
        " ",
        text,
        flags=re.I | re.S,
    )

    text = re.sub(
        r"<[^>]+>",
        " ",
        text,
    )

    text = unescape(text)

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


# ============================================================
# NEXT FOMC MEETING
# WINDOWS SAFE
# ============================================================

def get_next_fomc():

    today = datetime.now(
        timezone.utc
    ).date()

    for meeting in FOMC_SCHEDULE:

        decision_date = datetime.strptime(
            meeting["decision"],
            "%Y-%m-%d",
        ).date()

        if decision_date < today:
            continue

        start_date = datetime.strptime(
            meeting["start"],
            "%Y-%m-%d",
        )

        end_date = datetime.strptime(
            meeting["decision"],
            "%Y-%m-%d",
        )

        # Windows-safe date formatting.
        # We DO NOT use %-d.

        meeting_label = (
            f"{start_date.strftime('%B')} "
            f"{start_date.day}-{end_date.day}, "
            f"{end_date.year}"
        )

        return {
            "start_date":
                meeting["start"],

            "decision_date":
                meeting["decision"],

            "meeting_label":
                meeting_label,

            "decision_time_et":
                "14:00",

            "press_conference_time_et":
                "14:30",

            "source":
                "Federal Reserve official schedule",
        }

    return None


# ============================================================
# TARGET RATE PARSING
# ============================================================

def parse_fractional_rate(value):

    value = str(value).strip()

    # Example:
    # 3-1/2

    match = re.fullmatch(
        r"(\d+)-(\d+)/(\d+)",
        value,
    )

    if match:

        whole = float(
            match.group(1)
        )

        numerator = float(
            match.group(2)
        )

        denominator = float(
            match.group(3)
        )

        if denominator == 0:
            return None

        return (
            whole
            +
            numerator
            /
            denominator
        )

    try:
        return float(value)

    except ValueError:
        return None


def get_current_target_range():

    html = fetch_page(
        TARGET_RANGE_URL
    )

    if not html:
        return None

    text = clean_html(html)

    # --------------------------------------------------------
    # PATTERN 1
    #
    # Example:
    # target range for the federal funds rate
    # at 3-1/2 to 3-3/4 percent
    # --------------------------------------------------------

    patterns = [

        (
            r"target range for the federal funds rate"
            r".{0,250}?"
            r"(?:at|of)?\s*"
            r"(\d+(?:\.\d+)?|\d+-\d+/\d+)"
            r"\s*(?:to|through|[-–])\s*"
            r"(\d+(?:\.\d+)?|\d+-\d+/\d+)"
            r"\s*percent"
        ),

        (
            r"federal funds rate"
            r".{0,250}?"
            r"(\d+(?:\.\d+)?|\d+-\d+/\d+)"
            r"\s*(?:to|through|[-–])\s*"
            r"(\d+(?:\.\d+)?|\d+-\d+/\d+)"
            r"\s*percent"
        ),

    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.I,
        )

        for match in matches:

            lower = parse_fractional_rate(
                match[0]
            )

            upper = parse_fractional_rate(
                match[1]
            )

            if (
                lower is None
                or
                upper is None
            ):
                continue

            if not (
                0 <= lower <= 20
                and
                0 <= upper <= 20
                and
                lower <= upper
            ):
                continue

            return {
                "lower":
                    lower,

                "upper":
                    upper,

                "source":
                    TARGET_RANGE_URL,
            }

    return None


# ============================================================
# BUILD FUNDAMENTAL STRUCTURE
# ============================================================

def build_fundamental():

    next_meeting = get_next_fomc()

    print()
    print(
        "Fetching current official Fed target range..."
    )

    target_range = (
        get_current_target_range()
    )


    fundamental = {

        # ----------------------------------------------------
        # EVENT INFORMATION
        # ----------------------------------------------------

        "event": {

            "name":
                "FED Interest Rate Decision",

            "meeting_start_date":
                None,

            "next_meeting_date":
                None,

            "meeting_label":
                None,

            "decision_time_et":
                None,

            "press_conference_time_et":
                None,

            "current_target_lower":
                None,

            "current_target_upper":
                None,

            "source":
                "Federal Reserve",
        },


        # ----------------------------------------------------
        # RATE EXPECTATIONS
        # ----------------------------------------------------

        "market_probabilities": {

            "cut":
                None,

            "hold":
                None,

            "hike":
                None,

            "source":
                "UNKNOWN",

            "updated_at":
                None,
        },


        "expected_decision":
            "UNKNOWN",


        # ----------------------------------------------------
        # MARKET CONDITIONS
        # ----------------------------------------------------

        "dollar_bias":
            "UNKNOWN",

        "treasury_yields":
            "UNKNOWN",


        # ----------------------------------------------------
        # MACRO CONDITIONS
        # ----------------------------------------------------

        "inflation_trend":
            "UNKNOWN",

        "labor_market":
            "UNKNOWN",


        # ----------------------------------------------------
        # FED / GEOPOLITICS
        # ----------------------------------------------------

        "fed_tone":
            "UNKNOWN",

        "geopolitical_risk":
            "UNKNOWN",


        # ----------------------------------------------------
        # MACRO RELEASE DATA
        # ----------------------------------------------------

        "macro": {

            "cpi": {

                "actual":
                    None,

                "forecast":
                    None,

                "previous":
                    None,

                "release_date":
                    None,
            },


            "core_cpi": {

                "actual":
                    None,

                "forecast":
                    None,

                "previous":
                    None,

                "release_date":
                    None,
            },


            "nfp": {

                "actual":
                    None,

                "forecast":
                    None,

                "previous":
                    None,

                "release_date":
                    None,
            },


            "unemployment": {

                "actual":
                    None,

                "forecast":
                    None,

                "previous":
                    None,

                "release_date":
                    None,
            },

        },


        # ----------------------------------------------------
        # LIVE MARKETS
        # ----------------------------------------------------

        "markets": {

            "dxy": {

                "value":
                    None,

                "direction":
                    "UNKNOWN",
            },


            "us10y": {

                "value":
                    None,

                "direction":
                    "UNKNOWN",
            },


            "gold": {

                "value":
                    None,

                "direction":
                    "UNKNOWN",
            },

        },


        # ----------------------------------------------------
        # NEWS CONTEXT
        # ----------------------------------------------------

        "context": {

            "fed_drivers":
                [],

            "inflation_drivers":
                [],

            "labor_drivers":
                [],

            "dollar_drivers":
                [],

            "geopolitical_drivers":
                [],
        },


        # ----------------------------------------------------
        # DATA QUALITY
        # ----------------------------------------------------

        "data_quality": {

            "official_fomc_calendar":
                False,

            "official_target_rate":
                False,

            "market_probabilities":
                False,

            "macro_data":
                False,

            "market_data":
                False,

            "fed_news":
                False,

            "geopolitical_news":
                False,
        },

    }


    # ========================================================
    # ADD NEXT MEETING
    # ========================================================

    if next_meeting:

        event = fundamental[
            "event"
        ]

        event[
            "meeting_start_date"
        ] = next_meeting[
            "start_date"
        ]

        event[
            "next_meeting_date"
        ] = next_meeting[
            "decision_date"
        ]

        event[
            "meeting_label"
        ] = next_meeting[
            "meeting_label"
        ]

        event[
            "decision_time_et"
        ] = next_meeting[
            "decision_time_et"
        ]

        event[
            "press_conference_time_et"
        ] = next_meeting[
            "press_conference_time_et"
        ]

        fundamental[
            "data_quality"
        ][
            "official_fomc_calendar"
        ] = True


    # ========================================================
    # ADD TARGET RANGE
    # ========================================================

    if target_range:

        event = fundamental[
            "event"
        ]

        event[
            "current_target_lower"
        ] = target_range[
            "lower"
        ]

        event[
            "current_target_upper"
        ] = target_range[
            "upper"
        ]

        fundamental[
            "data_quality"
        ][
            "official_target_rate"
        ] = True


    return fundamental


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)

    print(
        "EDGE X PRO"
    )

    print(
        "LIVE FOMC FUNDAMENTAL COLLECTOR V3.1"
    )

    print("=" * 60)


    existing = load_existing()


    print()
    print(
        "Finding next official FOMC meeting..."
    )


    fundamental = (
        build_fundamental()
    )


    # ========================================================
    # PRESERVE EXISTING TECHNICAL DATA
    # ========================================================

    existing[
        "fundamental"
    ] = fundamental


    existing[
        "fundamental_updated_at_utc"
    ] = datetime.now(
        timezone.utc
    ).isoformat()


    event = fundamental.get(
        "event",
        {},
    )


    if event.get(
        "next_meeting_date"
    ):

        existing[
            "event_name"
        ] = (
            "FED Interest Rate Decision"
        )

        existing[
            "event_date"
        ] = event[
            "next_meeting_date"
        ]


    save_json(
        existing
    )


    # ========================================================
    # TERMINAL OUTPUT
    # ========================================================

    print()
    print("=" * 60)

    print(
        "FOMC FUNDAMENTAL COLLECTION COMPLETE"
    )

    print("=" * 60)


    print()
    print(
        "NEXT FOMC:"
    )

    print(
        event.get(
            "meeting_label"
        )
        or
        "UNKNOWN"
    )


    print()
    print(
        "DECISION DATE:"
    )

    print(
        event.get(
            "next_meeting_date"
        )
        or
        "UNKNOWN"
    )


    print()
    print(
        "DECISION TIME:"
    )

    decision_time = event.get(
        "decision_time_et"
    )

    if decision_time:

        print(
            f"{decision_time} ET"
        )

    else:

        print(
            "UNKNOWN"
        )


    print()
    print(
        "PRESS CONFERENCE:"
    )

    press_time = event.get(
        "press_conference_time_et"
    )

    if press_time:

        print(
            f"{press_time} ET"
        )

    else:

        print(
            "UNKNOWN"
        )


    print()
    print(
        "CURRENT TARGET RANGE:"
    )


    lower = event.get(
        "current_target_lower"
    )

    upper = event.get(
        "current_target_upper"
    )


    if (
        lower is not None
        and
        upper is not None
    ):

        print(
            f"{lower:.2f}% - "
            f"{upper:.2f}%"
        )

    else:

        print(
            "UNKNOWN"
        )


    print()
    print(
        "DATA QUALITY:"
    )


    quality = fundamental.get(
        "data_quality",
        {},
    )


    print(
        "FOMC Calendar:",
        (
            "OK"
            if quality.get(
                "official_fomc_calendar"
            )
            else
            "MISSING"
        ),
    )


    print(
        "Target Rate:",
        (
            "OK"
            if quality.get(
                "official_target_rate"
            )
            else
            "MISSING"
        ),
    )


    print()
    print(
        "Technical data preserved:",
        bool(
            existing.get(
                "technical"
            )
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