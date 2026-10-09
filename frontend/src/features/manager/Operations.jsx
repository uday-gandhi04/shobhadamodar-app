import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import ManagerLayout from "./ManagerLayout";
import {
  getManagerOperations,
  getManagerShiftDetail,
  getManagerMpdShifts,
} from "../../services/managerOperationsApi";
import { getBusinessDate } from "../../utils/businessDate";
import PastShiftsView from "./PastShiftsView";
import CollectionCard from "../../components/business/accounting/CollectionCard";
import { CashBreakdownModal, CardBreakdownModal, UpiBreakdownModal, UdhariBreakdownModal } from "../../components/business/accounting/CollectionModals";

const formatMoney = (paise) => {
  const amount = Number(paise || 0) / 100;
  const sign = amount < 0 ? "-" : "";

  return `${sign}₹${Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel = (status, t) => {
  const key = String(status || "").toLowerCase();

  return (
    t(`manager.operationsStatus.${key}`, {
      defaultValue: status || "—",
    }) || status
  );
};

const sortShiftsChronologically = (shiftList) =>
  [...shiftList].sort(
    (left, right) =>
      new Date(left.startedAt).getTime() -
      new Date(right.startedAt).getTime(),
  );

const Operations = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("LIVE");

  const [businessDate, setBusinessDate] = useState(getBusinessDate());

  const [mpds, setMpds] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [historyMpdId, setHistoryMpdId] = useState(null);
  const [selectedShiftId, setSelectedShiftId] = useState(
    () => location.state?.accountingShiftId || location.state?.employeeShiftId || null,
  );
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftDetailLoading, setShiftDetailLoading] = useState(false);
  const [shiftDetailError, setShiftDetailError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const requestInFlight = useRef(false);
  const hasLoaded = useRef(false);
  const isMounted = useRef(false);

  const loadOperations = useCallback(async () => {
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    if (!hasLoaded.current) setLoading(true);
    setError("");

    try {
      const date = getBusinessDate();
      const response = await getManagerOperations(date);
      const data = response?.data || {};

      if (isMounted.current) {
        setBusinessDate(data.businessDate || date);
        setMpds(data.mpds || []);
        setShifts(data.shifts || []);
      }
    } catch (err) {
      console.error("[Manager Operations]", err);

      if (isMounted.current) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("manager.operationsLoadError"),
        );
      }
    } finally {
      requestInFlight.current = false;
      if (isMounted.current) {
        hasLoaded.current = true;
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "LIVE" || historyMpdId || selectedShiftId) {
      return undefined;
    }

    const initialRequestId = window.setTimeout(loadOperations, 0);
    const intervalId = window.setInterval(loadOperations, 12000);

    return () => {
      window.clearTimeout(initialRequestId);
      window.clearInterval(intervalId);
    };
  }, [activeTab, historyMpdId, loadOperations, retryCount, selectedShiftId]);

  const historyMpd = useMemo(
    () => mpds.find((mpd) => String(mpd._id) === String(historyMpdId)) || null,
    [mpds, historyMpdId],
  );

  const historyShifts = useMemo(
    () =>
      historyMpdId
        ? sortShiftsChronologically(
            shifts.filter((shift) => String(shift.mpd?._id) === String(historyMpdId)),
          )
        : [],
    [historyMpdId, shifts],
  );

  const closeShiftDetail = () => {
    if (location.state?.accountingReturn) {
      navigate("/manager/accounting", {
        state: location.state.accountingReturn,
      });
      return;
    }

    if (location.state?.employeeReturn) {
      navigate("/manager/employees", {
        state: location.state.employeeReturn,
      });
      return;
    }

    setSelectedShiftId(null);
    setSelectedShift(null);
    setShiftDetailError("");
  };

  const closeMpdHistory = () => setHistoryMpdId(null);

  const openMpdHistory = (mpdId) => {
    setHistoryMpdId(mpdId);
  };

  const openShiftDetail = useCallback(async (shiftId) => {
    setSelectedShiftId(shiftId);
    setSelectedShift(null);
    try {
      setShiftDetailLoading(true);
      setShiftDetailError("");

      const response = await getManagerShiftDetail(shiftId);

      setSelectedShift(response?.data || null);
    } catch (err) {
      console.error("[Manager Shift Detail]", err);

      setShiftDetailError(
        err?.response?.data?.message ||
          err?.message ||
          t("manager.shiftDetailLoadError"),
      );
    } finally {
      setShiftDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const routeShiftId =
      location.state?.accountingShiftId || location.state?.employeeShiftId;
    if (!routeShiftId) return undefined;

    const timeoutId = window.setTimeout(
      () => openShiftDetail(routeShiftId),
      0,
    );

    return () => window.clearTimeout(timeoutId);
  }, [location.key, location.state, openShiftDetail]);

  const handleBack = selectedShiftId
    ? closeShiftDetail
    : historyMpdId
      ? closeMpdHistory
      : undefined;

  return (
    <ManagerLayout
      title={
        selectedShiftId
          ? t("manager.shiftDetail")
          : historyMpdId
            ? t("manager.mpdTodayShifts", { mpd: historyMpd?.mpdNumber || "MPD" })
            : t("manager.operations")
      }
      showBack
      onBack={handleBack}
    >
      {selectedShiftId ? (
        <ShiftDetailView
          shift={selectedShift}
          loading={shiftDetailLoading}
          error={shiftDetailError}
          onBack={closeShiftDetail}
          t={t}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-[21px] font-bold tracking-[-0.02em] text-slate-900">
              {t("manager.operationsHeading")}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {t("manager.operationsSubtitle")}
            </p>
          </div>

          {!historyMpdId && (
            <div className="grid grid-cols-2 !rounded-[14px] !bg-slate-50 !p-1 !mb-4">
              {[
                ["LIVE", "MPDs"],
                ["TODAY", "Shifts"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={`
                !min-h-[38px]
                !rounded-[10px]
                !px-2
                !text-[12px]
                !font-bold
                !transition-all
                ${
                  activeTab === value
                    ? "!bg-emerald-800 !text-white !shadow-sm"
                    : "!text-slate-500 hover:!text-slate-700"
                }
              `}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {historyMpdId && (
            <div className="mb-2 mt-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[18px] font-black tracking-tight text-slate-900">
                    {historyMpd?.mpdNumber || "MPD"}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-500">
                    {t("manager.todaysShifts")}
                  </p>
                </div>
              </div>
              <div className="rounded-[10px] bg-white px-3 py-1.5 shadow-sm border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                  {formatDate(businessDate)}
                </span>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              <div className="h-[200px] animate-pulse rounded-[22px] bg-white" />
              <div className="h-[200px] animate-pulse rounded-[22px] bg-white" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-[18px] border border-red-100 bg-red-50 p-4">
              <p className="text-[11px] font-semibold text-red-700">{error}</p>

              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-3 rounded-[10px] bg-white px-3 py-2 text-[10px] font-semibold text-red-700 shadow-sm"
              >
                {t("manager.retry")}
              </button>
            </div>
          )}

          {!loading && !error && activeTab === "LIVE" && !historyMpdId && (
            <div className="space-y-4">
              {mpds.length === 0 && <EmptyState text={t("manager.noMpds")} />}

              {mpds.map((mpd) => (
                <MpdCard
                  key={mpd._id}
                  mpd={mpd}
                  lastShift={shifts.find(
                    (shift) => String(shift.mpd?._id) === String(mpd._id),
                  )}
                  t={t}
                  onViewTodayHistory={() => openMpdHistory(mpd._id)}
                />
              ))}
            </div>
          )}

          {!loading && !error && historyMpdId && (
            <MpdShiftList
              shifts={historyShifts}
              t={t}
              onOpenShift={openShiftDetail}
            />
          )}

          {!loading && !error && activeTab === "TODAY" && !historyMpdId && (
            <PastShiftsView
              mpds={mpds}
              t={t}
              onOpenShift={openShiftDetail}
            />
          )}
        </div>
      )}
    </ManagerLayout>
  );
};

const MpdShiftList = ({ shifts, t, onOpenShift }) => (
  <section className="space-y-3.5">
    {shifts.length === 0 ? (
      <EmptyState text={t("manager.noShiftsForDate")} />
    ) : (
      shifts.map((shift) => (
        <ShiftCard
          key={shift._id}
          shift={shift}
          active={shift.status === "IN_PROGRESS"}
          t={t}
          onClick={() => onOpenShift(shift._id)}
        />
      ))
    )}
  </section>
);



const MpdCard = ({ mpd, lastShift, t, onViewTodayHistory }) => (
  <section className="!rounded-[24px] !border !border-slate-100/60 !bg-white !p-4 !shadow-[0_4px_20px_rgba(15,23,42,0.04)] !mb-4">
    {/* TOP ROW: MPD NAME + ACTIVE BADGE */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="!h-6 !w-1.5 !rounded-full !bg-emerald-700" />
        <p className="!text-[16px] !font-bold !text-slate-900">
          {mpd.mpdNumber}
        </p>
      </div>

      <div
        className={`flex items-center gap-1 !rounded-full !px-3 !py-1.5 !text-[10px] !font-bold ${
          mpd.status === "ACTIVE"
            ? "!bg-emerald-50 !text-emerald-600"
            : "!bg-slate-50 !text-slate-500"
        }`}
      >
        {mpd.status === "ACTIVE" ? (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" className="!h-3 !w-3">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
            </svg>
            Active
          </>
        ) : (
          "Free"
        )}
      </div>
    </div>

    {/* SECOND ROW: EMPLOYEE INFO */}
    {mpd.activeShift ? (
      <div className="mt-4 flex items-center justify-between pr-2">
        <div>
          <p className="!text-[10px] !font-medium !text-slate-400">Employee</p>
          <p className="!mt-0.5 !text-[13px] !font-bold !text-slate-900">
            {mpd.activeShift.employee?.name || "Unknown"}
          </p>
        </div>
        <div>
          <p className="!text-[10px] !font-medium !text-slate-400">Started</p>
          <p className="!mt-0.5 !text-[13px] !font-bold !text-slate-900">
            {formatTime(mpd.activeShift.startedAt)}
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="!h-4 !w-4 !text-slate-400"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    ) : (
      <div className="mt-4 flex items-center justify-between pr-2">
        <div>
          <p className="!text-[13px] !font-bold !text-slate-500">No active shift</p>
        </div>
      </div>
    )}

    {/* NOZZLES GRID */}
    <div className="mt-5 grid grid-cols-4 gap-2">
      {mpd.nozzles.map((nozzle) => {
        const isPetrol = nozzle.fuelType === "PETROL";
        return (
          <div
            key={nozzle.nozzleId}
            className="flex flex-col items-center !rounded-[14px] !border !border-slate-100 !bg-white !p-2 !shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
          >
            <p className="!text-[11px] !font-bold !text-slate-700">
              {nozzle.nozzleId.toUpperCase()}
            </p>
            <div
              className={`!mt-2 flex !h-[26px] !w-[26px] items-center justify-center !rounded-full !text-[10px] !font-bold ${
                isPetrol
                  ? "!bg-emerald-50 !text-emerald-600"
                  : "!bg-blue-50 !text-blue-600"
              }`}
            >
              {isPetrol ? "P" : "D"}
            </div>
            {mpd.activeShift ? (
              <p className="!mt-3 !text-[10px] !font-bold !text-slate-700">
                {Number(nozzle.litres || 0).toFixed(1)} L
              </p>
            ) : (
              <p className="!mt-3 !text-[10px] !font-bold !text-slate-700">
                {Number(nozzle.currentReading || 0).toFixed(1)} L
              </p>
            )}
          </div>
        );
      })}
    </div>

    {/* TOTALS */}
    {mpd.activeShift && (
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="!text-[10px] !font-medium !text-slate-400">Today's Sale</p>
          <p className="!mt-0.5 !text-[14px] !font-bold !text-slate-900">
            {formatMoney(mpd.estimatedSalePaise)}
          </p>
        </div>
        <div>
          <p className="!text-[10px] !font-medium !text-slate-400">Total Litres</p>
          <p className="!mt-0.5 !text-[14px] !font-bold !text-slate-900">
            {mpd.totalLitres.toFixed(2)} L
          </p>
        </div>
      </div>
    )}

    <div className="mt-5 flex flex-col gap-2">
      <button
        type="button"
        onClick={onViewTodayHistory}
        className="flex w-full items-center justify-between !rounded-[12px] !border !border-slate-100 !bg-slate-50/50 !p-3 !text-left"
      >
        <div className="flex items-center gap-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="!h-4 !w-4 !text-slate-500"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span className="!text-[12px] !font-bold !text-slate-800">
            View Today's Shifts
          </span>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="!h-4 !w-4 !text-slate-400"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  </section>
);

const ShiftCard = ({ shift, t, active = false, onClick }) => {
  const difference = Number(shift.differencePaise || 0);

  const differenceTextColor =
    difference === 0
      ? "!text-emerald-600"
      : difference < 0
        ? "!text-red-600"
        : "!text-amber-600";

  return (
    <div
      onClick={onClick}
      className={`!group !cursor-pointer !rounded-[20px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_4px_20px_rgba(15,23,42,0.03)] !transition-all !duration-300 ${
        active 
          ? "!border-emerald-200 !shadow-[0_8px_24px_rgba(16,185,129,0.08)]" 
          : "hover:!border-emerald-200 hover:!shadow-[0_8px_30px_rgba(4,120,87,0.08)]"
      }`}
    >
      <div className="!mb-4 !flex !items-center !justify-between">
        <div className="!flex !items-center !gap-2.5 !flex-1 !min-w-0">
          <div className="!flex !h-8 !w-8 !shrink-0 !items-center !justify-center !rounded-full !bg-emerald-50 !text-emerald-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="!h-4 !w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="!text-[13px] !font-black !text-slate-900 !truncate">
            {shift.employee?.name || shift.employee?.employeeId || t("manager.employeeUnknown")}
          </p>
        </div>
        
        <div className="!flex !flex-1 !items-center !justify-center">
          <div className={`!flex !items-center !gap-1.5 !rounded-full !px-2.5 !py-1 !text-[10px] !font-bold !whitespace-nowrap ${active ? "!bg-emerald-100 !text-emerald-700" : "!bg-slate-50 !text-slate-600"}`}>
            <span>{formatTime(shift.startedAt)}</span>
            <svg className={`!h-3 !w-3 ${active ? "!text-emerald-600" : "!text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>{active ? t("manager.live") : formatTime(shift.endedAt)}</span>
          </div>
        </div>

        <div className="!flex-1 !text-right">
          <p className="!text-[11px] !font-bold !text-slate-400 !whitespace-nowrap">
            {statusLabel(shift.status, t)}
          </p>
        </div>
      </div>

      <div className={`!mt-4 !grid ${active ? "!grid-cols-3" : "!grid-cols-4"} !divide-x !divide-slate-200/60 !rounded-[14px] !bg-slate-50/80 !p-3 !border !border-slate-100`}>
        <div className="!flex !flex-col !items-center !justify-center !px-1">
          <p className="!text-[9px] !font-extrabold !uppercase !tracking-wider !text-slate-400 !mb-1">{t("manager.petrol")}</p>
          <p className="!text-[13px] !font-black !text-slate-700">{Number(shift.totalLitresPetrol || 0).toFixed(2)} <span className="!text-[10px] !font-bold !text-slate-400">L</span></p>
        </div>
        <div className="!flex !flex-col !items-center !justify-center !px-1">
          <p className="!text-[9px] !font-extrabold !uppercase !tracking-wider !text-slate-400 !mb-1">{t("manager.diesel")}</p>
          <p className="!text-[13px] !font-black !text-slate-700">{Number(shift.totalLitresDiesel || 0).toFixed(2)} <span className="!text-[10px] !font-bold !text-slate-400">L</span></p>
        </div>
        <div className="!flex !flex-col !items-center !justify-center !px-1">
          <p className="!text-[9px] !font-extrabold !uppercase !tracking-wider !text-slate-400 !mb-1">{t("manager.sale")}</p>
          <p className="!text-[14px] !font-black !text-emerald-600">{formatMoney(shift.expectedTotalSalePaise)}</p>
        </div>
        {!active && (
          <div className="!flex !flex-col !items-center !justify-center !px-1">
            <p className="!text-[9px] !font-extrabold !uppercase !tracking-wider !text-slate-400 !mb-1">{t("manager.difference")}</p>
            <p className={`!text-[12px] !font-black ${differenceTextColor}`}>
              {difference > 0 ? "+" : ""}{formatMoney(difference)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="rounded-[11px] bg-slate-50 px-3 py-2.5">
    <p className="text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-[12px] font-bold text-slate-900">{value}</p>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="rounded-[18px] bg-white p-7 text-center shadow-[0_5px_18px_rgba(15,23,42,0.04)]">
    <p className="text-[11px] font-medium text-slate-500">{text}</p>
  </div>
);

const ShiftDetailView = ({
  shift,
  loading,
  error,
  onBack,
  t,
}) => {
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showUdhariModal, setShowUdhariModal] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-[20px] bg-white" />
        <div className="h-48 animate-pulse rounded-[20px] bg-white" />
        <div className="h-48 animate-pulse rounded-[20px] bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] font-semibold text-bpcl-emerald"
        >
          ← {t("manager.backToShifts")}
        </button>

        <div className="rounded-[18px] bg-red-50 p-4">
          <p className="text-[11px] font-semibold text-red-700">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="rounded-[18px] bg-white p-6 text-center">
        <p className="text-[11px] text-slate-500">
          {t(
            "manager.shiftNotAvailable",
          )}
        </p>
      </div>
    );
  }

  const totalLitres =
    Number(
      shift.totalLitresPetrol || 0,
    ) +
    Number(
      shift.totalLitresDiesel || 0,
    );

  const difference =
    Number(
      shift.differencePaise || 0,
    );

  const differenceClass =
    difference === 0
      ? "text-bpcl-emerald"
      : difference < 0
        ? "text-red-600"
        : "text-amber-600";

  const collectionTotal =
    Number(
      shift.totalCollectedPaise ||
        0,
    );

  const expenseTotal =
    Number(
      shift.totalExpensePaise ||
        0,
    );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="
          text-[10px]
          font-semibold
          text-bpcl-emerald
        "
      >
        ← {t("manager.backToShifts")}
      </button>

      {/* Shift header */}
      <section className="rounded-[22px] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[17px] font-bold text-slate-900">
              {shift.mpd?.mpdNumber ||
                "MPD"}
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-500">
              {shift.employee?.name ||
                t(
                  "manager.employeeUnknown",
                )}
            </p>
            {shift.employee?.employeeId && (
              <p className="mt-0.5 text-[9px] text-slate-400">
                {shift.employee.employeeId}
              </p>
            )}
          </div>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[8px] font-bold text-slate-600">
            {statusLabel(
              shift.status,
              t,
            )}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric
            label={t(
              "manager.businessDate",
            )}
            value={formatDate(
              shift.businessDate,
            )}
          />

          <Metric
            label={t(
              "manager.totalLitres",
            )}
            value={`${totalLitres.toFixed(
              2,
            )} L`}
          />

          <Metric
            label={t(
              "manager.started",
            )}
            value={formatTime(
              shift.startedAt,
            )}
          />

          <Metric
            label={t(
              "manager.ended",
            )}
            value={
              shift.endedAt
                ? formatTime(
                    shift.endedAt,
                  )
                : "—"
            }
          />
        </div>
      </section>

      {/* Fuel sales */}
      <section className="rounded-[22px] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
        <SectionTitle
          title={t(
            "manager.fuelSales",
          )}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-[14px] bg-green-50 p-3">
            <p className="text-[9px] font-semibold text-fuel-petrol">
              {t("manager.petrol")}
            </p>

            <p className="mt-1 text-[16px] font-bold text-slate-900">
              {Number(
                shift.totalLitresPetrol ||
                  0,
              ).toFixed(2)}{" "}
              L
            </p>
            <p className="mt-1 text-[10px] font-semibold text-slate-700">
              {formatMoney(shift.petrolSalePaise)}
            </p>
          </div>

          <div className="rounded-[14px] bg-blue-50 p-3">
            <p className="text-[9px] font-semibold text-fuel-diesel">
              {t("manager.diesel")}
            </p>

            <p className="mt-1 text-[16px] font-bold text-slate-900">
              {Number(
                shift.totalLitresDiesel ||
                  0,
              ).toFixed(2)}{" "}
              L
            </p>
            <p className="mt-1 text-[10px] font-semibold text-slate-700">
              {formatMoney(shift.dieselSalePaise)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[10px] text-slate-500">
            {t(
              "manager.expectedSale",
            )}
          </span>

          <span className="text-[14px] font-bold text-slate-900">
            {formatMoney(
              shift.expectedTotalSalePaise,
            )}
          </span>
        </div>
      </section>

      {/* Nozzle readings */}
      <section className="mt-4 overflow-hidden rounded-[18px] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
        <div className="p-4 pb-3">
          <SectionTitle title={t("manager.nozzleReadings")} />
        </div>

        <div className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-y border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.05em] text-slate-500 sm:grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4 sm:px-4">
          <span>{t("manager.nozzle", { defaultValue: "Nozzle" })}</span>
          <span className="text-right">{t("manager.opening")}</span>
          <span className="text-right">{t("manager.closing")}</span>
        </div>

        <div>
          {(shift.readings || []).map((reading) => {
            const fuelCode = reading.fuelType === "DIESEL" ? "D" : "P";
            return (
              <div
                key={reading.nozzleId}
                className="
                  grid
                  grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)]
                  items-center
                  gap-4
                  border-t
                  border-slate-100
                  px-3
                  py-3.5
                  first:border-t-0
                  sm:grid-cols-[76px_minmax(0,1fr)_minmax(0,1fr)]
                  sm:gap-5
                  sm:px-4
                "
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold leading-none tracking-[-0.01em] text-slate-900">
                    {String(reading.nozzleId).toUpperCase()} ({fuelCode})
                  </p>
                </div>

                <div className="min-w-0 text-right">
                  <span className="font-mono text-[14px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-slate-800 sm:text-[15px]">
                    {Number(reading.openingReading || 0).toFixed(2)}
                  </span>
                </div>

                <div className="min-w-0 pl-1 sm:pl-2">
                  <div className="flex h-[36px] w-full min-w-0 items-center justify-end border-b-[2px] border-slate-100 bg-transparent px-1 text-right font-mono text-[14px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-slate-900 sm:h-[38px] sm:text-[15px]">
                    {reading.closingReading != null
                      ? Number(reading.closingReading).toFixed(2)
                      : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Collections */}
      <CollectionCard
        title={t("manager.collections", { defaultValue: "Collections" })}
        totalCashPaise={shift.totalCashPaise}
        totalUpiPaise={shift.totalUpiPaise}
        totalCardPaise={shift.totalCardPaise}
        totalUdhariPaise={shift.totalUdhariPaise}
        totalCollectedPaise={collectionTotal}
        onCashClick={() => setShowCashModal(true)}
        onUpiClick={() => setShowUpiModal(true)}
        onCardClick={() => setShowCardModal(true)}
        onUdhariClick={() => setShowUdhariModal(true)}
      />

      {/* Reconciliation */}
      <section className="rounded-[20px] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-black tracking-tight text-slate-900">
            {t("manager.reconciliation", "Reconciliation")}
          </h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
              shift.reconciliationStatus === "MATCHED"
                ? "bg-emerald-100 text-emerald-700"
                : shift.reconciliationStatus === "SHORT"
                ? "bg-rose-100 text-rose-600"
                : shift.reconciliationStatus === "EXCESS"
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {t(`manager.reconciliationStatus.${String(shift.reconciliationStatus || "PENDING").toLowerCase()}`)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[14px] bg-slate-50/70 border border-slate-100/50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t("manager.expectedSale", "Expected Sale")}
            </p>
            <p className="text-[14px] font-black text-slate-900">
              {formatMoney(shift.expectedTotalSalePaise)}
            </p>
          </div>
          <div className="rounded-[14px] bg-slate-50/70 border border-slate-100/50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t("manager.totalCollected", "Total Collected")}
            </p>
            <p className="text-[14px] font-black text-slate-900">
              {formatMoney(collectionTotal)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[14px] bg-slate-50/70 border border-slate-100/50 px-4 py-3">
          <span className="text-[11px] font-bold text-slate-600">
            {t("manager.difference", "Difference")}
          </span>
          <span className={`text-[14px] font-black ${differenceClass}`}>
            {difference > 0 ? "+" : ""}
            {formatMoney(difference)}
          </span>
        </div>
      </section>

      {/* Expenses */}
      <section className="rounded-[20px] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mt-4">
        <h2 className="text-[15px] font-black tracking-tight text-slate-900 mb-4">
          {t("manager.expenses", "Expenses")}
        </h2>

        {(shift.expenses || []).length === 0 ? (
          <p className="text-[12px] font-medium text-slate-400 italic">
            {t("manager.noExpenses", "No expenses recorded")}
          </p>
        ) : (
          <div className="space-y-2.5">
            {shift.expenses.map((expense) => (
              <SummaryRow
                key={expense._id}
                label={expense.reason}
                value={formatMoney(expense.amountPaise)}
              />
            ))}
            <div className="pt-2 border-t border-slate-100">
              <SummaryRow
                label={t("manager.total", "Total")}
                value={formatMoney(expenseTotal)}
                strong
                bg="bg-transparent border-0 px-0 py-1 hover:bg-transparent"
              />
            </div>
          </div>
        )}
      </section>

      {/* Udhari transactions */}
      <section className="rounded-[20px] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mt-4 mb-8">
        <h2 className="text-[15px] font-black tracking-tight text-slate-900 mb-4">
          {t("manager.udhariTransactions", "Udhari Transactions")}
        </h2>

        {(shift.udhariTransactions || []).length === 0 ? (
          <p className="text-[12px] font-medium text-slate-400 italic">
            {t("manager.noUdhariTransactions", "No udhari entries")}
          </p>
        ) : (
          <div className="space-y-2.5">
            {shift.udhariTransactions.map((transaction) => (
              <div
                key={transaction._id}
                className="rounded-[14px] bg-slate-50/70 border border-slate-100/50 p-4 transition-all hover:bg-slate-50 hover:shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-bold text-slate-800">
                    {transaction.customerId?.name || "—"}
                  </p>
                  <p className="text-[13px] font-black text-slate-900">
                    {formatMoney(transaction.amountPaise)}
                  </p>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                    {transaction.vehicleNumber || "—"}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500">
                    {transaction.fuelType} • {Number(transaction.litres || 0).toFixed(2)} L
                  </p>
                </div>
                <p className="text-[9px] font-medium text-slate-400">
                  {formatDate(transaction.createdAt)} · {formatTime(transaction.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {showCashModal && (
        <CashBreakdownModal
          cashCollections={shift.cashCollections}
          coinsPaise={shift.coinsPaise}
          totalCashPaise={shift.totalCashPaise}
          onClose={() => setShowCashModal(false)}
        />
      )}
      {showUpiModal && (
        <UpiBreakdownModal
          upiCollection={shift.upiCollection}
          totalUpiPaise={shift.totalUpiPaise}
          onClose={() => setShowUpiModal(false)}
        />
      )}
      {showCardModal && (
        <CardBreakdownModal
          atmEntries={shift.atmEntries}
          totalCardPaise={shift.totalCardPaise}
          onClose={() => setShowCardModal(false)}
        />
      )}
      {showUdhariModal && (
        <UdhariBreakdownModal
          udhariTransactions={shift.udhariTransactions}
          totalUdhariPaise={shift.totalUdhariPaise}
          onClose={() => setShowUdhariModal(false)}
        />
      )}
    </div>
  );
};

const SectionTitle = ({
  title,
}) => (
  <p className="text-[12px] font-bold text-slate-900">
    {title}
  </p>
);

const SummaryRow = ({
  label,
  value,
  strong = false,
  bg = "bg-slate-50/70 border border-slate-100/50 px-3.5 py-3"
}) => (
  <div className={`flex items-center justify-between rounded-[14px] ${bg} transition-all hover:bg-slate-50`}>
    <span
      className={`text-[13px] ${
        strong
          ? "font-black text-slate-700"
          : "font-semibold text-slate-500"
      }`}
    >
      {label}
    </span>

    <span
      className={`text-[13px] ${
        strong
          ? "font-black text-slate-900"
          : "font-bold text-slate-700"
      }`}
    >
      {value}
    </span>
  </div>
);

export default Operations;
