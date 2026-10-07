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
    <ManagerLayout title={t("manager.accounting")} showBack>
      <div className="space-y-4">
        <div className="grid grid-cols-3 rounded-[14px] bg-white p-1 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          {["today", "week", "month"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`min-h-[40px] rounded-[10px] px-2 text-[11px] font-bold transition ${
                period === value
                  ? "bg-bpcl-emerald text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {t(`manager.accountingLabels.${value}`)}
            </button>
          ))}
        </div>

        <div className="flex min-h-[46px] items-center justify-between rounded-[14px] bg-white px-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            onClick={() => setBusinessDate(movePeriodDate(businessDate, period, -1))}
            aria-label={t("manager.accountingLabels.previousPeriod")}
            className="grid h-10 w-10 place-items-center rounded-[10px] text-[20px] font-semibold text-slate-500 active:bg-slate-100"
          >
            â€¹
          </button>
          <div className="text-center">
            <p className="text-[11px] font-bold text-slate-800">
              {period === "today"
                ? formatBusinessDate(businessDate, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : `${formatBusinessDate(dateRange.start, {
                    day: "2-digit",
                    month: "short",
                  })} â€“ ${formatBusinessDate(dateRange.end, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBusinessDate(movePeriodDate(businessDate, period, 1))}
            disabled={nextDisabled}
            aria-label={t("manager.accountingLabels.nextPeriod")}
            className="grid h-10 w-10 place-items-center rounded-[10px] text-[20px] font-semibold text-slate-500 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            â€º
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-[14px] border border-red-100 bg-red-50 p-3 text-[11px] font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3" aria-label={t("manager.accountingLabels.loading")}>
            <div className="h-[118px] animate-pulse rounded-[18px] bg-white" />
            <div className="h-[150px] animate-pulse rounded-[18px] bg-white" />
            <div className="h-[120px] animate-pulse rounded-[18px] bg-white" />
          </div>
        ) : error ? null : (
          <>
            <section className="grid grid-cols-2 gap-2.5">
              <MetricCard
                label={t("manager.accountingLabels.totalSale")}
                value={formatMoney(summary.expectedTotalSalePaise)}
                tone="green"
                icon="sale"
              />
              <MetricCard
                label={t("manager.accountingLabels.totalLitres")}
                value={formatLitres(summary.totalLitres)}
                tone="blue"
                icon="litres"
              />
            </section>

            <section className="grid grid-cols-2 gap-2.5">
              <FuelCard
                title={t("manager.petrol")}
                litres={summary.totalLitresPetrol}
                sale={summary.petrolSalePaise}
                tone="petrol"
                t={t}
              />
              <FuelCard
                title={t("manager.diesel")}
                litres={summary.totalLitresDiesel}
                sale={summary.dieselSalePaise}
                tone="diesel"
                t={t}
              />
            </section>

            <section className="rounded-[16px] bg-white p-3.5 shadow-[0_5px_18px_rgba(15,23,42,0.05)]">
              <h2 className="text-[15px] font-bold text-slate-900">
                {t("manager.accountingLabels.mpdWise")}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(report?.mpds || []).map((mpd) => (
                  <MpdAccountingCard key={mpd._id} mpd={mpd} t={t} />
                ))}
                {(report?.mpds || []).length === 0 && (
                  <p className="py-3 text-center text-[10px] text-slate-400">
                    {t("manager.accountingLabels.noMpdData")}
                  </p>
                )}
              </div>
              <div className="mt-3 rounded-[12px] border border-slate-100 bg-slate-50 p-3 shadow-sm">
                 <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-[11px] font-extrabold text-slate-900">{t("manager.accountingLabels.stationTotal")}</span>
                    <span className="text-[11px] font-extrabold text-slate-900">{formatMoney(summary.expectedTotalSalePaise)}</span>
                 </div>
                 <div className="mt-2 space-y-1.5 text-[9px] font-medium text-slate-600">
                    <div className="flex justify-between">
                       <span className="font-bold text-rose-700">{t("manager.petrol")}</span>
                       <span className="font-semibold text-slate-800">
                         {formatLitresNumber(summary.totalLitresPetrol)} L · {formatMoney(summary.petrolSalePaise)}
                       </span>
                    </div>
                    <div className="flex justify-between">
                       <span className="font-bold text-blue-700">{t("manager.diesel")}</span>
                       <span className="font-semibold text-slate-800">
                         {formatLitresNumber(summary.totalLitresDiesel)} L · {formatMoney(summary.dieselSalePaise)}
                       </span>
                    </div>
                    <div className="mt-1 flex justify-between border-t border-slate-200/60 pt-1.5 font-bold text-slate-700">
                       <span>{t("manager.accountingLabels.totalLitresColumn")}</span>
                       <span>{formatLitresNumber(summary.totalLitres)} L</span>
                    </div>
                 </div>
              </div>
            </section>

            <section className="grid grid-cols-2 items-start gap-2.5">
              <div className="rounded-[16px] bg-white p-3 shadow-[0_5px_18px_rgba(15,23,42,0.05)]">
                <SectionHeading title={t("manager.collections")} />
                <div className="mt-2 space-y-2">
                  <MoneyRow label={t("manager.cash")} value={summary.totalCashPaise} />
                  <MoneyRow label={t("manager.accountingLabels.coins")} value={summary.coinsPaise} muted />
                  <p className="-mt-1 text-[7px] leading-3 text-slate-400">
                    {t("manager.accountingLabels.coinsNote")}
                  </p>
                  <MoneyRow label={t("manager.upi")} value={summary.totalUpiPaise} />
                  <MoneyRow label={t("manager.accountingLabels.cardAtm")} value={summary.totalCardPaise} />
                  <MoneyRow label={t("manager.udhari")} value={summary.totalUdhariPaise} />
                  <MoneyRow label={t("manager.totalCollected")} value={summary.totalCollectedPaise} strong />
                </div>
              </div>

              <div className="rounded-[16px] bg-white p-3 shadow-[0_5px_18px_rgba(15,23,42,0.05)]">
                <SectionHeading title={t("manager.expenses")} tone="red" />
                <p className="mt-3 text-[9px] font-semibold text-slate-500">
                  {t("manager.accountingLabels.totalExpenses")}
                </p>
                <p className="mt-1 break-words text-[13px] font-bold text-red-600">
                  {formatMoney(summary.totalExpensePaise)}
                </p>
              </div>
            </section>

            <section className="rounded-[16px] bg-white p-3.5 shadow-[0_5px_18px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-2">
                <SectionHeading title={t("manager.reconciliation")} />
                <StatusBadge status={summary.reconciliationStatus} t={t} />
              </div>
              <div className="mt-3 space-y-2">
                <MoneyRow label={t("manager.expectedSale")} value={summary.expectedTotalSalePaise} />
                <MoneyRow label={t("manager.accounted")} value={summary.totalCollectedPaise} />
                <DifferenceRow difference={summary.differencePaise} t={t} />
                {((summary.shortShiftCount || 0) > 0 || (summary.excessShiftCount || 0) > 0) && (
                  <p className="border-t border-slate-100 pt-2 text-[9px] font-semibold text-slate-500">
                    {t("manager.accountingLabels.mismatchCounts", {
                      short: summary.shortShiftCount || 0,
                      excess: summary.excessShiftCount || 0,
                    })}
                  </p>
                )}
              </div>
            </section>

            {period !== "today" && (
              <section className="rounded-[16px] bg-white p-3.5 shadow-[0_5px_18px_rgba(15,23,42,0.05)]">
                <SectionHeading title={t("manager.accountingLabels.dailyBreakdown")} />
                <div className="mt-2 divide-y divide-slate-100">
                  {(report?.dailyBreakdown || []).map((day) => (
                    <button
                      key={day.businessDate}
                      type="button"
                      onClick={() => openDailyAccounting(day.businessDate)}
                      className="flex min-h-[58px] w-full items-center justify-between gap-3 py-2 text-left active:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block text-[10px] font-bold text-slate-800">
                          {formatBusinessDate(day.businessDate, {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                        <span className="mt-0.5 block text-[9px] text-slate-400">
                          {t("manager.accountingLabels.dayBreakdownMeta", {
                            litres: Number(day.totalLitres || 0).toFixed(2),
                            shifts: day.shiftCount || 0,
                          })}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[11px] font-bold text-slate-800">
                          {formatMoney(day.expectedTotalSalePaise)}
                        </span>
                        {((day.shortShiftCount || 0) > 0 || (day.excessShiftCount || 0) > 0) && (
                          <span className="block text-[8px] font-semibold text-red-600">
                            {t("manager.accountingLabels.mismatchCounts", {
                              short: day.shortShiftCount || 0,
                              excess: day.excessShiftCount || 0,
                            })}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {period === "today" && (
              <section className="rounded-[16px] bg-white p-3.5 shadow-[0_5px_18px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-2">
                  <SectionHeading title={t("manager.accountingLabels.activeOvernightShifts")} />
                  <span className="text-[9px] font-semibold text-slate-400">
                    {(report?.activeShifts || []).length} {t("manager.shifts").toLowerCase()}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {(report?.activeShifts || []).map((shift) => (
                    <ActiveShiftSummaryRow
                      key={shift._id}
                      shift={shift}
                      t={t}
                      selectedBusinessDate={businessDate}
                      onClick={() => navigateToOperationsShift(shift._id)}
                    />
                  ))}
                  {(report?.activeShifts || []).length === 0 && (
                    <p className="py-3 text-center text-[10px] text-slate-400">
                      {t("manager.accountingLabels.noActiveShifts")}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <SectionHeading title={t("manager.accountingLabels.todaysCompletedShifts")} />
                  <span className="text-[9px] font-semibold text-slate-400">
                    {(report?.shifts || []).length} {t("manager.shifts").toLowerCase()}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {(report?.shifts || []).map((shift) => (
                    <ShiftSummaryRow
                      key={shift._id}
                      shift={shift}
                      t={t}
                      onClick={() => navigateToOperationsShift(shift._id)}
                    />
                  ))}
                  {(report?.shifts || []).length === 0 && (
                    <p className="py-3 text-center text-[10px] text-slate-400">
                      {t("manager.accountingLabels.noCompletedShifts")}
                    </p>
                  )}
                </div>
              </section>
            )}

            <button
              type="button"
              disabled
              title={t("manager.accountingLabels.exportUnavailable")}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[13px] bg-emerald-100 text-[11px] font-bold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-80"
            >
              <span aria-hidden="true">â†“</span>
              {t("manager.accountingLabels.exportReport")}
              <span className="text-[9px] font-medium">
                {t("manager.accountingLabels.exportUnavailable")}
              </span>
            </button>
          </>
        )}
      </div>
    </ManagerLayout>
  );
};

const MetricCard = ({ label, value, tone, icon }) => (
  <div className={`flex min-h-[72px] items-center gap-2.5 rounded-[14px] border border-white p-2.5 shadow-[0_3px_12px_rgba(15,23,42,0.04)] ${tone === "green" ? "bg-emerald-50" : "bg-sky-50"}`}>
    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${tone === "green" ? "bg-white/80 text-emerald-700" : "bg-white/80 text-sky-700"}`}>
      <AccountingIcon type={icon} />
    </span>
    <div className="min-w-0">
      <p className="text-[9px] font-medium leading-3 text-slate-500">{label}</p>
      <p className="mt-1 break-words text-[14px] font-extrabold leading-[18px] text-slate-900">{value}</p>
    </div>
  </div>
);

