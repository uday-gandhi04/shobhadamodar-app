import { useEffect, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";

import { getCurrentShift, previewEndShift, endShift } from "../services/shiftApi";
import { getMyShiftExpenses } from "../services/expenseApi";
import {
  clearShiftWorkflowState,
  readShiftWorkflowState,
} from "../utils/shiftWorkflow";

const formatMoney = (paise) => {
  return `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const EndShiftReview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const workflowState = readShiftWorkflowState(location.state);
  const { shiftId, finalReadings, collections } = workflowState || {};

  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(true);

  const [ending, setEnding] = useState(false);

  const [error, setError] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [resolvedShiftId, setResolvedShiftId] = useState(shiftId || null);
  const [resolvedFinalReadings, setResolvedFinalReadings] = useState(finalReadings || []);
  const [resolvedCollections, setResolvedCollections] = useState(collections || null);

  useEffect(() => {
    let mounted = true;

    const calculateReview = async () => {
      try {
        setLoading(true);
        setError("");

        const shiftResponse = await getCurrentShift();
        const currentShift = shiftResponse?.data;
        if (!currentShift) {
          navigate("/select-mpd", { replace: true });
          return;
        }

        const activeShiftId = currentShift._id || shiftId;
        if (!activeShiftId) {
          navigate("/select-mpd", { replace: true });
          return;
        }
        setResolvedShiftId(activeShiftId);

        const backendReadings = (currentShift.readings || [])
          .filter((reading) => reading.closingReading !== null && reading.closingReading !== undefined)
          .map((reading) => ({
            nozzleId: reading.nozzleId,
            closingReading: Number(reading.closingReading),
          }));
        const persistedReadings = backendReadings.length > 0 ? backendReadings : finalReadings;
        const persistedCollections = {
          cashBreakdown: currentShift.cashCollections || [],
          coinsPaise: Number(currentShift.coinsPaise || 0),
          upiPaise: Number(currentShift.totalUpiPaise || 0),
          cardPaise: Number(currentShift.totalCardPaise || 0),
          udhariPaise: Number(currentShift.totalUdhariPaise || 0),
          ...(currentShift.upiCollection ? { upiCollection: currentShift.upiCollection } : {}),
        };

        if (!Array.isArray(persistedReadings) || persistedReadings.length === 0) {
          setError("Final nozzle readings are missing.");
          setLoading(false);
          return;
        }

        setResolvedFinalReadings(persistedReadings);
        setResolvedCollections(persistedCollections);

        const response = await previewEndShift(activeShiftId, {
          readings: persistedReadings,
          collections: persistedCollections,
        });

        if (!mounted) return;

        setPreview(response?.data || null);

        const expenseResponse = await getMyShiftExpenses(activeShiftId);
        if (mounted) setExpenses(expenseResponse?.data || []);
      } catch (err) {
        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to calculate final result.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    calculateReview();

    return () => {
      mounted = false;
    };
  }, [shiftId, navigate, finalReadings]);

  const handleEndShift = async () => {
  if (!resolvedShiftId || !preview || ending) {
    return;
  }

  try {
    setEnding(true);
    setError("");

    await endShift(resolvedShiftId, {
      readings: resolvedFinalReadings,
      collections: resolvedCollections || {
        cashBreakdown: [],
        upiPaise: 0,
        cardPaise: 0,
        udhariPaise: 0,
      },
    });

    clearShiftWorkflowState();

    /*
     * Shift ended successfully.
     * Keep employee logged in, but start the next
     * screen from a clean Select MPD state.
     */
    window.location.replace("/select-mpd");
  } catch (err) {
    setError(
      err?.response?.data?.message ||
        err?.message ||
        "Unable to end shift.",
    );
  } finally {
    setEnding(false);
  }
};

  const status = preview?.reconciliationStatus;

  const difference = Number(preview?.differencePaise || 0);

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          "--background": "#F3F4F6",
        }}
      >
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-32 pt-[max(0.9rem,env(safe-area-inset-top))]">
          {/* Header */}
          <header className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate("/shift/expense", {
                  state: {
                    shiftId,
                    finalReadings,
                    collections,
                  },
                })
              }
              className="
                grid
                h-9
                w-9
                place-items-center
                rounded-full
                bg-white
                text-slate-700
                shadow-sm
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

            <div>
              <h1 className="text-[18px] font-bold text-slate-900">
                Review End Shift
              </h1>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Check everything before ending
              </p>
            </div>
          </header>

          {/* Step indicator */}
          <div className="mt-5 rounded-[18px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-[#047857]">
                  ✓
                </div>

                <span className="text-[10px] font-semibold text-slate-600">
                  Nozzle
                </span>
              </div>

              <div className="h-px flex-1 bg-emerald-200" />

              <div className="flex items-center gap-2 px-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-[#047857]">
                  ✓
                </div>

                <span className="text-[10px] font-semibold text-slate-600">
                  Money
                </span>
              </div>

              <div className="h-px flex-1 bg-[#047857]" />

              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-[#047857] text-[11px] font-bold text-white">
                  3
                </div>

                <span className="text-[10px] font-semibold text-slate-900">
                  Review
                </span>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <>
              <div className="mt-4 h-40 animate-pulse rounded-[20px] bg-white" />

              <div className="mt-4 h-52 animate-pulse rounded-[20px] bg-white" />
            </>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mt-4 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-[11px] font-medium leading-5 text-red-700">
              {error}
            </div>
          )}

          {/* Result */}
          {!loading && preview && (
            <>
              {/* Main result */}
              <section className="mt-4 rounded-[22px] bg-slate-900 p-5 text-white shadow-[0_10px_28px_rgba(15,23,42,0.16)]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Final Result
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-slate-400">Expected Sale</p>

                    <p className="mt-1 text-[20px] font-bold">
                      {formatMoney(preview.expectedTotalSalePaise)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] text-slate-400">Total Collected</p>

                    <p className="mt-1 text-[20px] font-bold">
                      {formatMoney(preview.totalCollectedPaise)}
                    </p>
                  </div>
                </div>

                <div
                  className={`
                      mt-5
                      rounded-[16px]
                      p-4
                      ${
                        status === "MATCHED"
                          ? "bg-emerald-500/15"
                          : status === "SHORT"
                            ? "bg-rose-500/15"
                            : "bg-amber-500/15"
                      }
                    `}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                    Reconciliation
                  </p>

                  <p
                    className={`
                        mt-1
                        text-[25px]
                        font-bold
                        ${
                          status === "MATCHED"
                            ? "text-emerald-300"
                            : status === "SHORT"
                              ? "text-rose-300"
                              : "text-amber-300"
                        }
                      `}
                  >
                    {status === "MATCHED"
                      ? "MATCHED"
                      : status === "SHORT"
                        ? `SHORT ${formatMoney(Math.abs(difference))}`
                        : `EXCESS ${formatMoney(difference)}`}
                  </p>
                </div>
              </section>

              {/* Breakdown */}
              <section className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                <h2 className="text-[14px] font-bold text-slate-900">
                  Collection Breakdown
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Cash</span>

                    <span className="text-[12px] font-bold text-slate-800">
                      {formatMoney(preview.totalCashPaise)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">UPI</span>

                    <span className="text-[12px] font-bold text-slate-800">
                      {formatMoney(preview.totalUpiPaise)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Card / ATM
                    </span>

                    <span className="text-[12px] font-bold text-slate-800">
                      {formatMoney(preview.totalCardPaise)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Udhari</span>

                    <span className="text-[12px] font-bold text-slate-800">
                      {formatMoney(preview.totalUdhariPaise)}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-slate-700">
                        Total
                      </span>

                      <span className="text-[15px] font-bold text-[#047857]">
                        {formatMoney(preview.totalCollectedPaise)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                <h2 className="text-[14px] font-bold text-slate-900">
                  Expenses
                </h2>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Business Expenses</span>
                  <span className="text-[12px] font-bold text-amber-700">
                    {formatMoney(expenses.reduce((total, expense) => total + Number(expense.amountPaise || 0), 0))}
                  </span>
                </div>
              </section>

              {/* Fuel summary */}
              <section className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                <h2 className="text-[14px] font-bold text-slate-900">
                  Fuel Dispensed
                </h2>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[14px] bg-emerald-50 p-3">
                    <p className="text-[9px] font-semibold text-emerald-700">
                      Petrol
                    </p>

                    <p className="mt-1 text-[17px] font-bold text-emerald-800">
                      {Number(preview.totalLitresPetrol || 0).toFixed(2)} L
                    </p>
                  </div>

                  <div className="rounded-[14px] bg-blue-50 p-3">
                    <p className="text-[9px] font-semibold text-blue-700">
                      Diesel
                    </p>

                    <p className="mt-1 text-[17px] font-bold text-blue-800">
                      {Number(preview.totalLitresDiesel || 0).toFixed(2)} L
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>

        {/* Final button */}
        {!loading && preview && (
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <div className="mx-auto max-w-[480px]">
              <button
                type="button"
                disabled={ending}
                onClick={handleEndShift}
                className="
                    flex
                    min-h-[54px]
                    w-full
                    items-center
                    justify-center
                    rounded-[15px]
                    bg-[#DC2626]
                    text-[15px]
                    font-bold
                    text-white
                    shadow-[0_8px_20px_rgba(220,38,38,0.18)]
                    transition
                    active:scale-[0.985]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
              >
                {ending ? "Ending Shift..." : "End Shift"}
              </button>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default EndShiftReview;
