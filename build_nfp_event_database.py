import json
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

# ============================================================
# EDGE X PRO - NFP EVENT DATABASE BUILDER V1
# ============================================================
# Uses the official BLS Public Data API.
#
# Series:
#   CES0000000001 = Total nonfarm employment, seasonally adjusted
#
# NFP actual = current month's total nonfarm employment minus
# previous month's total nonfarm employment, in thousands.
#
# Output:
#   data/nfp/events/verified_events.json
#
# Historical consensus is intentionally left null.
# ============================================================

END_YEAR = 2026

NFP_SERIES = "CES0000000001"
API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

OUTPUT_FILE = Path("data/nfp/events/verified_events.json")
CACHE_FILE = Path("data/nfp/cache/total_nonfarm_bls_series.json")

ET = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")
IST = ZoneInfo("Asia/Kolkata")

MONTHS = {f"M{i:02d}": i for i in range(1, 13)}

# Reference month -> actual Employment Situation publication date.
# 2022-2024 follow the published historical BLS release calendar.
# 2025 excludes October because BLS states that release was not published
# during the federal appropriations lapse. Later affected releases use
# their actual delayed publication dates.
# 2026 included through June / July 2 release.
RELEASE_DATES = {
    # 2022
    (2021, 12): (2022, 1, 7),
    (2022, 1): (2022, 2, 4),
    (2022, 2): (2022, 3, 4),
    (2022, 3): (2022, 4, 1),
    (2022, 4): (2022, 5, 6),
    (2022, 5): (2022, 6, 3),
    (2022, 6): (2022, 7, 8),
    (2022, 7): (2022, 8, 5),
    (2022, 8): (2022, 9, 2),
    (2022, 9): (2022, 10, 7),
    (2022, 10): (2022, 11, 4),
    (2022, 11): (2022, 12, 2),

    # 2023
    (2022, 12): (2023, 1, 6),
    (2023, 1): (2023, 2, 3),
    (2023, 2): (2023, 3, 10),
    (2023, 3): (2023, 4, 7),
    (2023, 4): (2023, 5, 5),
    (2023, 5): (2023, 6, 2),
    (2023, 6): (2023, 7, 7),
    (2023, 7): (2023, 8, 4),
    (2023, 8): (2023, 9, 1),
    (2023, 9): (2023, 10, 6),
    (2023, 10): (2023, 11, 3),
    (2023, 11): (2023, 12, 8),

    # 2024
    (2023, 12): (2024, 1, 5),
    (2024, 1): (2024, 2, 2),
    (2024, 2): (2024, 3, 8),
    (2024, 3): (2024, 4, 5),
    (2024, 4): (2024, 5, 3),
    (2024, 5): (2024, 6, 7),
    (2024, 6): (2024, 7, 5),
    (2024, 7): (2024, 8, 2),
    (2024, 8): (2024, 9, 6),
    (2024, 9): (2024, 10, 4),
    (2024, 10): (2024, 11, 1),
    (2024, 11): (2024, 12, 6),

    # 2025
    (2024, 12): (2025, 1, 10),
    (2025, 1): (2025, 2, 7),
    (2025, 2): (2025, 3, 7),
    (2025, 3): (2025, 4, 4),
    (2025, 4): (2025, 5, 2),
    (2025, 5): (2025, 6, 6),
    (2025, 6): (2025, 7, 3),
    (2025, 7): (2025, 8, 1),
    (2025, 8): (2025, 9, 5),
    (2025, 9): (2025, 11, 20),
    # October 2025 was not separately published.
    (2025, 11): (2025, 12, 16),
    (2025, 12): (2026, 1, 9),

    # 2026
    (2026, 1): (2026, 2, 11),
    (2026, 2): (2026, 3, 6),
    (2026, 3): (2026, 4, 3),
    (2026, 4): (2026, 5, 8),
    (2026, 5): (2026, 6, 5),
    (2026, 6): (2026, 7, 2),
}


def download_bls_series(retries=4, timeout=180):
    payload = json.dumps({
        "seriesid": [NFP_SERIES],
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
                    "User-Agent": "EDGE-X-PRO-NFP/1.0",
                },
                method="POST",
            )

            with urllib.request.urlopen(request, timeout=timeout) as response:
                data = json.loads(response.read().decode("utf-8"))

            if data.get("status") != "REQUEST_SUCCEEDED":
                raise RuntimeError(f"BLS API failed: {data.get('message')}")

            CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            CACHE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
            return data

        except Exception as error:
            last_error = error
            print(f"  Failed: {error}")
            if attempt < retries:
                time.sleep(attempt * 3)

    if CACHE_FILE.exists():
        print("BLS API unavailable. Using cached BLS series.")
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))

    raise RuntimeError(f"BLS API failed and no cache exists: {last_error}")


