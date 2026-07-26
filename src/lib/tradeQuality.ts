export type Trade = {
  rr?: number;
  riskPercent?: number;
  followedPlan?: boolean;
  respectedStopLoss?: boolean;
  emotions?: string;
  outcome?: "WIN" | "LOSS" | "BE";
};

export type TradeQualityReport = {
  score: number;
  grade: string;
  confidence: number;

  riskScore: number;
  executionScore: number;
  psychologyScore: number;
  disciplineScore: number;

  strengths: string[];
  weaknesses: string[];
  recommendations: string[];

  summary: string;
};

export function calculateTradeQuality(
  trade: Trade
): TradeQualityReport {
  let riskScore = 100;
  let executionScore = 100;
  let psychologyScore = 100;
  let disciplineScore = 100;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Risk

  if ((trade.riskPercent ?? 0) > 2) {
    riskScore -= 25;
    weaknesses.push("Risk per trade exceeded 2%");
    recommendations.push("Reduce position size.");
  } else {
    strengths.push("Risk was controlled.");
  }

  if (trade.respectedStopLoss) {
    strengths.push("Stop loss was respected.");
  } else {
    riskScore -= 20;
    disciplineScore -= 20;
    weaknesses.push("Stop loss was moved or ignored.");
    recommendations.push("Never move your stop loss.");
  }

  // Discipline

  if (trade.followedPlan) {
    strengths.push("Followed trading plan.");
  } else {
    disciplineScore -= 30;
    executionScore -= 15;
    weaknesses.push("Trade was outside the trading plan.");
    recommendations.push("Only trade approved setups.");
  }

  // Psychology

  if (trade.emotions) {
    const emotion = trade.emotions.toLowerCase();

    if (
      emotion.includes("fear") ||
      emotion.includes("revenge") ||
      emotion.includes("fomo")
    ) {
      psychologyScore -= 30;
      weaknesses.push(`Negative emotion detected: ${trade.emotions}`);
      recommendations.push("Stay emotionally neutral before entry.");
    } else {
      strengths.push("Emotional control was good.");
    }
  }

  // Reward/Risk

  if ((trade.rr ?? 0) >= 2) {
    strengths.push("Reward-to-risk ratio was excellent.");
  } else {
    executionScore -= 15;
    recommendations.push("Aim for at least 1:2 reward-to-risk.");
  }

  riskScore = Math.max(0, Math.min(100, riskScore));
  executionScore = Math.max(0, Math.min(100, executionScore));
  psychologyScore = Math.max(0, Math.min(100, psychologyScore));
  disciplineScore = Math.max(0, Math.min(100, disciplineScore));

  const score = Math.round(
    (riskScore +
      executionScore +
      psychologyScore +
      disciplineScore) / 4
  );

  let grade = "D";

  if (score >= 95) grade = "A+";
  else if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";

  const confidence = Math.min(
    100,
    Math.max(
      50,
      score +
        (strengths.length - weaknesses.length) * 5
    )
  );

  let summary = "";

  if (score >= 90) {
    summary =
      "Excellent trade execution. Continue repeating this process.";
  } else if (score >= 80) {
    summary =
      "Good trade with only minor improvements needed.";
  } else if (score >= 70) {
    summary =
      "Average trade. Several areas should be improved.";
  } else {
    summary =
      "Poor quality trade. Focus on discipline and execution before increasing risk.";
  }

  return {
    score,
    grade,
    confidence,

    riskScore,
    executionScore,
    psychologyScore,
    disciplineScore,

    strengths,
    weaknesses,
    recommendations,

    summary,
  };
}