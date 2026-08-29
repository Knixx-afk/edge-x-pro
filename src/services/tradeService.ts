import { supabase } from "@/lib/supabase";

export type Trade = {
  id?: string;
  user_id?: string;
  date: string;
  time: string;
  symbol: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  exit_price: number;
  risk: number;
  lot_size: number;
  pnl: number;
  session: string;
  strategy: string;
  emotion: string;
  rule_followed: string;
  tradingview_link: string;
  notes: string;
  chart_images: string[];
};

export async function getTrades() {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .order("date", { ascending: false })
    .order("time", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTrade(trade: Omit<Trade, "id">) {
  const { error } = await supabase.from("trades").insert(trade);
  if (error) throw error;
}

export async function updateTrade(trade: Trade) {
  if (!trade.id) throw new Error("Trade id is required.");
  const { id, ...payload } = trade;
  const { error } = await supabase.from("trades").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteTrade(id: string) {
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw error;
}