def parse_values(data):
    series = data.get("Results", {}).get("series", [])

    if not series:
        raise RuntimeError("No Total Nonfarm Payroll series returned by BLS.")

    values = {}

    for row in series[0].get("data", []):
        period = row.get("period")
        if period not in MONTHS:
            continue

        raw_value = str(row.get("value", "")).replace(",", "").strip()
        if raw_value in ("", "-", "N/A"):
            continue

        try:
            value = float(raw_value)
        except ValueError:
            continue

        values[(int(row["year"]), MONTHS[period])] = value

    return values


def previous_month(year, month):
    return (year - 1, 12) if month == 1 else (year, month - 1)


def monthly_change(values, year, month):
    current = values.get((year, month))
    previous_key = previous_month(year, month)
    previous = values.get(previous_key)

    if current is None or previous is None:
        return None

    return round(current - previous, 0)


def build_event(values, reference_key, release_parts):
    year, month = reference_key

    current_total = values.get((year, month))
    previous_key = previous_month(year, month)
    previous_total = values.get(previous_key)

    if current_total is None or previous_total is None:
        return None

    actual = monthly_change(values, year, month)

    prior_key = previous_month(previous_key[0], previous_key[1])
    previous_change = None
    if values.get(prior_key) is not None:
        previous_change = round(previous_total - values[prior_key], 0)

    release_et = datetime(*release_parts, 8, 30, tzinfo=ET)
    release_utc = release_et.astimezone(UTC)
    release_ist = release_et.astimezone(IST)

    reference_period = datetime(year, month, 1).strftime("%B %Y")

    return {
        "id": f"NFP_{year}_{month:02d}",
        "events": ["US Nonfarm Payrolls"],
        "event": "NFP",
        "category": "NFP",
        "verified": True,

        "timestamp_et": release_et.isoformat(),
        "timestamp_utc": release_utc.isoformat(),
        "timestamp_ist": release_ist.isoformat(),
        "date_ist": release_ist.strftime("%Y-%m-%d"),
        "time_ist": release_ist.strftime("%H:%M"),

        "reference_periods": [reference_period],

        "numbers": {
            "total_nonfarm_payrolls_thousands": current_total,
            "actual": actual,
            "forecast": None,
            "previous": previous_change,
            "unit": "thousand jobs",
        },

        # Compatibility fields for reaction builders.
        "actual": actual,
        "forecast": None,
        "previous": previous_change,

        "release": {
            "previous": (
                f"{int(previous_change):+d}K"
                if previous_change is not None
                else None
            ),
            "actual": (
                f"{int(actual):+d}K"
                if actual is not None
                else None
            ),
            "result": "NFP RELEASE",
        },

        "official_source": "U.S. Bureau of Labor Statistics",
        "series_id": NFP_SERIES,
        "consensus_status": "PENDING_VERIFIED_SOURCE",

        "data_note": (
            "NFP monthly payroll change calculated from the official "
            "seasonally adjusted BLS Total Nonfarm Payroll employment "
            "series. Historical consensus is not included. Values from "
            "the live BLS series may include later revisions."
        ),
    }


def main():
    print()
    print("==============================================")
    print("EDGE X PRO - NFP DATABASE BUILDER V1")
    print("==============================================")
    print()
    print("Downloading official Total Nonfarm Payroll series from BLS API...")

    data = download_bls_series()
    values = parse_values(data)

    print(f"Loaded {len(values)} usable monthly observations.")

    events = []
    skipped = []

    for reference_key, release_parts in sorted(
        RELEASE_DATES.items(),
        key=lambda item: item[1],
    ):
        event = build_event(values, reference_key, release_parts)

        if event is None:
            skipped.append({
                "reference_period": f"{reference_key[0]}-{reference_key[1]:02d}",
                "reason": "Required BLS payroll values unavailable",
            })
            continue

        events.append(event)

        print(
            f"  {event['reference_periods'][0]} -> "
            f"{event['date_ist']} {event['time_ist']} IST | "
            f"NFP: {int(event['actual']):+d}K"
        )

    database = {
        "database_name": "EDGE X PRO Historical NFP Releases",
        "event_type": "NFP",
        "instrument": "XAUUSD",
        "total_verified_events": len(events),
        "total_skipped_events": len(skipped),

        "time_policy": {
            "release": "8:30 AM America/New_York",
            "internal": "UTC",
            "display": "Asia/Kolkata",
        },

        "actual_data_source": "U.S. Bureau of Labor Statistics Public Data API",
        "series_id": NFP_SERIES,

        "forecast_policy": (
            "Historical market consensus is intentionally null until a "
            "separately verified consensus source is added."
        ),

        "revision_warning": (
            "The BLS API series contains the latest revised payroll levels. "
            "Therefore calculated historical monthly changes can differ from "
            "the first NFP number reported on the original release day."
        ),

        "events": events,
        "skipped_events": skipped,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(database, indent=2), encoding="utf-8")

    print()
    print("==============================================")
    print("NFP DATABASE COMPLETE")
    print("==============================================")
    print()
    print(f"Verified events saved: {len(events)}")
    print(f"Skipped events: {len(skipped)}")
    print(f"Saved to: {OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()
