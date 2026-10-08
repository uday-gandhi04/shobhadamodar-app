import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ManagerLayout from "./ManagerLayout";
import { getManagerAccounting } from "../../services/managerAccountingApi";
import { getBusinessDate } from "../../utils/businessDate";

const addDays = (businessDate, amount) => {
  const date = new Date(`${businessDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const movePeriodDate = (businessDate, period, direction) => {
  if (period === "today") return addDays(businessDate, direction);
  if (period === "week") return addDays(businessDate, direction * 7);

  const [year, month, day] = businessDate.split("-").map(Number);
  const targetMonth = new Date(Date.UTC(year, month - 1 + direction, 1));
  const targetYear = targetMonth.getUTCFullYear();
  const targetMonthIndex = targetMonth.getUTCMonth();
  const finalDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();

  return [
    targetYear,
    String(targetMonthIndex + 1).padStart(2, "0"),
    String(Math.min(day, finalDay)).padStart(2, "0"),
  ].join("-");
};

const formatBusinessDate = (businessDate, options) => {
  const date = new Date(`${businessDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    ...options,
  }).format(date);
};

const formatTime = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(paise || 0) / 100);

const formatLitres = (litres) =>
  `${Number(litres || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} L`;

const formatLitresNumber = (litres) =>
  Number(litres || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getDateRange = (period, businessDate) => {
  if (period === "today") {
    return { start: businessDate, end: businessDate };
  }

  if (period === "week") {
    const weekday = new Date(`${businessDate}T00:00:00.000Z`).getUTCDay();
    const start = addDays(businessDate, -((weekday + 6) % 7));
    return { start, end: addDays(start, 6) };
  }

  const [year, month] = businessDate.split("-").map(Number);
  return {
    start: `${businessDate.slice(0, 7)}-01`,
    end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
};

const CollectionAccordionRow = ({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  isExpanded,
  onToggle,
  children,
}) => (
  <div className="overflow-hidden rounded-[11px] bg-slate-50 transition-colors">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-3 py-2.5 active:bg-slate-100"
    >
      <div className="flex items-center gap-2">
        <div
          className={`!h-5 !w-5 flex items-center justify-center !rounded-[6px] ${iconBg} ${iconColor}`}
        >
          {icon}
        </div>
        <span className="!text-[11px] !font-medium !text-slate-600">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="!text-[11px] !font-medium !text-slate-800">
          {value}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3 w-3 text-slate-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </div>
    </button>
    {isExpanded && (
      <div className="px-3 pb-2.5 pt-0">
        <div className="mt-1 space-y-1.5 border-t border-slate-200/60 pt-2">
          {children}
        </div>
      </div>
    )}
  </div>
);

const Accounting = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState(
    () => location.state?.accountingPeriod || "today",
  );
  const [businessDate, setBusinessDate] = useState(
    () => location.state?.businessDate || getBusinessDate(),
  );
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCollection, setExpandedCollection] = useState(null);
  const today = getBusinessDate();

  useEffect(() => {
    let mounted = true;

    const loadReport = async () => {
      setLoading(true);
      setError("");
      setReport(null);
      try {
        const response = await getManagerAccounting(period, businessDate);
        if (mounted) setReport(response?.data || null);
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.response?.data?.message ||
              requestError?.message ||
              t("manager.accountingLabels.loadError"),
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadReport();
    return () => {
      mounted = false;
    };
  }, [businessDate, period, t]);

  const summary = report?.summary || {};
  const dateRange = getDateRange(period, businessDate);
  const nextDisabled = dateRange.end >= today;

  const navigateToOperationsShift = (shiftId) => {
    navigate("/manager/operations", {
      state: {
        accountingShiftId: shiftId,
        accountingReturn: {
          accountingPeriod: period,
          businessDate,
        },
      },
    });
  };

  const openDailyAccounting = (day) => {
    setPeriod("today");
    setBusinessDate(day);
  };

  return (
    <ManagerLayout title={t("manager.accounting", "Sales & Accounting")} showBack>
      <div className="space-y-4 pb-6">
        
        {/* SEGMENTED CONTROL */}
        <div className="grid grid-cols-3 !rounded-[12px] !bg-slate-50 !p-1">
          {["today", "week", "month"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`!min-h-[38px] !rounded-[10px] !px-2 !text-[12px] !font-bold !transition-all ${
                period === value
                  ? "!bg-emerald-800 !text-white !shadow-sm"
                  : "!text-slate-500 hover:!text-slate-700"
              }`}
            >
              {t(`manager.accountingLabels.${value}`, value.charAt(0).toUpperCase() + value.slice(1))}
            </button>
          ))}
        </div>

        {/* DATE PICKER */}
        <div className="flex !min-h-[46px] items-center justify-between !rounded-[14px] !bg-white !px-3 !border !border-slate-100/60 !shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4 !text-slate-400">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p className="!text-[12px] !font-bold !text-slate-800">
              {period === "today"
                ? formatBusinessDate(businessDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                : `${formatBusinessDate(dateRange.start, { day: "numeric", month: "short" })} - ${formatBusinessDate(dateRange.end, { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setBusinessDate(movePeriodDate(businessDate, period, -1))} className="!p-2 !text-slate-400 hover:!text-slate-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button onClick={() => setBusinessDate(movePeriodDate(businessDate, period, 1))} disabled={nextDisabled} className="!p-2 !text-slate-400 hover:!text-slate-700 disabled:!opacity-30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-[14px] border border-red-100 bg-red-50 p-3 text-[11px] font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="h-[118px] animate-pulse rounded-[18px] bg-white" />
            <div className="h-[150px] animate-pulse rounded-[18px] bg-white" />
            <div className="h-[120px] animate-pulse rounded-[18px] bg-white" />
          </div>
        ) : error ? null : (
          <>
            {/* SUMMARY CARDS (Top 4 grid) */}
            <section className="grid grid-cols-2 gap-3">
              {/* Total Sale */}
              <div className="flex items-center gap-3 !rounded-[16px] !bg-white !p-4 !border !border-slate-100 !shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                <div className="!h-[36px] !w-[36px] shrink-0 flex items-center justify-center !rounded-[10px] !bg-emerald-50 !text-emerald-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5"><path d="M7 4h8v16H7z"/><path d="M15 7h2l2 2v7h-4"/><circle cx="10" cy="8" r="1"/></svg>
                </div>
                <div>
                  <p className="!text-[10px] !font-bold !text-slate-500">Total Sale</p>
                  <p className="!mt-0.5 !text-[15px] !font-extrabold !text-slate-900">{formatMoney(summary.expectedTotalSalePaise)}</p>
                </div>
              </div>

              {/* Total Litres */}
              <div className="flex items-center gap-3 !rounded-[16px] !bg-white !p-4 !border !border-slate-100 !shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                <div className="!h-[36px] !w-[36px] shrink-0 flex items-center justify-center !rounded-[10px] !bg-emerald-50 !text-emerald-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5"><path d="M3 10h18"/><path d="M3 14h18"/><path d="M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/></svg>
                </div>
                <div>
                  <p className="!text-[10px] !font-bold !text-slate-500">Total Litres</p>
                  <p className="!mt-0.5 !text-[15px] !font-extrabold !text-slate-900">{formatLitres(summary.totalLitres)}</p>
                </div>
              </div>

              {/* Petrol */}
              <div className="flex items-center gap-3 !rounded-[16px] !bg-rose-50/60 !p-4 !border !border-rose-100/50">
                <div className="!h-[36px] !w-[36px] shrink-0 flex items-center justify-center !rounded-[10px] !bg-rose-100 !text-rose-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5"><path d="M7 4h8v16H7z"/><path d="M15 7h2l2 2v7h-4"/><circle cx="10" cy="8" r="1"/></svg>
                </div>
                <div>
                  <p className="!text-[10px] !font-bold !text-rose-600">Petrol</p>
                  <p className="!mt-0.5 !text-[14px] !font-extrabold !text-slate-900">{formatLitresNumber(summary.totalLitresPetrol)} L</p>
                  <p className="!mt-0.5 !text-[11px] !font-bold !text-slate-700">{formatMoney(summary.petrolSalePaise)}</p>
                </div>
              </div>

              {/* Diesel */}
              <div className="flex items-center gap-3 !rounded-[16px] !bg-sky-50/60 !p-4 !border !border-sky-100/50">
                <div className="!h-[36px] !w-[36px] shrink-0 flex items-center justify-center !rounded-[10px] !bg-blue-100 !text-blue-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5"><path d="M7 4h8v16H7z"/><path d="M15 7h2l2 2v7h-4"/><circle cx="10" cy="8" r="1"/></svg>
                </div>
                <div>
                  <p className="!text-[10px] !font-bold !text-blue-600">Diesel</p>
                  <p className="!mt-0.5 !text-[14px] !font-extrabold !text-slate-900">{formatLitresNumber(summary.totalLitresDiesel)} L</p>
                  <p className="!mt-0.5 !text-[11px] !font-bold !text-slate-700">{formatMoney(summary.dieselSalePaise)}</p>
                </div>
              </div>
            </section>

            {/* MPD WISE TABLE */}
            <section className="!mt-2">
              <h2 className="!text-[14px] !font-bold !text-slate-900 !mb-3">MPD Wise</h2>
              <div className="!rounded-[16px] !bg-white !p-4 !border !border-slate-100 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[280px]">
                  <thead>
                    <tr className="!bg-slate-50">
                      <th className="!p-2.5 !text-[9px] !font-bold !text-slate-500 !rounded-tl-[8px] !rounded-bl-[8px]">MPD</th>
                      <th className="!p-2.5 !text-[9px] !font-bold !text-slate-500 text-center">Petrol (L)</th>
                      <th className="!p-2.5 !text-[9px] !font-bold !text-slate-500 text-center">Diesel (L)</th>
                      <th className="!p-2.5 !text-[9px] !font-bold !text-slate-500 text-center">Total (L)</th>
                      <th className="!p-2.5 !text-[9px] !font-bold !text-slate-500 text-right !rounded-tr-[8px] !rounded-br-[8px]">Sale (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.mpds || []).map((mpd) => (
                      <tr key={mpd._id} className="border-b border-slate-50">
                        <td className="!py-3 !px-2.5 !text-[11px] !font-bold !text-slate-900">{mpd.mpdNumber}</td>
                        <td className="!py-3 !px-2.5 !text-[11px] !font-medium !text-slate-600 text-center">{formatLitresNumber(mpd.totalLitresPetrol)}</td>
                        <td className="!py-3 !px-2.5 !text-[11px] !font-medium !text-slate-600 text-center">{formatLitresNumber(mpd.totalLitresDiesel)}</td>
                        <td className="!py-3 !px-2.5 !text-[11px] !font-bold !text-slate-800 text-center">{formatLitresNumber(mpd.totalLitres)}</td>
                        <td className="!py-3 !px-2.5 !text-[11px] !font-medium !text-slate-600 text-right">{formatMoney(mpd.expectedTotalSalePaise).replace("₹", "")}</td>
                      </tr>
                    ))}
                    <tr className="!bg-slate-50/50">
                      <td className="!py-3 !px-2.5 !text-[11px] !font-bold !text-slate-900 !rounded-tl-[8px] !rounded-bl-[8px]">Total</td>
                      <td className="!py-3 !px-2.5 !text-[11px] !font-bold !text-slate-900 text-center">{formatLitresNumber(summary.totalLitresPetrol)}</td>
                      <td className="!py-3 !px-2.5 !text-[11px] !font-bold !text-slate-900 text-center">{formatLitresNumber(summary.totalLitresDiesel)}</td>
                      <td className="!py-3 !px-2.5 !text-[11px] !font-bold !text-slate-900 text-center">{formatLitresNumber(summary.totalLitres)}</td>
                      <td className="!py-3 !px-2.5 !text-[11px] !font-bold !text-slate-900 text-right !rounded-tr-[8px] !rounded-br-[8px]">{formatMoney(summary.expectedTotalSalePaise)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* COLLECTIONS & EXPENSES */}
            <section className="grid grid-cols-2 gap-3 !mt-2">
              {/* Collections */}
              <div className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100 flex flex-col justify-between">
                <div>
                  <h2 className="!text-[14px] !font-bold !text-slate-900 !mb-4">Collections</h2>
                  <div className="space-y-2">
                    <CollectionAccordionRow
                      icon={<rect x="2" y="6" width="20" height="12" rx="2" />}
                      iconBg="!bg-emerald-50"
                      iconColor="!text-emerald-600"
                      label="Cash"
                      value={formatMoney(summary.totalCashPaise)}
                      isExpanded={expandedCollection === "CASH"}
                      onToggle={() =>
                        setExpandedCollection(
                          expandedCollection === "CASH" ? null : "CASH",
                        )
                      }
                    >
                      {(summary.collectionDetails?.cashCollections || []).map(
                        (item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-[10px] font-medium text-slate-500"
                          >
                            <span>
                              ₹{item.denomination} × {item.count}
                            </span>
                            <span>
                              {formatMoney(
                                item.denomination * item.count * 100,
                              )}
                            </span>
                          </div>
                        ),
                      )}
                      {(summary.collectionDetails?.coinsPaise || 0) > 0 && (
                        <div className="flex justify-between text-[10px] font-medium text-slate-500">
                          <span>Coins</span>
                          <span>
                            {formatMoney(summary.collectionDetails.coinsPaise)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200/60 pt-1.5 text-[10px] font-bold text-slate-700">
                        <span>Total Cash</span>
                        <span>{formatMoney(summary.totalCashPaise)}</span>
                      </div>
                    </CollectionAccordionRow>

                    <CollectionAccordionRow
                      icon={
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      }
                      iconBg="!bg-blue-50"
                      iconColor="!text-blue-600"
                      label="UPI"
                      value={formatMoney(summary.totalUpiPaise)}
                      isExpanded={expandedCollection === "UPI"}
                      onToggle={() =>
                        setExpandedCollection(
                          expandedCollection === "UPI" ? null : "UPI",
                        )
                      }
                    >
                      {summary.collectionDetails?.upiCollection
                        ?.firstTransactionTime ? (
                        <>
                          <div className="flex justify-between text-[10px] font-medium text-slate-500">
                            <span>
                              First (
                              {
                                summary.collectionDetails.upiCollection
                                  .firstTransactionTime
                              }
                              )
                            </span>
                            <span>
                              {formatMoney(
                                summary.collectionDetails.upiCollection
                                  .firstTransactionAmountPaise,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] font-medium text-slate-500">
                            <span>
                              Last (
                              {
                                summary.collectionDetails.upiCollection
                                  .lastTransactionTime
                              }
                              )
                            </span>
                            <span>
                              {formatMoney(
                                summary.collectionDetails.upiCollection
                                  .lastTransactionAmountPaise,
                              )}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] italic text-slate-400">
                          No transactions recorded
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200/60 pt-1.5 text-[10px] font-bold text-slate-700">
                        <span>Total UPI</span>
                        <span>{formatMoney(summary.totalUpiPaise)}</span>
                      </div>
                    </CollectionAccordionRow>

                    <CollectionAccordionRow
                      icon={
                        <>
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </>
                      }
                      iconBg="!bg-purple-50"
                      iconColor="!text-purple-600"
                      label="Card"
                      value={formatMoney(summary.totalCardPaise)}
                      isExpanded={expandedCollection === "CARD"}
                      onToggle={() =>
                        setExpandedCollection(
                          expandedCollection === "CARD" ? null : "CARD",
                        )
                      }
                    >
                      {(summary.collectionDetails?.atmEntries || []).map(
                        (entry, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-[10px] font-medium text-slate-500"
                          >
                            <span>{entry.time}</span>
                            <span>{formatMoney(entry.amountPaise)}</span>
                          </div>
                        ),
                      )}
                      {(summary.collectionDetails?.atmEntries || []).length ===
                        0 && (
                        <div className="text-[10px] italic text-slate-400">
                          No individual entries
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200/60 pt-1.5 text-[10px] font-bold text-slate-700">
                        <span>Total Card</span>
                        <span>{formatMoney(summary.totalCardPaise)}</span>
                      </div>
                    </CollectionAccordionRow>

                    <CollectionAccordionRow
                      icon={<path d="M5 12h14" />}
                      iconBg="!bg-rose-50"
                      iconColor="!text-rose-500"
                      label="Udhari"
                      value={formatMoney(summary.totalUdhariPaise)}
                      isExpanded={expandedCollection === "UDHARI"}
                      onToggle={() =>
                        setExpandedCollection(
                          expandedCollection === "UDHARI" ? null : "UDHARI",
                        )
                      }
                    >
                      {(summary.collectionDetails?.udhariTransactions || [])
                        .length > 0 ? (
                        (summary.collectionDetails?.udhariTransactions || [])
                          .map((tx, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-[10px] font-medium text-slate-500"
                            >
                              <span className="truncate pr-2">
                                {tx.customerId?.name || "Unknown Customer"}
                              </span>
                              <span>{formatMoney(tx.amountPaise)}</span>
                            </div>
                          ))
                      ) : (
                        <div className="text-[10px] italic text-slate-400">
                          No udhari entries
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200/60 pt-1.5 text-[10px] font-bold text-slate-700">
                        <span>Total Udhari</span>
                        <span>{formatMoney(summary.totalUdhariPaise)}</span>
                      </div>
                    </CollectionAccordionRow>
                  </div>
                </div>
                <div className="!mt-5 flex items-center justify-between !border-t !border-slate-100 !pt-4">
                  <span className="!text-[12px] !font-bold !text-slate-900">Total</span>
                  <span className="!text-[13px] !font-bold !text-slate-900">{formatMoney(summary.totalCollectedPaise)}</span>
                </div>
              </div>

              {/* Expenses */}
              <div className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100 flex flex-col justify-center items-center text-center">
                <div className="!h-10 !w-10 flex items-center justify-center !rounded-[10px] !bg-red-50 !text-red-500 !mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <h2 className="!text-[13px] !font-bold !text-slate-500 !mb-1">Total Expenses</h2>
                <p className="!text-[18px] !font-extrabold !text-red-600">{formatMoney(summary.totalExpensePaise)}</p>
              </div>
            </section>

            {/* RECONCILIATION */}
            <section className="!rounded-[16px] !bg-white !p-5 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100 !mt-2">
              <div className="flex items-center justify-between !mb-5">
                <h2 className="!text-[14px] !font-bold !text-slate-900">Reconciliation</h2>
                <div className={`!rounded-[8px] !px-3 !py-1.5 !text-[10px] !font-bold ${summary.reconciliationStatus === "MATCHED" ? "!bg-emerald-50 !text-emerald-700" : "!bg-amber-50 !text-amber-700"}`}>
                  {summary.reconciliationStatus === "MATCHED" ? "Balanced" : summary.reconciliationStatus}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="!text-[10px] !font-medium !text-slate-500">Expected Sale</p>
                  <p className="!mt-1.5 !text-[14px] !font-bold !text-slate-900">{formatMoney(summary.expectedTotalSalePaise)}</p>
                </div>
                <div>
                  <p className="!text-[10px] !font-medium !text-slate-500">Accounted</p>
                  <p className="!mt-1.5 !text-[14px] !font-bold !text-slate-900">{formatMoney(summary.totalCollectedPaise)}</p>
                </div>
                <div>
                  <p className="!text-[10px] !font-medium !text-slate-500">Difference</p>
                  <p className={`!mt-1.5 !text-[14px] !font-bold ${summary.differencePaise === 0 ? "!text-slate-900" : "!text-red-600"}`}>
                    {formatMoney(summary.differencePaise)}
                  </p>
                </div>
              </div>
            </section>

            {/* EXPORT BUTTON */}
            <button
              type="button"
              className="!mt-2 !flex !min-h-[48px] !w-full !items-center !justify-center !gap-2 !rounded-[14px] !bg-emerald-100/80 !text-[13px] !font-bold !text-emerald-800 hover:!bg-emerald-100 active:!bg-emerald-200 !transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export Report
            </button>

          </>
        )}
      </div>
    </ManagerLayout>
  );
};

export default Accounting;
