import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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

  if (period === "AM" && h === 12) {
    hour24 = 0;
  }

  if (period === "PM" && h !== 12) {
    hour24 = h + 12;
  }

  return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const TimeField = ({ value, onChange }) => {
  const initial = parseTime(value);

  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);

  useEffect(() => {
    const next = parseTime(value);

    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [value]);

  const emit = (nextHour, nextMinute, nextPeriod = period) => {
    setHour(nextHour);
    setMinute(nextMinute);
    onChange(makeTime(nextHour, nextMinute, nextPeriod));
  };

  const handleHour = (event) => {
    let next = event.target.value
      .replace(/\D/g, "")
      .slice(0, 2);

    if (next.length === 2) {
      const n = Number(next);
      if (n < 1) next = "01";
      if (n > 12) next = "12";
    }

    emit(next, minute);
  };

  const handleMinute = (event) => {
    let next = event.target.value
      .replace(/\D/g, "")
      .slice(0, 2);

    if (next.length === 2 && Number(next) > 59) {
      next = "59";
    }

    emit(hour, next);
  };

  return (
    <div className="flex w-[124px] shrink-0 items-center gap-1.5">
      {/* HH:MM */}
      <div
        className="
          flex
          h-[42px]
          w-[72px]
          shrink-0
          items-center
          justify-center
          rounded-[10px]
          border
          border-slate-200
          bg-slate-50
          px-1
          focus-within:border-[#047857]
          focus-within:bg-white
        "
      >
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={hour}
          onChange={handleHour}
          onFocus={(e) => e.target.select()}
          placeholder="HH"
          className="
            w-[25px]
            bg-transparent
            p-0
            text-center
            text-[12px]
            font-semibold
            tabular-nums
            text-slate-800
            outline-none
            placeholder:text-slate-300
          "
        />

        <span className="text-[12px] font-bold text-slate-400">
          :
        </span>

        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={minute}
          onChange={handleMinute}
          onFocus={(e) => e.target.select()}
          placeholder="MM"
          className="
            w-[25px]
            bg-transparent
            p-0
            text-center
            text-[12px]
            font-semibold
            tabular-nums
            text-slate-800
            outline-none
            placeholder:text-slate-300
          "
        />
      </div>

      {/* AM / PM */}
      <div
        className="
          flex
          h-[42px]
          w-[47px]
          shrink-0
          items-center
          rounded-[10px]
          border
          border-slate-200
          bg-slate-50
          p-1
        "
      >
        <button
          type="button"
          onClick={() => {
            setPeriod("AM");
            onChange(makeTime(hour, minute, "AM"));
          }}
          className={`
            h-[32px]
            w-[21px]
            rounded-[7px]
            text-[8px]
            font-bold
            ${
              period === "AM"
                ? "bg-[#047857] text-white"
                : "text-slate-500"
            }
          `}
        >
          AM
        </button>

        <button
          type="button"
          onClick={() => {
            setPeriod("PM");
            onChange(makeTime(hour, minute, "PM"));
          }}
          className={`
            h-[32px]
            w-[21px]
            rounded-[7px]
            text-[8px]
            font-bold
            ${
              period === "PM"
                ? "bg-[#047857] text-white"
                : "text-slate-500"
            }
          `}
        >
          PM
        </button>
      </div>
    </div>
  );
};

const AmountInput = ({ value, onChange }) => (
  <div
    className="
      flex
      h-[42px]
      min-w-0
      w-full
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
    <span className="mr-1 text-[13px] font-semibold text-slate-400">
      ₹
    </span>

    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="
        min-w-0
        w-full
        bg-transparent
        text-right
        text-[12px]
        font-semibold
        tabular-nums
        text-slate-900
        outline-none
      "
    />
  </div>
);

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

      {/* <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {t("phonepe.description")}
      </p> */}

      <div className="mt-5 overflow-hidden rounded-[14px] border border-slate-200">
        {/* HEADER */}
        <div
          className="
            grid
            grid-cols-[42px_124px_minmax(0,1fr)]
            items-center
            gap-2
            bg-slate-50
            px-3
            py-2.5
            text-[9px]
            font-bold
            uppercase
            tracking-[0.04em]
            text-slate-500
          "
        >
          <span>{t("phonepe.transaction")}</span>

          <span className="text-center">
            {t("phonepe.time")}
          </span>

          <span className="text-right">
            {t("phonepe.amount")}
          </span>
        </div>

        {/* FIRST */}
        <div
          className="
            grid
            grid-cols-[42px_124px_minmax(0,1fr)]
            items-center
            gap-2
            border-t
            border-slate-100
            px-3
            py-3
          "
        >
          <span className="text-[12px] font-semibold text-slate-700">
            {t("phonepe.first")}
          </span>

          <TimeField
            value={firstTransactionTime}
            onChange={onFirstTransactionTimeChange}
          />

          <AmountInput
            value={firstTransactionAmount}
            onChange={onFirstTransactionAmountChange}
          />
        </div>

        {/* LAST */}
        <div
          className="
            grid
            grid-cols-[42px_124px_minmax(0,1fr)]
            items-center
            gap-2
            border-t
            border-slate-100
            px-3
            py-3
          "
        >
          <span className="text-[12px] font-semibold text-slate-700">
            {t("phonepe.last")}
          </span>

          <TimeField
            value={lastTransactionTime}
            onChange={onLastTransactionTimeChange}
          />

          <AmountInput
            value={lastTransactionAmount}
            onChange={onLastTransactionAmountChange}
          />
        </div>
      </div>

      {timeError && (
        <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[10px] font-medium text-red-700">
          {timeError}
        </p>
      )}

      {/* TOTAL */}
      <div className="mt-4 rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3">
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