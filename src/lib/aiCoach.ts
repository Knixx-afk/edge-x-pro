export type Trade = {
  pnl?: number;
  session?: string;
  strategy?: string;
  date?: string;
};

export type AICoachReport = {
  bestSession: string;
  worstSession: string;
  bestStrategy: string;
  worstStrategy: string;
  message: string[];
};

export function buildAICoach(trades: Trade[]): AICoachReport {
  const sessionMap: Record<string, number> = {};
  const strategyMap: Record<string, number> = {};

  trades.forEach((trade) => {
    const pnl = Number(trade.pnl || 0);

    const session = trade.session || "Unknown";
    sessionMap[session] = (sessionMap[session] || 0) + pnl;

    const strategy = trade.strategy || "Unknown";
    strategyMap[strategy] = (strategyMap[strategy] || 0) + pnl;
  });

  const bestSession =
    Object.entries(sessionMap).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "Not enough data";

  const worstSession =
    Object.entries(sessionMap).sort((a, b) => a[1] - b[1])[0]?.[0] ??
    "Not enough data";

  const bestStrategy =
    Object.entries(strategyMap).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "Not enough data";

  const worstStrategy =
    Object.entries(strategyMap).sort((a, b) => a[1] - b[1])[0]?.[0] ??
    "Not enough data";

  const message: string[] = [];

  if (trades.length < 20) {
    message.push("More trade history is needed for reliable AI insights.");
  }

  message.push(`Best session: ${bestSession}`);
  message.push(`Worst session: ${worstSession}`);
  message.push(`Best strategy: ${bestStrategy}`);
  message.push(`Worst strategy: ${worstStrategy}`);

  return {
    bestSession,
    worstSession,
    bestStrategy,
    worstStrategy,
    message,
  };
}