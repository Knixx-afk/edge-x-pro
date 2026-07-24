from datetime import datetime, timezone
import MetaTrader5 as mt5


if not mt5.initialize():
    print("MT5 connection failed:", mt5.last_error())
    quit()


symbol = "XAUUSD"

mt5.symbol_select(symbol, True)


# Download a wide window around the news.
# 14 July 2026
#
# We deliberately inspect every large M1 candle
# instead of assuming the broker/API timezone.

start = datetime(
    2026, 7, 14,
    10, 0,
    tzinfo=timezone.utc
)

end = datetime(
    2026, 7, 14,
    18, 0,
    tzinfo=timezone.utc
)


rates = mt5.copy_rates_range(
    symbol,
    mt5.TIMEFRAME_M1,
    start,
    end
)


if rates is None or len(rates) == 0:

    print("No data received.")
    print("MT5 error:", mt5.last_error())

    mt5.shutdown()
    quit()


print()
print("==============================================")
print("MT5 TIME DIAGNOSTIC")
print("14 JULY 2026")
print("==============================================")
print()

print("Candles received:", len(rates))
print()


# Print every candle with a range greater than $15.
# The screenshot shows approximately a $55-$60 candle,
# so the real news candle should stand out clearly.

large_candles = []


for rate in rates:

    timestamp = datetime.fromtimestamp(
        int(rate["time"]),
        tz=timezone.utc
    )

    open_price = float(rate["open"])
    high = float(rate["high"])
    low = float(rate["low"])
    close = float(rate["close"])

    candle_range = high - low
    body = close - open_price


    if candle_range >= 15:

        large_candles.append({
            "timestamp": timestamp,
            "open": open_price,
            "high": high,
            "low": low,
            "close": close,
            "range": candle_range,
            "body": body,
        })


print("LARGE M1 CANDLES:")
print()


if not large_candles:

    print("No M1 candle with range >= $15 found.")


for candle in large_candles:

    print("----------------------------------------------")

    print(
        "API TIMESTAMP:",
        candle["timestamp"].strftime(
            "%Y-%m-%d %H:%M:%S UTC"
        )
    )

    print(
        "OPEN:",
        round(candle["open"], 3)
    )

    print(
        "HIGH:",
        round(candle["high"], 3)
    )

    print(
        "LOW:",
        round(candle["low"], 3)
    )

    print(
        "CLOSE:",
        round(candle["close"], 3)
    )

    print(
        "RANGE:",
        round(candle["range"], 3)
    )

    print(
        "BODY:",
        round(candle["body"], 3)
    )


# Also print specific possible timestamps.

print()
print("==============================================")
print("CANDIDATE TIMES")
print("==============================================")


candidate_hours = [
    (12, 30),
    (13, 30),
    (14, 30),
    (15, 30),
]


for hour, minute in candidate_hours:

    print()
    print(
        f"--- API {hour:02d}:{minute:02d} ---"
    )

    found = False

    for rate in rates:

        timestamp = datetime.fromtimestamp(
            int(rate["time"]),
            tz=timezone.utc
        )

        if (
            timestamp.hour == hour
            and timestamp.minute == minute
        ):

            open_price = float(rate["open"])
            high = float(rate["high"])
            low = float(rate["low"])
            close = float(rate["close"])

            print(
                "O:",
                round(open_price, 3)
            )

            print(
                "H:",
                round(high, 3)
            )

            print(
                "L:",
                round(low, 3)
            )

            print(
                "C:",
                round(close, 3)
            )

            print(
                "RANGE:",
                round(
                    high - low,
                    3
                )
            )

            print(
                "BODY:",
                round(
                    close - open_price,
                    3
                )
            )

            found = True
            break


    if not found:

        print("Candle not found.")


mt5.shutdown()