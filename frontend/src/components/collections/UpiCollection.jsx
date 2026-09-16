import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import TimeField from "../business/workflow/TimeField";

const parseTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return {
      hour: "",
      minute: "",
      period: "AM",
    };
  }

  const [h, m] = value.split(":").map(Number);

  return {
    hour: String(h % 12 || 12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period: h >= 12 ? "PM" : "AM",
  };
};

const makeTime = (hour, minute, period) => {
  const h = Number(hour);
  const m = Number(minute);

  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 1 ||
    h > 12 ||
    m < 0 ||
    m > 59
  ) {
    return "";
  }

  let hour24 = h;

  if (period === "AM" && h === 12) hour24 = 0;
  if (period === "PM" && h !== 12) hour24 = h + 12;

  return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const UpiCollection = ({
  upi,
  onUpiChange,
  firstTransactionTime,
  onFirstTransactionTimeChange,
  firstTransactionAmount,
  onFirstTransactionAmountChange,
  lastTransactionTime,
  onLastTransactionTimeChange,
  lastTransactionAmount,
  onLastTransactionAmountChange,
  timeError,
  onSavedMessage,
}) => {
  const { t } = useTranslation();

  const hasAnyUpiData = Boolean(
    upi ||
      firstTransactionTime ||
      firstTransactionAmount ||
      lastTransactionTime ||
      lastTransactionAmount,
  );

  return (
    <section className="mt-4 rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <p className="text-[16px] font-bold text-slate-900">
        {t("phonepe.title")}
      </p>

      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {t("phonepe.description")}
      </p>

      <div className="mt-5 overflow-hidden rounded-[14px] border border-slate-200">
        {/* HEADER */}
        <div className="grid grid-cols-[48px_150px_minmax(0,1fr)] items-center gap-2 bg-slate-50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.05em] text-slate-500">
          <span>
            {t("phonepe.transaction")}
          </span>

          <span className="text-center">
            {t("phonepe.time")}
          </span>

          <span className="text-right">
            {t("phonepe.amount")}
          </span>
        </div>

        {/* FIRST */}
        <div className="grid grid-cols-[48px_150px_minmax(0,1fr)] items-center gap-2 border-t border-slate-100 px-3 py-3">
          <span className="text-[12px] font-semibold text-slate-700">
            {t("phonepe.first")}
          </span>

          <TimeField
            value={firstTransactionTime}
            onChange={
              onFirstTransactionTimeChange
            }
            hourLabel={t(
              "phonepe.firstHourAriaLabel",
            )}
            minuteLabel={t(
              "phonepe.firstMinuteAriaLabel",
            )}
            periodLabel={t(
              "phonepe.firstPeriodAriaLabel",
            )}
          />

          <div
            className="
              flex
              h-[42px]
              min-w-0
              items-center
              rounded-[10px]
              border
              border-slate-200
              bg-slate-50
              px-2.5
              focus-within:border-[#047857]
              focus-within:bg-white
            "
          >
            <span className="mr-1.5 text-[13px] font-semibold text-slate-400">
              ₹
            </span>

            <input
              type="text"
              inputMode="decimal"
              value={firstTransactionAmount}
              onChange={(event) =>
                onFirstTransactionAmountChange(
                  event.target.value,
                )
              }
              aria-label={t(
                "phonepe.firstAmountAriaLabel",
              )}
              className="
                min-w-0
                w-full
                bg-transparent
                text-right
                text-[12px]
                font-semibold
                tabular-nums
                text-slate-800
                outline-none
              "
            />
          </div>
        </div>

        {/* LAST */}
        <div className="grid grid-cols-[48px_150px_minmax(0,1fr)] items-center gap-2 border-t border-slate-100 px-3 py-3">
          <span className="text-[12px] font-semibold text-slate-700">
            {t("phonepe.last")}
          </span>

          <TimeField
            value={lastTransactionTime}
            onChange={
              onLastTransactionTimeChange
            }
            hourLabel={t(
              "phonepe.lastHourAriaLabel",
            )}
            minuteLabel={t(
              "phonepe.lastMinuteAriaLabel",
            )}
            periodLabel={t(
              "phonepe.lastPeriodAriaLabel",
            )}
          />

          <div
            className="
              flex
              h-[42px]
              min-w-0
              items-center
              rounded-[10px]
              border
              border-slate-200
              bg-slate-50
              px-2.5
              focus-within:border-[#047857]
              focus-within:bg-white
            "
          >
            <span className="mr-1.5 text-[13px] font-semibold text-slate-400">
              ₹
            </span>

            <input
              type="text"
              inputMode="decimal"
              value={lastTransactionAmount}
              onChange={(event) =>
                onLastTransactionAmountChange(
                  event.target.value,
                )
              }
              aria-label={t(
                "phonepe.lastAmountAriaLabel",
              )}
              className="
                min-w-0
                w-full
                bg-transparent
                text-right
                text-[12px]
                font-semibold
                tabular-nums
                text-slate-800
                outline-none
              "
            />
          </div>
        </div>
      </div>

      {timeError && (
        <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[10px] font-medium text-red-700">
          {timeError}
        </p>
      )}

      {/* TOTAL */}
      <div className="mt-4 rounded-[14px] border border-emerald-100 bg-emerald-50 px-3 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-emerald-700">
          {t("phonepe.totalCollection")}
        </p>

        <div className="mt-1 flex items-center">
          <span className="mr-2 text-[20px] font-bold text-emerald-700">
            ₹
          </span>

          <input
            type="text"
            inputMode="decimal"
            value={upi}
            onChange={(event) => {
              onUpiChange(event.target.value);
              onSavedMessage("");
            }}
            className="
              min-w-0
              flex-1
              bg-transparent
              text-right
              text-[22px]
              font-bold
              tabular-nums
              text-slate-900
              outline-none
            "
            aria-label={t(
              "phonepe.totalCollectionAriaLabel",
            )}
          />
        </div>
      </div>

      {!hasAnyUpiData && (
        <p className="mt-2 text-center text-[9px] text-slate-400">
          {t("phonepe.emptyHint")}
        </p>
      )}
    </section>
  );
};

export default UpiCollection;