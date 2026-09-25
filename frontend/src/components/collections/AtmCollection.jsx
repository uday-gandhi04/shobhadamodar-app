import { useState } from "react";
import { useTranslation } from "react-i18next";

import TimeField from "../business/workflow/TimeField";

const AtmCollection = ({ entries = [], onEntriesChange, onSavedMessage }) => {
  const { t } = useTranslation();

  const [time, setTime] = useState("");
  const [amount, setAmount] = useState("");

  const addEntry = () => {
    const amountNumber = Number(amount);

    if (!time || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return;
    }

    const newEntries = [
      ...entries,
      {
        id: `${Date.now()}-${Math.random()}`,
        time,
        amountPaise: Math.round(amountNumber * 100),
      },
    ];

    onEntriesChange(newEntries);

    setTime("");
    setAmount("");
    onSavedMessage("");
  };

  const removeEntry = (id) => {
    onEntriesChange(entries.filter((entry) => entry.id !== id));

    onSavedMessage("");
  };

  const totalPaise = entries.reduce(
    (sum, entry) => sum + Number(entry.amountPaise || 0),
    0,
  );

  return (
    <section className="mt-4 rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <p className="text-[16px] font-bold text-slate-900">{t("atm.title")}</p>

      {/* <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {t("atm.description")}
      </p> */}

      {/* NEW ENTRY */}
      <div className="mt-5 rounded-[14px] border border-slate-200 bg-slate-50 p-3">
        <div className="grid grid-cols-[1fr_1fr] items-end gap-2">
          <TimeField value={time} onChange={setTime} />

          <div>
            <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.04em] text-slate-400">
              {t("atm.amount")}
            </label>

            <div
              className="
        flex
        h-[42px]
        w-full
        items-center
        rounded-[10px]
        border
        border-slate-200
        bg-white
        px-2.5
        focus-within:border-[#047857]
      "
            >
              <span className="mr-1.5 text-[13px] font-semibold text-slate-400">
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
                      .replace(/(\..*)\./g, "$1"),
                  )
                }
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
                aria-label={t("atm.amount")}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={addEntry}
          disabled={!time || !Number(amount)}
          className="
            mt-3
            h-[44px]
            w-full
            rounded-[11px]
            bg-[#047857]
            text-[12px]
            font-semibold
            text-white
            disabled:opacity-40
          "
        >
          + Add ATM
        </button>
      </div>

      {/* THIS SHIFT */}
      <div className="mt-4 rounded-[14px] border border-slate-100 bg-white">
        <div className="flex items-center justify-between px-3 py-3">
          <div>
            <p className="text-[13px] font-bold text-slate-900">
              {t("atm.thisShift")}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-400">
              {entries.length}{" "}
              {entries.length === 1 ? t("atm.entry") : t("atm.entries")}
            </p>
          </div>

          <p className="text-[15px] font-bold text-[#047857]">
            ₹
            {(totalPaise / 100).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        {entries.length > 0 && (
          <div className="border-t border-slate-100">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {entry.time}
                  </p>

                  <p className="mt-0.5 text-[9px] text-slate-400">ATM</p>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-[12px] font-bold text-slate-900">
                    ₹
                    {(Number(entry.amountPaise || 0) / 100).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                      },
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="text-[10px] font-semibold text-red-600"
                  >
                    {t("atm.remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AtmCollection;
