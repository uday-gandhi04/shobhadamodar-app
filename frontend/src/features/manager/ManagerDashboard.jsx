import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ManagerLayout from "./ManagerLayout";
import { getManagerAccounting } from "../../services/managerAccountingApi";
import { getManagerOperations } from "../../services/managerOperationsApi";
import { getBusinessDate } from "../../utils/businessDate";

const actionTones = {
  accounting: "bg-emerald-50 text-emerald-700",
  operations: "bg-rose-50 text-rose-600",
  stock: "bg-teal-50 text-teal-700",
  udhari: "bg-pink-50 text-pink-700",
  employees: "bg-emerald-50 text-emerald-700",
};

const actionSurfaces = {
  accounting: "bg-emerald-50/80",
  operations: "bg-rose-50/80",
  stock: "bg-teal-50/80",
  udhari: "bg-pink-50/80",
  employees: "bg-emerald-50/80",
};

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(paise || 0) / 100);

const formatBusinessDate = (businessDate, language) =>
  new Intl.DateTimeFormat(language, {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${businessDate}T00:00:00+05:00`));

const ActionIcon = ({ type }) => {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    className: "h-6 w-6",
    "aria-hidden": true,
  };

  if (type === "accounting") {
    return (
      <svg {...common}>
        <path d="M6 3.75h12A1.5 1.5 0 0 1 19.5 5.25v13.5A1.5 1.5 0 0 1 18 20.25H6a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 6 3.75Z" />
        <path d="M8 8h8M8 12h8M8 16h4" />
      </svg>
    );
  }

  if (type === "operations") {
    return (
      <svg {...common}>
        <path d="M4 7.5h16M4 12h16M4 16.5h16" />
        <circle cx="7" cy="7.5" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="17" cy="16.5" r="1" />
      </svg>
    );
  }

  if (type === "stock") {
    return (
      <svg {...common}>
        <path d="M5 4.5h14v15H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (type === "udhari") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M8 12h3M16 9.5v5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.75 19c.55-3.4 2.35-5.25 5.25-5.25S13.7 15.6 14.25 19" />
      <path d="M16 6.5a2.5 2.5 0 1 1 0 5" />
      <path d="M15.5 14.25c2.25.25 3.55 1.65 4 4.25" />
    </svg>
  );
};

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

  const actions = [
    {
      key: "accounting",
      path: "/manager/accounting",
      title: t("manager.accounting"),
      description: t("manager.accountingDescription"),
    },
    {
      key: "operations",
      path: "/manager/operations",
      title: t("manager.operations"),
      description: t("manager.operationsDescription"),
    },
    {
      key: "stock",
      path: "/manager/stock",
      title: t("manager.stock"),
      description: t("manager.stockDescription"),
    },
    {
      key: "udhari",
      path: "/manager/udhari",
      title: t("manager.udhari"),
      description: t("manager.udhariDescription"),
    },
    {
      key: "employees",
      path: "/manager/employees",
      title: t("manager.employees"),
      description: t("manager.employeesDescription"),
    },
  ];

  const summary = overview?.summary || {};
  const openShiftCount = liveShiftSummary.activeShiftCount;
  const totalMpdCount = liveShiftSummary.mpdCount || overview?.mpds?.length || 0;
  const hasOverview = Boolean(overview);
  const openAccounting = () =>
    navigate("/manager/accounting", {
      state: { accountingPeriod: "today", businessDate },
    });

  return (
    <ManagerLayout title={t("manager.dashboardTitle")} variant="dashboard">
      <div className="space-y-3">
        <div className="flex min-h-[42px] items-center justify-between gap-2 rounded-[13px] border border-white bg-white/85 px-2.5 shadow-[0_3px_12px_rgba(15,23,42,0.04)]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-emerald-50 text-emerald-700">
              <CalendarIcon />
            </span>
            <span className="truncate text-[10px] font-semibold text-slate-700">
              {formatBusinessDate(businessDate, i18n.language)}
            </span>
          </div>
          <button
            type="button"
            onClick={openAccounting}
            className="flex min-h-[30px] shrink-0 items-center gap-1 rounded-[9px] border border-emerald-100 bg-white px-2 text-[9px] font-bold text-emerald-800 active:bg-emerald-50"
          >
            {t("manager.accountingLabels.today")}
            <ChevronIcon />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => navigate(action.path)}
              className={`group relative min-h-[104px] rounded-[14px] border border-white p-2.5 text-left shadow-[0_4px_14px_rgba(15,23,42,0.045)] transition active:scale-[0.985] ${actionSurfaces[action.key]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`grid h-8 w-8 place-items-center rounded-[10px] bg-white/80 ${actionTones[action.key]}`}>
                  <ActionIcon type={action.key} />
                </div>

                <span className="mt-1 text-slate-400 transition-transform group-hover:translate-x-0.5">
                  <ChevronIcon />
                </span>
              </div>

              <p className="mt-2 text-[11px] font-bold leading-[14px] text-slate-900">
                {action.title}
              </p>

              <p className="mt-0.5 line-clamp-2 text-[8px] font-medium leading-[11px] text-slate-500">
                {action.description}
              </p>
            </button>
          ))}
        </div>

        <section className="rounded-[15px] border border-white bg-white/90 p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-[12px] font-extrabold text-slate-900">
              {t("manager.dashboardOverview.todayAtGlance")}
            </h2>
            <button
              type="button"
              onClick={openAccounting}
              className="flex min-h-[28px] items-center gap-1 text-[8px] font-semibold text-slate-500 active:text-emerald-700"
            >
              {t("manager.dashboardOverview.viewDetails")}
              <ChevronIcon />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <OverviewMetric
              label={t("manager.accountingLabels.totalSale")}
              value={hasOverview ? formatMoney(summary.expectedTotalSalePaise) : "—"}
              tone="green"
              icon="sale"
            />
            <OverviewMetric
              label={t("manager.accountingLabels.totalLitres")}
              value={hasOverview ? `${Number(summary.totalLitres || 0).toFixed(2)} L` : "—"}
              tone="green"
              icon="litres"
            />
            <OverviewMetric
              label={t("manager.dashboardOverview.openShifts")}
              value={hasOverview ? `${openShiftCount} / ${totalMpdCount}` : "—"}
              tone="rose"
              icon="shifts"
            />
            <OverviewMetric
              label={t("manager.udhari")}
              value={hasOverview ? formatMoney(summary.totalUdhariPaise) : "—"}
              tone="rose"
              icon="udhari"
            />
          </div>
        </section>
      </div>
    </ManagerLayout>
  );
};

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <rect x="4" y="5.5" width="16" height="15" rx="2" />
    <path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h2M14 13h2M8 16.5h2" />
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3" aria-hidden="true">
    <path d="m6 3.5 4.5 4.5L6 12.5" />
  </svg>
);

