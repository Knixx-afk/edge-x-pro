from pathlib import Path

ROOT = Path.cwd()

folders = [
    "src/components/dashboard",
    "src/components/intelligence",
    "src/components/charts",
    "src/components/ai",
    "src/components/layout",
    "src/components/cards",
    "src/components/ui",
    "src/hooks",
    "src/lib",
    "src/services",
    "src/types",
]

files = [
    # Dashboard
    "src/components/dashboard/AIBiasCard.tsx",
    "src/components/dashboard/ConfidenceGauge.tsx",
    "src/components/dashboard/EventCountdown.tsx",
    "src/components/dashboard/MarketOverview.tsx",
    "src/components/dashboard/HorizonPredictions.tsx",
    "src/components/dashboard/RecentSignals.tsx",
    "src/components/dashboard/HistoricalSummary.tsx",
    "src/components/dashboard/DashboardHeader.tsx",
    "src/components/dashboard/DashboardGrid.tsx",

    # Intelligence
    "src/components/intelligence/TechnicalSummary.tsx",
    "src/components/intelligence/FundamentalSummary.tsx",
    "src/components/intelligence/AIReasoning.tsx",
    "src/components/intelligence/ProbabilityMatrix.tsx",
    "src/components/intelligence/HistoricalMatches.tsx",
    "src/components/intelligence/TradePlanner.tsx",

    # Charts
    "src/components/charts/GoldChart.tsx",
    "src/components/charts/HistoricalReactionChart.tsx",
    "src/components/charts/MarketHeatmap.tsx",

    # AI
    "src/components/ai/ConfidenceBar.tsx",
    "src/components/ai/BiasIndicator.tsx",
    "src/components/ai/RiskMeter.tsx",

    # Layout
    "src/components/layout/PageContainer.tsx",
    "src/components/layout/SectionCard.tsx",

    # Cards
    "src/components/cards/MetricCard.tsx",
    "src/components/cards/ProbabilityCard.tsx",
    "src/components/cards/SignalCard.tsx",

    # UI
    "src/components/ui/LoadingSkeleton.tsx",
    "src/components/ui/AnimatedCounter.tsx",
    "src/components/ui/GlassCard.tsx",

    # Services
    "src/services/intelligenceService.ts",
    "src/services/marketService.ts",

    # Hooks
    "src/hooks/useUpcomingIntelligence.ts",
    "src/hooks/usePatternIntelligence.ts",

    # Types
    "src/types/intelligence.ts",
]

print("Creating folders...")

for folder in folders:
    path = ROOT / folder
    path.mkdir(parents=True, exist_ok=True)
    print(f"✓ {folder}")

print("\nCreating files...")

for file in files:
    path = ROOT / file
    path.parent.mkdir(parents=True, exist_ok=True)

    if not path.exists():
        path.write_text(
            """export default function Component() {
  return (
    <div>
      TODO
    </div>
  );
}
""",
            encoding="utf-8",
        )
        print(f"✓ {file}")
    else:
        print(f"• Exists: {file}")

print("\nEDGE X PRO V2 structure created successfully!")