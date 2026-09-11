const formatShiftStart = (startedAt) => {
  if (!startedAt) return "";

  return new Date(
    startedAt,
  ).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const EmployeeShiftHeader = ({ shift, user, onBack }) => {
  const employeeName = user?.name || user?.employeeId || "Employee";

  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="
          grid
          h-9
          w-9
          shrink-0
          place-items-center
          rounded-[12px]
          bg-white
          text-slate-700
          shadow-[0_2px_8px_rgba(15,23,42,0.06)]
        "
        aria-label="Back"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-none tracking-[-0.02em] text-slate-900">
            {shift?.mpdId?.mpdNumber || "MPD"}
          </p>
          <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            {formatShiftStart(shift?.startedAt)}
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[#047857]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5.5 19c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="max-w-[95px] truncate text-[10px] font-semibold leading-none text-slate-900">
              {employeeName}
            </p>
            <p className="mt-1 text-[7px] font-medium uppercase tracking-[0.05em] text-slate-400">
              Employee
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default EmployeeShiftHeader;