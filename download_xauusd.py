import csv
import io
import lzma
import struct
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


# ============================================================
# EDGE X PRO
# DUKASCOPY XAUUSD SPOT DATA DOWNLOADER
#
# Downloads Dukascopy tick data directly from the public
# historical data feed, converts it into 1-minute candles,
# and saves clean CSV files for EDGE X PRO.
#
# INTERNAL TIMEZONE: UTC
# DISPLAY TIMEZONE: IST
# ============================================================


INSTRUMENT = "XAUUSD"

# Dukascopy XAUUSD prices use 3 decimal places.
POINT_SCALE = 1000.0

# Dukascopy tick record:
#
# milliseconds from start of hour
# ask price
# bid price
# ask volume
# bid volume
#
# Big-endian binary structure.
TICK_STRUCT = struct.Struct(">3I2f")

BASE_URLS = [
    "https://datafeed.dukascopy.com/datafeed",
    "https://datafeed.dukascopy.com/datafeed",
]

OUTPUT_DIRECTORY = Path("data") / "xauusd"


# ============================================================
# DATE / TIME HELPERS
# ============================================================


def parse_date(value):
    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d",
        ).replace(
            tzinfo=timezone.utc
        )
    except ValueError:
        raise ValueError(
            "Date must use YYYY-MM-DD format."
        )


def format_utc(dt):
    return dt.astimezone(
        timezone.utc
    ).strftime(
        "%Y-%m-%d %H:%M:%S"
    )


def format_ist(dt):
    ist = timezone(
        timedelta(
            hours=5,
            minutes=30,
        )
    )

    return dt.astimezone(
        ist
    ).strftime(
        "%Y-%m-%d %H:%M:%S"
    )


# ============================================================
# DUKASCOPY URL
# ============================================================


def build_url(hour):
    """
    Dukascopy folder structure:

    SYMBOL/YYYY/MM/DD/HHh_ticks.bi5

    IMPORTANT:

    Dukascopy months are zero-based.

    January = 00
    February = 01
    ...
    December = 11
    """

    year = hour.year

    month = hour.month - 1

    day = hour.day

    hour_number = hour.hour

    return (
        f"{BASE_URLS[0]}/"
        f"{INSTRUMENT}/"
        f"{year}/"
        f"{month:02d}/"
        f"{day:02d}/"
        f"{hour_number:02d}h_ticks.bi5"
    )


# ============================================================
# DOWNLOAD ONE HOUR
# ============================================================


def download_hour(hour):
    url = build_url(hour)

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent":
                "Mozilla/5.0 "
                "(Windows NT 10.0; Win64; x64)",

            "Accept":
                "*/*",
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=30,
        ) as response:

            compressed_data = (
                response.read()
            )

            if not compressed_data:
                return []

    except urllib.error.HTTPError as error:

        # Missing hour / weekend / no trading.
        if error.code in (
            404,
            403,
        ):
            return []

        print(
            f"HTTP error {error.code}: "
            f"{format_utc(hour)}"
        )

        return []

    except Exception as error:

        print(
            f"Download failed: "
            f"{format_utc(hour)}"
        )

        print(
            f"Reason: {error}"
        )

        return []

    # --------------------------------------------------------
    # DECOMPRESS BI5
    # --------------------------------------------------------

    try:
        binary_data = lzma.decompress(
            compressed_data
        )

    except lzma.LZMAError:

        print(
            f"Could not decompress: "
            f"{format_utc(hour)}"
        )

        return []

    # --------------------------------------------------------
    # PARSE TICKS
    # --------------------------------------------------------

    ticks = []

    record_size = (
        TICK_STRUCT.size
    )

    for offset in range(
        0,
        len(binary_data),
        record_size,
    ):

        record = binary_data[
            offset:
            offset + record_size
        ]

        if (
            len(record)
            != record_size
        ):
            continue

        try:

            (
                milliseconds,
                ask_raw,
                bid_raw,
                ask_volume,
                bid_volume,

            ) = TICK_STRUCT.unpack(
                record
            )

        except struct.error:
            continue

        timestamp = (
            hour
            + timedelta(
                milliseconds=milliseconds
            )
        )

        ask = (
            ask_raw
            / POINT_SCALE
        )

        bid = (
            bid_raw
            / POINT_SCALE
        )

        # Mid-price gives us a clean
        # broker-neutral spot price.
        mid = (
            ask + bid
        ) / 2

        spread = (
            ask - bid
        )

        ticks.append(
            {
                "timestamp":
                    timestamp,

                "bid":
                    bid,

                "ask":
                    ask,

                "mid":
                    mid,

                "spread":
                    spread,

                "bid_volume":
                    bid_volume,

                "ask_volume":
                    ask_volume,
            }
        )

    return ticks


# ============================================================
# CONVERT TICKS TO M1 CANDLES
# ============================================================