const FuelCard = ({ title, litres, sale, tone, t }) => {
  const petrol = tone === "petrol";

  return (
    <div className={`flex min-h-[82px] items-center gap-2 rounded-[14px] border border-white p-2.5 shadow-[0_3px_12px_rgba(15,23,42,0.04)] ${petrol ? "bg-rose-50" : "bg-blue-50"}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${petrol ? "bg-white/80 text-rose-600" : "bg-white/80 text-blue-700"}`}>
        <AccountingIcon type={petrol ? "petrol" : "diesel"} />
      </span>
      <div className="min-w-0">
        <p className={`text-[9px] font-bold leading-3 ${petrol ? "text-rose-700" : "text-blue-700"}`}>{title}</p>
        <p className="mt-1 text-[13px] font-extrabold leading-4 text-slate-900">{formatLitres(litres)}</p>
        <p className="mt-0.5 break-words text-[9px] font-medium leading-3 text-slate-600">
          {t("manager.accountingLabels.sale")}: {formatMoney(sale)}
        </p>
      </div>
    </div>
  );
};

const AccountingIcon = ({ type }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[17px] w-[17px]"
    aria-hidden="true"
  >
    {type === "litres" ? (
      <>
        <path d="M12 3.5s6 6.1 6 10.4a6 6 0 1 1-12 0C6 9.6 12 3.5 12 3.5Z" />
        <path d="M9.2 15.1a2.9 2.9 0 0 0 2.9 2.8" />
      </>
    ) : type === "sale" ? (
      <>
        <path d="M7 3.8h8l3 3v13.4H7z" />
        <path d="M15 3.8v3h3M10 11h5M10 14.5h5M10 18h3" />
      </>
    ) : (
      <>
        <path d="M6.5 20.2V5.1a1.6 1.6 0 0 1 1.6-1.6h7.2a1.6 1.6 0 0 1 1.6 1.6v15.1" />
        <path d="M5 20.2h13.5M9 7.2h5.5v4H9zM17 7.5l2.3 2.1v5.2a1.5 1.5 0 0 0 3 0v-4.2l-2.1-2" />
      </>
    )}
  </svg>
);

