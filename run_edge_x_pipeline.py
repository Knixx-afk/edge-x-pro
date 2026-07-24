import subprocess
import sys
from pathlib import Path


# ============================================================
# EDGE X PRO
# AUTOMATIC STARTUP PIPELINE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent


# Run these files automatically before Edge X starts.
#
# IMPORTANT:
# collect_live_fomc_macro_markets.py is temporarily disabled
# because the FRED connection is timing out.
#
# We will replace it with a more reliable collector later.

SCRIPTS = [
    "collect_live_fomc_fundamentals.py",
    "collect_live_fomc_macro_markets.py",
    "collect_live_fomc_market_context.py",
    "collect_live_fomc_technical.py",
    "build_upcoming_intelligence.py",
]


def run_script(script_name):

    script_path = BASE_DIR / script_name

    print()
    print("=" * 70)
    print(f"EDGE X PIPELINE: {script_name}")
    print("=" * 70)

    # Do not crash the whole app if an optional
    # collector file does not exist.

    if not script_path.exists():

        print()
        print(
            f"SKIPPED: {script_name}"
        )

        print(
            "Reason: File not found."
        )

        return False


    try:

        result = subprocess.run(

            [
                sys.executable,
                str(script_path),
            ],

            cwd=str(BASE_DIR),

            check=False,

        )


        if result.returncode == 0:

            print()
            print(
                f"SUCCESS: {script_name}"
            )

            return True


        print()
        print(
            f"WARNING: {script_name}"
        )

        print(
            f"Exited with code "
            f"{result.returncode}"
        )

        print(
            "The pipeline will continue."
        )

        return False


    except Exception as error:

        print()
        print(
            f"ERROR running "
            f"{script_name}"
        )

        print(error)

        print(
            "The pipeline will continue."
        )

        return False


def main():

    print()
    print("=" * 70)
    print("EDGE X PRO")
    print("AUTOMATIC INTELLIGENCE PIPELINE")
    print("=" * 70)


    results = {}


    for script_name in SCRIPTS:

        results[
            script_name
        ] = run_script(
            script_name
        )


    print()
    print("=" * 70)
    print("EDGE X PIPELINE COMPLETE")
    print("=" * 70)


    for script_name, success in results.items():

        status = (
            "OK"
            if success
            else
            "WARNING"
        )

        print(
            f"{status}: {script_name}"
        )


    print()
    print(
        "Edge X can now start."
    )


if __name__ == "__main__":

    main()