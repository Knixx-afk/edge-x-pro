"use client";

import DashboardHeader from "./DashboardHeader";
import MarketOverview from "./MarketOverview";
import ConfidenceGauge from "./ConfidenceGauge";
import EventCountdown from "./EventCountdown";
import AIBiasCard from "./AIBiasCard";
import HorizonPredictions from "./HorizonPredictions";
import HistoricalSummary from "./HistoricalSummary";
import RecentSignals from "./RecentSignals";

export default function DashboardGrid() {
  return (
    <div className="space-y-6">

      <DashboardHeader />

      <div className="grid gap-6 lg:grid-cols-12">

        <div className="lg:col-span-8">
          <MarketOverview />
        </div>

        <div className="lg:col-span-4">
          <ConfidenceGauge />
        </div>

      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <EventCountdown />

        <AIBiasCard />

        <HistoricalSummary />

        <RecentSignals />

      </div>

      <HorizonPredictions />

    </div>
  );
}