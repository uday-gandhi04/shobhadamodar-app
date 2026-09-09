import { useMemo } from "react";

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const formatCurrency = (paise) => {
  return `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const CashCollection = ({ cashCounts, onCashCountsChange, onSavedMessage }) => {
  const totalCashPaise = useMemo(() => {
    return DENOMINATIONS.reduce((total, denomination) => {
      const count = Number(cashCounts[denomination] || 0);

      return total + denomination * count * 100;
    }, 0);
  }, [cashCounts]);

  const updateCashCount = (denomination, value) => {
    const cleaned = value.replace(/\D/g, "");

    onCashCountsChange((current) => ({
      ...current,
      [denomination]: cleaned ? Number(cleaned) : 0,
    }));

    onSavedMessage("");
  };

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-[18px] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="flex h-[116px] items-center justify-center bg-gradient-to-b from-amber-50 to-emerald-50">
          <div className="text-center">
            <div className="text-[36px] font-bold text-[#047857]">₹</div>

            <p className="mt-1 text-[10px] font-medium text-slate-500">
              Cash collected so far
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center px-3">
        <div className="w-[72px]" />

        <div className="flex-1 text-center text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          Count
        </div>

        <div className="w-[82px] text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          Value
        </div>
      </div>

      <section className="mt-2 rounded-[18px] bg-white p-2 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        {DENOMINATIONS.map((denomination) => {
          const count = Number(cashCounts[denomination] || 0);

          const valuePaise = denomination * count * 100;

          return (
            <div
              key={denomination}
              className="
                  grid
                  grid-cols-5
                  min-h-[43px]
                  items-center
                  border-b
                  border-slate-50
                  last:border-b-0
                "
            >
              <div className="text-center">
                <span className="text-[13px] font-semibold text-slate-700">
                  ₹ {denomination}
                </span>
              </div>

              <span className="place-self-center text-[16px] font-bold leading-none text-slate-600">
                ×
              </span>

              <input
                type="text"
                inputMode="numeric"
                value={count}
                onChange={(event) =>
                  updateCashCount(denomination, event.target.value)
                }
                className="
                    h-7
                    w-[42px]
                    justify-self-center
                    rounded-[7px]
                    border
                    border-slate-200
                    bg-white
                    text-center
                    text-[11px]
                    font-semibold
                    text-slate-800
                    outline-none
                    focus:border-[#047857]
                  "
              />

              <span className="place-self-center text-[16px] font-bold leading-none text-slate-600">
                =
              </span>

              <div className="text-center">
                <span className="text-[11px] font-semibold text-slate-700">
                  {formatCurrency(valuePaise)}
                </span>
              </div>
            </div>
          );
        })}

        <div className="mt-2 flex items-center justify-between rounded-[12px] bg-emerald-50 px-3 py-3">
          <span className="text-[11px] font-semibold text-slate-600">
            Total Cash
          </span>

          <span className="text-[17px] font-bold text-[#047857]">
            {formatCurrency(totalCashPaise)}
          </span>
        </div>
      </section>
    </>
  );
};

export default CashCollection;
