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
    () => location.state?.accountingShiftId || null,
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
    const accountingShiftId = location.state?.accountingShiftId;
    if (!accountingShiftId) return undefined;

    const timeoutId = window.setTimeout(
      () => openShiftDetail(accountingShiftId),
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
            <div className="grid grid-cols-2 rounded-[14px] border border-slate-100 bg-white p-1 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              {[
                ["LIVE", t("manager.liveMpds")],
                ["TODAY", t("manager.todaysShifts")],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={`
                min-h-[38px]
                rounded-[10px]
                px-2
                text-[10px]
                font-semibold
                transition
                ${
                  activeTab === value
                    ? "bg-bpcl-emerald text-white shadow-sm"
                    : "text-slate-500"
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
  <section className="rounded-[22px] border border-white bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-emerald-50 text-bpcl-emerald">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path d="M7 4h8v16H7z" />
            <path d="M15 7h2l2 2v7h-4" />
            <circle cx="10" cy="8" r="1" />
          </svg>
        </div>

        <div className="min-w-0">
          <p className="text-[16px] font-bold text-slate-900">
            {mpd.mpdNumber}
          </p>

          <p className="mt-0.5 text-[9px] text-slate-400">
            {mpd.serialNumber || t("manager.serialUnavailable")}
          </p>
        </div>
      </div>

      <span
        className={`
          rounded-full
          px-2.5
          py-1
          text-[9px]
          font-bold
          ${
            mpd.status === "ACTIVE"
              ? "bg-emerald-50 text-bpcl-emerald"
              : "bg-slate-100 text-slate-500"
          }
        `}
      >
        {mpd.status === "ACTIVE" ? t("manager.active") : t("manager.free")}
      </span>
    </div>

    {mpd.activeShift && (
      <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold uppercase text-bpcl-emerald">
        <span className="h-2 w-2 rounded-full bg-bpcl-emerald" />
        {t("manager.live")}
      </div>
    )}

    {mpd.activeShift ? (
      <div className="mt-4 flex items-center justify-between rounded-[13px] bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-[8px] uppercase tracking-[0.06em] text-slate-400">
            {t("manager.employee")}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-slate-900">
            {mpd.activeShift.employee?.name}
          </p>
          {mpd.activeShift.employee?.employeeId && (
            <p className="mt-0.5 text-[9px] text-slate-500">
              {mpd.activeShift.employee.employeeId}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-[8px] uppercase tracking-[0.06em] text-slate-400">
            {t("manager.started")}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-slate-900">
            {formatTime(mpd.activeShift.startedAt)}
          </p>
        </div>
      </div>
    ) : (
      <div className="mt-4 rounded-[13px] bg-slate-50 px-3 py-3">
        <p className="text-[11px] font-semibold text-slate-700">
          {t("manager.noActiveShift")}
        </p>
        {lastShift && (
          <p className="mt-1 text-[9px] text-slate-500">
            {t("manager.lastShift")}: {lastShift.employee?.name || t("manager.employeeUnknown")}
            {lastShift.endedAt ? ` · ${formatTime(lastShift.endedAt)}` : ""}
          </p>
        )}
      </div>
    )}

    <div className="mt-4 grid grid-cols-4 gap-1.5">
      {mpd.nozzles.map((nozzle) => (
        <div
          key={nozzle.nozzleId}
          className="min-w-0 rounded-[12px] border border-slate-100 bg-slate-50 p-2"
        >
          <div className="flex flex-col items-start gap-1">
            <p className="text-[10px] font-bold text-slate-800">
              {nozzle.nozzleId.toUpperCase()}
            </p>
            <span className={`rounded-full px-1 py-0.5 text-[7px] font-bold ${nozzle.fuelType === "PETROL" ? "bg-green-50 text-fuel-petrol" : "bg-blue-50 text-fuel-diesel"}`}>
              {nozzle.fuelType}
            </span>
          </div>
          {mpd.activeShift ? (
            <>
              <p className="mt-2 break-all text-[8px] font-semibold leading-tight text-slate-600">
                {t("manager.opening")}
              </p>
              <p className="break-all text-[9px] font-bold leading-tight text-slate-800">
                {Number(nozzle.openingReading || 0).toFixed(2)}
              </p>
              <p className="mt-1 break-all text-[8px] font-semibold leading-tight text-slate-600">
                {t("manager.currentReading")}
              </p>
              <p className="break-all text-[9px] font-bold leading-tight text-slate-800">
                {Number(nozzle.currentReading || 0).toFixed(2)}
              </p>
              <p className="mt-1 text-[8px] font-bold text-slate-700">
                {t("manager.sold")}: {Number(nozzle.litres || 0).toFixed(2)} L
              </p>
              <p className="mt-1 min-h-[20px] text-[7px] leading-tight text-slate-400">
                {nozzle.readingEntered ? t("manager.readingEntered") : t("manager.readingPending")}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 break-all text-[8px] font-semibold leading-tight text-slate-600">
                {t("manager.currentReading")}
              </p>
              <p className="break-all text-[9px] font-bold leading-tight text-slate-800">
                {Number(nozzle.currentReading || 0).toFixed(2)}
              </p>
            </>
          )}
        </div>
      ))}
    </div>

    {mpd.activeShift && <section className="mt-4 border-t border-slate-100 pt-3">
      <p className="mb-2 text-[9px] font-bold uppercase text-slate-400">
        {t("manager.currentShift")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Metric label={t("manager.petrol")} value={`${Number(mpd.totalPetrolLitres || 0).toFixed(2)} L`} />
        <Metric label={t("manager.diesel")} value={`${Number(mpd.totalDieselLitres || 0).toFixed(2)} L`} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
      <div>
        <p className="text-[8px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          {t("manager.totalLitres")}
        </p>

        <p className="mt-1 text-[14px] font-bold text-slate-900">
          {mpd.totalLitres.toFixed(2)} L
        </p>
      </div>

      <div className="text-right">
        <p className="text-[8px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          {t("manager.estimatedSale")}
        </p>

        <p className="mt-1 text-[14px] font-bold text-slate-900">
          {formatMoney(mpd.estimatedSalePaise)}
        </p>
      </div>
      </div>
    </section>}

    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={onViewTodayHistory}
        className="flex min-h-[42px] w-full items-center justify-between rounded-[14px] border border-slate-100 bg-white px-3 text-[10px] font-semibold text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.04)] active:scale-[0.99]"
      >
        <span className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
          >
            <path d="M4.5 6.75h15v12h-15z" />
            <path d="M8 10.5h8M8 14h5" />
          </svg>
          {t("manager.todaysShiftHistory")}
        </span>
        <span className="text-slate-300">→</span>
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
          <CollectionRow
            label={t("manager.cash")}
            value={formatMoney(
              shift.totalCashPaise,
            )}
          />

          <CollectionRow
            label={t("manager.coins")}
            value={formatMoney(shift.coinsPaise)}
          />

          <CollectionRow
            label={t("manager.upi")}
            value={formatMoney(
              shift.totalUpiPaise,
            )}
          />

          <CollectionRow
            label={t("manager.card")}
            value={formatMoney(
              shift.totalCardPaise,
            )}
          />

          {(shift.atmEntries || []).map((entry, index) => (
            <CollectionRow
              key={`${entry.time}-${index}`}
              label={`${t("manager.atmEntry")} · ${entry.time}`}
              value={formatMoney(entry.amountPaise)}
            />
          ))}

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
              "manager.accounted",
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

export default Operations;
