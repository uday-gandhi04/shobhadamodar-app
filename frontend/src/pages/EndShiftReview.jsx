import { IonContent, IonPage } from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import EmployeeShiftHeader from "../components/business/workflow/EmployeeShiftHeader";
import WorkflowStatusBar from "../components/business/workflow/WorkflowStatusBar";

import {
  getCurrentShift,
  previewEndShift,
  endShift,
} from "../services/shiftApi";

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
  const { user } = useContext(AuthContext);
  const [currentShift, setCurrentShift] = useState(null);

  const workflowState = readShiftWorkflowState(location.state);

  const { shiftId, finalReadings, collections } = workflowState || {};

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  const [expenses, setExpenses] = useState([]);

  const [resolvedShiftId, setResolvedShiftId] = useState(shiftId || null);

  const [resolvedFinalReadings, setResolvedFinalReadings] = useState(
    finalReadings || [],
  );

  const [resolvedCollections, setResolvedCollections] = useState(
    collections || null,
  );

  useEffect(() => {
    let mounted = true;

    const calculateReview = async () => {
      try {
        setLoading(true);
        setError("");

        const shiftResponse = await getCurrentShift();
        const activeShift = shiftResponse?.data;

        if (!activeShift) {
          navigate("/select-mpd", { replace: true });
          return;
        }

        setCurrentShift(activeShift);

        const activeShiftId = activeShift._id || shiftId;

        if (!activeShiftId) {
          navigate("/select-mpd", {
            replace: true,
          });
          return;
        }

        setResolvedShiftId(activeShiftId);

        const backendReadings = (activeShift.readings || [])
          .filter(
            (reading) =>
              reading.closingReading !== null &&
              reading.closingReading !== undefined,
          )
          .map((reading) => ({
            nozzleId: reading.nozzleId,
            closingReading: Number(reading.closingReading),
          }));

        const persistedReadings =
          backendReadings.length > 0 ? backendReadings : finalReadings;

        const persistedCollections = {
          cashBreakdown: activeShift.cashCollections || [],

          coinsPaise: Number(activeShift.coinsPaise || 0),

          upiPaise: Number(activeShift.totalUpiPaise || 0),

          cardPaise: Number(activeShift.totalCardPaise || 0),

          udhariPaise: Number(activeShift.totalUdhariPaise || 0),

          ...(activeShift.upiCollection
            ? {
                upiCollection: activeShift.upiCollection,
              }
            : {}),
        };

        if (
          !Array.isArray(persistedReadings) ||
          persistedReadings.length === 0
        ) {
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

        if (mounted) {
          setExpenses(expenseResponse?.data || []);
        }
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
          coinsPaise: 0,
        },
      });

      clearShiftWorkflowState();

      window.location.replace("/select-mpd");
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Unable to end shift.",
      );
    } finally {
      setEnding(false);
    }
  };

  const expenseTotalPaise = useMemo(
    () =>
      expenses.reduce(
        (total, expense) => total + Number(expense.amountPaise || 0),
        0,
      ),
    [expenses],
  );

  const totalCollectedPaise = Number(preview?.totalCollectedPaise || 0);

  /*
   * This is a DISPLAY-ONLY figure.
   *
   * It includes both:
   * - customer collections
   * - business expenses
   *
   * It must NOT replace totalCollectedPaise
   * in reconciliation/endShift calculations.
   */
  const totalAccountedPaise = totalCollectedPaise + expenseTotalPaise;

  const status = preview?.reconciliationStatus;

  const difference = Number(preview?.differencePaise || 0);

  const isMatched = status === "MATCHED";
  const isShort = status === "SHORT";
  const isExcess = status === "EXCESS";

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          "--background": "#F3F4F6",
        }}
      >
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-32 pt-[max(0.9rem,env(safe-area-inset-top))]">
          {/* HEADER */}
          <EmployeeShiftHeader
            shift={currentShift}
            user={user}
            onBack={() =>
              navigate("/shift/expense", {
                state: {
                  shiftId,
                  finalReadings,
                  collections,
                },
              })
            }
          />

          <WorkflowStatusBar currentStage="review" />

          <div className="mt-4">
            <h1 className="text-[18px] font-bold text-slate-900">Review</h1>

            <p className="mt-0.5 text-[10px] text-slate-500">
              Check everything before ending
            </p>
          </div>

          {/* LOADING */}
          {loading && (
            <>
              <div className="mt-4 h-56 animate-pulse rounded-[20px] bg-white" />
              <div className="mt-4 h-40 animate-pulse rounded-[20px] bg-white" />
            </>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="mt-4 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-[11px] font-medium leading-5 text-red-700">
              {error}
            </div>
          )}

          {!loading && preview && (
            <>
              {/* =====================================================
                  COLLECTION + EXPENSES
              ====================================================== */}
              <section className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                <h2 className="text-[15px] font-bold text-slate-900">
                  Collection
                </h2>

                <div className="mt-4 space-y-3">
                  {/* CASH */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Cash</span>

                    <span className="text-[12px] font-semibold text-slate-800">
                      {formatMoney(preview.totalCashPaise)}
                    </span>
                  </div>

                  {/* UPI */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">UPI</span>

                    <span className="text-[12px] font-semibold text-slate-800">
                      {formatMoney(preview.totalUpiPaise)}
                    </span>
                  </div>

                  {/* CARD */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Card / ATM
                    </span>

                    <span className="text-[12px] font-semibold text-slate-800">
                      {formatMoney(preview.totalCardPaise)}
                    </span>
                  </div>

                  {/* UDHARI */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Udhari</span>

                    <span className="text-[12px] font-semibold text-slate-800">
                      {formatMoney(preview.totalUdhariPaise)}
                    </span>
                  </div>

                  {/* EXPENSES */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Expenses</span>

                    <span className="text-[12px] font-semibold text-slate-800">
                      {formatMoney(expenseTotalPaise)}
                    </span>
                  </div>

                  {/* TOTAL */}
                  <div className="mt-1 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-slate-700">
                        Total
                      </span>

                      <span className="text-[16px] font-bold text-[#047857]">
                        {formatMoney(totalAccountedPaise)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* =====================================================
                  SALE RECONCILIATION
              ====================================================== */}
              <section className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                <h2 className="text-[15px] font-bold text-slate-900">
                  Sale Reconciliation
                </h2>

                <div className="mt-4 space-y-3">
                  {/* EXPECTED */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Expected Sale
                    </span>

                    <span className="text-[14px] font-bold text-slate-900">
                      {formatMoney(preview.expectedTotalSalePaise)}
                    </span>
                  </div>

                  {/* ACTUAL */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Actual Sale
                    </span>

                    <span className="text-[14px] font-bold text-slate-900">
                      {formatMoney(preview.totalCollectedPaise)}
                    </span>
                  </div>

                  {/* BALANCE */}
                  <div
                    className={`
                      mt-2
                      rounded-[14px]
                      px-3
                      py-3
                      ${
                        isMatched
                          ? "bg-emerald-50"
                          : isShort
                            ? "bg-red-50"
                            : "bg-amber-50"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Balance
                      </span>

                      <span
                        className={`
                          text-[14px]
                          font-bold
                          ${
                            isMatched
                              ? "text-[#047857]"
                              : isShort
                                ? "text-red-600"
                                : "text-amber-700"
                          }
                        `}
                      >
                        {isMatched
                          ? "MATCHED"
                          : isShort
                            ? `SHORT ${formatMoney(Math.abs(difference))}`
                            : isExcess
                              ? `EXCESS ${formatMoney(Math.abs(difference))}`
                              : "PENDING"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>

        {/* FINAL BUTTON */}
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
