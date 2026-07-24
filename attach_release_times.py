import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


# ============================================================
# EDGE X PRO
# VERIFIED ECONOMIC RELEASE DATABASE BUILDER
#
# YEARS: 2021 -> 2026
#
# BLS:
#   CPI / CORE CPI
#   PPI / CORE PPI
#   NFP / UNEMPLOYMENT
#
# FEDERAL RESERVE:
#   FOMC
#
# TIME:
#   Source = America/New_York
#   Internal = UTC
#   Display = IST
# ============================================================


START_YEAR = 2021
END_YEAR = 2026


OUTPUT_FOLDER = Path(
    "data/economic-events"
)

OUTPUT_FILE = (
    OUTPUT_FOLDER
    / "verified_events.json"
)

CACHE_FOLDER = (
    OUTPUT_FOLDER
    / "official-source-cache"
)


NY_TZ = ZoneInfo(
    "America/New_York"
)

IST = ZoneInfo(
    "Asia/Kolkata"
)


# ============================================================
# OFFICIAL SOURCES
# ============================================================


BLS_SCHEDULE_URLS = {

    "CPI":
        "https://www.bls.gov/schedule/news_release/cpi.htm",

    "PPI":
        "https://www.bls.gov/schedule/news_release/ppi.htm",

    "EMPLOYMENT":
        "https://www.bls.gov/schedule/news_release/empsit.htm",
}


FED_FOMC_URL = (
    "https://www.federalreserve.gov/"
    "monetarypolicy/fomccalendars.htm"
)


# ============================================================
# DOWNLOAD
# ============================================================


def download_text(
    url,
    cache_name,
):

    CACHE_FOLDER.mkdir(
        parents=True,
        exist_ok=True,
    )

    cache_file = (
        CACHE_FOLDER
        / cache_name
    )


    print()
    print(
        "SOURCE:",
        url,
    )


    request = Request(

        url,

        headers={

            "User-Agent":
                (
                    "Mozilla/5.0 "
                    "EDGE-X-PRO "
                    "Economic Research"
                )

        },

    )


    try:

        with urlopen(
            request,
            timeout=30,
        ) as response:

            text = (
                response
                .read()
                .decode(
                    "utf-8",
                    errors="ignore",
                )
            )


        cache_file.write_text(

            text,

            encoding="utf-8",

        )


        print(
            "Downloaded successfully."
        )


        return text


    except Exception as error:

        print(
            "Download failed:",
            error,
        )


        if cache_file.exists():

            print(
                "Using cached official page."
            )

            return cache_file.read_text(

                encoding="utf-8",

                errors="ignore",

            )


        return None


# ============================================================
# CLEAN HTML
# ============================================================


def clean_html(
    html,
):

    if not html:

        return ""


    text = re.sub(

        r"<script.*?</script>",

        " ",

        html,

        flags=(
            re.I
            |
            re.S
        ),

    )


    text = re.sub(

        r"<style.*?</style>",

        " ",

        text,

        flags=(
            re.I
            |
            re.S
        ),

    )


    text = re.sub(

        r"<[^>]+>",

        " ",

        text,

    )


    text = (

        text

        .replace(
            "&nbsp;",
            " ",
        )

        .replace(
            "&#160;",
            " ",
        )

        .replace(
            "&amp;",
            "&",
        )

    )


    text = re.sub(

        r"\s+",

        " ",

        text,

    )


    return text


# ============================================================
# DATE PARSING
# ============================================================


MONTHS = {

    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,

}


def parse_release_datetime(
    month_text,
    day_text,
    year_text,
    hour_text="08",
    minute_text="30",
):

    month_text = (
        month_text[:3]
    )


    month = MONTHS.get(
        month_text
    )


    if not month:

        return None


    local_time = datetime(

        int(
            year_text
        ),

        month,

        int(
            day_text
        ),

        int(
            hour_text
        ),

        int(
            minute_text
        ),

        tzinfo=NY_TZ,

    )


    return local_time


# ============================================================
# BLS SCHEDULE PARSER
# ============================================================


