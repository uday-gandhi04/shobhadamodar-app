import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ManagerLayout from "./ManagerLayout";
import api from "../../services/api";

const Settings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stationConfig, setStationConfig] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        const response = await api.get("/manager/operations", {
          params: { date: new Date().toISOString().slice(0, 10) },
        });
        if (mounted) {
          setStationConfig(response.data);
        }
      } catch {
        if (mounted) {
          setError(t("manager.settingsLoadError", "Unable to load settings data."));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadConfig();
    return () => {
      mounted = false;
    };
  }, [t]);

  return (
    <ManagerLayout
      title={t("manager.settings", "Settings")}
      showBack
      onBack={() => navigate(-1)}
    >
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
            {/* STATION IDENTITY CARD */}
            <section className="rounded-[16px] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] border border-slate-100">
              <h2 className="text-[12px] font-bold text-slate-900">
                {t("manager.stationIdentity", "Station Identity")}
              </h2>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] text-slate-500">Name</span>
                  <span className="text-[10px] font-bold text-slate-800">
                    Shobhadamodar Petroleum
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] text-slate-500">Active MPDs</span>
                  <span className="text-[10px] font-bold text-slate-800">
                    {(stationConfig?.mpds || []).length}
                  </span>
                </div>
              </div>
            </section>

            {/* MPD & NOZZLE CONFIGURATION CARD */}
            <section className="rounded-[16px] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-extrabold text-slate-900">
                    {t("manager.mpdConfig.cardTitle", "MPD & Nozzle Configuration")}
                  </h2>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                    {t("manager.mpdConfig.cardDesc", "Manage dispenser units, nozzle numbers, and assigned fuel types (MS & HSD).")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/manager/settings/mpds")}
                  className="rounded-[10px] bg-emerald-800 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                >
                  {t("manager.mpdConfig.manageMpd", "Configure MPDs & Nozzles")}
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {(stationConfig?.mpds || []).map((mpd) => (
                  <div key={mpd._id} className="rounded-[12px] bg-slate-50 p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-bold text-slate-800">{mpd.mpdNumber}</p>
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {mpd.nozzles?.length || 0} Nozzles
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {mpd.nozzles?.map((n) => (
                        <div
                          key={n._id}
                          className="rounded-[8px] bg-white p-2 border border-slate-100 flex items-center justify-between"
                        >
                          <div>
                            <span className="block text-[8px] text-slate-400 font-mono">
                              {n.nozzleNumber || n.nozzleId}
                            </span>
                            <span className="block text-[10px] font-bold text-slate-800">
                              {n.name || n.nozzleId}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                              n.fuelType === "PETROL"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-sky-50 text-sky-700"
                            }`}
                          >
                            {n.fuelType === "PETROL" ? "Petrol" : "Diesel"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* TANKS CONFIGURATION CARD */}
            <section className="rounded-[16px] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-extrabold text-slate-900">
                    {t("manager.tanksConfig", "Tanks Configuration")}
                  </h2>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                    {t(
                      "manager.tanksConfigDesc",
                      "View and edit physical tank dimensions, capacity, and active status."
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/manager/stock", { state: { tab: "stock" } })}
                  className="rounded-[10px] bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition"
                >
                  {t("manager.stockLabels.manageTanks", "Manage Tanks")}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </ManagerLayout>
  );
};

export default Settings;
