import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ManagerLayout from "./ManagerLayout";
import { getManagerAccounting } from "../../services/managerAccountingApi";
import { getManagerOperations } from "../../services/managerOperationsApi";
import { getBusinessDate } from "../../utils/businessDate";

/* ─── colour accents: tinted card surfaces + icon tones ─── */
const cardAccents = {
  accounting: {
    iconBg: "bg-emerald-100/80 text-emerald-600",
  },
  operations: {
    iconBg: "bg-red-100/80 text-red-500",
  },
  stock: {
    iconBg: "bg-teal-100/80 text-teal-600",
  },
  udhari: {
    iconBg: "bg-rose-100/80 text-rose-500",
  },
  employees: {
    iconBg: "bg-emerald-100/80 text-emerald-600",
  },
  settings: {
    iconBg: "bg-sky-100/80 text-sky-600",
  },
};

/* ─── helpers ─── */
const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(paise || 0) / 100);

const formatBusinessDate = (businessDate, language) =>
  new Intl.DateTimeFormat(language, {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${businessDate}T00:00:00+05:00`));

/* ─── SVG icon set (consistent stroke, 24×24 viewBox) ─── */
const ActionIcon = ({ type, className }) => {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className || "h-[22px] w-[22px]",
    "aria-hidden": true,
  };

  switch (type) {
    case "accounting":
      return (
        <svg {...common}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "operations":
      return (
        <svg {...common}>
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M5 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      );
    case "stock":
      return (
        <svg {...common}>
          <path d="M3 6h18M3 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6M3 6l1-2h16l1 2" />
          <path d="M10 10h4" />
        </svg>
      );
    case "udhari":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "employees":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    default:
      return null;
  }
};

/* ─── Chevron ─── */
const Chevron = ({ className = "" }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-[16px] w-[16px] ${className}`}
    aria-hidden="true"
  >
    <path d="m5.5 3 5 5-5 5" />
  </svg>
);

/* ─── Calendar icon ─── */
const CalendarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px]"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

