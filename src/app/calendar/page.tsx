"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";

type Trade = {
  id: number;
  date?: string;
  time?: string;
  symbol?: string;
  direction?: string;
  pnl?: number;
  strategy?: string;
  session?: string;
};

type DayData = {
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  tradeList: Trade[];
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekDays = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export default function CalendarPage() {
  const today = new Date();

  const [trades, setTrades] = useState<Trade[]>([]);

  const [currentYear, setCurrentYear] = useState(
    today.getFullYear()
  );

  const [currentMonth, setCurrentMonth] = useState(
    today.getMonth()
  );

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("edge-x-trades");

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setTrades(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load trades:", error);
      setTrades([]);
    }
  }, []);

  const dailyData = useMemo(() => {
    const map: Record<string, DayData> = {};

    trades.forEach((trade) => {
      if (!trade.date) {
        return;
      }

      if (!map[trade.date]) {
        map[trade.date] = {
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0,
          breakeven: 0,
          tradeList: [],
        };
      }

      const pnl = Number(trade.pnl || 0);

      map[trade.date].pnl += pnl;
      map[trade.date].trades += 1;
      map[trade.date].tradeList.push(trade);

      if (pnl > 0) {
        map[trade.date].wins += 1;
      } else if (pnl < 0) {
        map[trade.date].losses += 1;
      } else {
        map[trade.date].breakeven += 1;
      }
    });

    return map;
  }, [trades]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      currentYear,
      currentMonth,
      1
    ).getDay();

    const daysInMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();

    const daysInPreviousMonth = new Date(
      currentYear,
      currentMonth,
      0
    ).getDate();

    const days: {
      day: number;
      date: string;
      currentMonth: boolean;
    }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const previousDate = new Date(
        currentYear,
        currentMonth - 1,
        daysInPreviousMonth - i
      );

      days.push({
        day: previousDate.getDate(),
        date: formatDateKey(previousDate),
        currentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentYear,
        currentMonth,
        day
      );

      days.push({
        day,
        date: formatDateKey(date),
        currentMonth: true,
      });
    }

    let nextMonthDay = 1;

    while (days.length % 7 !== 0) {
      const nextDate = new Date(
        currentYear,
        currentMonth + 1,
        nextMonthDay
      );

      days.push({
        day: nextMonthDay,
        date: formatDateKey(nextDate),
        currentMonth: false,
      });

      nextMonthDay += 1;
    }

    return days;
  }, [currentMonth, currentYear]);

  const monthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(
      currentMonth + 1
    ).padStart(2, "0")}`;

    const monthTrades = trades.filter((trade) =>
      trade.date?.startsWith(monthPrefix)
    );

    const netPnL = monthTrades.reduce(
      (total, trade) =>
        total + Number(trade.pnl || 0),
      0
    );

    const wins = monthTrades.filter(
      (trade) => Number(trade.pnl || 0) > 0
    ).length;

    const losses = monthTrades.filter(
      (trade) => Number(trade.pnl || 0) < 0
    ).length;

    const tradingDates = Object.keys(dailyData).filter(
      (date) => date.startsWith(monthPrefix)
    );

    const winningDays = tradingDates.filter(
      (date) => dailyData[date].pnl > 0
    ).length;

    const losingDays = tradingDates.filter(
      (date) => dailyData[date].pnl < 0
    ).length;

    const bestDay =
      tradingDates.length > 0
        ? Math.max(
            ...tradingDates.map(
              (date) => dailyData[date].pnl
            )
          )
        : 0;

    const worstDay =
      tradingDates.length > 0
        ? Math.min(
            ...tradingDates.map(
              (date) => dailyData[date].pnl
            )
          )
        : 0;

    return {
      trades: monthTrades.length,
      netPnL,
      wins,
      losses,
      tradingDays: tradingDates.length,
      winningDays,
      losingDays,
      bestDay,
      worstDay,
    };
  }, [
    trades,
    dailyData,
    currentMonth,
    currentYear,
  ]);

  const selectedDayData = selectedDate
    ? dailyData[selectedDate]
    : undefined;

  function previousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else {
      setCurrentMonth((month) => month - 1);
    }

    setSelectedDate(null);
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else {
      setCurrentMonth((month) => month + 1);
    }

    setSelectedDate(null);
  }

  function goToToday() {
    const now = new Date();

    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(formatDateKey(now));
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8">
        {/* HEADER */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Trading Calendar
          </h1>

          <p className="mt-2 text-slate-400">
            Track your daily performance and discover your
            most profitable trading days.
          </p>
        </div>

        {/* MONTH STATISTICS */}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Monthly Net P&L"
            value={formatMoney(monthStats.netPnL)}
            valueClass={
              monthStats.netPnL > 0
                ? "text-emerald-400"
                : monthStats.netPnL < 0
                ? "text-red-400"
                : "text-white"
            }
          />

          <StatCard
            title="Trades This Month"
            value={String(monthStats.trades)}
          />

          <StatCard
            title="Winning Days"
            value={String(monthStats.winningDays)}
            valueClass="text-emerald-400"
          />

          <StatCard
            title="Losing Days"
            value={String(monthStats.losingDays)}
            valueClass="text-red-400"
          />
        </div>

        {/* CALENDAR */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {/* MONTH NAVIGATION */}

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-6">
            <div>
              <h2 className="text-2xl font-bold">
                {monthNames[currentMonth]} {currentYear}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {monthStats.tradingDays} active trading{" "}
                {monthStats.tradingDays === 1
                  ? "day"
                  : "days"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previousMonth}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-300 transition hover:border-yellow-400 hover:text-white"
              >
                ←
              </button>

              <button
                type="button"
                onClick={goToToday}
                className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-2 text-sm font-medium text-slate-300 transition hover:border-yellow-400 hover:text-white"
              >
                Today
              </button>

              <button
                type="button"
                onClick={nextMonth}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-300 transition hover:border-yellow-400 hover:text-white"
              >
                →
              </button>
            </div>
          </div>

          {/* WEEKDAY HEADERS */}

          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40">
            {weekDays.map((day) => (
              <div
                key={day}
                className="border-r border-slate-800 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* DAYS */}

          <div className="grid grid-cols-7">
            {calendarDays.map((calendarDay, index) => {
              const dayData =
                dailyData[calendarDay.date];

              const isToday =
                calendarDay.date ===
                formatDateKey(new Date());

              const isSelected =
                selectedDate === calendarDay.date;

              return (
                <button
                  key={`${calendarDay.date}-${index}`}
                  type="button"
                  onClick={() =>
                    setSelectedDate(calendarDay.date)
                  }
                  className={`relative min-h-[145px] border-b border-r border-slate-800 p-3 text-left transition hover:bg-slate-800/60 ${
                    !calendarDay.currentMonth
                      ? "bg-slate-950/30 text-slate-600"
                      : "bg-slate-900"
                  } ${
                    isSelected
                      ? "ring-2 ring-inset ring-yellow-400"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday
                          ? "bg-yellow-400 text-slate-950"
                          : ""
                      }`}
                    >
                      {calendarDay.day}
                    </span>

                    {dayData && (
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                        {dayData.trades}{" "}
                        {dayData.trades === 1
                          ? "trade"
                          : "trades"}
                      </span>
                    )}
                  </div>

                  {dayData && (
                    <div className="mt-5">
                      <p
                        className={`text-lg font-bold ${
                          dayData.pnl > 0
                            ? "text-emerald-400"
                            : dayData.pnl < 0
                            ? "text-red-400"
                            : "text-slate-400"
                        }`}
                      >
                        {formatMoney(dayData.pnl)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        {dayData.wins > 0 && (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-400">
                            {dayData.wins}W
                          </span>
                        )}

                        {dayData.losses > 0 && (
                          <span className="rounded-md bg-red-500/10 px-2 py-1 text-red-400">
                            {dayData.losses}L
                          </span>
                        )}

                        {dayData.breakeven > 0 && (
                          <span className="rounded-md bg-slate-700 px-2 py-1 text-slate-300">
                            {dayData.breakeven}BE
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* MONTH DETAILS */}

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* MONTH SUMMARY */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">
              Monthly Summary
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Performance summary for{" "}
              {monthNames[currentMonth]} {currentYear}.
            </p>

            <div className="mt-6 space-y-3">
              <SummaryRow
                label="Total Trades"
                value={String(monthStats.trades)}
              />

              <SummaryRow
                label="Winning Trades"
                value={String(monthStats.wins)}
                valueClass="text-emerald-400"
              />

              <SummaryRow
                label="Losing Trades"
                value={String(monthStats.losses)}
                valueClass="text-red-400"
              />

              <SummaryRow
                label="Trading Days"
                value={String(monthStats.tradingDays)}
              />

              <SummaryRow
                label="Best Day"
                value={formatMoney(monthStats.bestDay)}
                valueClass={
                  monthStats.bestDay > 0
                    ? "text-emerald-400"
                    : "text-slate-300"
                }
              />

              <SummaryRow
                label="Worst Day"
                value={formatMoney(monthStats.worstDay)}
                valueClass={
                  monthStats.worstDay < 0
                    ? "text-red-400"
                    : "text-slate-300"
                }
              />

              <div className="border-t border-slate-800 pt-4">
                <SummaryRow
                  label="Monthly Net P&L"
                  value={formatMoney(monthStats.netPnL)}
                  valueClass={
                    monthStats.netPnL > 0
                      ? "text-emerald-400"
                      : monthStats.netPnL < 0
                      ? "text-red-400"
                      : "text-white"
                  }
                />
              </div>
            </div>
          </section>

          {/* SELECTED DAY DETAILS */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">
              Day Details
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {selectedDate
                ? formatDisplayDate(selectedDate)
                : "Select a day on the calendar."}
            </p>

            {!selectedDate ? (
              <div className="flex h-[300px] items-center justify-center text-center text-slate-500">
                Click any calendar day to review its trades.
              </div>
            ) : !selectedDayData ? (
              <div className="flex h-[300px] items-center justify-center text-center text-slate-500">
                No trades were recorded on this day.
              </div>
            ) : (
              <div className="mt-6">
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950 p-4">
                    <p className="text-xs text-slate-500">
                      Daily P&L
                    </p>

                    <p
                      className={`mt-1 text-xl font-bold ${
                        selectedDayData.pnl > 0
                          ? "text-emerald-400"
                          : selectedDayData.pnl < 0
                          ? "text-red-400"
                          : "text-slate-300"
                      }`}
                    >
                      {formatMoney(selectedDayData.pnl)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4">
                    <p className="text-xs text-slate-500">
                      Total Trades
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {selectedDayData.trades}
                    </p>
                  </div>
                </div>

                <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
                  {selectedDayData.tradeList.map(
                    (trade, index) => {
                      const pnl = Number(trade.pnl || 0);

                      return (
                        <div
                          key={`${trade.id}-${index}`}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold">
                                  {trade.symbol || "Unknown"}
                                </span>

                                <span
                                  className={
                                    trade.direction === "Buy"
                                      ? "text-sm text-emerald-400"
                                      : trade.direction === "Sell"
                                      ? "text-sm text-red-400"
                                      : "text-sm text-slate-400"
                                  }
                                >
                                  {trade.direction || "—"}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-slate-500">
                                {trade.time || "No time"}
                                {" • "}
                                {trade.strategy || "No setup"}
                              </p>
                            </div>

                            <span
                              className={
                                pnl > 0
                                  ? "font-bold text-emerald-400"
                                  : pnl < 0
                                  ? "font-bold text-red-400"
                                  : "font-bold text-slate-400"
                              }
                            >
                              {formatMoney(pnl)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString: string) {
  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  const date = new Date(
    year,
    month,
    day
  );

  return date.toLocaleDateString(
    undefined,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function formatMoney(value: number) {
  if (value > 0) {
    return `+$${value.toFixed(2)}`;
  }

  if (value < 0) {
    return `-$${Math.abs(value).toFixed(2)}`;
  }

  return "$0.00";
}

function StatCard({
  title,
  value,
  valueClass = "text-white",
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {title}