import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ManagerLayout from "./ManagerLayout";
import api from "../../services/api";

const Settings = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stationConfig, setStationConfig] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        const response = await api.get("/manager/operations", {
           params: { date: new Date().toISOString().slice(0, 10) }
        });
        if (mounted) {
           setStationConfig(response.data);
        }
      } catch {
        if (mounted) {
           setError("Unable to load settings data.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadConfig();
    return () => { mounted = false; };
  }, []);

  return (
    <ManagerLayout title="Settings" showBack onBack={() => navigate(-1)}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-[14px] border border-red-100 bg-red-50 p-3 text-[11px] font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-24 rounded-[18px] bg-white" />
            <div className="h-32 rounded-[18px] bg-white" />
          </div>
        ) : !error && (
          <>
            <section className="rounded-[16px] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <h2 className="text-[12px] font-bold text-slate-900">Station Identity</h2>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                   <span className="text-[10px] text-slate-500">Name</span>
                   <span className="text-[10px] font-bold text-slate-800">Shobhadamodar Petroleum</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                   <span className="text-[10px] text-slate-500">Active MPDs</span>
                   <span className="text-[10px] font-bold text-slate-800">{(stationConfig?.mpds || []).length}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[16px] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <h2 className="text-[12px] font-bold text-slate-900">MPDs & Nozzles</h2>
              <div className="mt-3 space-y-3">
                {(stationConfig?.mpds || []).map(mpd => (
                  <div key={mpd._id} className="rounded-[12px] bg-slate-50 p-3">
                    <p className="text-[10px] font-bold text-slate-800">{mpd.mpdNumber}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                       {mpd.nozzles.map(n => (
                         <div key={n._id} className="rounded-[8px] bg-white p-2 border border-slate-100">
                            <span className="block text-[8px] text-slate-400">{n.nozzleNumber}</span>
                            <span className="block text-[10px] font-bold text-slate-700">{n.fuelType}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[16px] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-bold text-slate-900">Tanks Configuration</h2>
                <button
                  type="button"
                  onClick={() => navigate("/manager/stock", { state: { tab: "rates" } })}
                  className="rounded-[8px] bg-bpcl-emerald/10 px-3 py-1.5 text-[9px] font-bold text-bpcl-emerald active:bg-bpcl-emerald/20"
                >
                  Manage Tanks
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                View and edit physical tank dimensions, capacity, and active status through the Stock module.
              </p>
            </section>

          </>
        )}
      </div>
    </ManagerLayout>
  );
};

export default Settings;