/* ════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════ */
const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [liveShiftSummary, setLiveShiftSummary] = useState({
    activeShiftCount: 0,
    mpdCount: 0,
  });
  const businessDate = getBusinessDate();

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getManagerAccounting("today", businessDate),
      getManagerOperations(businessDate),
    ])
      .then(([accountingResponse, operationsResponse]) => {
        if (!mounted) return;

        setOverview(accountingResponse?.data || null);
        setLiveShiftSummary({
          activeShiftCount:
            Number(operationsResponse?.data?.activeShifts?.length || 0),
          mpdCount: Number(operationsResponse?.data?.mpds?.length || 0),
        });
      })
      .catch((error) => {
        console.error("[Manager Dashboard Overview]", error);
      });

    return () => {
      mounted = false;
    };
  }, [businessDate]);

  /* action definitions — functional, unchanged */
  const actions = [
    {
      key: "accounting",
      path: "/manager/accounting",
      title: t("manager.accounting"),
      description: t("manager.accountingDescription", "Daily sales and collections"),
    },
    {
      key: "operations",
      path: "/manager/operations",
      title: t("manager.operations"),
      description: t("manager.operationsDescription", "MPDs, shifts and nozzle details"),
    },
    {
      key: "stock",
      path: "/manager/stock",
      title: t("manager.stock"),
      description: t("manager.stockDescription", "Stock, receipts, dips and rates"),
    },
    {
      key: "udhari",
      path: "/manager/udhari",
      title: t("manager.udhari"),
      description: t("manager.udhariDescription", "Customer accounts and settlements"),
    },
    {
      key: "employees",
      path: "/manager/employees",
      title: t("manager.employees"),
      description: t("manager.employeesDescription", "Employee profiles and access"),
    },
    {
      key: "settings",
      path: "/manager/settings",
      title: t("manager.settings", "Settings"),
      description: t(
        "manager.settingsDescription",
        "Station and configuration"
      ),
    },
  ];

  const summary = overview?.summary || {};
  const openShiftCount = liveShiftSummary.activeShiftCount;
  const totalMpdCount =
    liveShiftSummary.mpdCount || overview?.mpds?.length || 0;
  const hasOverview = Boolean(overview);

  const openAccounting = () =>
    navigate("/manager/accounting", {
      state: { accountingPeriod: "today", businessDate },
    });

  return (
    <ManagerLayout title={t("manager.dashboardTitle")} variant="dashboard">
      <div className="space-y-6 pb-6">
        {/* ── Date row ── */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5 text-slate-600">
            <CalendarIcon />
            <span className="text-[13px] font-bold tracking-wide">
              {formatBusinessDate(businessDate, i18n.language)}
            </span>
          </div>

          <button
            type="button"
            onClick={openAccounting}
            className="flex min-h-[34px] items-center gap-2 rounded-full bg-emerald-100/50 px-4 py-1.5 text-[11px] font-bold tracking-wide text-emerald-800 transition hover:bg-emerald-100 active:bg-emerald-200"
          >
            {t("manager.accountingLabels.today", "Today")}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="m6 3.5 4.5 4.5-4.5 4.5" />
            </svg>
          </button>
        </div>

        {/* ── Navigation cards — 2-col grid ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((action) => {
            const accent = cardAccents[action.key];
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => navigate(action.path)}
                className="group relative flex flex-col justify-between overflow-hidden !rounded-[16px] bg-white border border-slate-100/80 !p-3 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                style={{ minHeight: "82px" }}
              >
                {/* Top row: icon + chevron */}
                <div className="flex w-full items-start justify-between">
                  <div
                    className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full ${accent.iconBg}`}
                  >
                    <ActionIcon type={action.key} className="h-[16px] w-[16px]" />
                  </div>

                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50/50">
                    <Chevron className="text-slate-400 !h-[12px] !w-[12px]" />
                  </div>
                </div>

                {/* Bottom: title + desc */}
                <div className="mt-2.5">
                  <h3 className="text-[13px] font-bold leading-tight tracking-tight text-slate-800 break-normal whitespace-normal">
                    {action.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[9px] font-medium leading-[1.2] text-slate-500 break-normal whitespace-normal">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Today at a glance ── */}
        <section className="overflow-hidden !rounded-[24px] bg-white !p-5 shadow-[0_8px_24px_rgba(149,157,165,0.1)]">
          {/* Section header */}
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight text-slate-800">
              {t("manager.dashboardOverview.todayAtGlance")}
            </h2>
            <button
              type="button"
              onClick={openAccounting}
              className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3.5 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200"
            >
              {t("manager.dashboardOverview.viewDetails")}
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <path d="m6 4 4 4-4 4" />
              </svg>
            </button>
          </div>

          {/* 2×2 stat grid */}
          <div className="grid grid-cols-2 gap-3">
            <GlanceStat
              label={t("manager.accountingLabels.totalSale")}
              value={
                hasOverview
                  ? formatMoney(summary.expectedTotalSalePaise)
                  : "—"
              }
              icon="sale"
              tone="green"
            />
            <GlanceStat
              label={t("manager.accountingLabels.totalLitres")}
              value={
                hasOverview
                  ? `${Number(summary.totalLitres || 0).toFixed(2)} L`
                  : "—"
              }
              icon="litres"
              tone="green"
            />
            <GlanceStat
              label={t("manager.dashboardOverview.openShifts")}
              value={
                hasOverview ? `${openShiftCount} / ${totalMpdCount}` : "—"
              }
              icon="shifts"
              tone="rose"
            />
            <GlanceStat
              label={t("manager.udhari")}
              value={
                hasOverview ? formatMoney(summary.totalUdhariPaise) : "—"
              }
              icon="udhari"
              tone="rose"
            />
          </div>
        </section>
      </div>
    </ManagerLayout>
  );
};

/* ─── Glance stat card ─── */
const GlanceStat = ({ label, value, icon, tone }) => {
  const bg =
    tone === "rose"
      ? "bg-rose-100/70 text-rose-500"
      : "bg-emerald-100/70 text-emerald-600";

  return (
    <div className="flex flex-col !rounded-[16px] bg-slate-50 !p-4 border border-slate-100/60">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${bg}`}
        >
          <GlanceIcon type={icon} />
        </span>
        <span className="truncate text-[10px] font-bold uppercase tracking-[0.05em] text-slate-500">
          {label}
        </span>
      </div>
      <p className="mt-3 truncate text-[18px] font-black leading-none tracking-tight text-slate-800">
        {value}
      </p>
    </div>
  );
};

/* ─── Small stat icons ─── */
const GlanceIcon = ({ type }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[14px] w-[14px]"
    aria-hidden="true"
  >
    {type === "sale" ? (
      <>
        <path d="M7 4h8l3 3v13H7z" />
        <path d="M15 4v3h3" />
      </>
    ) : type === "litres" ? (
      <path d="M12 3s6 6 6 10.5a6 6 0 1 1-12 0C6 9 12 3 12 3Z" />
    ) : type === "shifts" ? (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ) : (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 12h4M17 9v6" />
      </>
    )}
  </svg>
);

export default ManagerDashboard;