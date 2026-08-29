"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import ChartModal from "../../components/ChartModal";
import TradeDetailsDrawer from "@/components/trade/TradeDetailsDrawer";
import { supabase } from "@/lib/supabase";

type Trade = {
  id: string;
  user_id: string;
  date: string;
  time: string;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exit: number;
  risk: number;
  lotSize: number;
  pnl: number;
  session: string;
  strategy: string;
  emotion: string;
  ruleFollowed: string;
  tradingViewLink: string;
  notes: string;
  chartImages: string[];
};

type DbTrade = {
  id: string;
  user_id: string;
  date: string | null;
  time: string | null;
  symbol: string | null;
  direction: string | null;
  entry_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number | null;
  strategy: string | null;
  notes: string | null;
  risk: number | null;
  lot_size: number | null;
  session: string | null;
  emotion: string | null;
  rule_followed: string | null;
  tradingview_link: string | null;
  chart_images: string[] | null;
};

const emptyForm = {
  date: "",
  time: "",
  symbol: "XAUUSD",
  direction: "Buy",
  entry: "",
  stopLoss: "",
  takeProfit: "",
  exit: "",
  risk: "",
  lotSize: "",
  pnl: "",
  session: "London",
  strategy: "",
  emotion: "Calm",
  ruleFollowed: "Yes",
  tradingViewLink: "",
  notes: "",
};

