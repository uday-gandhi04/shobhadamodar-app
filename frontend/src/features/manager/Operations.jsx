import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import ManagerLayout from "./ManagerLayout";
import {
  getManagerOperations,
  getManagerShiftDetail,
} from "../../services/managerOperationsApi";
import { getBusinessDate } from "../../utils/businessDate";

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
            <div className="flex items-center justify-between px-1">
              <p className="text-[12px] font-bold text-slate-900">
                {historyMpd?.mpdNumber || "MPD"} · {t("manager.todaysShifts")}
              </p>
              <span className="text-[10px] font-semibold text-slate-400">
                {formatDate(businessDate)}
              </span>
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
            <TodayShiftGroups
              mpds={mpds}
              shifts={shifts}
              businessDate={businessDate}
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
  <section className="space-y-2">
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

const TodayShiftGroups = ({ mpds, shifts, businessDate, t, onOpenShift }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between px-1">
      <p className="text-[12px] font-bold text-slate-900">
        {t("manager.todaysShifts")}
      </p>
      <span className="text-[10px] font-semibold text-slate-400">
        {formatDate(businessDate)}
      </span>
    </div>
    {mpds.map((mpd) => {
      const mpdShifts = sortShiftsChronologically(
        shifts.filter((shift) => String(shift.mpd?._id) === String(mpd._id)),
      );

      return (
        <section key={mpd._id}>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[12px] font-bold text-slate-900">
              {mpd.mpdNumber}
            </p>
            <span className="text-[9px] font-semibold text-slate-400">
              {mpd.status === "ACTIVE" ? t("manager.live") : t("manager.free")}
            </span>
          </div>
          {mpdShifts.length === 0 ? (
            <EmptyState text={t("manager.noShiftsForDate")} />
          ) : (
            <div className="space-y-2">
              {mpdShifts.map((shift) => (
                <ShiftCard
                  key={shift._id}
                  shift={shift}
                  active={shift.status === "IN_PROGRESS"}
                  t={t}
                  onClick={() => onOpenShift(shift._id)}
                />
              ))}
            </div>
          )}
        </section>
      );
    })}
  </div>
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
            View Nozzle Details
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
            View Live Shifts
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

  const differenceClass =
    difference === 0
      ? "text-bpcl-emerald"
      : difference < 0
        ? "text-red-600"
        : "text-amber-600";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
    w-full
    rounded-[18px]
    border
    bg-white
    p-4
    text-left
    shadow-[0_5px_18px_rgba(15,23,42,0.05)]
    ${active ? "border-emerald-100" : "border-slate-100"}
    ${onClick ? "transition active:scale-[0.99]" : ""}
  `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-bold text-slate-900">
              {formatTime(shift.startedAt)} – {active ? t("manager.live") : formatTime(shift.endedAt)}
            </p>
            <span className={`rounded-full px-2 py-1 text-[8px] font-bold ${active ? "bg-emerald-50 text-bpcl-emerald" : "bg-slate-100 text-slate-500"}`}>
              {statusLabel(shift.status, t)}
            </span>
          </div>

          <p className="mt-1 text-[10px] font-medium text-slate-500">
            {shift.employee?.name ||
              shift.employee?.employeeId ||
              t("manager.employeeUnknown")}
          </p>
        </div>

        {!active && onClick && (
          <span className="text-[16px] text-slate-300">→</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric
          label={t("manager.petrol")}
          value={`${Number(shift.totalLitresPetrol || 0).toFixed(2)} L`}
        />

        <Metric
          label={t("manager.diesel")}
          value={`${Number(shift.totalLitresDiesel || 0).toFixed(2)} L`}
        />

        <Metric
          label={t("manager.totalLitres")}
          value={`${(
            Number(shift.totalLitresPetrol || 0) +
            Number(shift.totalLitresDiesel || 0)
          ).toFixed(2)} L`}
        />

        <Metric
          label={t("manager.sale")}
          value={formatMoney(shift.expectedTotalSalePaise)}
        />
      </div>

      {!active && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[9px] font-medium text-slate-400">
            {t("manager.difference")}
          </span>

          <span className={`text-[11px] font-bold ${differenceClass}`}>
            {difference > 0 ? "+" : ""}
            {formatMoney(difference)}
          </span>
        </div>
      )}
    </button>
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
      <section className="rounded-[22px] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
        <SectionTitle
          title={t(
            "manager.nozzleReadings",
          )}
        />

        <div className="mt-3 space-y-2">
          {(shift.readings || []).map(
            (reading) => (
              <div
                key={
                  reading.nozzleId
                }
                className="rounded-[16px] border border-slate-100 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.035)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-slate-900">
                      {String(
                        reading.nozzleId,
                      ).toUpperCase()}
                    </span>

                    <span
                      className={`
                        rounded-full
                        px-2
                        py-1
                        text-[8px]
                        font-bold
                        ${
                          reading.fuelType ===
                          "PETROL"
                            ? "bg-green-50 text-fuel-petrol"
                            : "bg-blue-50 text-fuel-diesel"
                        }
                      `}
                    >
                      {reading.fuelType}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-700">
                    {t("manager.dispensed")}: {Number(reading.dispensedLitres || 0).toFixed(2)} L
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Metric
                    label={t(
                      "manager.opening",
                    )}
                    value={Number(
                      reading.openingReading ||
                        0,
                    ).toFixed(2)}
                  />

                  <Metric
                    label={t(
                      "manager.closing",
                    )}
                    value={
                      reading.closingReading !=
                      null
                        ? Number(
                            reading.closingReading,
                          ).toFixed(2)
                        : "—"
                    }
                  />

                  <Metric
                    label={t(
                      "manager.sale",
                    )}
                    value={formatMoney(
                      reading.expectedSalePaise,
                    )}
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Collections */}
      <section className="rounded-[22px] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
        <SectionTitle
          title={t(
            "manager.collections",
          )}
        />

        <div className="mt-3 space-y-2">
          <ExpandableCashRow shift={shift} t={t} />

          <CollectionRow
            label={t("manager.upi")}
            value={formatMoney(
              shift.totalUpiPaise,
            )}
          />

          <ExpandableCardRow shift={shift} t={t} />

          <CollectionRow
            label={t(
              "manager.udhari",
            )}
            value={formatMoney(
              shift.totalUdhariPaise,
            )}
          />

          <CollectionRow
            label={t(
              "manager.totalCollected",
            )}
            value={formatMoney(
              collectionTotal,
            )}
            strong
          />
        </div>
      </section>

      {/* Reconciliation */}
      <section className="rounded-[22px] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <SectionTitle
            title={t(
              "manager.reconciliation",
            )}
          />

          <span
            className={`
              rounded-full
              px-2
              py-1
              text-[8px]
              font-bold
              ${
                shift.reconciliationStatus ===
                "MATCHED"
                  ? "bg-emerald-50 text-bpcl-emerald"
                  : shift.reconciliationStatus === "SHORT"
                    ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-600"
              }
            `}
          >
            {t(`manager.reconciliationStatus.${String(shift.reconciliationStatus || "PENDING").toLowerCase()}`)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric
            label={t(
              "manager.expectedSale",
            )}
            value={formatMoney(
              shift.expectedTotalSalePaise,
            )}
          />

          <Metric
            label={t(
              "manager.totalCollected",
            )}
            value={formatMoney(
              collectionTotal,
            )}
          />
        </div>

        <div className="mt-2 flex items-center justify-between rounded-[13px] bg-slate-50 px-3 py-2.5">
          <span className="text-[9px] font-medium text-slate-500">
            {t(
              "manager.difference",
            )}
          </span>

          <span
            className={`text-[12px] font-bold ${differenceClass}`}
          >
            {difference > 0
              ? "+"
              : ""}
            {formatMoney(
              difference,
            )}
          </span>
        </div>
      </section>

      {/* Expenses */}
      <section className="rounded-[22px] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
        <SectionTitle
          title={t(
            "manager.expenses",
          )}
        />

        {(shift.expenses || [])
          .length === 0 ? (
          <p className="mt-3 text-[10px] text-slate-400">
            {t(
              "manager.noExpenses",
            )}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {shift.expenses.map(
              (expense) => (
                <CollectionRow
                  key={
                    expense._id
                  }
                  label={
                    expense.reason
                  }
                  value={formatMoney(
                    expense.amountPaise,
                  )}
                />
              ),
            )}

            <CollectionRow
              label={t(
                "manager.total",
              )}
              value={formatMoney(
                expenseTotal,
              )}
              strong
            />
          </div>
        )}
      </section>

      {/* Udhari transactions */}
      <section className="rounded-[22px] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
        <SectionTitle
          title={t(
            "manager.udhariTransactions",
          )}
        />

        {(shift.udhariTransactions ||
          []).length === 0 ? (
          <p className="mt-3 text-[10px] text-slate-400">
            {t(
              "manager.noUdhariTransactions",
            )}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {shift.udhariTransactions.map(
              (transaction) => (
                <div
                  key={
                    transaction._id
                  }
                  className="rounded-[14px] border border-slate-100 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-800">
                      {transaction
                        .customerId
                        ?.name ||
                        "—"}
                    </p>

                    <p className="text-[11px] font-bold text-slate-900">
                      {formatMoney(
                        transaction.amountPaise,
                      )}
                    </p>
                  </div>

                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-[8px] text-slate-400">
                      {transaction
                        .vehicleNumber ||
                        "—"}
                    </p>

                    <p className="text-[8px] text-slate-400">
                      {
                        transaction.fuelType
                      }{" "}
                      •{" "}
                      {Number(
                        transaction.litres ||
                          0,
                      ).toFixed(2)}{" "}
                      L
                    </p>
                  </div>
                  <p className="mt-1 text-[8px] text-slate-400">
                    {formatDate(transaction.createdAt)} · {formatTime(transaction.createdAt)}
                  </p>
                </div>
              ),
            )}
          </div>
        )}
      </section>
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

const CollectionRow = ({
  label,
  value,
  strong = false,
}) => (
  <div className="flex items-center justify-between rounded-[11px] bg-slate-50 px-3 py-2.5">
    <span
      className={`text-[9px] ${
        strong
          ? "font-bold text-slate-800"
          : "font-medium text-slate-500"
      }`}
    >
      {label}
    </span>

    <span
      className={`text-[10px] ${
        strong
          ? "font-bold text-slate-900"
          : "font-semibold text-slate-700"
      }`}
    >
      {value}
    </span>
  </div>
);

const ExpandableCashRow = ({ shift, t }) => {
  const [expanded, setExpanded] = useState(false);
  const collections = shift.cashCollections || [];
  
  return (
    <div className="overflow-hidden rounded-[11px] bg-slate-50 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 active:bg-slate-100"
      >
        <span className="text-[9px] font-medium text-slate-500">{t("manager.cash")}</span>
        <div className="flex items-center gap-1.5">
           <span className="text-[10px] font-semibold text-slate-700">{formatMoney(shift.totalCashPaise)}</span>
           <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={`h-2.5 w-2.5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}>
             <path d="m5 7.5 5 5 5-5" />
           </svg>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 pt-0">
           <div className="mt-1 space-y-1.5 border-t border-slate-200/60 pt-2">
             {collections.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[8px] font-medium text-slate-500">
                   <span>₹{item.denomination} × {item.count}</span>
                   <span>{formatMoney((item.denomination * item.count) * 100)}</span>
                </div>
             ))}
             {(shift.coinsPaise || 0) > 0 && (
                <div className="flex justify-between text-[8px] font-medium text-slate-500">
                   <span>{t("manager.coins")}</span>
                   <span>{formatMoney(shift.coinsPaise)}</span>
                </div>
             )}
             <div className="flex justify-between border-t border-slate-200/60 pt-1.5 text-[8.5px] font-bold text-slate-700">
                <span>{t("manager.totalCash") || "Total Cash"}</span>
                <span>{formatMoney(shift.totalCashPaise)}</span>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ExpandableCardRow = ({ shift, t }) => {
  const [expanded, setExpanded] = useState(false);
  const entries = shift.atmEntries || [];
  
  if (entries.length === 0 && (!shift.totalCardPaise || shift.totalCardPaise === 0)) {
     return (
        <CollectionRow
            label={t("manager.card")}
            value={formatMoney(shift.totalCardPaise)}
        />
     );
  }

  return (
    <div className="overflow-hidden rounded-[11px] bg-slate-50 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 active:bg-slate-100"
      >
        <span className="text-[9px] font-medium text-slate-500">{t("manager.card")}</span>
        <div className="flex items-center gap-1.5">
           <span className="text-[10px] font-semibold text-slate-700">{formatMoney(shift.totalCardPaise)}</span>
           <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={`h-2.5 w-2.5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}>
             <path d="m5 7.5 5 5 5-5" />
           </svg>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 pt-0">
           <div className="mt-1 space-y-1.5 border-t border-slate-200/60 pt-2">
             {entries.map((entry, idx) => (
                <div key={`${entry.time}-${idx}`} className="flex justify-between text-[8px] font-medium text-slate-500">
                   <span>{entry.time}</span>
                   <span>{formatMoney(entry.amountPaise)}</span>
                </div>
             ))}
             {entries.length === 0 && (
                <div className="text-[8px] italic text-slate-400">No individual entries</div>
             )}
             <div className="flex justify-between border-t border-slate-200/60 pt-1.5 text-[8.5px] font-bold text-slate-700">
                <span>{t("manager.total") || "Total"}</span>
                <span>{formatMoney(shift.totalCardPaise)}</span>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Operations;
