const formatMoney = (paise) => {
  const amount = Number(paise || 0) / 100;
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹${Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const DENOMINATIONS = [500, 200, 100, 50, 20, 10];

export const CashBreakdownModal = ({ cashCollections = [], coinsPaise = 0, totalCashPaise = 0, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[24px] bg-[#F3F4F6] p-2 shadow-xl">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-[16px] font-black text-slate-900">Cash Breakdown</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mt-1 flex items-center px-3">
          <div className="w-[72px]" />
          <div className="flex-1 text-center text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            COUNT
          </div>
          <div className="w-[82px] text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            VALUE
          </div>
        </div>

        <div className="mt-2 rounded-[18px] bg-white p-2 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {DENOMINATIONS.map((denomination) => {
            const item = cashCollections.find(c => Number(c.denomination) === denomination);
            const count = item ? Number(item.count) : 0;
            const valuePaise = denomination * count * 100;
            
            return (
              <div key={denomination} className="grid grid-cols-5 min-h-[43px] items-center border-b border-slate-50 last:border-b-0">
                <div className="text-center">
                  <span className="text-[13px] font-semibold text-slate-700">₹ {denomination}</span>
                </div>
                <span className="place-self-center text-[16px] font-bold leading-none text-slate-600">×</span>
                <div className="flex h-7 w-[42px] justify-self-center items-center justify-center rounded-[7px] border border-slate-200 bg-white text-[11px] font-semibold text-slate-800">
                  {count}
                </div>
                <span className="place-self-center text-[16px] font-bold leading-none text-slate-600">=</span>
                <div className="text-center">
                  <span className="text-[11px] font-semibold text-slate-700">{formatMoney(valuePaise)}</span>
                </div>
              </div>
            );
          })}
          
          <div className="grid grid-cols-5 min-h-[43px] items-center border-t border-slate-50 mt-1">
            <div className="text-left pl-2">
              <span className="text-[13px] font-semibold text-slate-700">Coins</span>
            </div>
            <span />
            <div className="flex h-7 w-[54px] justify-self-center items-center justify-center rounded-[7px] border border-slate-200 bg-white text-[11px] font-semibold text-slate-800">
              {coinsPaise > 0 ? formatMoney(coinsPaise) : "₹0.00"}
            </div>
            <span className="place-self-center text-[16px] font-bold leading-none text-slate-600">=</span>
            <div className="text-center">
              <span className="text-[11px] font-semibold text-slate-700">{formatMoney(coinsPaise)}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between rounded-[12px] bg-emerald-50 px-3 py-3">
            <span className="text-[11px] font-semibold text-slate-600">Total Cash</span>
            <span className="text-[17px] font-bold text-[#047857]">{formatMoney(totalCashPaise)}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export const UpiBreakdownModal = ({ upiCollection, totalUpiPaise, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[24px] bg-[#F3F4F6] p-2 shadow-xl">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-[16px] font-black text-slate-900">PhonePe Breakdown</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mt-2 rounded-[18px] bg-white p-2 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="overflow-hidden rounded-[14px] border border-slate-200">
            <div className="grid grid-cols-[42px_1fr_1fr] items-center gap-2 bg-slate-50 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.04em] text-slate-500">
              <span>TRX</span>
              <span className="text-center">TIME</span>
              <span className="text-right">AMOUNT</span>
            </div>
            
            <div className="grid grid-cols-[42px_1fr_1fr] items-center gap-2 border-t border-slate-100 px-3 py-3">
              <span className="text-[12px] font-semibold text-slate-700">First</span>
              <div className="flex h-[36px] items-center justify-center rounded-[8px] bg-white border border-slate-100 text-[12px] font-semibold text-slate-900">
                {upiCollection?.firstTransactionTime || "-"}
              </div>
              <div className="flex h-[36px] items-center justify-end rounded-[8px] bg-white border border-slate-100 px-2.5 text-[12px] font-semibold text-slate-900">
                {upiCollection?.firstTransactionAmountPaise != null ? formatMoney(upiCollection.firstTransactionAmountPaise) : "-"}
              </div>
            </div>

            <div className="grid grid-cols-[42px_1fr_1fr] items-center gap-2 border-t border-slate-100 px-3 py-3">
              <span className="text-[12px] font-semibold text-slate-700">Last</span>
              <div className="flex h-[36px] items-center justify-center rounded-[8px] bg-white border border-slate-100 text-[12px] font-semibold text-slate-900">
                {upiCollection?.lastTransactionTime || "-"}
              </div>
              <div className="flex h-[36px] items-center justify-end rounded-[8px] bg-white border border-slate-100 px-2.5 text-[12px] font-semibold text-slate-900">
                {upiCollection?.lastTransactionAmountPaise != null ? formatMoney(upiCollection.lastTransactionAmountPaise) : "-"}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[12px] bg-emerald-50 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-emerald-700">Total Collection</span>
            <span className="text-[17px] font-bold text-[#047857]">{formatMoney(totalUpiPaise)}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export const CardBreakdownModal = ({ atmEntries = [], totalCardPaise = 0, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[24px] bg-[#F3F4F6] p-2 shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <h2 className="text-[16px] font-black text-slate-900">Card / ATM Breakdown</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mt-2 rounded-[18px] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col min-h-0 border border-slate-100">
          <div className="flex items-center justify-between px-4 py-4 shrink-0 bg-white z-10 border-b border-slate-100">
            <div>
              <p className="text-[13px] font-bold text-slate-900">This Shift</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                {atmEntries.length} {atmEntries.length === 1 ? "entry" : "entries"}
              </p>
            </div>
            <p className="text-[16px] font-bold text-[#047857]">{formatMoney(totalCardPaise)}</p>
          </div>

          <div className="overflow-y-auto px-4 py-2">
            {atmEntries.length > 0 ? atmEntries.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-[12px] font-semibold text-slate-700">{entry.time}</p>
                  <p className="mt-0.5 text-[9px] font-medium text-slate-400">ATM</p>
                </div>
                <p className="text-[13px] font-bold text-slate-900">{formatMoney(entry.amountPaise)}</p>
              </div>
            )) : (
              <div className="text-center py-6 text-[12px] text-slate-400 italic">No ATM entries</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export const UdhariBreakdownModal = ({ udhariTransactions = [], totalUdhariPaise = 0, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[24px] bg-[#F3F4F6] p-2 shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <h2 className="text-[16px] font-black text-slate-900">Udhari Breakdown</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mt-2 rounded-[18px] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col min-h-0 border border-slate-100">
          <div className="flex items-center justify-between px-4 py-4 shrink-0 bg-white z-10 border-b border-slate-100">
            <div>
              <p className="text-[13px] font-bold text-slate-900">This Shift</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                {udhariTransactions.length} {udhariTransactions.length === 1 ? "entry" : "entries"}
              </p>
            </div>
            <p className="text-[16px] font-bold text-[#047857]">{formatMoney(totalUdhariPaise)}</p>
          </div>

          <div className="overflow-y-auto px-4 py-2">
            {udhariTransactions.length > 0 ? udhariTransactions.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div className="min-w-0 pr-4">
                  <p className="text-[12px] font-semibold text-slate-700 truncate">{tx.customerId?.name || "Unknown Customer"}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                    Slip: {tx.slipNumber || "-"} • {tx.vehicleNumber || "No Vehicle"}
                  </p>
                </div>
                <p className="text-[13px] font-bold text-slate-900 shrink-0">{formatMoney(tx.amountPaise)}</p>
              </div>
            )) : (
              <div className="text-center py-6 text-[12px] text-slate-400 italic">No Udhari entries</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
