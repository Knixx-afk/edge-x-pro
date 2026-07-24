import json
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

# ============================================================
# EDGE X PRO - CORE CPI EVENT DATABASE BUILDER V3
# ============================================================
# No BLS webpage scraping.
# Uses:
#   1) A local release-date calendar.
#   2) The official BLS Public Data API for Core CPI index values.
#
# Output:
#   data/cpi/events/verified_events.json
#
# Historical market consensus is intentionally left null.
# ============================================================

START_YEAR = 2022
END_YEAR = 2026

CORE_CPI_SERIES = "CUSR0000SA0L1E"
API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

OUTPUT_FILE = Path("data/cpi/events/verified_events.json")
CACHE_FILE = Path("data/cpi/cache/core_cpi_bls_series.json")

ET = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")
IST = ZoneInfo("Asia/Kolkata")

MONTHS = {
    f"M{i:02d}": i
    for i in range(1, 13)
}

# Key: reference month (YYYY, MM)
# Value: actual release date (YYYY, MM, DD)
#
# 2022-2024: regular historical CPI calendar.
# 2025: included through August reference month. Later 2025 releases were
# affected by the federal funding lapse and are intentionally excluded here
# rather than guessed.
# 2026: included through June reference month / July 14 release.
RELEASE_DATES = {
    # 2022 reference months
    (2021, 12): (2022, 1, 12),
    (2022, 1): (2022, 2, 10),
    (2022, 2): (2022, 3, 10),
    (2022, 3): (2022, 4, 12),
    (2022, 4): (2022, 5, 11),
    (2022, 5): (2022, 6, 10),
    (2022, 6): (2022, 7, 13),
    (2022, 7): (2022, 8, 10),
    (2022, 8): (2022, 9, 13),
    (2022, 9): (2022, 10, 13),
    (2022, 10): (2022, 11, 10),
    (2022, 11): (2022, 12, 13),

    # 2023 reference months
    (2022, 12): (2023, 1, 12),
    (2023, 1): (2023, 2, 14),
    (2023, 2): (2023, 3, 14),
    (2023, 3): (2023, 4, 12),
    (2023, 4): (2023, 5, 10),
    (2023, 5): (2023, 6, 13),
    (2023, 6): (2023, 7, 12),
    (2023, 7): (2023, 8, 10),
    (2023, 8): (2023, 9, 13),
    (2023, 9): (2023, 10, 12),
    (2023, 10): (2023, 11, 14),
    (2023, 11): (2023, 12, 12),

    # 2024 reference months
    (2023, 12): (2024, 1, 11),
    (2024, 1): (2024, 2, 13),
    (2024, 2): (2024, 3, 12),
    (2024, 3): (2024, 4, 10),
    (2024, 4): (2024, 5, 15),
    (2024, 5): (2024, 6, 12),
    (2024, 6): (2024, 7, 11),
    (2024, 7): (2024, 8, 14),
    (2024, 8): (2024, 9, 11),
    (2024, 9): (2024, 10, 10),
    (2024, 10): (2024, 11, 13),
    (2024, 11): (2024, 12, 11),

    # 2025 reference months
    (2024, 12): (2025, 1, 15),
    (2025, 1): (2025, 2, 12),
    (2025, 2): (2025, 3, 12),
    (2025, 3): (2025, 4, 10),
    (2025, 4): (2025, 5, 13),
    (2025, 5): (2025, 6, 11),
    (2025, 6): (2025, 7, 15),
    (2025, 7): (2025, 8, 12),
    (2025, 8): (2025, 9, 11),

    # 2026 reference months
    (2025, 12): (2026, 1, 13),
    (2026, 1): (2026, 2, 13),
    (2026, 2): (2026, 3, 11),
    (2026, 3): (2026, 4, 10),
    (2026, 4): (2026, 5, 12),
    (2026, 5): (2026, 6, 10),
    (2026, 6): (2026, 7, 14),
}


def download_bls_series(retries=4, timeout=180):
    payload = json.dumps({
        "seriesid": [CORE_CPI_SERIES],
        "startyear": "2021",
        "endyear": str(END_YEAR),
    }).encode("utf-8")

    last_error = None

    for attempt in range(1, retries + 1):
        try:
            print(f"BLS API attempt {attempt}/{retries}...")

            request = urllib.request.Request(
                API_URL,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "EDGE-X-PRO/3.0",
                },
                method="POST",
            )

            with urllib.request.urlopen(
                request,
                timeout=timeout,
            ) as response:
                data = json.loads(
                    response.read().decode("utf-8")
                )

            if data.get("status") != "REQUEST_SUCCEEDED":
                raise RuntimeError(
                    f"BLS API failed: {data.get('message')}"
                )

            CACHE_FILE.parent.mkdir(
                parents=True,
                exist_ok=True,
            )

            CACHE_FILE.write_text(
                json.dumps(data, indent=2),
                encoding="utf-8",
            )

            return data

        except Exception as error:
            last_error = error
            print(f"  Failed: {error}")

            if attempt < retries:
                time.sleep(attempt * 3)

    if CACHE_FILE.exists():
        print("BLS API unavailable. Using cached BLS series.")
        return json.loads(
            CACHE_FILE.read_text(encoding="utf-8")
        )

    raise RuntimeError(
        f"BLS API failed and no cache exists: {last_error}"
    )