const MpdAccountingCard = ({ mpd, t }) => (
  <div className="rounded-[14px] border border-slate-100 bg-white p-3 shadow-[0_3px_10px_rgba(15,23,42,0.04)]">
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span className="text-[11px] font-extrabold text-slate-900">{mpd.mpdNumber}</span>
      <span className="text-[11px] font-extrabold text-slate-900">{formatMoney(mpd.expectedTotalSalePaise)}</span>
    </div>
    <div className="mt-2 space-y-1.5 text-[9px] font-medium text-slate-600">
      <div className="flex justify-between">
         <span className="font-bold text-rose-700">{t("manager.petrol")}</span>
         <span className="font-semibold text-slate-800">{formatLitresNumber(mpd.totalLitresPetrol)} L · {formatMoney(mpd.petrolSalePaise)}</span>
      </div>
      <div className="flex justify-between">
         <span className="font-bold text-blue-700">{t("manager.diesel")}</span>
         <span className="font-semibold text-slate-800">{formatLitresNumber(mpd.totalLitresDiesel)} L · {formatMoney(mpd.dieselSalePaise)}</span>
      </div>
      <div className="mt-1 flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-700">
         <span>{t("manager.accountingLabels.totalLitresColumn")}</span>
         <span>{formatLitresNumber(mpd.totalLitres)} L</span>
      </div>
    </div>
  </div>
);