def parse_bls_schedule(
    html,
    release_type,
):

    text = clean_html(
        html
    )


    events = []


    # Matches examples:
    #
    # June 2026 Jul. 14, 2026 08:30 AM
    #
    # Reference month
    # Release date
    # Release time

    pattern = re.compile(

        r"("
        r"January|February|March|April|May|June|"
        r"July|August|September|October|November|December"
        r")"
        r"\s+"
        r"(\d{4})"
        r"\s+"
        r"("
        r"Jan|Feb|Mar|Apr|May|Jun|"
        r"Jul|Aug|Sep|Oct|Nov|Dec"
        r")"
        r"\.?"
        r"\s+"
        r"(\d{1,2})"
        r","
        r"\s+"
        r"(\d{4})"
        r"\s+"
        r"(\d{1,2})"
        r":"
        r"(\d{2})"
        r"\s+"
        r"(AM|PM)",

        flags=re.I,

    )


    for match in pattern.finditer(
        text
    ):


        reference_month = (
            match.group(1)
        )


        reference_year = int(
            match.group(2)
        )


        release_month = (
            match.group(3)
        )


        release_day = (
            match.group(4)
        )


        release_year = int(
            match.group(5)
        )


        hour = int(
            match.group(6)
        )


        minute = int(
            match.group(7)
        )


        am_pm = (
            match.group(8)
            .upper()
        )


        if (
            am_pm == "PM"
            and
            hour != 12
        ):

            hour += 12


        if (
            am_pm == "AM"
            and
            hour == 12
        ):

            hour = 0


        release_et = (

            parse_release_datetime(

                release_month,

                release_day,

                release_year,

                str(
                    hour
                ),

                str(
                    minute
                ),

            )

        )


        if release_et is None:

            continue


        if not (

            START_YEAR
            <=
            release_et.year
            <=
            END_YEAR

        ):

            continue


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


        reference_period = (

            f"{reference_month} "
            f"{reference_year}"

        )


        if release_type == "CPI":

            names = [

                "CPI",

                "Core CPI",

            ]


        elif release_type == "PPI":

            names = [

                "PPI",

                "Core PPI",

            ]


        else:

            names = [

                "NFP",

                "Unemployment Rate",

            ]


        events.append({

            "events":
                names,

            "category":
                release_type,

            "reference_periods": [

                reference_period

            ],

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

            "release_timezone":

                (
                    release_et
                    .tzname()
                ),

            "official_source":

                "U.S. Bureau of Labor Statistics",

            # Actual values are intentionally not invented.
            # They can be attached from archived releases.

            "numbers": {},

        })


    return events


# ============================================================
# FOMC DATE PARSER
# ============================================================


