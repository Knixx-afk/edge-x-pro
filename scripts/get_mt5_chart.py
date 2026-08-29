import argparse
import json
import sys
from datetime import datetime, timezone

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "MetaTrader5 Python package is not installed."
    }))
    sys.exit(0)


SYMBOL = "XAUUSD"

TIMEFRAME_MAP = {
    "M1": mt5.TIMEFRAME_M1,
    "M5": mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1": mt5.TIMEFRAME_H1,
    "H4": mt5.TIMEFRAME_H4,
}

DEFAULT_TIMEFRAME = "M1"

# Number of candles returned for each request.
CANDLE_COUNT_MAP = {
    "M1": 500,
    "M5": 500,
    "M15": 500,
    "M30": 500,
    "H1": 500,
    "H4": 500,
}


def get_arguments():
    parser = argparse.ArgumentParser(
        description="Get live XAUUSD candles from MetaTrader 5."
    )

    parser.add_argument(
        "--timeframe",
        type=str,
        default=DEFAULT_TIMEFRAME,
        help="Chart timeframe: M1, M5, M15, M30, H1, H4"
    )

    return parser.parse_args()


def main():
    args = get_arguments()

    requested_timeframe = args.timeframe.upper().strip()

    if requested_timeframe not in TIMEFRAME_MAP:
        print(json.dumps({
            "success": False,
            "error": (
                f"Invalid timeframe '{requested_timeframe}'. "
                f"Allowed values: {', '.join(TIMEFRAME_MAP.keys())}"
            )
        }))
        return

    mt5_timeframe = TIMEFRAME_MAP[requested_timeframe]
    candle_count = CANDLE_COUNT_MAP[requested_timeframe]

    if not mt5.initialize():
        print(json.dumps({
            "success": False,
            "error": f"MT5 initialization failed: {mt5.last_error()}"
        }))
        return

    try:
        if not mt5.symbol_select(SYMBOL, True):
            print(json.dumps({
                "success": False,
                "error": f"Could not select symbol {SYMBOL}"
            }))
            return

        rates = mt5.copy_rates_from_pos(
            SYMBOL,
            mt5_timeframe,
            0,
            candle_count
        )

        if rates is None or len(rates) == 0:
            print(json.dumps({
                "success": False,
                "error": (
                    f"No {requested_timeframe} candle data received "
                    f"for {SYMBOL}. MT5 error: {mt5.last_error()}"
                )
            }))
            return

        tick = mt5.symbol_info_tick(SYMBOL)

        candles = []

        for rate in rates:
            candles.append({
                "time": int(rate["time"]),
                "open": float(rate["open"]),
                "high": float(rate["high"]),
                "low": float(rate["low"]),
                "close": float(rate["close"]),
                "tick_volume": int(rate["tick_volume"])
            })

        result = {
            "success": True,
            "symbol": SYMBOL,
            "timeframe": requested_timeframe,
            "server_time": datetime.now(timezone.utc).isoformat(),
            "price": {
                "bid": float(tick.bid) if tick else None,
                "ask": float(tick.ask) if tick else None,
                "last": float(tick.last) if tick else None
            },
            "candles": candles
        }

        print(json.dumps(result))

    except Exception as error:
        print(json.dumps({
            "success": False,
            "error": str(error)
        }))

    finally:
        mt5.shutdown()


if __name__ == "__main__":
    main()