def parse_values(data):
    series = (
        data.get("Results", {})
        .get("series", [])
    )

    if not series:
        raise RuntimeError(
            "No Core CPI series returned by BLS."
        )

    values = {}

    for row in series[0].get("data", []):
        period = row.get("period")

        if period not in MONTHS:
            continue

        raw_value = str(
            row.get("value", "")
        ).strip()

        if raw_value in ("", "-", "N/A"):
            continue

        try:
            value = float(raw_value)
        except ValueError:
            continue

        values[
            (
                int(row["year"]),
                MONTHS[period],
            )
        ] = value

    return values


def previous_month(year, month):
    if month == 1:
        return year - 1, 12

    return year, month - 1


def percentage_change(current, previous):
    if (
        current is None
        or previous is None
        or previous == 0
    ):
        return None

    return round(
        ((current / previous) - 1) * 100,
        1,
    )


def build_event(values, reference_key, release_parts):
    year, month = reference_key

    current = values.get((year, month))
    previous_key = previous_month(year, month)
    previous_index = values.get(previous_key)
    year_ago_index = values.get((year - 1, month))

    if current is None or previous_index is None:
        return None

    actual_mom = percentage_change(
        current,
        previous_index,
    )

    actual_yoy = percentage_change(
        current,
        year_ago_index,
    )

    prior_previous_key = previous_month(
        previous_key[0],
        previous_key[1],
    )

    previous_mom = percentage_change(
        previous_index,
        values.get(prior_previous_key),
    )

    release_et = datetime(
        *release_parts,
        8,
        30,
        tzinfo=ET,
    )

    release_utc = release_et.astimezone(UTC)
    release_ist = release_et.astimezone(IST)

    reference_period = datetime(
        year,
        month,
        1,
    ).strftime("%B %Y")

    return {
        "id": f"CORE_CPI_{year}_{month:02d}",

        "events": [
            "US Core CPI MoM"
        ],

        "event":
            "CORE_CPI",

        "category":
            "CORE_CPI",

        "verified":
            True,

        "timestamp_et":
            release_et.isoformat(),

        "timestamp_utc":
            release_utc.isoformat(),

        "timestamp_ist":
            release_ist.isoformat(),

        "date_ist":
            release_ist.strftime("%Y-%m-%d"),

        "time_ist":
            release_ist.strftime("%H:%M"),

        "reference_periods": [
            reference_period
        ],

        "numbers": {
            "core_cpi_index":
                current,

            "actual_mom":
                actual_mom,

            "forecast_mom":
                None,

            "previous_mom":
                previous_mom,

            "actual_yoy":
                actual_yoy,

            "forecast_yoy":
                None,
        },

        # Compatibility fields for reaction builders.
        "actual":
            actual_mom,

        "forecast":
            None,

        "previous":
            previous_mom,

        "release": {
            "previous":
                (
                    f"{previous_mom:.1f}%"
                    if previous_mom is not None
                    else None
                ),

            "actual":
                (
                    f"{actual_mom:.1f}%"
                    if actual_mom is not None
                    else None
                ),

            "result":
                "CORE CPI RELEASE",
        },

        "official_source":
            "U.S. Bureau of Labor Statistics",

        "series_id":
            CORE_CPI_SERIES,

        "consensus_status":
            "PENDING_VERIFIED_SOURCE",

        "data_note":
            (
                "Core CPI changes calculated from the official "
                "seasonally adjusted BLS index series. Historical "
                "market consensus is not included."
            ),
    }


def main():
    print()
    print("==============================================")
    print("EDGE X PRO - CORE CPI DATABASE BUILDER V3")
    print("==============================================")
    print()

    print(
        "No BLS webpage scraping is used in this version."
    )
    print(
        "Downloading official Core CPI series from BLS API..."
    )

    data = download_bls_series()
    values = parse_values(data)

    print(
        f"Loaded {len(values)} usable monthly observations."
    )

    events = []
    skipped = []

    for reference_key, release_parts in sorted(
        RELEASE_DATES.items(),
        key=lambda item: item[1],
    ):
        event = build_event(
            values,
            reference_key,
            release_parts,
        )

        if event is None:
            skipped.append({
                "reference_period":
                    f"{reference_key[0]}-{reference_key[1]:02d}",
                "reason":
                    "Required BLS index value unavailable",
            })
            continue

        events.append(event)

        print(
            f"  {event['reference_periods'][0]} -> "
            f"{event['date_ist']} {event['time_ist']} IST | "
            f"Core CPI MoM: {event['actual']}%"
        )

    database = {
        "database_name":
            "EDGE X PRO Historical Core CPI Releases",

        "event_type":
            "CORE_CPI",

        "instrument":
            "XAUUSD",

        "total_verified_events":
            len(events),

        "total_skipped_events":
            len(skipped),

        "time_policy": {
            "release":
                "8:30 AM America/New_York",
            "internal":
                "UTC",
            "display":
                "Asia/Kolkata",
        },

        "actual_data_source":
            "U.S. Bureau of Labor Statistics Public Data API",

        "series_id":
            CORE_CPI_SERIES,

        "forecast_policy":
            (
                "Historical market consensus is intentionally null "
                "until a separately verified consensus source is added."
            ),

        "events":
            events,

        "skipped_events":
            skipped,
    }

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
            database,
            file,
            indent=2,
        )

    print()
    print("==============================================")
    print("CORE CPI DATABASE COMPLETE")
    print("==============================================")
    print()
    print(
        f"Verified events saved: {len(events)}"
    )
    print(
        f"Skipped events: {len(skipped)}"
    )
    print(
        f"Saved to: {OUTPUT_FILE.resolve()}"
    )


if __name__ == "__main__":
    main()
