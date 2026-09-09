import { useEffect, useMemo, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";

import { getCurrentShift } from "../services/shiftApi";
import NozzleReadingList from "../components/business/nozzle/NozzleReadingList";
import {
  formatReading,
  getFuelType,
  getNozzleNumber,
} from "../components/business/nozzle/nozzleUtils";

import nozzleDispenserImage from "../assets/fuel/nozzle-dispenser.webp";

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

  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          navigate("/dashboard", { replace: true });
          return;
        }

        setShift(currentShift);

        const initialReadings = {};

        (currentShift.readings || []).forEach((reading) => {
          const nozzleId = reading.nozzleId || reading.nozzle || reading._id;

          if (!nozzleId) return;

          const openingReading = Number(
            reading.openingReading ?? reading.opening ?? 0,
          );

          const existingFinalReading =
            reading.closingReading ?? reading.finalReading;

          /*
           * If no final reading has been entered yet,
           * pre-fill it with the opening reading.
           *
           * This lets an unused nozzle remain unchanged.
           */
          initialReadings[nozzleId] =
            existingFinalReading !== null &&
            existingFinalReading !== undefined &&
            existingFinalReading !== ""
              ? String(existingFinalReading)
              : formatReading(openingReading);
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

  const nozzleCardReadings = readings.map((reading) => {
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
              onClick={() => navigate("/dashboard")}
              className="grid h-9 w-9 place-items-center rounded-[12px] bg-white text-slate-700 shadow-sm"
              style={{ borderRadius: "12px", overflow: "hidden" }}
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

            <div>
              <h1 className="text-[18px] font-semibold text-slate-900">
                End Shift
              </h1>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Final nozzle readings
              </p>
            </div>
          </header>

          {/* Step indicator */}
          <div className="mt-5 rounded-[18px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            <div className="flex items-center">
              <div className="flex flex-1 items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-[#047857] text-[11px] font-bold text-white">
                  1
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-900">
                    Nozzle
                  </p>

                  <p className="text-[9px] text-[#047857]">Current step</p>
                </div>
              </div>

              <div className="h-px w-8 bg-slate-200" />

              <div className="flex items-center gap-2 px-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-400">
                  2
                </div>

                <p className="hidden text-[11px] font-medium text-slate-400 sm:block">
                  Money
                </p>
              </div>

              <div className="h-px w-8 bg-slate-200" />

              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-400">
                  3
                </div>

                <p className="hidden text-[11px] font-medium text-slate-400 sm:block">
                  Review
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Final readings */}
          <section className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
            <div className="mb-4">
              <h2 className="text-[15px] font-semibold text-slate-900">
                Final nozzle readings
              </h2>

              <p className="mt-1 text-[10px] font-semibold text-slate-500">
                {shift?.mpdId?.mpdNumber || "MPD"} · {shift?.shiftType || ""}
              </p>

              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Enter the final totalizer reading for each nozzle.
              </p>
            </div>

            {/* Nozzle overview image
            <div className="mb-4 flex justify-center rounded-[16px] bg-slate-50 px-3 py-4">
              <img
                src={nozzleDispenserImage}
                alt="Four fuel nozzles"
                className="w-full object-contain"
              />
            </div> */}

            {/* Nozzle cards */}
            <NozzleReadingList
              variant="end-shift"
              readings={nozzleCardReadings}
              onFinalReadingChange={handleReadingChange}
            />
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

                  navigate("/collections", {
                    state: {
                      mode: "end-shift",
                      shiftId: shift?._id,
                      finalReadings: finalReadingsPayload,
                    },
                  });
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
                Next: Money Collection
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
