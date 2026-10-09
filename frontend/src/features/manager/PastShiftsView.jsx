import { useEffect, useState } from "react";
import { getManagerMpdShifts } from "../../services/managerOperationsApi";

const formatMoney = (paise) => {
  const amount = Number(paise || 0) / 100;
  const sign = amount < 0 ? "-" : "";

  return `${sign}₹${Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PastShiftsView = ({ mpds, t, onOpenShift }) => {
  const [activeMpdId, setActiveMpdId] = useState(mpds.length > 0 ? mpds[0]._id : null);
  const [shifts, setShifts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!activeMpdId) return;

    const fetchShifts = async () => {
      try {
        setLoading(true);
        const response = await getManagerMpdShifts(activeMpdId, page, 10);
        if (page === 1) {
          setShifts(response.data.shifts);
        } else {
          setShifts(prev => [...prev, ...response.data.shifts]);
        }
        setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
      } catch (err) {
        console.error("Error fetching shifts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, [activeMpdId, page]);

  return (
    <div className="space-y-4">
      {mpds.length > 1 && (
        <div className="!flex !rounded-[14px] !bg-slate-50 !p-1 !mb-4">
          {mpds.map(mpd => (
            <button
              key={mpd._id}
              onClick={() => {
                setActiveMpdId(mpd._id);
                setPage(1);
                setShifts([]);
              }}
              className={`
                !flex-1
                !min-h-[38px]
                !rounded-[10px]
                !px-2
                !text-[12px]
                !font-bold
                !transition-all
                ${
                  activeMpdId === mpd._id
                    ? "!bg-emerald-800 !text-white !shadow-sm"
                    : "!text-slate-500 hover:!text-slate-700"
                }
              `}
            >
              {mpd.mpdNumber}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {shifts.length === 0 && !loading ? (
          <div className="rounded-[14px] bg-slate-50 p-6 text-center">
            <p className="text-[12px] font-medium text-slate-500">No past shifts found.</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <div
              key={shift._id}
              onClick={() => onOpenShift(shift._id)}
              className="group cursor-pointer rounded-[20px] border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)] hover:border-emerald-200 hover:shadow-[0_8px_30px_rgba(4,120,87,0.08)] transition-all duration-300"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <p className="text-[13px] font-black text-slate-900 truncate">{shift.employeeName}</p>
                </div>
                
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                    <span>{formatTime(shift.startedAt)}</span>
                    <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <span>{shift.endedAt ? formatTime(shift.endedAt) : "Active"}</span>
                  </div>
                </div>

                <div className="flex-1 text-right">
                  <p className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                    {formatDate(shift.businessDate)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200/60 rounded-[14px] bg-slate-50/80 p-3 border border-slate-100">
                <div className="flex flex-col items-center justify-center">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Petrol</p>
                  <p className="text-[13px] font-black text-slate-700">{shift.totalLitresPetrol.toFixed(2)} <span className="text-[10px] font-bold text-slate-400">L</span></p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Diesel</p>
                  <p className="text-[13px] font-black text-slate-700">{shift.totalLitresDiesel.toFixed(2)} <span className="text-[10px] font-bold text-slate-400">L</span></p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Collected</p>
                  <p className="text-[14px] font-black text-emerald-600">{formatMoney(shift.totalCollectedPaise)}</p>
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="py-4 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500"></div>
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={() => setPage(p => p + 1)}
            className="w-full rounded-[12px] border border-emerald-100 bg-emerald-50/50 py-3 text-[12px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            Load More Shifts
          </button>
        )}
      </div>
    </div>
  );
};

export default PastShiftsView;