const OverviewMetric = ({ label, value, tone, icon }) => {
  const toneClasses = tone === "rose"
    ? "bg-rose-50 text-rose-700"
    : "bg-emerald-50 text-emerald-700";

  return (
    <div className="flex min-h-[50px] min-w-0 items-center gap-1.5 rounded-[11px] bg-slate-50/90 px-2 py-1.5">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[8px] ${toneClasses}`}>
        <OverviewIcon type={icon} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[7px] font-medium leading-3 text-slate-500">{label}</span>
        <span className="block truncate text-[10px] font-extrabold leading-[13px] text-slate-900">{value}</span>
      </span>
    </div>
  );
};

const OverviewIcon = ({ type }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]" aria-hidden="true">
    {type === "sale" ? (
      <>
        <path d="M7 3.5h8l3 3v14H7z" />
        <path d="M15 3.5v3h3M10 11h5M10 14.5h5M10 18h3" />
      </>
    ) : type === "litres" ? (
      <>
        <path d="M12 3.5s6 6.1 6 10.4a6 6 0 1 1-12 0C6 9.6 12 3.5 12 3.5Z" />
        <path d="M9.2 15.1a2.9 2.9 0 0 0 2.9 2.8" />
      </>
    ) : type === "shifts" ? (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.6-3.2 2.4-4.8 5.5-4.8 2 0 3.4.7 4.4 2" />
        <path d="M16 11.5a3 3 0 1 0-2.5-4.7M15.5 15c2.4.4 3.8 1.7 4.3 4" />
      </>
    ) : (
      <>
        <rect x="3.5" y="6" width="17" height="12" rx="2" />
        <path d="M7.5 12h3M16.5 9.5v5" />
      </>
    )}
  </svg>
);

export default ManagerDashboard;