const SectionHeading = ({ title, tone }) => (
  <h2 className={`text-[11px] font-extrabold ${tone === "red" ? "text-red-600" : "text-slate-900"}`}>
    {title}
  </h2>
);

const MoneyRow = ({ label, value, strong = false, muted = false }) => (
  <div className={`flex items-start justify-between gap-1 ${strong ? "border-t border-slate-100 pt-2" : ""}`}>
    <span className={`min-w-0 text-[9px] ${strong ? "font-bold text-slate-700" : muted ? "font-medium text-slate-400" : "font-medium text-slate-500"}`}>
      {label}
    </span>
    <span className={`shrink-0 text-right text-[9px] ${strong ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>
      {formatMoney(value)}
    </span>
  </div>
);

const DifferenceRow = ({ difference, t }) => {
  const amount = Number(difference || 0);
  const color = amount < 0 ? "text-red-600" : amount > 0 ? "text-amber-600" : "text-emerald-700";
  const label = amount < 0
    ? t("manager.accountingLabels.short")
    : amount > 0
      ? t("manager.accountingLabels.excess")
      : t("manager.accountingLabels.matched");

  return (
    <div className="flex items-center justify-between rounded-[11px] bg-slate-50 px-3 py-2">
      <span className="text-[9px] font-semibold text-slate-500">
        {t("manager.difference")} Â· {label}
      </span>
      <span className={`text-[11px] font-extrabold ${color}`}>
        {amount > 0 ? "+" : ""}{formatMoney(amount)}
      </span>
    </div>
  );
};

const StatusBadge = ({ status, t }) => {
  const normalized = String(status || "PENDING").toLowerCase();
  const color = normalized === "matched"
    ? "bg-emerald-50 text-emerald-700"
    : normalized === "short"
      ? "bg-red-50 text-red-600"
      : normalized === "excess"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-500";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold ${color}`}>
      {t(`manager.reconciliationStatus.${normalized}`)}
    </span>
  );
};

