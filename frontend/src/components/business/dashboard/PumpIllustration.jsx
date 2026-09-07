const PumpIllustration = () => {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-emerald-200 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white p-4 shadow-[0_10px_28px_rgba(16,185,129,0.12)]">
      <div className="absolute -right-8 -top-6 h-24 w-24 rounded-full bg-emerald-200/50 blur-2xl" />
      <div className="absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-amber-200/50 blur-2xl" />

      <div className="relative flex h-28 items-end justify-center">
        <div className="relative h-20 w-16 rounded-t-[18px] border-4 border-slate-800 bg-white shadow-inner">
          <div className="absolute inset-x-2 top-3 h-3 rounded-full bg-emerald-500" />
          <div className="absolute inset-x-2 bottom-3 h-7 rounded-b-[10px] bg-slate-900/5" />
        </div>

        <div className="absolute bottom-0 left-1/2 h-12 w-24 -translate-x-1/2 rounded-t-[20px] bg-emerald-600" />
        <div className="absolute bottom-0 left-1/2 h-6 w-16 -translate-x-1/2 rounded-t-[12px] bg-emerald-700" />
      </div>
    </div>
  );
};

export default PumpIllustration;