def parse_fomc_calendar(
    html,
):

    text = clean_html(
        html
    )


    events = []


    # Federal Reserve calendar contains meeting ranges.
    #
    # We identify dates such as:
    #
    # January 27-28, 2026
    #
    # The policy statement is normally released
    # on the FINAL meeting date at 2:00 PM ET.


    pattern = re.compile(

        r"("
        r"January|February|March|April|May|June|"
        r"July|August|September|October|November|December"
        r")"
        r"\s+"
        r"(\d{1,2})"
        r"(?:\s*[-–]\s*(\d{1,2}))?"
        r",?"
        r"\s+"
        r"(20(?:21|22|23|24|25|26))",

        flags=re.I,

    )


    seen = set()


    for match in pattern.finditer(
        text
    ):


        month_name = (
            match.group(1)
        )


        first_day = int(
            match.group(2)
        )


        second_day = (
            match.group(3)
        )


        year = int(
            match.group(4)
        )


        # Statement date =
        # final day of meeting.

        if second_day:

            statement_day = int(
                second_day
            )

        else:

            statement_day = (
                first_day
            )


        month_number = None


        for (
            short_name,
            number,
        ) in MONTHS.items():


            if (

                month_name
                .lower()
                .startswith(
                    short_name.lower()
                )

            ):

                month_number = (
                    number
                )

                break


        if month_number is None:

            continue


        key = (

            year,

            month_number,

            statement_day,

        )


        if key in seen:

            continue


        seen.add(
            key
        )


        # FOMC policy statement:
        # 2:00 PM Eastern Time.

        release_et = datetime(

            year,

            month_number,

            statement_day,

            14,

            0,

            tzinfo=NY_TZ,

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


        events.append({

            "events": [

                "FOMC Statement"

            ],

            "category":

                "FOMC",

            "reference_periods": [

                release_et.strftime(
                    "%B %Y"
                )

            ],

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

            "release_timezone":

                release_et.tzname(),

            "official_source":

                (
                    "Board of Governors "
                    "of the Federal Reserve System"
                ),

            "numbers": {

                "target_rate_before":
                    None,

                "target_rate_after":
                    None,

                "rate_change_bps":
                    None,

            },

        })


    return events


# ============================================================
# REMOVE DUPLICATES
# ============================================================


def remove_duplicates(
    events,
):

    unique = {}


    for event in events:


        key = (

            tuple(
                event[
                    "events"
                ]
            ),

            event[
                "timestamp_utc"
            ],

        )


        unique[key] = event


    return list(
        unique.values()
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
        "VERIFIED ECONOMIC DATABASE BUILDER"
    )

    print(
        "============================================"
    )


    all_events = []


    # ========================================================
    # BLS
    # ========================================================


    for (
        release_type,
        url,
    ) in BLS_SCHEDULE_URLS.items():


        print()

        print(
            "Collecting:",
            release_type,
        )


        html = download_text(

            url,

            f"{release_type.lower()}_schedule.html",

        )


        if not html:

            print(
                "No source data available."
            )

            continue


        events = parse_bls_schedule(

            html,

            release_type,

        )


        print(

            "Verified releases found:",

            len(events),

        )


        all_events.extend(
            events
        )


        time.sleep(
            1
        )


    # ========================================================
    # FOMC
    # ========================================================


    print()

    print(
        "Collecting: FOMC"
    )


    fomc_html = download_text(

        FED_FOMC_URL,

        "fomc_calendar.html",

    )


    if fomc_html:


        fomc_events = (

            parse_fomc_calendar(

                fomc_html

            )

        )


        print(

            "FOMC releases found:",

            len(
                fomc_events
            ),

        )


        all_events.extend(
            fomc_events
        )


    # ========================================================
    # CLEAN + SORT
    # ========================================================


    all_events = remove_duplicates(
        all_events
    )


    all_events.sort(

        key=lambda item:

            item[
                "timestamp_utc"
            ]

    )


    # ========================================================
    # GROUP EVENTS OCCURRING AT EXACT SAME TIME
    # ========================================================


    grouped = {}


    for event in all_events:


        timestamp = (

            event[
                "timestamp_utc"
            ]

        )


        if timestamp not in grouped:


            grouped[
                timestamp
            ] = {

                "events":
                    [],

                "categories":
                    [],

                "reference_periods":
                    [],

                "verified":
                    True,

                "timestamp_et":

                    event[
                        "timestamp_et"
                    ],

                "timestamp_utc":

                    event[
                        "timestamp_utc"
                    ],

                "timestamp_ist":

                    event[
                        "timestamp_ist"
                    ],

                "date_ist":

                    event[
                        "date_ist"
                    ],

                "time_ist":

                    event[
                        "time_ist"
                    ],

                "release_timezone":

                    event[
                        "release_timezone"
                    ],

                "numbers": {},

            }


        group = grouped[
            timestamp
        ]


        for name in event[
            "events"
        ]:


            if name not in group[
                "events"
            ]:


                group[
                    "events"
                ].append(
                    name
                )


        category = event[
            "category"
        ]


        if category not in group[
            "categories"
        ]:


            group[
                "categories"
            ].append(
                category
            )


        for period in event.get(

            "reference_periods",

            [],

        ):


            if period not in group[
                "reference_periods"
            ]:


                group[
                    "reference_periods"
                ].append(
                    period
                )


    download_groups = list(

        grouped.values()

    )


    download_groups.sort(

        key=lambda item:

            item[
                "timestamp_utc"
            ]

    )


    # ========================================================
    # SAVE
    # ========================================================


    OUTPUT_FOLDER.mkdir(

        parents=True,

        exist_ok=True,

    )


    output = {

        "database_name":

            (
                "EDGE X PRO Verified "
                "Economic Release Database"
            ),

        "generated_at_ist":

            datetime.now(
                IST
            ).isoformat(),

        "years": {

            "start":
                START_YEAR,

            "end":
                END_YEAR,

        },

        "time_policy": {

            "official_bls_time":

                "America/New_York",

            "internal_storage":

                "UTC",

            "user_display":

                "Asia/Kolkata",

            "note":

                (
                    "DST conversion is calculated "
                    "individually for every release."
                ),

        },

        "total_verified_events":

            len(
                all_events
            ),

        "total_download_groups":

            len(
                download_groups
            ),

        "events":

            all_events,

        "download_groups":

            download_groups,

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
        "============================================"
    )

    print(
        "DATABASE COMPLETE"
    )

    print(
        "============================================"
    )


    print(

        "Individual releases:",

        len(
            all_events
        ),

    )


    print(

        "MT5 reaction windows:",

        len(
            download_groups
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