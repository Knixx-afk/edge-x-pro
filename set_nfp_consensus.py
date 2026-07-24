import json
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SETUP_FILE = BASE_DIR / "data" / "nfp" / "context" / "current_setup.json"
CONSENSUS_FILE = BASE_DIR / "data" / "nfp" / "context" / "verified_consensus.json"


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

            # NFP values are in thousands of jobs, so allow a wide,
            # but still reasonable, validation range.
            if -2000 <= number <= 2000:
                return number
        except ValueError:
            pass

        print("Enter a valid NFP value in thousands, for example 150")


def main():
    print("EDGE X PRO - VERIFIED NFP CONSENSUS INPUT")

    if not SETUP_FILE.exists():
        print("Missing:", SETUP_FILE)
        return

    forecast = ask_number(
        "Upcoming NFP consensus (thousand jobs) [example 150]: "
    )

    previous = ask_number(
        "Previous NFP (thousand jobs) [Enter if unknown]: ",
        True,
    )

    source = input(
        "Consensus source name [example Reuters]: "
    ).strip()

    if not source:
        print("Source is required. Nothing changed.")
        return

    reference = input(
        "Source page/reference [optional]: "
    ).strip()

    event_date = input(
        "Upcoming release date YYYY-MM-DD [optional]: "
    ).strip()

    now = datetime.now(timezone.utc).isoformat()

    record = {
        "event": "US Nonfarm Payrolls",
        "forecast": forecast,
        "previous": previous,
        "unit": "thousand jobs",
        "source": source,
        "source_reference": reference or None,
        "event_date": event_date or None,
        "verified_by_user": True,
        "updated_at_utc": now,
    }

    save_json(CONSENSUS_FILE, record)

    setup = load_json(SETUP_FILE)

    nfp = (
        setup
        .setdefault("fundamental", {})
        .setdefault("macro", {})
        .setdefault("nfp", {})
    )

    nfp["forecast"] = forecast

    if previous is not None:
        nfp["previous"] = previous

    nfp["consensus_source"] = source
    nfp["consensus_source_reference"] = reference or None
    nfp["consensus_updated_at_utc"] = now
    nfp["consensus_verified"] = True

    if event_date:
        nfp["upcoming_event_date"] = event_date

    setup["nfp_consensus"] = record

    save_json(SETUP_FILE, setup)

    print("\nConsensus saved.")
    print("Forecast NFP:", forecast, "thousand jobs")

    if previous is not None:
        print("Previous NFP:", previous, "thousand jobs")

    print("Source:", source)
    print("\nNow run: python build_nfp_upcoming_intelligence.py")


if __name__ == "__main__":
    main()