function dbToTrade(row: DbTrade): Trade {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date || "",
    time: row.time || "",
    symbol: row.symbol || "XAUUSD",
    direction: row.direction || "Buy",
    entry: Number(row.entry_price || 0),
    stopLoss: Number(row.stop_loss || 0),
    takeProfit: Number(row.take_profit || 0),
    exit: Number(row.exit_price || 0),
    risk: Number(row.risk || 0),
    lotSize: Number(row.lot_size || 0),
    pnl: Number(row.pnl || 0),
    session: row.session || "London",
    strategy: row.strategy || "",
    emotion: row.emotion || "Calm",
    ruleFollowed: row.rule_followed || "Yes",
    tradingViewLink: row.tradingview_link || "",
    notes: row.notes || "",
    chartImages: row.chart_images || [],
  };
}

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chartImages, setChartImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrentDateTime();
    void loadTrades();
  }, []);

  async function loadTrades() {
    try {
      setLoadingTrades(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not logged in:", userError);
        setTrades([]);
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (error) throw error;

      setTrades(((data || []) as DbTrade[]).map(dbToTrade));
    } catch (error) {
      console.error("Failed to load trades:", error);
      alert("Failed to load trades from Supabase.");
      setTrades([]);
    } finally {
      setLoadingTrades(false);
    }
  }

  function getCurrentDateTime() {
    const now = new Date();

    const date =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const time =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");

    return { date, time };
  }

  function setCurrentDateTime() {
    const { date, time } = getCurrentDateTime();

    setForm((previous) => ({
      ...previous,
      date,
      time,
    }));
  }

  function updateField(
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleChartUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const remainingSlots = 10 - chartImages.length;

    if (remainingSlots <= 0) {
      alert("Maximum 10 screenshots allowed per trade.");
      event.target.value = "";
      return;
    }

    try {
      const compressedImages = await Promise.all(
        files.slice(0, remainingSlots).map((file) => compressImage(file))
      );

      setChartImages((previous) => [...previous, ...compressedImages]);
    } catch {
      alert("One or more screenshots could not be processed.");
    }

    event.target.value = "";
  }

  function removeChart(index: number) {
    setChartImages((previous) =>
      previous.filter((_, imageIndex) => imageIndex !== index)
    );
  }

  async function saveTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("You must be logged in to save trades.");
        return;
      }

      const payload = {
        user_id: user.id,
        date: form.date || null,
        time: form.time || null,
        symbol: form.symbol,
        direction: form.direction,
        entry_price: Number(form.entry || 0),
        exit_price: Number(form.exit || 0),
        stop_loss: Number(form.stopLoss || 0),
        take_profit: Number(form.takeProfit || 0),
        pnl: Number(form.pnl || 0),
        strategy: form.strategy || null,
        notes: form.notes || null,
        risk: Number(form.risk || 0),
        lot_size: Number(form.lotSize || 0),
        session: form.session || null,
        emotion: form.emotion || null,
        rule_followed: form.ruleFollowed || null,
        tradingview_link: form.tradingViewLink || null,
        chart_images: chartImages,
      };

      if (editingId) {
        const { error } = await supabase
          .from("trades")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("trades").insert(payload);

        if (error) throw error;
      }

      await loadTrades();

      alert(editingId ? "Trade updated successfully!" : "Trade saved successfully!");

      clearForm();
    } catch (error) {
      console.error("Failed to save trade:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save trade."
      );
    } finally {
      setSaving(false);
    }
  }

  function editTrade(trade: Trade) {
    setEditingId(trade.id);

    setForm({
      date: trade.date || "",
      time: trade.time || "",
      symbol: trade.symbol || "XAUUSD",
      direction: trade.direction || "Buy",
      entry: String(trade.entry ?? ""),
      stopLoss: String(trade.stopLoss ?? ""),
      takeProfit: String(trade.takeProfit ?? ""),
      exit: String(trade.exit ?? ""),
      risk: String(trade.risk ?? ""),
      lotSize: String(trade.lotSize ?? ""),
      pnl: String(trade.pnl ?? ""),
      session: trade.session || "London",
      strategy: trade.strategy || "",
      emotion: trade.emotion || "Calm",
      ruleFollowed: trade.ruleFollowed || "Yes",
      tradingViewLink: trade.tradingViewLink || "",
      notes: trade.notes || "",
    });

    setChartImages(trade.chartImages || []);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteTrade(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this trade?"
    );

    if (!confirmed) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You must be logged in.");
        return;
      }

      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      await loadTrades();

      if (editingId === id) clearForm();
    } catch (error) {
      console.error("Failed to delete trade:", error);
      alert("Failed to delete trade.");
    }
  }

  function clearForm() {
    const { date, time } = getCurrentDateTime();

    setForm({
      ...emptyForm,
      date,
      time,
    });

    setEditingId(null);
    setChartImages([]);
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Trade Journal</h1>
          <p className="mt-2 text-slate-400">
            Record, review and improve every trade.
          </p>
        </div>

        <form
          onSubmit={saveTrade}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-yellow-400">
              {editingId ? "✏️ Edit Trade" : "+ Add New Trade"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={clearForm}
                className="text-sm text-slate-400 hover:text-white"
              >
                Cancel Editing
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Date" name="date" type="date" value={form.date} onChange={updateField} />
            <Input label="Time" name="time" type="time" value={form.time} onChange={updateField} />
            <Select label="Symbol" name="symbol" value={form.symbol} onChange={updateField} options={["XAUUSD","BTCUSD","EURUSD","GBPUSD","NAS100","US30"]} />
            <Select label="Direction" name="direction" value={form.direction} onChange={updateField} options={["Buy","Sell"]} />
            <Input label="Entry Price" name="entry" type="number" value={form.entry} onChange={updateField} />
            <Input label="Stop Loss" name="stopLoss" type="number" value={form.stopLoss} onChange={updateField} />
            <Input label="Take Profit" name="takeProfit" type="number" value={form.takeProfit} onChange={updateField} />
            <Input label="Exit Price" name="exit" type="number" value={form.exit} onChange={updateField} />
            <Input label="Risk %" name="risk" type="number" value={form.risk} onChange={updateField} />
            <Input label="Lot Size" name="lotSize" type="number" value={form.lotSize} onChange={updateField} />
            <Input label="Profit / Loss ($)" name="pnl" type="number" value={form.pnl} onChange={updateField} />
            <Select label="Session" name="session" value={form.session} onChange={updateField} options={["Asia","London","New York","London + New York"]} />
            <Input label="Strategy / Setup" name="strategy" type="text" value={form.strategy} onChange={updateField} />
            <Select label="Emotion" name="emotion" value={form.emotion} onChange={updateField} options={["Calm","Confident","Fear","FOMO","Revenge","Greedy"]} />
            <Select label="Rules Followed?" name="ruleFollowed" value={form.ruleFollowed} onChange={updateField} options={["Yes","Partially","No"]} />
            <Input label="TradingView Link" name="tradingViewLink" type="url" value={form.tradingViewLink} onChange={updateField} />
          </div>

          <div className="mt-6">
            <Label>Trade Notes</Label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              rows={5}
              className={inputStyle}
              placeholder="Why did you enter? What happened? What did you learn?"
            />
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <Label>Chart Screenshots</Label>
              <span className="text-sm text-slate-500">{chartImages.length}/10</span>
            </div>

            {chartImages.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {chartImages.map((image, index) => (
                  <div key={index} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                    <button type="button" onClick={() => setSelectedImage(image)} className="block w-full">
                      <img src={image} alt={`Trade chart ${index + 1}`} className="h-40 w-full object-cover" />
                    </button>
                    <div className="flex justify-between p-3">
                      <button type="button" onClick={() => setSelectedImage(image)} className="text-sm text-yellow-400">View</button>
                      <button type="button" onClick={() => removeChart(index)} className="text-sm text-red-400">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {chartImages.length < 10 && (
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 p-8 hover:border-yellow-400">
                <span className="text-4xl">📷</span>
                <span className="mt-3 font-medium text-slate-300">Add Screenshots</span>
                <span className="mt-1 text-sm text-slate-500">Select one or multiple images — maximum 10.</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleChartUpload} />
              </label>
            )}
          </div>

          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-yellow-400 px-8 py-3 font-bold text-slate-950 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update Trade" : "Save Trade"}
            </button>

            <button
              type="button"
              onClick={clearForm}
              className="rounded-xl border border-slate-700 px-8 py-3 text-slate-300"
            >
              Clear
            </button>
          </div>
        </form>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Saved Trades</h2>
          <p className="mt-1 text-sm text-slate-400">
            {loadingTrades ? "Loading trades..." : `${trades.length} trades recorded`}
          </p>

          {!loadingTrades && trades.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-500">
              No trades saved yet.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="border-b border-slate-800">
                  <tr>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Charts</TableHead>
                    <TableHead>Actions</TableHead>
                  </tr>
                </thead>

                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-800 last:border-0">
                      <TableCell>{trade.date || "—"}</TableCell>
                      <TableCell>{trade.time || "—"}</TableCell>
                      <TableCell>{trade.symbol}</TableCell>
                      <TableCell>{trade.direction}</TableCell>
                      <TableCell>{trade.strategy || "—"}</TableCell>
                      <TableCell>{trade.session || "—"}</TableCell>
                      <TableCell>{trade.risk}%</TableCell>
                      <TableCell>
                        <span className={trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                          ${trade.pnl.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>{trade.chartImages.length}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTrade(trade);
                              setDrawerOpen(true);
                            }}
                            className="rounded-lg bg-yellow-500/10 px-3 py-2 text-yellow-400"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => editTrade(trade)}
                            className="rounded-lg bg-blue-500/10 px-3 py-2 text-blue-400"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteTrade(trade.id)}
                            className="rounded-lg bg-red-500/10 px-3 py-2 text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <ChartModal image={selectedImage} onClose={() => setSelectedImage(null)} />

      <TradeDetailsDrawer
        trade={selectedTrade}
        trades={trades}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxWidth = 1400;
        const maxHeight = 900;

        let width = image.width;
        let height = image.height;

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas unavailable"));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };

      image.onerror = () => reject(new Error("Image could not be loaded"));
      image.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error("File could not be read"));
    reader.readAsDataURL(file);
  });
}

const inputStyle =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-slate-300">{children}</label>;
}

function Input({
  label,
  name,
  type,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        step={type === "number" ? "any" : undefined}
        className={inputStyle}
      />
    </div>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select name={name} value={value} onChange={onChange} className={inputStyle}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase text-slate-400">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
      {children}
    </td>
  );
}
