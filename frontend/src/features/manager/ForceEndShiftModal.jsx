import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import NozzleReadingRow from "../../components/business/nozzle/NozzleReadingRow";
import {
  getFuelType,
  getNozzleNumber,
} from "../../components/business/nozzle/nozzleUtils";
import { forceEndManagerShift } from "../../services/managerOperationsApi";

const calculateLitresDispensed = (opening, final) => {
  const openingValue = Number(opening);
  const finalValue = Number(final);

  if (!Number.isFinite(openingValue) || !Number.isFinite(finalValue)) {
    return null;
  }

  const litres = finalValue - openingValue;
  if (litres < 0) {
    return null;
  }

  return litres;
};

const ForceEndShiftModal = ({
  shift,
  mpd,
  fuelRates = { PETROL: 0, DIESEL: 0 },
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState("CONFIRM"); // "CONFIRM" | "READINGS"
  const [finalReadings, setFinalReadings] = useState(() => {
    const initial = {};
    (shift?.readings || []).forEach((reading) => {
      const nozzleId = reading.nozzleId || reading._id;
      if (nozzleId) {
        const existingClosing = reading.closingReading ?? reading.finalReading;
        initial[nozzleId] =
          existingClosing != null && existingClosing !== ""
            ? String(existingClosing)
            : "";
      }
    });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const readings = useMemo(() => {
    return [...(shift?.readings || [])].sort((a, b) => {
      const aNumber = Number(getNozzleNumber(a.nozzleId));
      const bNumber = Number(getNozzleNumber(b.nozzleId));
      return aNumber - bNumber;
    });
  }, [shift]);

  const handleReadingChange = (nozzleId, value) => {
    const cleaned = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    setFinalReadings((current) => ({
      ...current,
      [nozzleId]: cleaned,
    }));
  };

  const nozzleReadings = readings.map((reading) => {
    const nozzleId = reading.nozzleId || reading._id;
    const openingReading = Number(reading.openingReading ?? 0);
    const currentValue =
      finalReadings[nozzleId] !== undefined ? finalReadings[nozzleId] : "";
    const numericFinalValue = currentValue === "" ? NaN : Number(currentValue);
    const litresDispensed = Number.isFinite(numericFinalValue)
      ? calculateLitresDispensed(openingReading, numericFinalValue)
      : null;

    return {
      nozzle: {
        id: nozzleId,
        number: getNozzleNumber(nozzleId),
        fuelType: getFuelType(reading),
      },
      openingReading,
      finalReading: currentValue,
      litresDispensed,
      isInvalid:
        Number.isFinite(numericFinalValue) && numericFinalValue < openingReading,
    };
  });

  const totalLitresPetrol = nozzleReadings.reduce(
    (total, reading) =>
      total +
      (reading.nozzle.fuelType === "PETROL" ? reading.litresDispensed || 0 : 0),
    0,
  );

  const totalLitresDiesel = nozzleReadings.reduce(
    (total, reading) =>
      total +
      (reading.nozzle.fuelType === "DIESEL" ? reading.litresDispensed || 0 : 0),
    0,
  );

  const totalFuelLitres = totalLitresPetrol + totalLitresDiesel;

  const totalExpectedSalePaise = nozzleReadings.reduce((total, reading) => {
    const ratePaise = fuelRates[reading.nozzle.fuelType] || 0;
    return total + (reading.litresDispensed || 0) * ratePaise;
  }, 0);

  const canContinue =
    readings.length > 0 &&
    readings.every((reading) => {
      const nozzleId = reading.nozzleId || reading._id;
      const value = finalReadings[nozzleId];
      if (
        value === undefined ||
        value === "" ||
        !Number.isFinite(Number(value))
      ) {
        return false;
      }
      const openingReading = Number(reading.openingReading ?? 0);
      return Number(value) >= openingReading;
    });

  const handleSubmit = async () => {
    if (!canContinue || isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const payload = readings.map((reading) => {
        const nozzleId = reading.nozzleId || reading._id;
        return {
          nozzleId,
          closingReading: Number(finalReadings[nozzleId]),
        };
      });

      await forceEndManagerShift(shift._id, payload);
      onSuccess?.();
    } catch (err) {
      console.error("[ForceEndShift] Failed:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("manager.forceEndFailed", { defaultValue: "Failed to force end shift." }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeeName =
    shift?.employee?.name || shift?.employeeId?.name || "Employee";
  const mpdNumber = mpd?.mpdNumber || shift?.mpd?.mpdNumber || "MPD";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="!flex !shrink-0 !items-center !justify-between !border-b !border-slate-100 !px-5 !py-4">
          <div className="!flex !items-center !gap-2.5">
            <div className="!flex !h-8 !w-8 !items-center !justify-center !rounded-full !bg-rose-50 !text-rose-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="!h-4 !w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <h2 className="!text-[15px] !font-black !text-slate-900">
                {step === "CONFIRM"
                  ? t("manager.confirmForceEndTitle", "Force End Active Shift")
                  : t("manager.finalEndShift", "Final End Shift")}
              </h2>
              <p className="!text-[10px] !font-bold !text-slate-400">
                {mpdNumber} • {employeeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="!flex !h-8 !w-8 !items-center !justify-center !rounded-full !text-slate-400 hover:!bg-slate-100 hover:!text-slate-600 disabled:!opacity-50 !transition-all"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="!h-4 !w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content body */}
        <div className="!flex-1 !min-h-0 !overflow-y-auto !p-5">
          {error && (
            <div className="mb-4 rounded-[14px] border border-red-100 bg-red-50 p-3 text-[12px] font-medium text-red-700">
              {error}
            </div>
          )}

          {step === "CONFIRM" ? (
            <div className="space-y-4">
              <div className="rounded-[16px] border border-amber-200/80 bg-amber-50/70 p-4">
                <p className="text-[13px] font-bold text-amber-900">
                  {t(
                    "manager.confirmForceEndMessage",
                    "You are ending the active shift for {{name}} on {{mpd}}. You must enter the final meter readings to finalize this shift.",
                    { name: employeeName, mpd: mpdNumber },
                  )}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-amber-800/90">
                  {t(
                    "manager.confirmForceEndNotice",
                    "Because this shift is being force-ended, unverified collections and cash entries will be set to zero. Fuel sales will be calculated strictly from the closing meter readings you enter.",
                  )}
                </p>
              </div>

              <div className="rounded-[16px] border border-slate-100 bg-slate-50/60 p-4 text-[12px] space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Employee</span>
                  <span className="font-bold text-slate-900">{employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">MPD</span>
                  <span className="font-bold text-slate-900">{mpdNumber}</span>
                </div>
                {shift?.businessDate && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Business Date</span>
                    <span className="font-bold text-slate-900">{shift.businessDate}</span>
                  </div>
                )}
                {shift?.startedAt && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Shift Started</span>
                    <span className="font-bold text-slate-900">
                      {new Date(shift.startedAt).toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Existing Nozzle Reading Interface Structure */}
              <section className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
                <div className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.05em] text-slate-500 sm:grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4 sm:px-4">
                  <span>{t("nozzle.nozzle", "NOZZLE")}</span>
                  <span className="text-right">{t("nozzle.opening", "OPENING")}</span>
                  <span className="text-right">{t("nozzle.closing", "CLOSING")}</span>
                </div>

                <div>
                  {nozzleReadings.map((reading) => (
                    <NozzleReadingRow
                      key={reading.nozzle.id}
                      {...reading}
                      onFinalReadingChange={handleReadingChange}
                    />
                  ))}
                </div>

                {/* Fuel Totals and Sale Footer */}
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                  <div className="grid grid-cols-3 divide-x divide-slate-200">
                    <div className="pr-3">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                        {t("nozzle.petrol", "PETROL")}
                      </p>
                      <p className="mt-1 font-mono text-[12px] font-bold tabular-nums text-slate-800">
                        {totalLitresPetrol.toFixed(2)} L
                      </p>
                    </div>

                    <div className="px-3">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                        {t("nozzle.diesel", "DIESEL")}
                      </p>
                      <p className="mt-1 font-mono text-[12px] font-bold tabular-nums text-slate-800">
                        {totalLitresDiesel.toFixed(2)} L
                      </p>
                    </div>

                    <div className="pl-3 text-right">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                        {t("nozzle.totalFuel", "TOTAL FUEL")}
                      </p>
                      <p className="mt-1 font-mono text-[13px] font-bold tabular-nums text-[#047857]">
                        {totalFuelLitres.toFixed(2)} L
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                        {t("nozzle.totalSale", "TOTAL SALE")}
                      </p>
                      <p className="font-mono text-[14px] font-bold tabular-nums text-[#047857]">
                        ₹
                        {(totalExpectedSalePaise / 100).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Modal actions */}
        <div className="!shrink-0 !border-t !border-slate-100 !bg-slate-50/80 !p-4 sm:!px-5 sm:!py-4">
          {step === "CONFIRM" ? (
            <div className="!grid !grid-cols-2 !gap-3">
              <button
                type="button"
                onClick={onClose}
                className="!flex !min-h-[48px] !h-[48px] !w-full !shrink-0 !items-center !justify-center !rounded-[14px] !border !border-slate-200 !bg-white !px-4 !text-[13px] !font-bold !text-slate-700 !shadow-sm hover:!bg-slate-50 active:!bg-slate-100 !transition-all"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={() => setStep("READINGS")}
                className="!flex !min-h-[48px] !h-[48px] !w-full !shrink-0 !items-center !justify-center !gap-2 !rounded-[14px] !bg-rose-600 !px-4 !text-[13px] !font-bold !text-white !shadow-[0_4px_14px_rgba(225,29,72,0.25)] hover:!bg-rose-700 active:!scale-98 !transition-all"
              >
                {t("manager.proceedToReadings", "Proceed to Final Readings")}
              </button>
            </div>
          ) : (
            <div className="!grid !grid-cols-3 !gap-3">
              <button
                type="button"
                onClick={() => setStep("CONFIRM")}
                disabled={isSubmitting}
                className="!col-span-1 !flex !min-h-[48px] !h-[48px] !w-full !shrink-0 !items-center !justify-center !rounded-[14px] !border !border-slate-200 !bg-white !px-4 !text-[13px] !font-bold !text-slate-700 !shadow-sm hover:!bg-slate-50 active:!bg-slate-100 !transition-all disabled:!opacity-50"
              >
                {t("common.back", "Back")}
              </button>
              <button
                type="button"
                disabled={!canContinue || isSubmitting}
                onClick={handleSubmit}
                className="!col-span-2 !flex !min-h-[48px] !h-[48px] !w-full !shrink-0 !items-center !justify-center !gap-2 !rounded-[14px] !bg-emerald-700 !px-4 !text-[13px] !font-bold !text-white !shadow-[0_4px_14px_rgba(4,120,87,0.25)] hover:!bg-emerald-800 active:!scale-98 !transition-all disabled:!cursor-not-allowed disabled:!bg-slate-200 disabled:!text-slate-400 disabled:!shadow-none"
              >
                {isSubmitting ? (
                  <span className="!flex !items-center !gap-2">
                    <span className="!h-4 !w-4 !animate-spin !rounded-full !border-2 !border-white/30 !border-t-white" />
                    <span>Ending Shift...</span>
                  </span>
                ) : (
                  <span>{t("manager.finalEndShift", "Final End Shift")}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForceEndShiftModal;
