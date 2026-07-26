"use client";

import { calculateTradeQuality, Trade } from "@/lib/tradeQuality";

import CircularGauge from "./CircularGauge";
import ProgressBar from "./ProgressBar";
import ScoreCard from "./ScoreCard";
import AiVerdict from "./AiVerdict";
import AiCoach from "./AiCoach";
import StrengthWeaknessCard from "./StrengthWeaknessCard";
import RecommendationCard from "./RecommendationCard";

type Props = {
  trade: Trade;
};

export default function TradeQualityCard({
  trade,
}: Props) {

  const report = calculateTradeQuality(trade);

  return (

    <div className="space-y-8">

      {/* Header */}

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">

        <div className="grid gap-8 xl:grid-cols-2">

          {/* Gauge */}

          <div className="flex justify-center">

            <CircularGauge
              score={report.score}
            />

          </div>

          {/* Summary */}

          <div className="flex flex-col justify-center">

            <div className="inline-flex w-fit rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-400">

              🤖 EDGE AI ENGINE

            </div>

            <h1 className="mt-6 text-4xl font-black text-white">

              Trade Quality Analysis

            </h1>

            <p className="mt-4 leading-8 text-slate-300">

              {report.summary}

            </p>

            <div className="mt-8">

              <ProgressBar
                title="Confidence"
                value={report.confidence}
              />

            </div>

          </div>

        </div>

      </div>

      {/* Verdict */}

      <AiVerdict
        score={report.score}
      />

      {/* KPI */}

      <div className="grid gap-6 lg:grid-cols-4">

        <ScoreCard
          title="Risk"
          score={report.riskScore}
          description="Risk Management"
        />

        <ScoreCard
          title="Execution"
          score={report.executionScore}
          description="Trade Execution"
        />

        <ScoreCard
          title="Psychology"
          score={report.psychologyScore}
          description="Mental Performance"
        />

        <ScoreCard
          title="Discipline"
          score={report.disciplineScore}
          description="Rule Following"
        />

      </div>

      {/* Progress */}

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

        <h2 className="mb-8 text-2xl font-bold text-white">

          Score Breakdown

        </h2>

        <div className="space-y-6">

          <ProgressBar
            title="Risk Management"
            value={report.riskScore}
          />

          <ProgressBar
            title="Execution"
            value={report.executionScore}
          />

          <ProgressBar
            title="Psychology"
            value={report.psychologyScore}
          />

          <ProgressBar
            title="Discipline"
            value={report.disciplineScore}
          />

        </div>

      </div>

      {/* Strength / Weakness */}

      <StrengthWeaknessCard

        strengths={report.strengths}

        weaknesses={report.weaknesses}

      />

      {/* Recommendations */}

      <RecommendationCard

        recommendations={report.recommendations}

      />

      {/* Coach */}

      <AiCoach

        strengths={report.strengths}

        weaknesses={report.weaknesses}

        recommendations={report.recommendations}

        score={report.score}

      />

    </div>

  );

}