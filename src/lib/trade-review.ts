export type Trade = {
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exit: number;
  risk: number;
  pnl: number;
  emotion: string;
  ruleFollowed: string;
  strategy: string;
};

export type TradeReview = {
  edgeScore: number;
  riskScore: number;
  executionScore: number;
  psychologyScore: number;
  disciplineScore: number;

  strengths: string[];
  mistakes: string[];
  recommendations: string[];

  summary: string;
};

export function reviewTrade(trade: Trade): TradeReview {
  const strengths: string[] = [];
  const mistakes: string[] = [];
  const recommendations: string[] = [];

  // --------------------------
  // Risk Score
  // --------------------------

  let riskScore = 100;

  if (trade.risk > 2) {
    riskScore -= 20;
    mistakes.push("Risk exceeds 2%");
    recommendations.push("Reduce risk below 2% per trade.");
  } else if (trade.risk > 1) {
    riskScore -= 5;
    recommendations.push("Consider risking 1% for better consistency.");
  } else {
    strengths.push("Excellent risk management.");
  }

  // --------------------------
  // Psychology
  // --------------------------

  let psychologyScore = 100;

  switch (trade.emotion) {
    case "Calm":
      psychologyScore = 100;
      strengths.push("Calm emotional state.");
      break;

    case "Confident":
      psychologyScore = 95;
      strengths.push("Strong confidence.");
      break;

    case "Fear":
      psychologyScore = 70;
      mistakes.push("Fear detected.");
      recommendations.push("Trust your trading plan.");
      break;

    case "FOMO":
      psychologyScore = 50;
      mistakes.push("FOMO detected.");
      recommendations.push("Wait for confirmation before entering.");
      break;

    case "Greedy":
      psychologyScore = 40;
      mistakes.push("Greed detected.");
      recommendations.push("Follow your take-profit plan.");
      break;

    case "Revenge":
      psychologyScore = 20;
      mistakes.push("Revenge trading detected.");
      recommendations.push("Stop trading after emotional losses.");
      break;

    default:
      psychologyScore = 80;
  }

  // --------------------------
  // Discipline
  // --------------------------

  let disciplineScore = 100;

  if (trade.ruleFollowed === "Yes") {
    strengths.push("Trading plan followed.");
  } else if (trade.ruleFollowed === "Partially") {
    disciplineScore = 70;
    mistakes.push("Trading rules only partially followed.");
    recommendations.push("Stick to your complete trading plan.");
  } else {
    disciplineScore = 20;
    mistakes.push("Trading rules ignored.");
    recommendations.push("Never ignore your written rules.");
  }

  // --------------------------
  // Execution
  // --------------------------

  let executionScore = 100;

  if (trade.entry <= 0) {
    executionScore -= 20;
    mistakes.push("Invalid entry price.");
  }

  if (trade.stopLoss <= 0) {
    executionScore -= 20;
    mistakes.push("Missing stop loss.");
    recommendations.push("Always define a stop loss.");
  }

  if (trade.takeProfit <= 0) {
    executionScore -= 15;
    mistakes.push("Missing take profit.");
    recommendations.push("Plan your exit before entering.");
  }

  const riskDistance = Math.abs(trade.entry - trade.stopLoss);
  const rewardDistance = Math.abs(trade.takeProfit - trade.entry);

  if (riskDistance > 0) {
    const rr = rewardDistance / riskDistance;

    if (rr >= 2) {
      strengths.push(`Excellent Risk:Reward (${rr.toFixed(2)}R).`);
    } else if (rr >= 1.5) {
      strengths.push(`Good Risk:Reward (${rr.toFixed(2)}R).`);
    } else {
      executionScore -= 10;
      mistakes.push(`Low Risk:Reward (${rr.toFixed(2)}R).`);
      recommendations.push("Aim for at least 2R setups.");
    }
  }

  executionScore = Math.max(0, executionScore);

  // --------------------------
  // Edge Score
  // --------------------------

  const edgeScore = Math.round(
    riskScore * 0.25 +
      psychologyScore * 0.20 +
      disciplineScore * 0.25 +
      executionScore * 0.30
  );

  // --------------------------
  // Summary
  // --------------------------

  let summary = "";

  if (edgeScore >= 90) {
    summary =
      "Outstanding trade. Strong discipline, controlled risk, and excellent execution.";
  } else if (edgeScore >= 80) {
    summary =
      "Very good trade with only minor improvements needed.";
  } else if (edgeScore >= 70) {
    summary =
      "Average trade. Focus on improving execution and discipline.";
  } else if (edgeScore >= 60) {
    summary =
      "Below-average trade. Emotional control and risk management need attention.";
  } else {
    summary =
      "Poor-quality trade. Review your trading plan before taking similar setups.";
  }

  return {
    edgeScore,
    riskScore,
    executionScore,
    psychologyScore,
    disciplineScore,

    strengths,
    mistakes,
    recommendations,

    summary,
  };
}