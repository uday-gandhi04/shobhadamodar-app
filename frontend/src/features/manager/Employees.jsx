import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ManagerLayout from "./ManagerLayout";
import {
  createEmployee,
  getManagerEmployeeDetail,
  getManagerEmployees,
  resetManagerEmployeePassword,
  updateManagerEmployee,
  updateManagerEmployeeStatus,
} from "../../services/managerEmployeesApi";
import { getBusinessDate } from "../../utils/businessDate";

const accountStatusRank = {
  ACTIVE: 1,
  INACTIVE: 2,
  BANNED: 3,
};

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(paise || 0) / 100);

const formatLitres = (litres) =>
  `${Number(litres || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} L`;

const formatBusinessDate = (businessDate, language) =>
  new Intl.DateTimeFormat(language, {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${businessDate}T00:00:00.000Z`));

const formatTimestampDate = (timestamp, language) =>
  new Intl.DateTimeFormat(language, {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));

const formatTime = (timestamp) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));

const businessDateAtTimestamp = (timestamp) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));

const addBusinessDays = (businessDate, days) => {
  const date = new Date(`${businessDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getStartedLabel = (timestamp, t, language) => {
  const startDate = businessDateAtTimestamp(timestamp);
  const today = getBusinessDate();
  const yesterday = addBusinessDays(today, -1);
  const dayLabel = startDate === today
    ? t("manager.employeesPage.today", "Today")
    : startDate === yesterday
      ? t("manager.employeesPage.yesterday", "Yesterday")
      : formatTimestampDate(timestamp, language);

  return `${dayLabel} · ${formatTime(timestamp)}`;
};

// Reusable Input matching the redesign
const Input = ({ label, value, onChange, type = "text", required = false, isTextarea = false, inputMode, minLength, maxLength, pattern, autoComplete, readOnly }) => (
  <label className="block !text-[11px] !font-bold !text-slate-600 !mb-3">
    {label}
    {isTextarea ? (
      <textarea
        value={value}
        required={required}
        onChange={onChange}
        readOnly={readOnly}
        className="!mt-1.5 !min-h-[74px] !w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !px-4 !py-3 !text-[14px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
      />
    ) : (
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        required={required}
        onChange={onChange}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        autoComplete={autoComplete}
        readOnly={readOnly}
        className="!mt-1.5 !min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !px-4 !text-[14px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all read-only:!bg-slate-100 read-only:!text-slate-500 read-only:!border-slate-200"
      />
    )}
  </label>
);

const Button = ({ children, onClick, disabled = false, secondary = false, tone = "emerald", type = "button" }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`!min-h-[48px] !w-full !rounded-[14px] !px-4 !text-[13px] !font-bold !transition-all disabled:!opacity-50 disabled:!cursor-not-allowed flex items-center justify-center gap-2 ${
      secondary 
        ? "!bg-slate-100 !text-slate-700 hover:!bg-slate-200" 
        : tone === "red" 
          ? "!bg-rose-100 !text-rose-700 hover:!bg-rose-200"
          : tone === "blue"
            ? "!bg-sky-100 !text-sky-700 hover:!bg-sky-200"
            : tone === "amber"
              ? "!bg-amber-100 !text-amber-800 hover:!bg-amber-200"
              : "!bg-emerald-700 !text-white hover:!bg-emerald-800 !shadow-[0_4px_14px_rgba(5,150,105,0.2)]"
    }`}
  >
    {children}
  </button>
);

const Employees = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmployeeId = location.state?.employeeDetailId || null;
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState("");
  const [rosterRequest, setRosterRequest] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployeeId);
  const [employeeDetail, setEmployeeDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(Boolean(initialEmployeeId));
  const [detailError, setDetailError] = useState("");
  const [detailRequest, setDetailRequest] = useState(0);
  const [editor, setEditor] = useState(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmPasswordReset, setConfirmPasswordReset] = useState(false);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);

  useEffect(() => {
    let mounted = true;

    getManagerEmployees()
      .then((response) => {
        if (!mounted) return;
        setEmployees(response?.data?.employees || []);
        setSummary(response?.data?.summary || null);
        setRosterError("");
      })
      .catch((error) => {
        if (mounted) {
          setRosterError(
            error?.response?.data?.message ||
              error?.message ||
              t("manager.employeesPage.loadError", "Failed to load employees.")
          );
        }
      })
      .finally(() => {
        if (mounted) setRosterLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [rosterRequest, t]);

  useEffect(() => {
    if (!selectedEmployeeId) return undefined;
    let mounted = true;

    getManagerEmployeeDetail(selectedEmployeeId)
      .then((response) => {
        if (!mounted) return;
        setEmployeeDetail(response?.data || null);
        setDetailError("");
      })
      .catch((error) => {
        if (mounted) {
          setDetailError(
            error?.response?.data?.message ||
              error?.message ||
              t("manager.employeesPage.detailLoadError", "Failed to load employee details.")
          );
        }
      })
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedEmployeeId, detailRequest, t]);

  const visibleEmployees = employees
    .filter((employee) => {
      const normalizedSearch = search.trim().toLocaleLowerCase();
      const matchesSearch = !normalizedSearch ||
        employee.name.toLocaleLowerCase().includes(normalizedSearch) ||
        employee.employeeId.toLocaleLowerCase().includes(normalizedSearch);
      const isWorking = Boolean(employee.currentShift);
      const matchesFilter = filter === "ALL" ||
        (filter === "ACTIVE" && employee.accountStatus === "ACTIVE") ||
        (filter === "WORKING" && isWorking) ||
        (filter === "INACTIVE" && employee.accountStatus !== "ACTIVE");

      return matchesSearch && matchesFilter;
    })
    .sort((left, right) => {
      const leftRank = left.currentShift ? 0 : accountStatusRank[left.accountStatus] || 4;
      const rightRank = right.currentShift ? 0 : accountStatusRank[right.accountStatus] || 4;
      return leftRank - rightRank || left.name.localeCompare(right.name, i18n.language, { sensitivity: "base" });
    });

  const openEmployee = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setEmployeeDetail(null);
    setDetailLoading(true);
    setDetailError("");
    setNotice("");
  };

  const closeEmployee = () => {
    setSelectedEmployeeId(null);
    setEmployeeDetail(null);
    setDetailError("");
    navigate("/manager/employees", { replace: true, state: null });
  };

  const handleBack = selectedEmployeeId
    ? closeEmployee
    : () => navigate("/manager");

  const refreshData = () => {
    setRosterLoading(true);
    setRosterRequest((current) => current + 1);
    if (selectedEmployeeId) {
      setDetailLoading(true);
      setDetailRequest((current) => current + 1);
    }
  };

  const handleEditorSubmit = async (values) => {
    setEditorSaving(true);
    setEditorError("");
    try {
      if (editor.mode === "create") {
        await createEmployee(values);
        setEditor(null);
        setNotice(t("manager.employeesPage.employeeCreated", "Employee created."));
        refreshData();
      } else {
        const response = await updateManagerEmployee(
          selectedEmployeeId,
          { name: values.name }
        );
        setEmployeeDetail((current) => ({
          ...current,
          profile: response?.data || current?.profile,
        }));
        setEditor(null);
        setNotice(t("manager.employeesPage.profileUpdated", "Profile updated."));
        refreshData();
      }
    } catch (error) {
      setEditorError(
        error?.response?.data?.message ||
          error?.message ||
          t("manager.employeesPage.saveError", "Failed to save.")
      );
    } finally {
      setEditorSaving(false);
    }
  };

  const requestStatusChange = (nextStatus) => {
    const currentStatus = employeeDetail?.profile?.accountStatus;
    const keys = currentStatus === "BANNED" && nextStatus === "ACTIVE"
      ? ["confirmUnbanTitle", "confirmUnbanBody"]
      : nextStatus === "ACTIVE"
        ? ["confirmActivateTitle", "confirmActivateBody"]
        : nextStatus === "INACTIVE"
          ? ["confirmDeactivateTitle", "confirmDeactivateBody"]
          : ["confirmBanTitle", "confirmBanBody"];
    const actionLabel = currentStatus === "BANNED" && nextStatus === "ACTIVE"
      ? "unban"
      : nextStatus === "ACTIVE"
        ? "activate"
        : nextStatus === "INACTIVE"
          ? "deactivate"
          : "ban";

    setStatusError("");
    setPendingStatus({
      nextStatus,
      title: t(`manager.employeesPage.${keys[0]}`),
      confirmLabel: t(`manager.employeesPage.${actionLabel}`),
      body: t(`manager.employeesPage.${keys[1]}`, {
        name: employeeDetail?.profile?.name || "",
      }),
    });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || !selectedEmployeeId) return;
    setStatusSaving(true);
    setStatusError("");
    try {
      const response = await updateManagerEmployeeStatus(
        selectedEmployeeId,
        pendingStatus.nextStatus
      );
      setEmployeeDetail((current) => ({
        ...current,
        profile: response?.data || current?.profile,
      }));
      setPendingStatus(null);
      setNotice(t("manager.employeesPage.statusUpdated", "Status updated."));
      refreshData();
    } catch (error) {
      const currentShift = error?.response?.data?.data?.currentShift;
      setStatusError(
        currentShift
          ? t("manager.employeesPage.workingStatusBlocked", {
              mpd: currentShift.mpd || t("manager.operations", "Operations"),
            })
          : error?.response?.data?.message ||
              error?.message ||
              t("manager.employeesPage.saveError", "Failed to save status.")
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const openShiftInOperations = (shiftId) => {
    navigate("/manager/operations", {
      state: {
        employeeShiftId: shiftId,
        employeeReturn: { employeeDetailId: selectedEmployeeId },
      },
    });
  };

  const createEditor = () => {
    setEditorError("");
    setEditor({ mode: "create" });
  };

  const editEmployee = () => {
    setEditorError("");
    setEditor({ mode: "edit" });
  };

  const confirmPasswordResetRequest = () => {
    setConfirmPasswordReset(false);
    setShowPasswordResetForm(true);
  };

  const handlePasswordReset = async (password) => {
    await resetManagerEmployeePassword(selectedEmployeeId, password);
    setShowPasswordResetForm(false);
    setNotice(t("manager.employeesPage.passwordResetSuccess", "Password reset successfully."));
    refreshData();
  };

  // Clear notices automatically
  useEffect(() => {
    if (notice || rosterError) {
      const timer = setTimeout(() => { setNotice(""); setRosterError(""); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notice, rosterError]);

  const detail = employeeDetail;
  const profile = detail?.profile;
  const employeePageTitle = selectedEmployeeId
    ? profile?.name || t("manager.employeesPage.profile", "Profile")
    : t("manager.employees", "Employees");

  return (
    <ManagerLayout title={employeePageTitle} showBack onBack={handleBack}>
      <div className="!space-y-4 !pb-8">
        {selectedEmployeeId ? (
          <EmployeeDetailView
            detail={detail}
            loading={detailLoading}
            error={detailError}
            onRetry={() => {
              setDetailLoading(true);
              setDetailRequest((current) => current + 1);
            }}
            onEdit={editEmployee}
            onStatusChange={requestStatusChange}
            onResetPassword={() => {
              setNotice("");
              setConfirmPasswordReset(true);
            }}
            onOpenShift={openShiftInOperations}
            statusError={statusError}
            notice={notice}
            t={t}
            language={i18n.language}
          />
        ) : (
          <div className="!space-y-4">
            
            {notice && (
              <div className="!rounded-[14px] !bg-emerald-50 !p-3 !border !border-emerald-100 !flex !items-center !gap-2">
                <p className="!text-[11px] !font-bold !text-emerald-700">{notice}</p>
              </div>
            )}
            
            {rosterError && (
              <div className="!rounded-[14px] !bg-rose-50 !p-3 !border !border-rose-100 !flex !items-center !gap-2">
                <p className="!text-[11px] !font-bold !text-rose-700">{rosterError}</p>
              </div>
            )}

            {/* TOP SUMMARY CARDS */}
            <div className="!grid !grid-cols-2 !gap-3">
              <SummaryCard label={t("manager.employeesPage.totalEmployees", "Total")} value={summary?.total ?? "—"} tone="emerald" />
              <SummaryCard label={t("manager.employeesPage.activeCount", "Active")} value={summary?.active ?? "—"} tone="emerald" />
              <SummaryCard label={t("manager.employeesPage.workingCount", "Working")} value={summary?.working ?? "—"} tone="blue" />
              <SummaryCard label={t("manager.employeesPage.inactiveBannedCount", "Inactive/Banned")} value={summary?.inactiveOrBanned ?? "—"} tone="rose" />
            </div>

            <Button onClick={createEditor}>
              <PlusIcon /> {t("manager.employeesPage.addEmployee", "Add Employee")}
            </Button>

            <div className="!rounded-[20px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_8px_24px_rgba(149,157,165,0.05)]">
              <div className="!mb-4 !relative">
                <div className="!absolute !left-3 !top-1/2 !-translate-y-1/2 !text-slate-400">
                  <SearchIcon />
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="!w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !py-3 !pl-9 !pr-3 !text-[13px] !font-bold !text-slate-800 focus:!border-emerald-400 focus:!bg-white focus:!outline-none !transition-all"
                  placeholder={t("manager.employeesPage.searchPlaceholder", "Search by name or ID")}
                />
              </div>

              <div className="!flex !gap-2 !overflow-x-auto !pb-2 !mb-2 !scrollbar-hide">
                {[
                  ["ALL", "allFilter"],
                  ["ACTIVE", "activeFilter"],
                  ["WORKING", "workingFilter"],
                  ["INACTIVE", "inactiveBannedFilter"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`!shrink-0 !rounded-[10px] !border !px-4 !py-2 !text-[11px] !font-bold !transition-all ${
                      filter === value
                        ? "!border-emerald-500 !bg-emerald-50 !text-emerald-700"
                        : "!border-slate-200/60 !bg-white !text-slate-500 hover:!bg-slate-50"
                    }`}
                  >
                    {t(`manager.employeesPage.${label}`)}
                  </button>
                ))}
              </div>

              {rosterLoading ? (
                <p className="!py-6 !text-center !text-[12px] !font-bold !text-slate-400">Loading employees...</p>
              ) : visibleEmployees.length === 0 ? (
                <p className="!py-6 !text-center !text-[12px] !font-bold !text-slate-400">{t("manager.employeesPage.noEmployees", "No employees found.")}</p>
              ) : (
                <div className="!space-y-3 !mt-2">
                  {visibleEmployees.map((employee) => (
                    <EmployeeListCard
                      key={employee.id}
                      employee={employee}
                      onClick={() => openEmployee(employee.id)}
                      t={t}
                      language={i18n.language}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {editor && (
          <EmployeeEditorDialog
            mode={editor.mode}
            profile={profile}
            saving={editorSaving}
            error={editorError}
            onClose={() => setEditor(null)}
            onSubmit={handleEditorSubmit}
            t={t}
          />
        )}

        {pendingStatus && (
          <ConfirmationDialog
            title={pendingStatus.title}
            confirmLabel={pendingStatus.confirmLabel}
            message={pendingStatus.body}
            saving={statusSaving}
            error={statusError}
            onCancel={() => setPendingStatus(null)}
            onConfirm={confirmStatusChange}
          />
        )}
        
        {confirmPasswordReset && (
          <ConfirmationDialog
            title={t("manager.employeesPage.confirmPasswordResetTitle", "Reset Password?")}
            confirmLabel={t("manager.employeesPage.resetPassword", "Reset Password")}
            message={t("manager.employeesPage.confirmPasswordResetBody", { name: profile?.name || "" }, "Are you sure you want to reset this user's password?")}
            saving={false}
            error=""
            onCancel={() => setConfirmPasswordReset(false)}
            onConfirm={confirmPasswordResetRequest}
          />
        )}
        
        {showPasswordResetForm && (
          <ResetPasswordDialog
            onClose={() => setShowPasswordResetForm(false)}
            onSubmit={handlePasswordReset}
            t={t}
          />
        )}
      </div>
    </ManagerLayout>
  );
};

const SummaryCard = ({ label, value, tone }) => {
  const colors = tone === "rose"
    ? "!bg-rose-50 !text-rose-700 !border-rose-100"
    : tone === "blue"
      ? "!bg-sky-50 !text-sky-700 !border-sky-100"
      : "!bg-emerald-50 !text-emerald-800 !border-emerald-100";

  return (
    <div className={`!min-h-[74px] !rounded-[16px] !border !p-4 !shadow-[0_4px_14px_rgba(15,23,42,0.03)] !flex !flex-col !justify-center ${colors}`}>
      <p className="!text-[10px] !font-bold !uppercase !mb-1">{label}</p>
      <p className="!text-[22px] !font-black !leading-none">{value}</p>
    </div>
  );
};

const EmployeeListCard = ({ employee, onClick, t, language }) => {
  const isWorking = Boolean(employee.currentShift);
  const statusKey = employee.accountStatus === "BANNED"
    ? "accountBanned"
    : employee.accountStatus === "INACTIVE"
      ? "accountInactive"
      : "accountActive";
  const statusTone = employee.accountStatus === "BANNED"
    ? "!bg-red-50 !text-red-700"
    : employee.accountStatus === "INACTIVE"
      ? "!bg-slate-100 !text-slate-600"
      : "!bg-emerald-50 !text-emerald-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className="!w-full !flex !items-center !justify-between !rounded-[16px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:!border-emerald-200 !transition-all !text-left"
    >
      <div className="!flex !items-center !gap-3 !flex-1 !min-w-0">
        <span className="!grid !h-10 !w-10 !shrink-0 !place-items-center !rounded-[12px] !bg-emerald-50 !text-emerald-700">
          <PersonIcon />
        </span>
        <div className="!min-w-0 !flex-1">
          <p className="!text-[14px] !font-bold !text-slate-900 !truncate">{employee.name}</p>
          <p className="!text-[10px] !font-bold !text-slate-400 !mt-0.5">{employee.employeeId}</p>
          <div className="!mt-1.5 !flex !flex-wrap !gap-1.5">
            <span className={`!rounded-[6px] !px-2 !py-0.5 !text-[8px] !font-extrabold !uppercase ${statusTone}`}>
              {t(`manager.employeesPage.${statusKey}`)}
            </span>
            <span className={`!rounded-[6px] !px-2 !py-0.5 !text-[8px] !font-extrabold !uppercase ${isWorking ? "!bg-sky-50 !text-sky-700" : "!bg-slate-50 !text-slate-500"}`}>
              {t(isWorking ? "manager.employeesPage.workWorking" : "manager.employeesPage.workNotWorking")}
            </span>
          </div>
          {isWorking && (
            <p className="!mt-1.5 !text-[10px] !font-medium !text-slate-500 !truncate">
              {employee.currentShift.mpd || t("manager.operations")} · {getStartedLabel(employee.currentShift.startedAt, t, language)}
            </p>
          )}
        </div>
      </div>
      <ChevronIcon />
    </button>
  );
};

const EmployeeDetailView = ({
  detail,
  loading,
  error,
  onRetry,
  onEdit,
  onStatusChange,
  onResetPassword,
  onOpenShift,
  statusError,
  notice,
  t,
  language,
}) => {
  if (loading) {
    return <p className="!py-6 !text-center !text-[12px] !font-bold !text-slate-400">Loading details...</p>;
  }

  if (error || !detail?.profile) {
    return (
      <div className="!rounded-[14px] !bg-rose-50 !p-4 !border !border-rose-100 !text-center">
        <p className="!text-[11px] !font-bold !text-rose-700">{error || "Error loading details."}</p>
        <button onClick={onRetry} className="!mt-2 !text-[12px] !font-bold !text-rose-800 !underline">Try Again</button>
      </div>
    );
  }

  const { profile, currentShift, shiftHistory = [], summary = {} } = detail;
  const isWorking = Boolean(currentShift);
  const statusKey = profile.accountStatus === "BANNED" ? "accountBanned" : profile.accountStatus === "INACTIVE" ? "accountInactive" : "accountActive";
  const statusTone = profile.accountStatus === "BANNED" ? "!bg-red-50 !text-red-700" : profile.accountStatus === "INACTIVE" ? "!bg-slate-100 !text-slate-600" : "!bg-emerald-50 !text-emerald-800";

  return (
    <div className="!space-y-4">
      {notice && (
        <div className="!rounded-[14px] !bg-emerald-50 !p-3 !border !border-emerald-100">
          <p className="!text-[11px] !font-bold !text-emerald-700">{notice}</p>
        </div>
      )}

      {/* PROFILE CARD */}
      <section className="!rounded-[20px] !border !border-slate-100 !bg-white !p-5 !shadow-[0_8px_24px_rgba(149,157,165,0.05)]">
        <div className="!flex !items-start !justify-between !mb-4">
          <div className="!flex !items-center !gap-3">
            <span className="!grid !h-12 !w-12 !place-items-center !rounded-[14px] !bg-emerald-50 !text-emerald-700">
              <PersonIcon />
            </span>
            <div>
              <h1 className="!text-[18px] !font-black !text-slate-900">{profile.name}</h1>
              <p className="!text-[11px] !font-bold !text-slate-400 !mt-0.5">{profile.employeeId}</p>
            </div>
          </div>
          <span className={`!rounded-[8px] !px-3 !py-1 !text-[9px] !font-extrabold !uppercase ${statusTone}`}>
            {t(`manager.employeesPage.${statusKey}`)}
          </span>
        </div>

        <div className="!grid !grid-cols-2 !gap-3 !mb-4">
          <div className="!rounded-[12px] !bg-slate-50 !p-3">
            <p className="!text-[10px] !font-bold !uppercase !text-slate-400">Created</p>
            <p className="!mt-1 !text-[12px] !font-bold !text-slate-700">
              {profile.createdAt ? formatTimestampDate(profile.createdAt, language) : "—"}
            </p>
          </div>
          <div className="!rounded-[12px] !bg-slate-50 !p-3">
            <p className="!text-[10px] !font-bold !uppercase !text-slate-400">Account ID</p>
            <p className="!mt-1 !text-[12px] !font-bold !text-slate-700 truncate">{profile.employeeId}</p>
          </div>
        </div>

        <div className="!grid !grid-cols-2 !gap-2">
          <Button secondary onClick={onEdit}>Edit Details</Button>
          <Button tone="amber" onClick={onResetPassword}>Reset Password</Button>
          
          {profile.accountStatus === "ACTIVE" && (
            <>
              <Button secondary onClick={() => onStatusChange("INACTIVE")} disabled={isWorking}>Deactivate</Button>
              <Button tone="red" onClick={() => onStatusChange("BANNED")} disabled={isWorking}>Ban Account</Button>
            </>
          )}
          {profile.accountStatus === "INACTIVE" && (
            <Button onClick={() => onStatusChange("ACTIVE")}>Activate</Button>
          )}
          {profile.accountStatus === "BANNED" && (
            <Button onClick={() => onStatusChange("ACTIVE")}>Unban</Button>
          )}
        </div>

        {isWorking && (
          <div className="!mt-3 !rounded-[12px] !border !border-amber-100 !bg-amber-50 !p-3">
            <p className="!text-[10px] !font-bold !text-amber-800">Cannot modify status while working on {currentShift.mpd || "Operations"}.</p>
          </div>
        )}
        {statusError && (
          <div className="!mt-3 !rounded-[12px] !border !border-rose-100 !bg-rose-50 !p-3">
            <p className="!text-[10px] !font-bold !text-rose-700">{statusError}</p>
          </div>
        )}
      </section>

      {/* CURRENT SHIFT */}
      <section className="!rounded-[20px] !border !border-slate-100 !bg-white !p-5 !shadow-[0_8px_24px_rgba(149,157,165,0.05)]">
        <div className="!flex !items-center !justify-between !mb-3">
          <h2 className="!text-[14px] !font-black !text-slate-900">{t("manager.employeesPage.currentShift", "Current Shift")}</h2>
          {isWorking && <span className="!rounded-[6px] !bg-emerald-50 !px-2 !py-1 !text-[9px] !font-extrabold !text-emerald-700 !uppercase">Working</span>}
        </div>
        {currentShift ? (
          <div className="!flex !items-center !justify-between !rounded-[14px] !bg-emerald-50/70 !border !border-emerald-100 !p-4">
            <div>
              <p className="!text-[14px] !font-extrabold !text-emerald-900">{currentShift.mpd || "Operations"}</p>
              <p className="!mt-1 !text-[11px] !font-medium !text-emerald-700">
                Started {getStartedLabel(currentShift.startedAt, t, language)}
              </p>
            </div>
            <span className="!h-3 !w-3 !rounded-full !bg-emerald-500 !shadow-[0_0_8px_rgba(16,185,129,0.6)] !animate-pulse" />
          </div>
        ) : (
          <div className="!rounded-[14px] !bg-slate-50 !p-4 !text-center">
            <p className="!text-[11px] !font-bold !text-slate-500">{t("manager.employeesPage.noActiveShift", "No active shift right now.")}</p>
          </div>
        )}
      </section>

      {/* PERFORMANCE SUMMARY */}
      <section className="!rounded-[20px] !border !border-slate-100 !bg-white !p-5 !shadow-[0_8px_24px_rgba(149,157,165,0.05)]">
        <h2 className="!text-[14px] !font-black !text-slate-900 !mb-3">{t("manager.employeesPage.summary", "Summary")}</h2>
        <div className="!grid !grid-cols-2 !gap-3">
          <DetailMetric label={t("manager.employeesPage.totalShifts", "Total Shifts")} value={summary.shiftCount || 0} />
          <DetailMetric label={t("manager.employeesPage.totalLitres", "Volume Sold")} value={formatLitres(summary.totalLitres)} />
          <DetailMetric label={t("manager.employeesPage.totalSale", "Total Revenue")} value={formatMoney(summary.totalSalePaise)} />
          <DetailMetric label={t("manager.employeesPage.forceClosedShifts", "Force Closed")} value={summary.forceClosedShiftCount || 0} />
        </div>
      </section>

      {/* SHIFT HISTORY */}
      <section className="!rounded-[20px] !border !border-slate-100 !bg-white !p-5 !shadow-[0_8px_24px_rgba(149,157,165,0.05)]">
        <div className="!flex !items-center !justify-between !mb-4">
          <h2 className="!text-[14px] !font-black !text-slate-900">{t("manager.employeesPage.shiftHistory", "Shift History")}</h2>
          <span className="!text-[11px] !font-bold !text-slate-400">{shiftHistory.length} Shifts</span>
        </div>
        {shiftHistory.length === 0 ? (
          <div className="!rounded-[14px] !bg-slate-50 !p-6 !text-center">
            <p className="!text-[11px] !font-bold !text-slate-500">{t("manager.employeesPage.noShiftHistory", "No history available.")}</p>
          </div>
        ) : (
          <div className="!space-y-3">
            {shiftHistory.map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => onOpenShift(shift.id)}
                className="!w-full !flex !items-center !justify-between !rounded-[16px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:!border-emerald-200 !transition-all !text-left"
              >
                <div className="!min-w-0 !flex-1">
                  <div className="!flex !items-center !gap-2 !mb-1">
                    <span className="!text-[12px] !font-extrabold !text-slate-900">
                      {formatBusinessDate(shift.businessDate, language)}
                    </span>
                    <span className="!rounded-[6px] !bg-slate-100 !px-2 !py-0.5 !text-[8px] !font-bold !text-slate-600 !uppercase">
                      {shift.status}
                    </span>
                  </div>
                  <p className="!text-[10px] !font-bold !text-slate-500">
                    {shift.mpd || "Operations"} · {formatTime(shift.startedAt)} – {shift.endedAt ? formatTime(shift.endedAt) : "Open"}
                  </p>
                  <div className="!mt-2 !flex !items-center !gap-4">
                    <p className="!text-[11px] !font-black !text-slate-800">{formatMoney(shift.salePaise)}</p>
                    <p className="!text-[10px] !font-bold !text-slate-500">{formatLitres(shift.totalLitres)}</p>
                  </div>
                </div>
                <ChevronIcon />
              </button>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

const DetailMetric = ({ label, value }) => (
  <div className="!rounded-[14px] !bg-slate-50 !p-3">
    <p className="!text-[10px] !font-bold !uppercase !text-slate-500">{label}</p>
    <p className="!mt-1 !text-[16px] !font-black !text-slate-900">{value}</p>
  </div>
);

const EmployeeEditorDialog = ({ mode, profile, saving, error, onClose, onSubmit, t }) => {
  const creating = mode === "create";
  const [name, setName] = useState(creating ? "" : profile?.name || "");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(creating ? { name, employeeId, password } : { name });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-[20px] bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between !mb-2">
          <h2 className="!text-[16px] !font-black !text-slate-900">
            {t(creating ? "manager.employeesPage.addEmployee" : "manager.employeesPage.editEmployee", creating ? "Add Employee" : "Edit Employee")}
          </h2>
          <button type="button" onClick={onClose} className="!h-8 !w-8 !rounded-full !bg-slate-100 !flex !items-center !justify-center !text-slate-500 hover:!bg-slate-200">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="!space-y-0">
          <Input 
            label={t("manager.employeesPage.employeeName", "Full Name")} 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required minLength={2} maxLength={100} autoComplete="name" 
          />
          {creating ? (
            <>
              <Input 
                label={t("manager.employeesPage.employeeId", "Employee ID (e.g. EMP01)")} 
                value={employeeId} 
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())} 
                required minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]+" autoComplete="off" 
              />
              <Input 
                label={t("manager.employeesPage.password", "Password")} 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required minLength={6} maxLength={128} autoComplete="new-password" 
              />
            </>
          ) : (
            <Input 
              label={t("manager.employeesPage.employeeId", "Employee ID")} 
              value={profile?.employeeId || ""} 
              readOnly 
            />
          )}

          {error && <p className="!mt-2 !rounded-[10px] !bg-red-50 !px-3 !py-2 !text-[10px] !font-bold !text-red-700">{error}</p>}

          <div className="!pt-4 !mt-2 !border-t !border-slate-100 !flex !gap-2">
            <Button secondary onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : (creating ? "Create" : "Save")}</Button>
          </div>
        </form>
      </section>
    </div>
  );
};

const ConfirmationDialog = ({ title, confirmLabel, message, saving, error, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <section role="dialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-[20px] bg-white p-5 shadow-xl">
      <h2 className="!text-[16px] !font-black !text-slate-900">{title}</h2>
      <p className="!text-[12px] !font-medium !text-slate-600">{message}</p>
      
      {error && <p className="!rounded-[10px] !bg-red-50 !px-3 !py-2 !text-[10px] !font-bold !text-red-700">{error}</p>}
      
      <div className="!pt-2 !flex !gap-2">
        <Button secondary onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button tone="emerald" onClick={onConfirm} disabled={saving}>{saving ? "Wait..." : confirmLabel}</Button>
      </div>
    </section>
  </div>
);

const ResetPasswordDialog = ({ onClose, onSubmit, t }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!password || !confirmPassword) {
      setError(t("manager.employeesPage.passwordRequired", "Password is required"));
      return;
    }
    if (password.length < 6) {
      setError(t("manager.employeesPage.passwordTooShort", "Password must be at least 6 characters"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("manager.employeesPage.passwordsDoNotMatch", "Passwords do not match"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmit(password);
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          submitError?.message ||
          t("manager.employeesPage.passwordResetError", "Error resetting password")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-[20px] bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between !mb-2">
          <h2 className="!text-[16px] !font-black !text-slate-900">
            {t("manager.employeesPage.resetPassword", "Reset Password")}
          </h2>
          <button type="button" onClick={onClose} className="!h-8 !w-8 !rounded-full !bg-slate-100 !flex !items-center !justify-center !text-slate-500 hover:!bg-slate-200">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="!space-y-0">
          <Input 
            label={t("manager.employeesPage.newPassword", "New Password")} 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            autoComplete="new-password"
          />
          <Input 
            label={t("manager.employeesPage.confirmNewPassword", "Confirm Password")} 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            autoComplete="new-password"
          />
          
          {error && <p className="!mt-2 !rounded-[10px] !bg-red-50 !px-3 !py-2 !text-[10px] !font-bold !text-red-700">{error}</p>}
          
          <div className="!pt-4 !mt-2 !border-t !border-slate-100 !flex !gap-2">
            <Button secondary onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Confirm"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
};

const PlusIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="!h-5 !w-5" aria-hidden="true">
    <path d="M10 4v12M4 10h12" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4 !text-slate-300">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default Employees;