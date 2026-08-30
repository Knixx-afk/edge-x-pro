"""EDGE X PRO local MT5 bridge.

Run this on the same Windows machine where the MetaTrader 5 desktop terminal
is installed and logged into the trading account.

Default: http://127.0.0.1:8765
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import json
import os
import time

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None

HOST = os.getenv("EDGE_X_MT5_HOST", "127.0.0.1")
PORT = int(os.getenv("EDGE_X_MT5_PORT", "8765"))
SYMBOL = os.getenv("EDGE_X_MT5_SYMBOL", "XAUUSD")

TIMEFRAMES = {
    "M1": "TIMEFRAME_M1",
    "M5": "TIMEFRAME_M5",
    "M15": "TIMEFRAME_M15",
    "M30": "TIMEFRAME_M30",
    "H1": "TIMEFRAME_H1",
    "H4": "TIMEFRAME_H4",
    "D1": "TIMEFRAME_D1",
}


def json_response(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def ensure_mt5():
    if mt5 is None:
        raise RuntimeError("MetaTrader5 Python package is not installed")
    if not mt5.initialize():
        raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")
    if not mt5.symbol_select(SYMBOL, True):
        raise RuntimeError(f"Cannot select {SYMBOL}: {mt5.last_error()}")


def get_tick():
    ensure_mt5()
    tick = mt5.symbol_info_tick(SYMBOL)
    if tick is None:
        raise RuntimeError(f"No tick available for {SYMBOL}: {mt5.last_error()}")
    return {
        "connected": True,
        "symbol": SYMBOL,
        "bid": float(tick.bid),
        "ask": float(tick.ask),
        "last": float(tick.last or tick.bid),
        "time": int(tick.time),
        "serverTime": time.time(),
    }


def get_bars(timeframe, limit):
    ensure_mt5()
    tf_name = TIMEFRAMES.get(timeframe.upper(), "TIMEFRAME_M5")
    tf = getattr(mt5, tf_name)
    rates = mt5.copy_rates_from_pos(SYMBOL, tf, 0, max(20, min(int(limit), 500)))
    if rates is None:
        raise RuntimeError(f"No bars available: {mt5.last_error()}")

    bars = []
    for row in rates:
        bars.append({
            "time": int(row["time"]),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": int(row["tick_volume"]),
        })
    return {"connected": True, "symbol": SYMBOL, "timeframe": timeframe.upper(), "bars": bars}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        return

    def do_GET(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/health":
                json_response(self, 200, {"connected": mt5 is not None, "symbol": SYMBOL})
                return
            if parsed.path == "/tick":
                json_response(self, 200, get_tick())
                return
            if parsed.path == "/bars":
                query = parse_qs(parsed.query)
                timeframe = query.get("timeframe", ["M5"])[0]
                limit = query.get("limit", ["150"])[0]
                json_response(self, 200, get_bars(timeframe, limit))
                return
            json_response(self, 404, {"error": "Not found"})
        except Exception as exc:
            json_response(self, 503, {"connected": False, "error": str(exc)})


if __name__ == "__main__":
    print(f"EDGE X PRO MT5 bridge: http://{HOST}:{PORT}")
    print(f"Symbol: {SYMBOL}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
