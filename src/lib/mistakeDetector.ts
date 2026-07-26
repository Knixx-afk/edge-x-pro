export type Trade = {
  pnl?: number;
  risk?: number;
  emotion?: string;
  ruleFollowed?: string;
  planned?: boolean;
};

export type MistakeReport = {
  mistakes: string[];
};

export function detectMistakes(trades: Trade[]): MistakeReport {
  const mistakes: string[] = [];

  if (trades.length === 0) {
    return { mistakes: ["No trades available."] };
  }

  const recent = trades.slice(-20);

  const ruleBreaks = recent.filter(
    (t) => t.ruleFollowed !== "Yes"
  ).length;

  if (ruleBreaks >= 3) {
    mistakes.push("Frequent rule violations detected.");
  }

  const highRisk = recent.filter(
    (t) => (t.risk ?? 0) > 2
  ).length;

  if (highRisk >= 2) {
    mistakes.push("Multiple high-risk trades detected.");
  }

  const emotional = recent.filter(
    (t) =>
      t.emotion &&
      t.emotion.toLowerCase() !== "calm"
  ).length;

  if (emotional >= 2) {
    mistakes.push("Emotional trading pattern detected.");
  }

  const unplanned = recent.filter(
    (t) => !t.planned
  ).length;

  if (unplanned >= 2) {
    mistakes.push("Too many unplanned trades.");
  }

  if (mistakes.length === 0) {
    mistakes.push("No major recurring mistakes detected.");
  }

  return { mistakes };
}