export type Trade = {
  id: number;
  date?: string;
  time?: string;
  symbol?: string;
  direction?: string;
  pnl?: number;
  strategy?: string;
  session?: string;
};

export type DayData = {
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  tradeList: Trade[];
};