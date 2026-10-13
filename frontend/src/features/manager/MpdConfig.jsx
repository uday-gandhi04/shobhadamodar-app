import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ManagerLayout from "./ManagerLayout";
import {
  getManagerMpds,
  createManagerMpd,
  updateManagerMpd,
  deleteManagerMpd,
  addManagerMpdNozzle,
  updateManagerMpdNozzle,
  deleteManagerMpdNozzle,
} from "../../services/managerMpdApi";

const MpdConfig = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mpds, setMpds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Modal states
  const [mpdModalOpen, setMpdModalOpen] = useState(false);
  const [editingMpd, setEditingMpd] = useState(null);
  const [mpdForm, setMpdForm] = useState({
    mpdNumber: "",
    serialNumber: "",
    nozzleCount: 4,
    isActive: true,
  });

  const [nozzleModalOpen, setNozzleModalOpen] = useState(false);
  const [targetMpd, setTargetMpd] = useState(null);
  const [editingNozzle, setEditingNozzle] = useState(null);
  const [nozzleForm, setNozzleForm] = useState({
    nozzleId: "",
    name: "",
    nozzleNumber: 1,
    fuelType: "PETROL",
    currentCumulativeReading: 0,
    isActive: true,
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingNozzleId, setUpdatingNozzleId] = useState(null);

  const loadMpds = async () => {
    try {
      const res = await getManagerMpds();
      if (res?.data) {
        setMpds(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || t("manager.mpdConfig.loadError", "Unable to load MPD configuration."));
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchMpds = async () => {
      try {
        const res = await getManagerMpds();
        if (mounted && res?.data) {
          setMpds(res.data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || t("manager.mpdConfig.loadError", "Unable to load MPD configuration."));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchMpds();
    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  // Open MPD dialog for add or edit
  const openMpdDialog = (mpd = null) => {
    setEditingMpd(mpd);
    if (mpd) {
      setMpdForm({
        mpdNumber: mpd.mpdNumber,
        serialNumber: mpd.serialNumber || "",
        nozzleCount: mpd.nozzles?.length || 4,
        isActive: mpd.isActive,
      });
    } else {
      setMpdForm({
        mpdNumber: `MPD ${mpds.length + 1}`,
        serialNumber: "",
        nozzleCount: 4,
        isActive: true,
      });
    }
    setMpdModalOpen(true);
  };

  const saveMpd = async (e) => {
    e.preventDefault();
    if (!mpdForm.mpdNumber.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      if (editingMpd) {
        await updateManagerMpd(editingMpd._id, {
          mpdNumber: mpdForm.mpdNumber.trim(),
          serialNumber: mpdForm.serialNumber.trim(),
          isActive: mpdForm.isActive,
        });
        setNotice(t("manager.mpdConfig.savedSuccessfully", "Configuration saved successfully."));
      } else {
        await createManagerMpd({
          mpdNumber: mpdForm.mpdNumber.trim(),
          serialNumber: mpdForm.serialNumber.trim() || undefined,
          nozzleCount: Number(mpdForm.nozzleCount) || 4,
        });
        setNotice(t("manager.mpdConfig.savedSuccessfully", "Configuration saved successfully."));
      }
      setMpdModalOpen(false);
      setEditingMpd(null);
      await loadMpds();
    } catch (err) {
      setError(err.response?.data?.message || t("manager.mpdConfig.saveError", "Failed to save MPD."));
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle MPD active status
  const toggleMpdStatus = (mpd) => {
    if (mpd.hasActiveShift) {
      setError(t("manager.mpdConfig.shiftInProgressDesc", { employee: mpd.activeShift?.employeeName || "Employee" }));
      return;
    }
    const newStatus = !mpd.isActive;
    setConfirmDialog({
      title: newStatus ? t("manager.mpdConfig.activate") : t("manager.mpdConfig.deactivate"),
      message: newStatus
        ? `Activate ${mpd.mpdNumber}? It will become available for shifts.`
        : t("manager.mpdConfig.confirmDeactivate", { name: mpd.mpdNumber }),
      actionLabel: newStatus ? t("manager.mpdConfig.activate") : t("manager.mpdConfig.deactivate"),
      isDestructive: !newStatus,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await updateManagerMpd(mpd._id, { isActive: newStatus });
          setNotice(newStatus ? t("manager.mpdConfig.activatedSuccessfully") : t("manager.mpdConfig.deactivatedSuccessfully"));
          await loadMpds();
        } catch (err) {
          setError(err.response?.data?.message || "Failed to update MPD status.");
        } finally {
          setSubmitting(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // Delete MPD
  const handleDeleteMpd = (mpd) => {
    if (mpd.hasActiveShift) {
      setError(t("manager.mpdConfig.shiftInProgressDesc", { employee: mpd.activeShift?.employeeName || "Employee" }));
      return;
    }
    if (mpd.hasHistoricalShifts) {
      setError(t("manager.mpdConfig.deleteHistoricalWarning", "This MPD has historical records and cannot be permanently deleted. Please deactivate it instead."));
      return;
    }
    setConfirmDialog({
      title: t("manager.mpdConfig.delete"),
      message: t("manager.mpdConfig.confirmDelete", { name: mpd.mpdNumber }),
      actionLabel: t("manager.mpdConfig.delete"),
      isDestructive: true,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await deleteManagerMpd(mpd._id);
          setNotice(t("manager.mpdConfig.deletedSuccessfully"));
          await loadMpds();
        } catch (err) {
          setError(err.response?.data?.message || "Failed to delete MPD.");
        } finally {
          setSubmitting(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // Open nozzle dialog for add or edit
  const openNozzleDialog = (mpd, nozzle = null) => {
    if (mpd.hasActiveShift) {
      setError(t("manager.mpdConfig.shiftInProgressDesc", { employee: mpd.activeShift?.employeeName || "Employee" }));
      return;
    }
    setTargetMpd(mpd);
    setEditingNozzle(nozzle);
    if (nozzle) {
      setNozzleForm({
        nozzleId: nozzle.nozzleId,
        name: nozzle.name,
        nozzleNumber: nozzle.nozzleNumber || 1,
        fuelType: nozzle.fuelType,
        currentCumulativeReading: nozzle.currentCumulativeReading ?? 0,
        isActive: nozzle.isActive,
      });
    } else {
      const nextNum = (mpd.nozzles?.length || 0) + 1;
      setNozzleForm({
        nozzleId: `n${nextNum}`,
        name: `Nozzle ${nextNum}`,
        nozzleNumber: nextNum,
        fuelType: "PETROL",
        currentCumulativeReading: 0,
        isActive: true,
      });
    }
    setNozzleModalOpen(true);
  };

  const saveNozzle = async (e) => {
    e.preventDefault();
    if (!targetMpd) return;
    setSubmitting(true);
    setError("");
    try {
      if (editingNozzle) {
        await updateManagerMpdNozzle(targetMpd._id, editingNozzle.nozzleId, {
          name: nozzleForm.name.trim(),
          nozzleNumber: Number(nozzleForm.nozzleNumber),
          fuelType: nozzleForm.fuelType,
          isActive: nozzleForm.isActive,
          currentCumulativeReading: Number(nozzleForm.currentCumulativeReading) || 0,
        });
        setNotice(t("manager.mpdConfig.savedSuccessfully"));
      } else {
        await addManagerMpdNozzle(targetMpd._id, {
          nozzleId: nozzleForm.nozzleId.trim(),
          name: nozzleForm.name.trim(),
          nozzleNumber: Number(nozzleForm.nozzleNumber),
          fuelType: nozzleForm.fuelType,
          currentCumulativeReading: Number(nozzleForm.currentCumulativeReading) || 0,
          isActive: nozzleForm.isActive,
        });
        setNotice(t("manager.mpdConfig.savedSuccessfully"));
      }
      setNozzleModalOpen(false);
      setEditingNozzle(null);
      setTargetMpd(null);
      await loadMpds();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save nozzle.");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick fuel type change from table dropdown
  const handleQuickFuelChange = async (mpd, nozzle, newFuelType) => {
    if (mpd.hasActiveShift) {
      setError(t("manager.mpdConfig.shiftInProgressDesc", { employee: mpd.activeShift?.employeeName || "Employee" }));
      return;
    }
    if (nozzle.fuelType === newFuelType) return;
    setUpdatingNozzleId(`${mpd._id}_${nozzle.nozzleId}`);
    setError("");
    try {
      await updateManagerMpdNozzle(mpd._id, nozzle.nozzleId, {
        fuelType: newFuelType,
      });
      setNotice(t("manager.mpdConfig.savedSuccessfully"));
      await loadMpds();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reassign fuel type.");
    } finally {
      setUpdatingNozzleId(null);
    }
  };

  // Toggle nozzle active status
  const toggleNozzleStatus = async (mpd, nozzle) => {
    if (mpd.hasActiveShift) {
      setError(t("manager.mpdConfig.shiftInProgressDesc", { employee: mpd.activeShift?.employeeName || "Employee" }));
      return;
    }
    const newStatus = !nozzle.isActive;
    setUpdatingNozzleId(`${mpd._id}_${nozzle.nozzleId}`);
    setError("");
    try {
      await updateManagerMpdNozzle(mpd._id, nozzle.nozzleId, {
        isActive: newStatus,
      });
      setNotice(newStatus ? t("manager.mpdConfig.activatedSuccessfully") : t("manager.mpdConfig.deactivatedSuccessfully"));
      await loadMpds();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update nozzle status.");
    } finally {
      setUpdatingNozzleId(null);
    }
  };

  // Delete nozzle
  const handleDeleteNozzle = (mpd, nozzle) => {
    if (mpd.hasActiveShift) {
      setError(t("manager.mpdConfig.shiftInProgressDesc", { employee: mpd.activeShift?.employeeName || "Employee" }));
      return;
    }
    if (nozzle.hasHistoricalReadings) {
      setError(t("manager.mpdConfig.deleteHistoricalWarning", "This nozzle has historical records and cannot be permanently deleted. Please deactivate it instead."));
      return;
    }
    setConfirmDialog({
      title: t("manager.mpdConfig.delete"),
      message: t("manager.mpdConfig.confirmDelete", { name: `${nozzle.name} (${nozzle.nozzleId})` }),
      actionLabel: t("manager.mpdConfig.delete"),
      isDestructive: true,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await deleteManagerMpdNozzle(mpd._id, nozzle.nozzleId);
          setNotice(t("manager.mpdConfig.deletedSuccessfully"));
          await loadMpds();
        } catch (err) {
          setError(err.response?.data?.message || "Failed to delete nozzle.");
        } finally {
          setSubmitting(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  return (
    <ManagerLayout
      title={t("manager.mpdConfig.title", "MPD & Nozzle Configuration")}
      showBack
      onBack={() => navigate("/manager/settings")}
    >
      <div className="!space-y-4 !pb-12">
        {/* TOP ACTION BAR */}
        <div className="!flex !items-start !justify-between !gap-3">
          <div>
            <h1 className="!text-[20px] !font-black !tracking-tight !text-slate-900 !m-0 !leading-snug">
              {t("manager.mpdConfig.title", "MPD & Nozzle Configuration")}
            </h1>
            <p className="!mt-1 !text-[11px] !leading-relaxed !font-medium !text-slate-500 !m-0">
              {t("manager.mpdConfig.subtitle", "Configure multi-product dispensers, nozzle mappings, and fuel assignments.")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openMpdDialog()}
            className="!shrink-0 !flex !items-center !gap-1.5 !rounded-[12px] !bg-emerald-800 hover:!bg-emerald-700 active:!scale-95 !px-3.5 !py-2.5 !text-[11px] !font-bold !text-white !shadow-[0_4px_12px_rgba(4,120,87,0.2)] !transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-3.5 !w-3.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t("manager.mpdConfig.addMpd", "Add MPD")}</span>
          </button>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="!grid !grid-cols-3 !gap-2.5">
          <div className="!rounded-[16px] !border !border-emerald-100 !bg-emerald-50/70 !p-3 !text-center !shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <p className="!text-[9px] !font-bold !uppercase !tracking-wider !text-emerald-700 !m-0">Total MPDs</p>
            <p className="!text-[18px] !font-black !text-emerald-950 !mt-0.5 !m-0">{mpds.length}</p>
          </div>
          <div className="!rounded-[16px] !border !border-sky-100 !bg-sky-50/70 !p-3 !text-center !shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <p className="!text-[9px] !font-bold !uppercase !tracking-wider !text-sky-700 !m-0">Total Nozzles</p>
            <p className="!text-[18px] !font-black !text-sky-950 !mt-0.5 !m-0">
              {mpds.reduce((acc, m) => acc + (m.nozzles?.length || 0), 0)}
            </p>
          </div>
          <div className="!rounded-[16px] !border !border-slate-100 !bg-white !p-3 !text-center !shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <p className="!text-[9px] !font-bold !uppercase !tracking-wider !text-slate-500 !m-0">Active</p>
            <p className="!text-[18px] !font-black !text-slate-800 !mt-0.5 !m-0">
              {mpds.filter((m) => m.isActive).length}
            </p>
          </div>
        </div>

        {/* NOTICES & ALERTS */}
        {notice && (
          <div className="!rounded-[14px] !bg-emerald-50 !p-3.5 !border !border-emerald-100 !flex !items-center !gap-2.5">
            <span className="!h-5 !w-5 !shrink-0 !rounded-full !bg-emerald-200 !text-emerald-700 !flex !items-center !justify-center !text-[10px] !font-bold">✓</span>
            <p className="!text-[12px] !font-bold !text-emerald-800 !m-0">{notice}</p>
          </div>
        )}

        {error && (
          <div className="!rounded-[14px] !bg-rose-50 !p-3.5 !border !border-rose-100 !flex !items-center !justify-between !gap-2.5">
            <div className="!flex !items-center !gap-2.5 !min-w-0">
              <span className="!h-5 !w-5 !shrink-0 !rounded-full !bg-rose-200 !text-rose-700 !flex !items-center !justify-center !text-[10px] !font-bold">!</span>
              <p className="!text-[12px] !font-bold !text-rose-800 !m-0 !truncate">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="!text-[12px] !font-bold !text-rose-600 hover:!text-rose-800 !px-1.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading ? (
          <div className="!space-y-4 !animate-pulse">
            <div className="!h-48 !rounded-[20px] !bg-white !shadow-sm !border !border-slate-100" />
            <div className="!h-48 !rounded-[20px] !bg-white !shadow-sm !border !border-slate-100" />
          </div>
        ) : mpds.length === 0 ? (
          <div className="!rounded-[20px] !bg-white !p-8 !text-center !border !border-slate-100 !shadow-sm">
            <div className="!mx-auto !flex !h-12 !w-12 !items-center !justify-center !rounded-[14px] !bg-slate-50 !text-slate-400 !mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="!h-6 !w-6">
                <rect x="2" y="2" width="20" height="8" rx="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" />
              </svg>
            </div>
            <p className="!text-[13px] !font-bold !text-slate-700 !m-0">
              {t("manager.mpdConfig.noMpdsFound", "No MPDs configured yet.")}
            </p>
            <p className="!text-[11px] !font-medium !text-slate-400 !mt-1 !m-0">
              Click &quot;Add MPD&quot; above to set up your first dispenser unit.
            </p>
          </div>
        ) : (
          /* MPD LIST */
          <div className="!space-y-4">
            {mpds.map((mpd) => (
              <section
                key={mpd._id}
                className="!rounded-[20px] !bg-white !p-4 !shadow-[0_4px_20px_rgba(15,23,42,0.03)] !border !border-slate-100 !space-y-4"
              >
                {/* MPD HEADER */}
                <div className="!flex !flex-col sm:!flex-row sm:!items-center !justify-between !gap-3 !pb-3 !border-b !border-slate-100">
                  <div className="!flex !items-center !gap-3 !min-w-0">
                    <div
                      className={`!flex !h-10 !w-10 !shrink-0 !items-center !justify-center !rounded-[12px] ${
                        mpd.isActive ? "!bg-emerald-50 !text-emerald-700" : "!bg-slate-100 !text-slate-400"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5">
                        <rect x="2" y="2" width="20" height="8" rx="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" />
                        <line x1="6" y1="18" x2="6.01" y2="18" />
                      </svg>
                    </div>
                    <div className="!min-w-0">
                      <div className="!flex !items-center !gap-2 !flex-wrap">
                        <h2 className="!text-[15px] !font-black !text-slate-900 !tracking-tight !m-0 !truncate">
                          {mpd.mpdNumber}
                        </h2>
                        {mpd.isActive ? (
                          <span className="!inline-flex !items-center !text-[10px] !font-bold !text-emerald-700 !bg-emerald-50 !px-2.5 !py-0.5 !rounded-full !border !border-emerald-100/60">
                            {t("manager.mpdConfig.active", "Active")}
                          </span>
                        ) : (
                          <span className="!inline-flex !items-center !text-[10px] !font-bold !text-slate-600 !bg-slate-100 !px-2.5 !py-0.5 !rounded-full !border !border-slate-200/60">
                            {t("manager.mpdConfig.inactive", "Inactive")}
                          </span>
                        )}
                        {mpd.hasActiveShift && (
                          <span className="!inline-flex !items-center !gap-1 !text-[9px] !font-bold !text-amber-800 !bg-amber-100 !px-2 !py-0.5 !rounded-full">
                            <span>●</span> {t("manager.mpdConfig.shiftInProgress", "Shift In Progress")}
                          </span>
                        )}
                      </div>
                      {mpd.serialNumber && (
                        <p className="!text-[11px] !font-mono !font-medium !text-slate-400 !mt-0.5 !m-0">
                          S/N: {mpd.serialNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* MPD ACTIONS */}
                  <div className="!flex !items-center !gap-1.5 !self-start sm:!self-auto">
                    <button
                      type="button"
                      disabled={mpd.hasActiveShift}
                      onClick={() => openMpdDialog(mpd)}
                      className={`!text-[11px] !font-bold !px-3 !py-1.5 !rounded-[10px] !border !transition-all ${
                        mpd.hasActiveShift
                          ? "!opacity-50 !cursor-not-allowed !bg-slate-50 !text-slate-400 !border-slate-100"
                          : "!bg-slate-50 hover:!bg-slate-100 !text-slate-700 !border-slate-200/80 active:!scale-95"
                      }`}
                    >
                      {t("manager.mpdConfig.editMpd", "Edit MPD")}
                    </button>
                    <button
                      type="button"
                      disabled={mpd.hasActiveShift}
                      onClick={() => toggleMpdStatus(mpd)}
                      className={`!text-[11px] !font-bold !px-3 !py-1.5 !rounded-[10px] !border !transition-all ${
                        mpd.hasActiveShift
                          ? "!opacity-50 !cursor-not-allowed !bg-slate-50 !text-slate-400 !border-slate-100"
                          : mpd.isActive
                            ? "!bg-amber-50 hover:!bg-amber-100 !text-amber-800 !border-amber-200 active:!scale-95"
                            : "!bg-emerald-50 hover:!bg-emerald-100 !text-emerald-800 !border-emerald-200 active:!scale-95"
                      }`}
                    >
                      {mpd.isActive ? t("manager.mpdConfig.deactivate", "Deactivate") : t("manager.mpdConfig.activate", "Activate")}
                    </button>
                    {!mpd.hasHistoricalShifts && (
                      <button
                        type="button"
                        disabled={mpd.hasActiveShift}
                        onClick={() => handleDeleteMpd(mpd)}
                        className={`!text-[11px] !font-bold !px-2.5 !py-1.5 !rounded-[10px] !border !transition-all ${
                          mpd.hasActiveShift
                            ? "!opacity-50 !cursor-not-allowed !bg-slate-50 !text-slate-400 !border-slate-100"
                            : "!bg-rose-50 hover:!bg-rose-100 !text-rose-700 !border-rose-200 active:!scale-95"
                        }`}
                      >
                        {t("manager.mpdConfig.delete", "Delete")}
                      </button>
                    )}
                  </div>
                </div>

                {/* ACTIVE SHIFT BANNER */}
                {mpd.hasActiveShift && (
                  <div className="!rounded-[14px] !bg-amber-50 !border !border-amber-200/80 !p-3 !flex !items-start !gap-2.5">
                    <span className="!text-amber-600 !mt-0.5 !text-[13px]">⚠️</span>
                    <p className="!text-[11px] !font-semibold !text-amber-900 !leading-relaxed !m-0">
                      {t("manager.mpdConfig.shiftInProgressDesc", {
                        employee: mpd.activeShift?.employeeName || "Employee",
                      })}
                    </p>
                  </div>
                )}

                {/* NOZZLES HEADER & CARDS */}
                <div className="!space-y-3">
                  <div className="!flex !items-center !justify-between !pt-1">
                    <div className="!flex !items-center !gap-2">
                      <span className="!text-[11px] !font-extrabold !uppercase !tracking-wider !text-slate-400">
                        {t("manager.mpdConfig.nozzles", "Nozzles")}
                      </span>
                      <span className="!rounded-full !bg-slate-100 !px-2 !py-0.5 !text-[10px] !font-extrabold !text-slate-600">
                        {mpd.nozzles?.length || 0}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={mpd.hasActiveShift}
                      onClick={() => openNozzleDialog(mpd)}
                      className={`!flex !items-center !gap-1.5 !rounded-[10px] !bg-emerald-50 hover:!bg-emerald-100 !border !border-emerald-200/60 !px-2.5 !py-1.5 !text-[11px] !font-bold !text-emerald-800 !transition-all ${
                        mpd.hasActiveShift ? "!opacity-50 !cursor-not-allowed" : "active:!scale-95"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="!h-3 !w-3">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>{t("manager.mpdConfig.addNozzle", "Add Nozzle")}</span>
                    </button>
                  </div>

                  {/* NOZZLE CARDS LIST */}
                  <div className="!space-y-2.5">
                    {mpd.nozzles?.map((n) => {
                      const isPetrol = n.fuelType === "PETROL";
                      const isUpdating = updatingNozzleId === `${mpd._id}_${n.nozzleId}`;
                      return (
                        <div
                          key={n._id || n.nozzleId}
                          className={`!rounded-[16px] !border !p-3.5 !transition-all ${
                            !n.isActive
                              ? "!bg-slate-50/50 !border-slate-200/60 !opacity-60"
                              : "!bg-slate-50/30 hover:!bg-slate-50 !border-slate-100/90"
                          }`}
                        >
                          {/* ROW 1: Identifier, Name & Status */}
                          <div className="!flex !items-center !justify-between !gap-2">
                            <div className="!flex !items-center !gap-2.5 !min-w-0">
                              <span
                                className={`!flex !h-7 !w-7 !shrink-0 !items-center !justify-center !rounded-[8px] !text-[10px] !font-black ${
                                  isPetrol
                                    ? "!bg-rose-100 !text-rose-700"
                                    : "!bg-sky-100 !text-sky-700"
                                }`}
                              >
                                {isPetrol ? "MS" : "HSD"}
                              </span>
                              <div className="!min-w-0">
                                <div className="!flex !items-center !gap-2">
                                  <p className="!text-[13px] !font-black !text-slate-900 !truncate !m-0">
                                    {n.name}
                                  </p>
                                  <span className="!font-mono !text-[10px] !font-bold !text-slate-500 !bg-white !border !border-slate-200/60 !px-1.5 !py-0.5 !rounded-[6px]">
                                    {n.nozzleId}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="!shrink-0">
                              {n.isActive ? (
                                <span className="!text-[9px] !font-bold !text-emerald-700 !bg-emerald-100/70 !px-2.5 !py-0.5 !rounded-full">
                                  {t("manager.mpdConfig.active", "Active")}
                                </span>
                              ) : (
                                <span className="!text-[9px] !font-bold !text-slate-500 !bg-slate-200/70 !px-2.5 !py-0.5 !rounded-full">
                                  {t("manager.mpdConfig.inactive", "Inactive")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ROW 2: Fuel Type Select & Cumulative Reading */}
                          <div className="!mt-2.5 !pt-2.5 !border-t !border-slate-200/50 !flex !flex-wrap !items-center !justify-between !gap-2">
                            {/* Fuel Select */}
                            <div className="!flex !items-center !gap-2">
                              <span className="!text-[10px] !font-bold !text-slate-400 !uppercase !tracking-wider">Fuel:</span>
                              <div className="!relative !inline-flex !items-center">
                                <select
                                  disabled={mpd.hasActiveShift || isUpdating}
                                  value={n.fuelType}
                                  onChange={(e) => handleQuickFuelChange(mpd, n, e.target.value)}
                                  className={`!appearance-none !rounded-[10px] !pl-2.5 !pr-7 !py-1 !text-[11px] !font-bold !border !transition-all focus:!outline-none ${
                                    isPetrol
                                      ? "!bg-rose-50 !text-rose-700 !border-rose-200/80 hover:!bg-rose-100/70"
                                      : "!bg-sky-50 !text-sky-700 !border-sky-200/80 hover:!bg-sky-100/70"
                                  } ${mpd.hasActiveShift ? "!cursor-not-allowed !opacity-60" : "!cursor-pointer"}`}
                                >
                                  <option value="PETROL">{t("manager.mpdConfig.petrol", "Petrol (MS)")}</option>
                                  <option value="DIESEL">{t("manager.mpdConfig.diesel", "Diesel (HSD)")}</option>
                                </select>
                                <svg viewBox="0 0 20 20" fill="currentColor" className={`!pointer-events-none !absolute !right-2 !h-3.5 !w-3.5 ${isPetrol ? "!text-rose-600" : "!text-sky-600"}`}>
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                              </div>
                              {isUpdating && <span className="!text-[10px] !text-slate-400 animate-spin">⏳</span>}
                            </div>

                            {/* Reading */}
                            <div className="!flex !items-center !gap-1.5">
                              <span className="!text-[10px] !font-bold !text-slate-400 !uppercase !tracking-wider">Reading:</span>
                              <span className="!font-mono !text-[12px] !font-black !text-slate-800">
                                {Number(n.currentCumulativeReading || 0).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                L
                              </span>
                            </div>
                          </div>

                          {/* ROW 3: Nozzle Action Buttons */}
                          <div className="!mt-2 !flex !items-center !justify-end !gap-1.5 !pt-2 !border-t !border-slate-200/40">
                            <button
                              type="button"
                              disabled={mpd.hasActiveShift}
                              onClick={() => openNozzleDialog(mpd, n)}
                              className={`!rounded-[8px] !bg-white hover:!bg-slate-100 !border !border-slate-200/80 !px-2.5 !py-1 !text-[10px] !font-bold !text-slate-700 !transition-all ${
                                mpd.hasActiveShift ? "!opacity-50 !cursor-not-allowed" : "active:!scale-95"
                              }`}
                            >
                              {t("manager.mpdConfig.edit", "Edit")}
                            </button>
                            <button
                              type="button"
                              disabled={mpd.hasActiveShift || isUpdating}
                              onClick={() => toggleNozzleStatus(mpd, n)}
                              className={`!rounded-[8px] !border !px-2.5 !py-1 !text-[10px] !font-bold !transition-all ${
                                mpd.hasActiveShift || isUpdating
                                  ? "!opacity-50 !cursor-not-allowed !bg-slate-50 !text-slate-400 !border-slate-100"
                                  : n.isActive
                                    ? "!bg-amber-50 hover:!bg-amber-100 !text-amber-800 !border-amber-200 active:!scale-95"
                                    : "!bg-emerald-50 hover:!bg-emerald-100 !text-emerald-800 !border-emerald-200 active:!scale-95"
                              }`}
                            >
                              {n.isActive ? t("manager.mpdConfig.deactivate", "Deactivate") : t("manager.mpdConfig.activate", "Activate")}
                            </button>
                            {!n.hasHistoricalReadings && (
                              <button
                                type="button"
                                disabled={mpd.hasActiveShift}
                                onClick={() => handleDeleteNozzle(mpd, n)}
                                className={`!rounded-[8px] !bg-rose-50 hover:!bg-rose-100 !border !border-rose-200 !px-2 !py-1 !text-[10px] !font-bold !text-rose-700 !transition-all ${
                                  mpd.hasActiveShift ? "!opacity-50 !cursor-not-allowed" : "active:!scale-95"
                                }`}
                              >
                                {t("manager.mpdConfig.delete", "Delete")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}

        {/* MODAL: ADD / EDIT MPD */}
        {mpdModalOpen && (
          <div className="!fixed !inset-0 !z-50 !flex !items-center !justify-center !bg-slate-900/40 !p-4 !backdrop-blur-sm">
            <div className="!w-full !max-w-[420px] !rounded-[24px] !border !border-slate-100 !bg-white !p-6 !shadow-[0_16px_40px_rgba(15,23,42,0.12)] !space-y-4">
              <div className="!flex !items-center !justify-between !border-b !border-slate-100 !pb-3">
                <h2 className="!text-[16px] !font-black !text-slate-900 !tracking-tight !m-0">
                  {editingMpd ? t("manager.mpdConfig.editMpd", "Edit MPD") : t("manager.mpdConfig.addMpd", "Add MPD")}
                </h2>
                <button
                  type="button"
                  onClick={() => setMpdModalOpen(false)}
                  className="!grid !h-8 !w-8 !place-items-center !rounded-[10px] !bg-slate-100 !text-slate-500 hover:!bg-slate-200 !transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="!h-4 !w-4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={saveMpd} className="!space-y-4">
                <div>
                  <label className="!block !text-[11px] !font-bold !text-slate-700 !mb-1.5">
                    {t("manager.mpdConfig.mpdNumber", "MPD Name / Number")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={mpdForm.mpdNumber}
                    onChange={(e) => setMpdForm({ ...mpdForm, mpdNumber: e.target.value })}
                    placeholder={t("manager.mpdConfig.mpdNumberPlaceholder", "e.g. MPD 3")}
                    className="!min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/80 !bg-slate-50 !px-4 !text-[13px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
                  />
                </div>

                <div>
                  <label className="!block !text-[11px] !font-bold !text-slate-700 !mb-1.5">
                    {t("manager.mpdConfig.serialNumber", "Serial Number (Optional)")}
                  </label>
                  <input
                    type="text"
                    value={mpdForm.serialNumber}
                    onChange={(e) => setMpdForm({ ...mpdForm, serialNumber: e.target.value })}
                    placeholder={t("manager.mpdConfig.serialNumberPlaceholder", "e.g. 14LB1583V")}
                    className="!min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/80 !bg-slate-50 !px-4 !text-[13px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
                  />
                </div>

                {!editingMpd && (
                  <div>
                    <label className="!block !text-[11px] !font-bold !text-slate-700 !mb-1.5">
                      {t("manager.mpdConfig.initialNozzles", "Number of Initial Nozzles")}
                    </label>
                    <select
                      value={mpdForm.nozzleCount}
                      onChange={(e) => setMpdForm({ ...mpdForm, nozzleCount: Number(e.target.value) })}
                      className="!min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/80 !bg-slate-50 !px-4 !text-[13px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
                    >
                      <option value={2}>2 Nozzles (1 Petrol, 1 Diesel)</option>
                      <option value={4}>4 Nozzles (2 Petrol, 2 Diesel)</option>
                      <option value={6}>6 Nozzles (3 Petrol, 3 Diesel)</option>
                      <option value={8}>8 Nozzles (4 Petrol, 4 Diesel)</option>
                    </select>
                  </div>
                )}

                {editingMpd && (
                  <div className="!flex !items-center !justify-between !pt-1">
                    <span className="!text-[12px] !font-bold !text-slate-700">
                      {t("manager.mpdConfig.status", "Status")}
                    </span>
                    <label className="!inline-flex !items-center !cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mpdForm.isActive}
                        onChange={(e) => setMpdForm({ ...mpdForm, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="!relative !w-11 !h-6 !bg-slate-200 peer-focus:!outline-none !rounded-full peer peer-checked:after:!translate-x-full peer-checked:after:!border-white after:!content-[''] after:!absolute after:!top-[2px] after:!left-[2px] after:!bg-white after:!border-slate-300 after:!border after:!rounded-full after:!h-5 after:!w-5 after:!transition-all peer-checked:!bg-emerald-600"></div>
                      <span className="!ml-2.5 !text-[12px] !font-bold !text-slate-700">
                        {mpdForm.isActive ? t("manager.mpdConfig.active") : t("manager.mpdConfig.inactive")}
                      </span>
                    </label>
                  </div>
                )}

                <div className="!flex !items-center !gap-3 !pt-2">
                  <button
                    type="button"
                    onClick={() => setMpdModalOpen(false)}
                    className="!min-h-[46px] !flex-1 !rounded-[14px] !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-[13px] !font-bold !transition-all !flex !items-center !justify-center"
                  >
                    {t("manager.mpdConfig.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="!min-h-[46px] !flex-1 !rounded-[14px] !bg-emerald-700 hover:!bg-emerald-800 !text-white !shadow-[0_4px_14px_rgba(5,150,105,0.2)] !text-[13px] !font-bold !transition-all !flex !items-center !justify-center disabled:!opacity-50"
                  >
                    {submitting ? "Saving..." : t("manager.mpdConfig.save", "Save Changes")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT NOZZLE */}
        {nozzleModalOpen && (
          <div className="!fixed !inset-0 !z-50 !flex !items-center !justify-center !bg-slate-900/40 !p-4 !backdrop-blur-sm">
            <div className="!w-full !max-w-[420px] !rounded-[24px] !border !border-slate-100 !bg-white !p-6 !shadow-[0_16px_40px_rgba(15,23,42,0.12)] !space-y-4">
              <div className="!flex !items-center !justify-between !border-b !border-slate-100 !pb-3">
                <div>
                  <h2 className="!text-[16px] !font-black !text-slate-900 !tracking-tight !m-0">
                    {editingNozzle ? t("manager.mpdConfig.editNozzle", "Edit Nozzle") : t("manager.mpdConfig.addNozzle", "Add Nozzle")}
                  </h2>
                  <p className="!text-[11px] !font-semibold !text-emerald-700 !m-0 !mt-0.5">
                    {targetMpd?.mpdNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNozzleModalOpen(false)}
                  className="!grid !h-8 !w-8 !place-items-center !rounded-[10px] !bg-slate-100 !text-slate-500 hover:!bg-slate-200 !transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="!h-4 !w-4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={saveNozzle} className="!space-y-4">
                {!editingNozzle && (
                  <div>
                    <label className="!block !text-[11px] !font-bold !text-slate-700 !mb-1.5">
                      {t("manager.mpdConfig.nozzleId", "Nozzle Identifier")} *
                    </label>
                    <input
                      type="text"
                      required
                      value={nozzleForm.nozzleId}
                      onChange={(e) => setNozzleForm({ ...nozzleForm, nozzleId: e.target.value })}
                      placeholder={t("manager.mpdConfig.nozzleIdPlaceholder", "e.g. n1")}
                      className="!min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/80 !bg-slate-50 !px-4 !text-[13px] !font-mono !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="!block !text-[11px] !font-bold !text-slate-700 !mb-1.5">
                    {t("manager.mpdConfig.nozzleName", "Nozzle Name / Label")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={nozzleForm.name}
                    onChange={(e) => setNozzleForm({ ...nozzleForm, name: e.target.value })}
                    placeholder={t("manager.mpdConfig.nozzleNamePlaceholder", "e.g. Nozzle 1 - Petrol")}
                    className="!min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/80 !bg-slate-50 !px-4 !text-[13px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
                  />
                </div>

                <div>
                  <label className="!block !text-[11px] !font-bold !text-slate-700 !mb-1.5">
                    {t("manager.mpdConfig.fuelType", "Fuel Type")} *
                  </label>
                  <select
                    value={nozzleForm.fuelType}
                    onChange={(e) => setNozzleForm({ ...nozzleForm, fuelType: e.target.value })}
                    className="!min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/80 !bg-slate-50 !px-4 !text-[13px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
                  >
                    <option value="PETROL">{t("manager.mpdConfig.petrol", "Petrol (MS)")}</option>
                    <option value="DIESEL">{t("manager.mpdConfig.diesel", "Diesel (HSD)")}</option>
                  </select>
                </div>

                <div>
                  <label className="!block !text-[11px] !font-bold !text-slate-700 !mb-1.5">
                    {t("manager.mpdConfig.reading", "Current Cumulative Reading (Litres)")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={nozzleForm.currentCumulativeReading}
                    onChange={(e) => setNozzleForm({ ...nozzleForm, currentCumulativeReading: e.target.value })}
                    className="!min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/80 !bg-slate-50 !px-4 !text-[13px] !font-mono !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
                  />
                </div>

                <div className="!flex !items-center !justify-between !pt-1">
                  <span className="!text-[12px] !font-bold !text-slate-700">
                    {t("manager.mpdConfig.status", "Status")}
                  </span>
                  <label className="!inline-flex !items-center !cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nozzleForm.isActive}
                      onChange={(e) => setNozzleForm({ ...nozzleForm, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="!relative !w-11 !h-6 !bg-slate-200 peer-focus:!outline-none !rounded-full peer peer-checked:after:!translate-x-full peer-checked:after:!border-white after:!content-[''] after:!absolute after:!top-[2px] after:!left-[2px] after:!bg-white after:!border-slate-300 after:!border after:!rounded-full after:!h-5 after:!w-5 after:!transition-all peer-checked:!bg-emerald-600"></div>
                    <span className="!ml-2.5 !text-[12px] !font-bold !text-slate-700">
                      {nozzleForm.isActive ? t("manager.mpdConfig.active") : t("manager.mpdConfig.inactive")}
                    </span>
                  </label>
                </div>

                <div className="!flex !items-center !gap-3 !pt-2">
                  <button
                    type="button"
                    onClick={() => setNozzleModalOpen(false)}
                    className="!min-h-[46px] !flex-1 !rounded-[14px] !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-[13px] !font-bold !transition-all !flex !items-center !justify-center"
                  >
                    {t("manager.mpdConfig.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="!min-h-[46px] !flex-1 !rounded-[14px] !bg-emerald-700 hover:!bg-emerald-800 !text-white !shadow-[0_4px_14px_rgba(5,150,105,0.2)] !text-[13px] !font-bold !transition-all !flex !items-center !justify-center disabled:!opacity-50"
                  >
                    {submitting ? "Saving..." : t("manager.mpdConfig.save", "Save Changes")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRMATION DIALOG */}
        {confirmDialog && (
          <div className="!fixed !inset-0 !z-50 !flex !items-center !justify-center !bg-slate-900/40 !p-4 !backdrop-blur-sm">
            <div className="!w-full !max-w-[380px] !rounded-[24px] !border !border-slate-100 !bg-white !p-6 !shadow-[0_16px_40px_rgba(15,23,42,0.12)] !space-y-3">
              <h3 className="!text-[16px] !font-black !text-slate-900 !tracking-tight !m-0">
                {confirmDialog.title}
              </h3>
              <p className="!text-[12px] !font-medium !text-slate-600 !leading-relaxed !m-0">
                {confirmDialog.message}
              </p>
              <div className="!flex !items-center !gap-3 !pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="!min-h-[44px] !flex-1 !rounded-[14px] !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-[12px] !font-bold !transition-all !flex !items-center !justify-center"
                >
                  {t("manager.mpdConfig.cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmDialog.onConfirm}
                  className={`!min-h-[44px] !flex-1 !rounded-[14px] !text-[12px] !font-bold !text-white !transition-all !flex !items-center !justify-center ${
                    confirmDialog.isDestructive
                      ? "!bg-rose-600 hover:!bg-rose-700 !shadow-[0_4px_12px_rgba(225,29,72,0.2)]"
                      : "!bg-emerald-800 hover:!bg-emerald-700 !shadow-[0_4px_12px_rgba(4,120,87,0.2)]"
                  }`}
                >
                  {submitting ? "Processing..." : confirmDialog.actionLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
};

export default MpdConfig;
