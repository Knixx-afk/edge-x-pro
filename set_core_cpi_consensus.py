import json
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SETUP_FILE = BASE_DIR / "data" / "cpi" / "context" / "current_setup.json"
CONSENSUS_FILE = BASE_DIR / "data" / "cpi" / "context" / "verified_consensus.json"

def load_json(path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def ask_number(label, allow_blank=False):
    while True:
        value = input(label).strip()
        if allow_blank and not value:
            return None
        try:
            number = float(value)
            if -10 <= number <= 10:
                return number
        except ValueError:
            pass
        print("Enter a valid percentage, for example 0.3")

def main():
    print("EDGE X PRO - VERIFIED CORE CPI CONSENSUS INPUT")
    if not SETUP_FILE.exists():
        print("Missing:", SETUP_FILE)
        return

    forecast = ask_number("Upcoming Core CPI MoM consensus (%) [example 0.3]: ")
    previous = ask_number("Previous Core CPI MoM (%) [Enter if unknown]: ", True)
    source = input("Consensus source name [example Reuters]: ").strip()
    if not source:
        print("Source is required. Nothing changed.")
        return
    reference = input("Source page/reference [optional]: ").strip()
    event_date = input("Upcoming release date YYYY-MM-DD [optional]: ").strip()
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "event": "US Core CPI MoM",
        "forecast_mom": forecast,
        "previous_mom": previous,
        "source": source,
        "source_reference": reference or None,
        "event_date": event_date or None,
        "verified_by_user": True,
        "updated_at_utc": now,
    }
    save_json(CONSENSUS_FILE, record)

    setup = load_json(SETUP_FILE)
    core = setup.setdefault("fundamental", {}).setdefault("macro", {}).setdefault("core_cpi", {})
    core["forecast_mom"] = forecast
    core["forecast"] = forecast
    if previous is not None:
        core["previous_mom"] = previous
        core["previous"] = previous
    core["consensus_source"] = source
    core["consensus_source_reference"] = reference or None
    core["consensus_updated_at_utc"] = now
    core["consensus_verified"] = True
    if event_date:
        core["upcoming_event_date"] = event_date
    setup["core_cpi_consensus"] = record
    save_json(SETUP_FILE, setup)

    print("\nConsensus saved.")
    print("Forecast MoM:", forecast)
    print("Source:", source)
    print("\nNow run: python build_core_cpi_upcoming_intelligence.py")

if __name__ == "__main__":
    main()
