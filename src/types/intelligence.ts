export interface PatternIntelligence {
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  probability?: number;
  confidence?: number;
  timestamp?: string;
}

export interface UpcomingIntelligence {
  event?: string;
  date?: string;
  time?: string;
  impact?: string;
  forecast?: string | number;
  previous?: string | number;
}

export interface MarketOverview {
  symbol?: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

export interface IntelligenceResponse {
  patterns?: PatternIntelligence[];
  upcoming?: UpcomingIntelligence[];
  market?: MarketOverview[];
}

export type Intelligence = IntelligenceResponse;