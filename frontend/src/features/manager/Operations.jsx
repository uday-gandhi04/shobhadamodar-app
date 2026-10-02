import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import ManagerLayout from "./ManagerLayout";
import {
  getManagerOperations,
  getManagerShiftDetail,
} from "../../services/managerOperationsApi";
import { getBusinessDate } from "../../utils/businessDate";

const formatMoney = (paise) =>
  `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleTimeString("en-IN", {
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

const Operations = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("MPDS");

  const [businessDate, setBusinessDate] = useState(getBusinessDate());

  const [mpds, setMpds] = useState([]);
  const [activeShifts, setActiveShifts] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMpdId, setSelectedMpdId] = useState("");

  const [selectedShiftId, setSelectedShiftId] = useState(null);

  const [selectedShift, setSelectedShift] = useState(null);

  const [shiftDetailLoading, setShiftDetailLoading] = useState(false);

  const [shiftDetailError, setShiftDetailError] = useState("");

  const loadOperations = async (date = businessDate) => {
    try {
      setLoading(true);
      setError("");

      const response = await getManagerOperations(date);

      const data = response?.data || {};

      setMpds(data.mpds || []);
      setActiveShifts(data.activeShifts || []);
      setShifts(data.shifts || []);

      setSelectedMpdId((current) => {
        if (
          current &&
          (data.mpds || []).some((mpd) => String(mpd._id) === String(current))
        ) {
          return current;
        }

        return data.mpds?.[0]?._id || "";
      });
    } catch (err) {
      console.error("[Manager Operations]", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("manager.operationsLoadError"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations(businessDate);
  }, [businessDate]);

  const selectedMpd = useMemo(
    () => mpds.find((mpd) => String(mpd._id) === String(selectedMpdId)) || null,
    [mpds, selectedMpdId],
  );

  const openShiftDetail = async (shiftId) => {
    try {
      setShiftDetailLoading(true);
      setShiftDetailError("");

      const response = await getManagerShiftDetail(shiftId);

      setSelectedShift(response?.data || null);

      setSelectedShiftId(shiftId);
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
  };

  return (
    <ManagerLayout
      title={
        selectedShiftId ? t("manager.shiftDetail") : t("manager.operations")
      }
      showBack
      onBack={selectedShiftId ? closeShiftDetail : undefined}
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
          {/* Page intro */}
          <div>
            <p className="text-[21px] font-bold tracking-[-0.02em] text-slate-900">
              {t("manager.operationsHeading")}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {t("manager.operationsSubtitle")}
            </p>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3 rounded-[14px] border border-slate-100 bg-white p-1 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            {[
              ["MPDS", t("manager.mpds")],
              ["SHIFTS", t("manager.shifts")],
              ["NOZZLES", t("manager.nozzleReadings")],
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

          {/* Date */}
          {activeTab !== "MPDS" && (
            <div className="flex items-center justify-between rounded-[16px] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                  {t("manager.businessDate")}
                </p>

                <p className="mt-1 text-[13px] font-semibold text-slate-900">
                  {formatDate(businessDate)}
                </p>
              </div>

              <input
                type="date"
                value={businessDate}
                onChange={(event) => setBusinessDate(event.target.value)}
                className="
                h-9
                rounded-[10px]
                border
                border-slate-200
                bg-white
                px-2
                text-[10px]
                font-semibold
                text-slate-700
                outline-none
                focus:border-bpcl-emerald
              "
              />
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
                onClick={() => loadOperations(businessDate)}
                className="mt-3 rounded-[10px] bg-white px-3 py-2 text-[10px] font-semibold text-red-700 shadow-sm"
              >
                {t("manager.retry")}
              </button>
            </div>
          )}

          {!loading && !error && activeTab === "MPDS" && (
            <div className="space-y-4">
              {mpds.length === 0 && <EmptyState text={t("manager.noMpds")} />}

              {mpds.map((mpd) => (
                <MpdCard
                  key={mpd._id}
                  mpd={mpd}
                  t={t}
                  onViewNozzles={() => {
                    setSelectedMpdId(mpd._id);
                    setActiveTab("NOZZLES");
                  }}
                  onViewPastShifts={() => setActiveTab("SHIFTS")}
                />
              ))}
            </div>
          )}

          {!loading && !error && activeTab === "SHIFTS" && (
            <div className="space-y-4">
              {/* Active shifts */}
              <section>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[12px] font-bold text-slate-900">
                    {t("manager.activeShifts")}
                  </p>

                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-bpcl-emerald">
                    {activeShifts.length}
                  </span>
                </div>

                {activeShifts.length === 0 ? (
                  <EmptyState text={t("manager.noActiveShifts")} />
                ) : (
                  <div className="space-y-2">
                    {activeShifts.map((shift) => (
                      <ShiftCard
                        key={shift._id}
                        shift={shift}
                        t={t}
                        onClick={() => openShiftDetail(shift._id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Selected day */}
              <section>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[12px] font-bold text-slate-900">
                    {t("manager.selectedDayShifts")}
                  </p>

                  <span className="text-[9px] font-semibold text-slate-400">
                    {formatDate(businessDate)}
                  </span>
                </div>

                {shifts.length === 0 ? (
                  <EmptyState text={t("manager.noShiftsForDate")} />
                ) : (
                  <div className="space-y-2">
                    {shifts.map((shift) => (
                      <ShiftCard
                        key={shift._id}
                        shift={shift}
                        t={t}
                        onClick={() => openShiftDetail(shift._id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {!loading && !error && activeTab === "NOZZLES" && (
            <div className="space-y-4">
              {/* MPD selector */}
              <div className="grid grid-cols-2 gap-2">
                {mpds.map((mpd) => {
                  const selected = String(selectedMpdId) === String(mpd._id);

                  return (
                    <button
                      key={mpd._id}
                      type="button"
                      onClick={() => setSelectedMpdId(mpd._id)}
                      className={`
                        min-h-[44px]
                        rounded-[13px]
                        border
                        text-[11px]
                        font-semibold
                        ${
                          selected
                            ? "border-bpcl-emerald bg-emerald-50 text-bpcl-emerald"
                            : "border-slate-200 bg-white text-slate-600"
                        }
                      `}
                    >
                      {mpd.mpdNumber}
                    </button>
                  );
                })}
              </div>

              {selectedMpd ? (
                <NozzleReadings mpd={selectedMpd} t={t} />
              ) : (
                <EmptyState text={t("manager.selectMpd")} />
              )}
            </div>
          )}
        </div>
      )}
    </ManagerLayout>
  );
};

const MpdCard = ({ mpd, t, onViewNozzles, onViewPastShifts }) => (
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
      <div className="mt-4 flex items-center justify-between rounded-[13px] bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-[8px] uppercase tracking-[0.06em] text-slate-400">
            {t("manager.employee")}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-slate-900">
            {mpd.activeShift.employee?.name}
          </p>
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
    )}

    <div className="mt-4 grid grid-cols-4 gap-2">
      {mpd.nozzles.map((nozzle) => (
        <div
          key={nozzle.nozzleId}
          className="rounded-[13px] border border-slate-100 bg-slate-50 p-2"
        >
          <p className="text-center text-[9px] font-bold text-slate-700">
            {nozzle.nozzleId.toUpperCase()}
          </p>

          <div
            className={`
                mx-auto
                mt-2
                grid
                h-7
                w-7
                place-items-center
                rounded-full
                text-[9px]
                font-bold
                ${
                  nozzle.fuelType === "PETROL"
                    ? "bg-green-50 text-fuel-petrol"
                    : "bg-blue-50 text-fuel-diesel"
                }
              `}
          >
            {nozzle.fuelType === "PETROL" ? "P" : "D"}
          </div>

          <p className="mt-2 text-center text-[9px] font-bold text-slate-800">
            {nozzle.litres.toFixed(2)} L
          </p>

          <p className="mt-1 text-center text-[7px] text-slate-400">
            {nozzle.readingEntered
              ? t("manager.readingEntered")
              : t("manager.readingPending")}
          </p>
        </div>
      ))}
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
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

    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={onViewNozzles}
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
            <path d="M7 4h8v16H7z" />
            <path d="M15 7h2l2 2v7h-4" />
            <circle cx="10" cy="8" r="1" />
          </svg>
          {t("manager.viewNozzleDetails")}
        </span>
        <span className="text-slate-300">→</span>
      </button>

      <button
        type="button"
        onClick={onViewPastShifts}
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
          {t("manager.viewPastShifts")}
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
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-slate-900">
              {shift.mpd?.mpdNumber || "MPD"}
            </p>

            <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-500">
              {statusLabel(shift.status, t)}
            </span>
          </div>

          <p className="mt-1 text-[10px] font-medium text-slate-500">
            {shift.employee?.name ||
              shift.employee?.employeeId ||
              t("manager.employeeUnknown")}
          </p>
        </div>

        {active && (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-bpcl-emerald">
            {t("manager.live")}
          </span>
        )}

        {!active && onClick && (
          <span className="text-[16px] text-slate-300">→</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric
          label={t("manager.started")}
          value={formatTime(shift.startedAt)}
        />

        <Metric
          label={t("manager.ended")}
          value={shift.endedAt ? formatTime(shift.endedAt) : "—"}
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
  <div className="rounded-[11px] bg-slate-50 px-3 py-2">
    <p className="text-[8px] font-semibold uppercase tracking-[0.04em] text-slate-400">
      {label}
    </p>

    <p className="mt-1 text-[11px] font-bold text-slate-800">{value}</p>
  </div>
);

const NozzleReadings = ({ mpd, t }) => (
  <section className="rounded-[22px] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.06)]">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-[15px] font-bold text-slate-900">{mpd.mpdNumber}</p>

        <p className="mt-1 text-[9px] text-slate-400">
          {t("manager.nozzleReadings")}
        </p>
      </div>
    </div>

    <div className="space-y-2">
      {mpd.nozzles.map((nozzle) => (
        <div
          key={nozzle.nozzleId}
          className="rounded-[15px] border border-slate-100 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-800">
                {nozzle.nozzleId.toUpperCase()}
              </span>

              <span
                className={`
                    rounded-full
                    px-2
                    py-1
                    text-[8px]
                    font-bold
                    ${
                      nozzle.fuelType === "PETROL"
                        ? "bg-green-50 text-fuel-petrol"
                        : "bg-blue-50 text-fuel-diesel"
                    }
                  `}
              >
                {nozzle.fuelType}
              </span>
            </div>

            <span className="text-[11px] font-bold text-slate-900">
              {nozzle.litres.toFixed(2)} L
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric
              label={t("manager.opening")}
              value={Number(nozzle.openingReading || 0).toFixed(2)}
            />

            <Metric
              label={t("manager.closing")}
              value={
                nozzle.closingReading != null
                  ? Number(nozzle.closingReading).toFixed(2)
                  : "—"
              }
            />
          </div>
        </div>
      ))}
    </div>
  </section>
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
                className="rounded-[14px] border border-slate-100 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-800">
                      {String(
                        reading.nozzleId,
                      ).toUpperCase()}
                    </span>

                    <span
                      className={`
                        rounded-full
                        px-2
                        py-1
                        text-[7px]
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

                  <span className="text-[10px] font-bold text-slate-900">
                    {Number(
                      reading.dispensedLitres ||
                        0,
                    ).toFixed(2)}{" "}
                    L
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
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
                  : "bg-amber-50 text-amber-600"
              }
            `}
          >
            {shift.reconciliationStatus}
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
