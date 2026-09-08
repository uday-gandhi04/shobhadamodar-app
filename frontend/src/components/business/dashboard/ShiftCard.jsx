const ShiftCard = ({ shift }) => {
  const mpdName =
    shift?.mpdId?.mpdNumber ||
    shift?.mpdId?.name ||
    'MPD';

  const shiftLabel =
    shift?.shiftType === 'MORNING'
      ? 'Morning Shift'
      : shift?.shiftType === 'EVENING'
        ? 'Evening Shift'
        : 'Night Shift';

  return (
    <section className="relative mt-6 overflow-hidden rounded-[24px] bg-[#047857] p-5 text-white shadow-[0_12px_28px_rgba(4,120,87,0.20)]">
      {/* Decorative circles */}
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/[0.06]"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-emerald-900/20"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium text-emerald-100">
              Current Shift
            </p>

            <h2 className="mt-1 text-[21px] font-semibold">
              {mpdName}
            </h2>

            <p className="mt-1 text-[12px] text-emerald-100">
              {shiftLabel}
            </p>
          </div>

          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold">
            ● Active
          </span>
        </div>

        <div className="mt-6">
          <p className="text-[12px] text-emerald-100">
            Today&apos;s Sale
          </p>

          <p className="mt-1 text-[32px] font-bold">
            —
          </p>
        </div>
      </div>
    </section>
  );
};

export default ShiftCard;