def ticks_to_m1(ticks):

    candles = {}

    for tick in ticks:

        minute = (
            tick["timestamp"]
            .replace(
                second=0,
                microsecond=0,
            )
        )

        price = (
            tick["mid"]
        )

        if minute not in candles:

            candles[minute] = {
                "timestamp":
                    minute,

                "open":
                    price,

                "high":
                    price,

                "low":
                    price,

                "close":
                    price,

                "tick_count":
                    1,

                "spread_sum":
                    tick["spread"],
            }

        else:

            candle = (
                candles[minute]
            )

            candle["high"] = max(
                candle["high"],
                price,
            )

            candle["low"] = min(
                candle["low"],
                price,
            )

            candle["close"] = (
                price
            )

            candle["tick_count"] += 1

            candle["spread_sum"] += (
                tick["spread"]
            )

    results = []

    for timestamp in sorted(
        candles.keys()
    ):

        candle = (
            candles[timestamp]
        )

        average_spread = (
            candle["spread_sum"]
            / candle["tick_count"]
        )

        results.append(
            {
                "timestamp_utc":
                    timestamp.strftime(
                        "%Y-%m-%d %H:%M:%S"
                    ),

                "timestamp_ist":
                    format_ist(
                        timestamp
                    ),

                "open":
                    round(
                        candle["open"],
                        3,
                    ),

                "high":
                    round(
                        candle["high"],
                        3,
                    ),

                "low":
                    round(
                        candle["low"],
                        3,
                    ),

                "close":
                    round(
                        candle["close"],
                        3,
                    ),

                "tick_count":
                    candle[
                        "tick_count"
                    ],

                "average_spread":
                    round(
                        average_spread,
                        3,
                    ),
            }
        )

    return results


# ============================================================
# SAVE CSV
# ============================================================


def save_csv(
    candles,
    start_date,
    end_date,
):

    OUTPUT_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    filename = (
        f"xauusd_m1_"
        f"{start_date.strftime('%Y%m%d')}_"
        f"{end_date.strftime('%Y%m%d')}.csv"
    )

    output_path = (
        OUTPUT_DIRECTORY
        / filename
    )

    fields = [
        "timestamp_utc",
        "timestamp_ist",
        "open",
        "high",
        "low",
        "close",
        "tick_count",
        "average_spread",
    ]

    with open(
        output_path,
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = (
            csv.DictWriter(
                file,
                fieldnames=fields,
            )
        )

        writer.writeheader()

        writer.writerows(
            candles
        )

    return output_path


# ============================================================
# DOWNLOAD DATE RANGE
# ============================================================


def download_range(
    start_date,
    end_date,
):

    current_hour = (
        start_date
    )

    final_hour = (
        end_date
        + timedelta(
            days=1
        )
    )

    all_ticks = []

    total_hours = int(
        (
            final_hour
            - current_hour
        ).total_seconds()
        / 3600
    )

    completed = 0

    print()
    print(
        "=============================================="
    )

    print(
        "EDGE X PRO - XAUUSD DATA DOWNLOADER"
    )

    print(
        "=============================================="
    )

    print(
        f"Instrument: {INSTRUMENT}"
    )

    print(
        f"From: {start_date.date()}"
    )

    print(
        f"To: {end_date.date()}"
    )

    print(
        "Source: Dukascopy Historical Data"
    )

    print(
        "Output: XAUUSD M1"
    )

    print(
        "Internal timezone: UTC"
    )

    print(
        "Display timezone: IST"
    )

    print(
        "=============================================="
    )

    print()

    while (
        current_hour
        < final_hour
    ):

        completed += 1

        percentage = (
            completed
            / total_hours
        ) * 100

        print(
            f"[{percentage:6.2f}%] "
            f"Downloading "
            f"{format_utc(current_hour)} UTC",
            end="",
        )

        ticks = (
            download_hour(
                current_hour
            )
        )

        if ticks:

            all_ticks.extend(
                ticks
            )

            print(
                f" -> "
                f"{len(ticks):,} ticks"
            )

        else:

            print(
                " -> no data"
            )

        current_hour += (
            timedelta(
                hours=1
            )
        )

        # Small delay to avoid aggressively
        # hitting the public data server.
        time.sleep(
            0.05
        )

    print()

    if not all_ticks:

        print(
            "ERROR: No XAUUSD data was downloaded."
        )

        print()
        print(
            "Possible reasons:"
        )

        print(
            "1. Dukascopy data server is unavailable."
        )

        print(
            "2. Your internet/network is blocking the data server."
        )

        print(
            "3. The requested date has no market data."
        )

        return None

    print(
        f"Downloaded "
        f"{len(all_ticks):,} total ticks."
    )

    print(
        "Converting ticks to M1 candles..."
    )

    candles = (
        ticks_to_m1(
            all_ticks
        )
    )

    print(
        f"Created "
        f"{len(candles):,} M1 candles."
    )

    output_path = (
        save_csv(
            candles,
            start_date,
            end_date,
        )
    )

    print()

    print(
        "=============================================="
    )

    print(
        "DOWNLOAD COMPLETE"
    )

    print(
        "=============================================="
    )

    print(
        f"File saved:"
    )

    print(
        output_path.resolve()
    )

    print()

    if candles:

        print(
            "First candle:"
        )

        print(
            candles[0]
        )

        print()

        print(
            "Last candle:"
        )

        print(
            candles[-1]
        )

    return output_path


# ============================================================
# MAIN
# ============================================================


def main():

    print()
    print(
        "EDGE X PRO XAUUSD M1 DOWNLOADER"
    )

    print()

    print(
        "Enter dates using YYYY-MM-DD"
    )

    print()

    start_input = input(
        "Start date: "
    ).strip()

    end_input = input(
        "End date: "
    ).strip()

    try:

        start_date = (
            parse_date(
                start_input
            )
        )

        end_date = (
            parse_date(
                end_input
            )
        )

    except ValueError as error:

        print()

        print(
            f"ERROR: {error}"
        )

        sys.exit(
            1
        )

    if (
        end_date
        < start_date
    ):

        print()

        print(
            "ERROR: End date cannot be before start date."
        )

        sys.exit(
            1
        )

    download_range(
        start_date,
        end_date,
    )


if __name__ == "__main__":
    main()