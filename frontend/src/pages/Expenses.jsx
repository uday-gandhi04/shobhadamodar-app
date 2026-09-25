import { useCallback, useEffect, useContext, useState } from "react";
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

const formatMoney = (paise) =>
  `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const parseRupeesToPaise = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return Math.round(number * 100);
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

  const loadData = useCallback(async () => {
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
          "Unable to load expenses.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (saving) return;

    setError("");
    setSuccess("");

    const amountPaise =
      parseRupeesToPaise(amount);

    const trimmedReason =
      reason.trim();

    if (!amountPaise) {
      setError("Enter a valid amount.");
      return;
    }

    if (trimmedReason.length < 2) {
      setError("Enter the reason.");
      return;
    }

    if (!shift?._id) {
      setError("Active shift not found.");
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
      } else {
        const refreshed =
          await getMyShiftExpenses(
            shift._id,
          );

        setExpenses(
          refreshed?.data || [],
        );
      }

      setAmount("");
      setReason("");
      setSuccess("Expense saved.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save expense.",
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
          <main className="mx-auto min-h-[100dvh] max-w-[480px] px-4 pt-[max(0.9rem,env(safe-area-inset-top))]">
            <div className="h-10 animate-pulse rounded-[14px] bg-white" />
            <div className="mt-4 h-[300px] animate-pulse rounded-[20px] bg-white" />
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
        <main
          className="
            mx-auto
            min-h-[100dvh]
            max-w-[480px]
            px-4
            pb-24
            pt-[max(0.9rem,env(safe-area-inset-top))]
          "
        >
          {/* HEADER */}
          <EmployeeShiftHeader
            shift={shift}
            user={user}
            onBack={() =>
              navigate("/shift/udhari", {
                state: workflowState,
              })
            }
          />

          {/* STATUS */}
          <WorkflowStatusBar
            currentStage="expense"
            navigationUnlocked={true}
            mpdId={
              shift?.mpdId?._id ||
              shift?.mpdId
            }
          />

          {/* PAGE TITLE */}
          {/* <div className="mt-4">
            <h1 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900">
              {t("expense.title")}
            </h1>

            <p className="mt-1 text-[10px] text-slate-500">
              {t("expense.subtitle")}
            </p>
          </div> */}

          {/* ADD EXPENSE */}
          <section className="mt-4 rounded-[18px] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            <h2 className="text-[15px] font-bold text-slate-900">
              {t("expense.addExpense")}
            </h2>

            {/* <p className="mt-1 text-[9px] leading-4 text-slate-500">
              {t("expense.description")}
            </p> */}

            {/* AMOUNT */}
            <div className="mt-4">
              <label className="text-[8px] font-bold uppercase tracking-[0.05em] text-slate-400">
                {t("expense.amount")}
              </label>

              <div
                className="
                  mt-1.5
                  flex
                  h-[44px]
                  items-center
                  rounded-[10px]
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  focus-within:border-[#047857]
                  focus-within:bg-white
                "
              >
                <span className="mr-2 text-[15px] font-semibold text-slate-400">
                  ₹
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                        .replace(/[^\d.]/g, "")
                        .replace(
                          /(\..*)\./g,
                          "$1",
                        ),
                    )
                  }
                  className="
                    min-w-0
                    flex-1
                    bg-transparent
                    text-[15px]
                    font-semibold
                    tabular-nums
                    text-slate-900
                    outline-none
                  "
                  aria-label={t(
                    "expense.amount",
                  )}
                />
              </div>
            </div>

            {/* REASON */}
            <div className="mt-3">
              <label className="text-[8px] font-bold uppercase tracking-[0.05em] text-slate-400">
                {t("expense.reason")}
              </label>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                rows={2}
                className="
                  mt-1.5
                  h-[68px]
                  w-full
                  resize-none
                  rounded-[10px]
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  py-2.5
                  text-[12px]
                  font-medium
                  leading-5
                  text-slate-900
                  outline-none
                  focus:border-[#047857]
                  focus:bg-white
                "
                aria-label={t(
                  "expense.reason",
                )}
              />
            </div>

            {/* ERROR */}
            {error && (
              <div className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[9px] font-medium text-red-700">
                {error}
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div className="mt-3 rounded-[10px] bg-emerald-50 px-3 py-2 text-[9px] font-medium text-emerald-700">
                {success}
              </div>
            )}

            {/* SAVE */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="
                mt-3
                h-[44px]
                w-full
                rounded-[10px]
                bg-[#047857]
                text-[12px]
                font-bold
                text-white
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

          {/* THIS SHIFT */}
          <section className="mt-3 rounded-[16px] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-bold text-slate-900">
                  {t("expense.thisShift")}
                </p>

                <p className="mt-0.5 text-[8px] text-slate-400">
                  {t("expense.thisShiftHint")}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[14px] font-bold text-[#047857]">
                  {formatMoney(
                    totalExpenses,
                  )}
                </p>

                <p className="text-[8px] text-slate-400">
                  {expenses.length}{" "}
                  {t("expense.expenses")}
                </p>
              </div>
            </div>

            {expenses.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2">
                {expenses
                  .slice(0, 3)
                  .map((expense) => (
                    <div
                      key={expense._id}
                      className="flex items-center justify-between gap-3 py-1.5"
                    >
                      <p className="min-w-0 truncate text-[9px] font-medium text-slate-600">
                        {expense.reason}
                      </p>

                      <p className="shrink-0 text-[10px] font-semibold text-slate-800">
                        {formatMoney(
                          expense.amountPaise,
                        )}
                      </p>
                    </div>
                  ))}

                {expenses.length > 3 && (
                  <p className="pt-1 text-center text-[8px] text-slate-400">
                    +{expenses.length - 3} more
                  </p>
                )}
              </div>
            )}
          </section>
        </main>

        {/* FIXED NEXT BUTTON */}
        <div
          className="
            fixed
            bottom-0
            left-0
            right-0
            z-20
            border-t
            border-slate-100
            bg-white/95
            px-4
            pb-[max(0.65rem,env(safe-area-inset-bottom))]
            pt-2.5
            backdrop-blur
          "
        >
          <div className="mx-auto max-w-[480px]">
            <button
              type="button"
              onClick={() => {
                saveShiftWorkflowState(
                  workflowState,
                );

                navigate("/shift/review", {
                  state: workflowState,
                });
              }}
              className="
                flex
                h-[48px]
                w-full
                items-center
                justify-center
                rounded-[12px]
                bg-[#047857]
                text-[13px]
                font-bold
                text-white
                shadow-[0_6px_16px_rgba(4,120,87,0.18)]
                transition
                active:scale-[0.985]
              "
            >
              {t("expense.nextReview")}
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Expenses;