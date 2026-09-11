import { useCallback, useContext, useEffect, useState } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AuthContext } from "../context/AuthContext";

import EmployeeShiftHeader from "../components/business/workflow/EmployeeShiftHeader";
import WorkflowStatusBar from "../components/business/workflow/WorkflowStatusBar";

import {
  readShiftWorkflowState,
  saveShiftWorkflowState,
} from "../utils/shiftWorkflow";

import { getCurrentShift } from "../services/shiftApi";

import {
  createExpense,
  getMyShiftExpenses,
} from "../services/expenseApi";

const formatCurrency = (paise) => {
  return `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const parseRupeesToPaise = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return Math.round(number * 100);
};

const sanitizeAmount = (value) => {
  return value
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");
};

const Expenses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();

  const workflowState = readShiftWorkflowState(
    location.state,
  );

  const [shift, setShift] = useState(null);
  const [expenses, setExpenses] = useState([]);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadExpenses = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const shiftResponse =
          await getCurrentShift();

        const currentShift =
          shiftResponse?.data || null;

        if (!currentShift) {
          navigate("/select-mpd", {
            replace: true,
          });
          return;
        }

        setShift(currentShift);

        const expenseResponse =
          await getMyShiftExpenses(
            currentShift._id,
          );

        setExpenses(
          expenseResponse?.data || [],
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("expense.error.loadFailed"),
        );
      } finally {
        setLoading(false);
      }
    },
    [navigate, t],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadExpenses();
    }, 0);

    return () =>
      window.clearTimeout(timer);
  }, [loadExpenses]);

  const handleSave = async () => {
    if (saving) return;

    setError("");
    setSuccess("");

    const amountPaise =
      parseRupeesToPaise(amount);

    const trimmedReason =
      reason.trim();

    if (!amountPaise) {
      setError(t("expense.error.invalidAmount"));
      return;
    }

    if (trimmedReason.length < 2) {
      setError(t("expense.error.missingReason"));
      return;
    }

    if (!shift?._id) {
      setError(t("expense.error.noShift"));
      return;
    }

    try {
      setSaving(true);

      const response =
        await createExpense({
          shiftId: shift._id,
          amountPaise,
          reason: trimmedReason,
        });

      const newExpense =
        response?.data?.expense ||
        response?.expense ||
        null;

      if (newExpense) {
        setExpenses((current) => [
          newExpense,
          ...current,
        ]);
      }

      setAmount("");
      setReason("");

      setSuccess(t("expense.success.saved"));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("expense.error.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const totalExpenses = expenses.reduce(
    (total, expense) =>
      total +
      Number(expense.amountPaise || 0),
    0,
  );

  if (loading) {
    return (
      <IonPage>
        <IonContent
          fullscreen
          style={{
            "--background": "#F3F4F6",
          }}
        >
          <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-8 pt-[max(0.9rem,env(safe-area-inset-top))]">
            <div className="h-10 w-full animate-pulse rounded-[12px] bg-white" />

            <div className="mt-4 h-7 w-32 animate-pulse rounded bg-slate-200" />

            <div className="mt-4 h-80 animate-pulse rounded-[20px] bg-white" />

            <div className="mt-4 h-52 animate-pulse rounded-[20px] bg-white" />
          </main>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent
        fullscreen
        style={{
          "--background": "#F3F4F6",
        }}
      >
        <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pb-28 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <EmployeeShiftHeader
            shift={shift}
            user={user}
            onBack={() =>
              navigate("/shift/udhari", {
                state: workflowState,
              })
            }
          />

          <WorkflowStatusBar
            currentStage="expense"
          />

          <div className="mt-4">
            <h1 className="text-[18px] font-bold text-slate-900">
              {t("expense.title")}
            </h1>

            <p className="mt-0.5 text-[10px] text-slate-500">
              {t("expense.subtitle")}
            </p>
          </div>

          <section className="mt-4 rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                {t("expense.addExpense")}
              </h2>

              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                {t("expense.description")}
              </p>
            </div>

            <div className="mt-5">
              <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                {t("expense.amount")}
              </label>

              <div className="mt-2 flex h-[50px] items-center rounded-[12px] border border-slate-200 bg-slate-50 px-3 focus-within:border-[#047857] focus-within:bg-white">
                <span className="mr-2 text-[16px] font-semibold text-slate-400">
                  ₹
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      sanitizeAmount(
                        event.target.value,
                      ),
                    )
                  }
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-slate-900 outline-none"
                  aria-label={t("expense.amountAriaLabel")}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                {t("expense.reason")}
              </label>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                rows={3}
                className="
                  mt-2
                  w-full
                  resize-none
                  rounded-[12px]
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  py-3
                  text-[13px]
                  font-medium
                  text-slate-900
                  outline-none
                  focus:border-[#047857]
                  focus:bg-white
                "
                aria-label={t("expense.reasonAriaLabel")}
              />
            </div>

            {error && (
              <div className="mt-4 rounded-[12px] border border-red-100 bg-red-50 px-3 py-2.5 text-[10px] font-medium leading-4 text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[10px] font-medium leading-4 text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="
                mt-5
                flex
                min-h-[50px]
                w-full
                items-center
                justify-center
                rounded-[14px]
                bg-[#047857]
                text-[13px]
                font-semibold
                text-white
                shadow-[0_8px_18px_rgba(4,120,87,0.16)]
                transition
                active:scale-[0.985]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {saving
                ? t("expense.saving")
                : t("expense.saveExpense")}
            </button>
          </section>

          <section className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-900">
                  {t("expense.thisShift")}
                </p>

                <p className="mt-0.5 text-[9px] text-slate-400">
                  {t("expense.thisShiftHint")}
                </p>
              </div>

              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-700">
                {expenses.length}{" "}
                {expenses.length === 1
                  ? t("expense.expense")
                  : t("expense.expenses")}
              </span>
            </div>

            {expenses.length === 0 ? (
              <div className="mt-4 rounded-[12px] bg-slate-50 px-3 py-4 text-center">
                <p className="text-[10px] text-slate-400">
                  {t("expense.empty")}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-3 space-y-2">
                  {expenses.map(
                    (expense) => (
                      <div
                        key={expense._id}
                        className="
                          rounded-[14px]
                          border
                          border-slate-100
                          bg-slate-50
                          px-3
                          py-3
                        "
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-slate-900">
                              {expense.reason}
                            </p>

                            {expense.createdAt && (
                              <p className="mt-1 text-[9px] text-slate-400">
                                {new Date(
                                  expense.createdAt,
                                ).toLocaleTimeString(
                                  "en-IN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>
                            )}
                          </div>

                          <p className="shrink-0 text-[13px] font-bold text-slate-900">
                            {formatCurrency(
                              expense.amountPaise,
                            )}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-[12px] bg-amber-50 px-3 py-3">
                  <span className="text-[10px] font-semibold text-slate-600">
                    {t("expense.totalExpenses")}
                  </span>

                  <span className="text-[15px] font-bold text-amber-700">
                    {formatCurrency(
                      totalExpenses,
                    )}
                  </span>
                </div>
              </>
            )}
          </section>

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              saveShiftWorkflowState(
                workflowState,
              );

              navigate("/shift/review", {
                state: workflowState,
              });
            }}
            className="
              mt-4
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
              disabled:opacity-60
            "
          >
            {t("expense.nextReview")}
          </button>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Expenses;