const UpiCollection = ({ upi, onUpiChange, onSavedMessage }) => {
  return (
    <section className="mt-4 rounded-[20px] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <p className="text-[16px] font-bold text-slate-900">UPI Collection</p>

      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        Enter the total UPI amount received so far.
      </p>

      <div className="mt-5 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          Total UPI
        </p>

        <div className="mt-1 flex items-center">
          <span className="mr-2 text-[20px] font-bold text-slate-400">₹</span>

          <input
            type="text"
            inputMode="decimal"
            value={upi}
            onChange={(event) => {
              onUpiChange(event.target.value);
              onSavedMessage("");
            }}
            placeholder="0.00"
            className="
              min-w-0
              flex-1
              bg-transparent
              text-[22px]
              font-bold
              text-slate-900
              outline-none
            "
          />
        </div>
      </div>
    </section>
  );
};

export default UpiCollection;
