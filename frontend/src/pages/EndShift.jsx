import { IonContent, IonPage } from "@ionic/react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import { getCurrentFuelRate, getCurrentShift } from "../services/shiftApi";
import NozzleReadingRow from "../components/business/nozzle/NozzleReadingRow";
import {
  formatReading,
  getFuelType,
  getNozzleNumber,
} from "../components/business/nozzle/nozzleUtils";

import { saveShiftWorkflowState } from "../utils/shiftWorkflow";

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

const EndShift = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fuelRates, setFuelRates] = useState({ PETROL: 0, DIESEL: 0 });

  const [finalReadings, setFinalReadings] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadShift = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCurrentShift();

        if (!mounted) return;

        const currentShift = response?.data || null;

        if (!currentShift) {
          navigate("/select-mpd", { replace: true });
          return;
        }

        setShift(currentShift);

        try {
          const rateResponse = await getCurrentFuelRate(currentShift.businessDate);
          const rates = rateResponse?.data;
          if (rates && mounted) {
            setFuelRates({
              PETROL: Number(rates.petrolRatePaise || 0),
              DIESEL: Number(rates.dieselRatePaise || 0),
            });
          }
        } catch {
          if (mounted) setFuelRates({ PETROL: 0, DIESEL: 0 });
        }

        const initialReadings = {};

        (currentShift.readings || []).forEach((reading) => {
          const nozzleId = reading.nozzleId || reading.nozzle || reading._id;

          if (!nozzleId) return;

          const existingFinalReading =
            reading.closingReading ?? reading.finalReading;

          initialReadings[nozzleId] =
            existingFinalReading !== null &&
            existingFinalReading !== undefined &&
            existingFinalReading !== ""
              ? String(existingFinalReading)
              : "";
        });

        (location.state?.finalReadings || []).forEach((reading) => {
          if (reading?.nozzleId) {
            initialReadings[reading.nozzleId] = String(reading.closingReading);
          }
        });

        setFinalReadings(initialReadings);
      } catch (err) {
        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load shift readings.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadShift();

    return () => {
      mounted = false;
    };
  }, [location.state, navigate]);

  const readings = useMemo(() => {
    return [...(shift?.readings || [])].sort((a, b) => {
      const aNumber = Number(getNozzleNumber(a.nozzleId));
      const bNumber = Number(getNozzleNumber(b.nozzleId));

      return aNumber - bNumber;
    });
  }, [shift]);

  const handleReadingChange = (nozzleId, value) => {
    // Allow only numbers and one decimal point.
    const cleaned = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

    setFinalReadings((current) => ({
      ...current,
      [nozzleId]: cleaned,
    }));
  };

  const canContinue =
    readings.length > 0 &&
    readings.every((reading) => {
      const nozzleId = reading.nozzleId || reading.nozzle || reading._id;

      const value = finalReadings[nozzleId];

      if (
        value === undefined ||
        value === "" ||
        !Number.isFinite(Number(value))
      ) {
        return false;
      }

      const openingReading = Number(
        reading.openingReading ?? reading.opening ?? 0,
      );

      return Number(value) >= openingReading;
    });

  const nozzleReadings = readings.map((reading) => {
    const nozzleId = reading.nozzleId || reading.nozzle || reading._id;
    const openingReading = Number(
      reading.openingReading ?? reading.opening ?? 0,
    );
    const currentValue =
      finalReadings[nozzleId] !== undefined
        ? finalReadings[nozzleId]
        : formatReading(openingReading);
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

  const totalLitres = nozzleReadings.reduce(
    (total, reading) => total + (reading.litresDispensed || 0),
    0,
  );

  const totalExpectedSalePaise = nozzleReadings.reduce((total, reading) => {
    const ratePaise = fuelRates[reading.nozzle.fuelType] || 0;
    return total + (reading.litresDispensed || 0) * ratePaise;
  }, 0);

  const employeeName = user?.name || user?.employeeId || "Employee";

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen style={{ "--background": "#F3F4F6" }}>
          <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />

            <div className="mt-4 overflow-hidden rounded-[20px] bg-white">
              <div className="h-[190px] animate-pulse bg-slate-100" />
            </div>

            <div className="mt-4 h-64 animate-pulse rounded-[20px] bg-white" />
          </main>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen style={{ "--background": "#F3F4F6" }}>
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-28 pt-[max(0.9rem,env(safe-area-inset-top))]">
          {/* Header */}
          <header className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/select-mpd")}
              className="
                grid
                h-9
                w-9
                shrink-0
                place-items-center
                rounded-[12px]
                bg-white
                text-slate-700
                shadow-[0_2px_8px_rgba(15,23,42,0.06)]
              "
              aria-label="Back"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
              {/* MPD */}
              <div className="min-w-0">
                <p className="text-[17px] font-bold leading-none tracking-[-0.02em] text-slate-900">
                  {shift?.mpdId?.mpdNumber || "MPD"}
                </p>

                <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                  {shift?.shiftType || ""}
                </p>
              </div>

              {/* EMPLOYEE */}
              <div className="flex min-w-0 items-center gap-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[#047857]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="3.2" />
                    <path d="M5.5 19c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p className="max-w-[95px] truncate text-[10px] font-semibold leading-none text-slate-900">
                    {employeeName}
                  </p>

                  <p className="mt-1 text-[7px] font-medium uppercase tracking-[0.05em] text-slate-400">
                    Employee
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Step indicator */}
          <div className="mt-5 rounded-[18px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            <div className="grid grid-cols-7 items-center gap-1 text-center">
              {["Nozzle", "Cash", "UPI", "Card", "Udhari", "Expense", "Review"].map((label, index) => (
                <div key={label} className="min-w-0">
                  <div className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${index === 0 ? "bg-[#047857] text-white" : "bg-slate-100 text-slate-400"}`}>
                    {index + 1}
                  </div>
                  <p className={`mt-1 truncate text-[8px] font-semibold ${index === 0 ? "text-[#047857]" : "text-slate-400"}`}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Final readings */}
          <section className="mt-4 overflow-hidden rounded-[18px] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
            <div className="p-4 pb-3">
              <h2 className="text-[15px] font-semibold text-slate-900">
                Final nozzle readings
              </h2>

              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Enter the final totalizer reading for each nozzle.
              </p>
            </div>

            <div className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-y border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.05em] text-slate-500 sm:grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4 sm:px-4">
              <span>Nozzle</span>
              <span className="text-right">Opening</span>
              <span className="text-right">Closing</span>
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

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Total Litres
                </p>
                <p className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-slate-800">
                  {totalLitres.toFixed(2)} L
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Total Sale
                </p>
                <p className="mt-1 font-mono text-[15px] font-bold tabular-nums text-[#047857]">
                  ₹{(totalExpectedSalePaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </section>

          {/* Bottom action */}
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <div className="mx-auto max-w-[480px]">
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => {
                  const finalReadingsPayload = readings.map((reading) => {
                    const nozzleId =
                      reading.nozzleId ||
                      reading.nozzle ||
                      reading._id;

                    const finalValue =
                      finalReadings[nozzleId] ??
                      formatReading(
                        Number(
                          reading.openingReading ??
                            reading.opening ??
                            0,
                        ),
                      );

                    return {
                      nozzleId,
                      closingReading: Number(finalValue),
                    };
                  });

                  (() => {
                    const workflowState = {
                      shiftId: shift?._id,
                      finalReadings: finalReadingsPayload,
                    };
                    saveShiftWorkflowState(workflowState);
                    navigate("/shift/cash", { state: workflowState });
                  })();
                }}
                className="
                  flex
                  min-h-[52px]
                  w-full
                  items-center
                  justify-center
                  rounded-[15px]
                  bg-[#047857]
                  text-[14px]
                  font-semibold
                  text-white
                  shadow-[0_8px_20px_rgba(4,120,87,0.18)]
                  transition
                  active:scale-[0.985]
                  disabled:cursor-not-allowed
                  disabled:bg-slate-200
                  disabled:text-slate-400
                  disabled:shadow-none
                "
                style={{ borderRadius: "15px", overflow: "hidden" }}
              >
                Next: Cash
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-2 h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default EndShift;