const ShiftSummaryRow = ({ shift, t, onClick }) => {
  const difference = Number(shift.differencePaise || 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[12px] border border-slate-100 p-3 text-left active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold text-slate-800">
            {shift.mpd?.mpdNumber || t("manager.accountingLabels.unknownMpd")}
            <span className="font-medium text-slate-400"> Â· {shift.employee?.name || t("manager.employeeUnknown")}</span>
          </p>
          <p className="mt-1 text-[9px] text-slate-500">
            {formatTime(shift.startedAt)}
            {shift.endedAt
              ? ` â€“ ${formatTime(shift.endedAt)}`
              : ` â€“ ${t("manager.accountingLabels.activePending")}`}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-slate-800">
          {formatMoney(shift.expectedTotalSalePaise)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-[8px] font-semibold text-slate-400">
          {t(`manager.reconciliationStatus.${String(shift.reconciliationStatus || "PENDING").toLowerCase()}`)}
        </span>
        <span className={`text-[9px] font-bold ${difference < 0 ? "text-red-600" : difference > 0 ? "text-amber-600" : "text-emerald-700"}`}>
          {difference > 0 ? "+" : ""}{formatMoney(difference)}
        </span>
      </div>
    </button>
  );
};

const ActiveShiftSummaryRow = ({ shift, t, selectedBusinessDate, onClick }) => {
  const isOvernight = shift.businessDate < selectedBusinessDate;
  const petrolLitres = Number(shift.totalLitresPetrol || 0);
  const dieselLitres = Number(shift.totalLitresDiesel || 0);

  return (
    <button type="button" onClick={onClick} className="w-full rounded-[12px] border border-emerald-100 bg-emerald-50/40 p-3 text-left active:bg-emerald-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold text-slate-800">
            {shift.mpd?.mpdNumber || t("manager.accountingLabels.unknownMpd")}
            <span className="font-medium text-slate-500"> Â· {shift.employee?.name || t("manager.employeeUnknown")}</span>
          </p>
          <p className="mt-1 text-[9px] text-slate-500">
            {isOvernight ? t("manager.accountingLabels.startedEarlier") : t("manager.started")} Â· {formatTime(shift.startedAt)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-extrabold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> {t("manager.active")}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 border-y border-emerald-100 py-2 text-[8px]">
        <span className="text-slate-500">{t("manager.petrol")} <strong className="block text-[10px] text-slate-800">{formatLitres(petrolLitres)}</strong></span>
        <span className="text-slate-500">{t("manager.diesel")} <strong className="block text-[10px] text-slate-800">{formatLitres(dieselLitres)}</strong></span>
        <span className="text-right text-slate-500">{t("manager.accountingLabels.total")} <strong className="block text-[10px] text-slate-800">{formatLitres(petrolLitres + dieselLitres)}</strong></span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-[8px] font-semibold text-slate-500">{t("manager.accountingLabels.currentEstimated")}</span>
        <span className="text-[11px] font-extrabold text-slate-900">{formatMoney(shift.expectedTotalSalePaise)}</span>
      </div>
      <p className="mt-1.5 text-[8px] font-semibold text-emerald-700">{t("manager.accountingLabels.notIncludedInFinalized")}</p>
    </button>
  );
};

export default Accounting;



