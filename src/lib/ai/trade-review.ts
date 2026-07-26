export type Trade = {
  pnl?: number;
  risk?: number;
  emotion?: string;
  ruleFollowed?: string;
  planned?: boolean;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  exit?: number;
  direction?: string;
  session?: string;
  strategy?: string;
};

export type TradeReview = {
  edgeScore: number;
  grade: string;
  confidence: number;

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

  let riskScore = 100;
  let executionScore = 100;
  let psychologyScore = 100;
  let disciplineScore = 100;

  // ---------- Risk ----------
  if ((trade.risk ?? 1) <= 1) {
    strengths.push("Excellent risk management");
  } else if ((trade.risk ?? 1) <= 2) {
    strengths.push("Risk within acceptable limits");
    riskScore -= 5;
  } else if ((trade.risk ?? 1) <= 3) {
    riskScore -= 20;
    mistakes.push("Risk is higher than recommended");
    recommendations.push("Keep risk below 2%.");
  } else {
    riskScore -= 40;
    mistakes.push("Excessive risk per trade");
    recommendations.push("Reduce risk immediately.");
  }

  // ---------- Rules ----------
  if ((trade.ruleFollowed ?? "").toLowerCase() === "yes") {
    strengths.push("Trading plan followed");
  } else {
    disciplineScore -= 30;
    mistakes.push("Rules not followed");
    recommendations.push("Never break your trading plan.");
  }

  // ---------- Planning ----------
  if (trade.planned) {
    strengths.push("Trade was planned");
  } else {
    disciplineScore -= 20;
    mistakes.push("Impulse trade detected");
    recommendations.push("Plan trades before entering.");
  }

  // ---------- Psychology ----------
  const emotion = (trade.emotion ?? "").toLowerCase();

  switch (emotion) {
    case "calm":
    case "confident":
      strengths.push("Strong emotional control");
      break;

    case "fear":
      psychologyScore -= 15;
      mistakes.push("Fear affected execution");
      recommendations.push("Trust your trading system.");
      break;

    case "fomo":
      psychologyScore -= 25;
      mistakes.push("FOMO detected");
      recommendations.push("Wait for confirmation before entering.");
      break;

    case "revenge":
      psychologyScore -= 40;
      disciplineScore -= 20;
      mistakes.push("Revenge trading detected");
      recommendations.push("Stop trading after emotional losses.");
      break;

    case "greedy":
      psychologyScore -= 20;
      mistakes.push("Greed affected decision making");
      recommendations.push("Take profits according to plan.");
      break;
  }

  // ---------- PnL ----------
  if ((trade.pnl ?? 0) > 0) {
    strengths.push("Profitable execution");
  } else if ((trade.pnl ?? 0) < 0) {
    executionScore -= 15;
    recommendations.push("Review your entry and exit.");
  }

  // ---------- Final Score ----------
  const edgeScore = Math.round(
    riskScore * 0.30 +
    executionScore * 0.30 +
    psychologyScore * 0.20 +
    disciplineScore * 0.20
  );

  let grade = "D";

  if (edgeScore >= 97) grade = "A+";
  else if (edgeScore >= 90) grade = "A";
  else if (edgeScore >= 80) grade = "B";
  else if (edgeScore >= 70) grade = "C";

  const confidence = Math.min(
    99,
    Math.max(
      50,
      Math.round((riskScore + disciplineScore + psychologyScore) / 3)
    )
  );

  const summary =
    edgeScore >= 90
      ? "Excellent execution with strong discipline and psychology."
      : edgeScore >= 80
      ? "Good trade with a few areas for improvement."
      : edgeScore >= 70
      ? "Average execution. Focus on discipline and psychology."
      : "Poor-quality trade. Review your process before taking the next trade.";

  return {
    edgeScore,
    grade,
    confidence,

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