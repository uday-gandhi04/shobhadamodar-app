import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ManagerLayout from "./ManagerLayout";
import {
  createEmployee,
  getManagerEmployeeDetail,
  getManagerEmployees,
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
    ? t("manager.employeesPage.today")
    : startDate === yesterday
      ? t("manager.employeesPage.yesterday")
      : formatTimestampDate(timestamp, language);

  return `${dayLabel} · ${formatTime(timestamp)}`;
};

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
              t("manager.employeesPage.loadError"),
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
              t("manager.employeesPage.detailLoadError"),
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
        setNotice(t("manager.employeesPage.employeeCreated"));
        refreshData();
      } else {
        const response = await updateManagerEmployee(
          selectedEmployeeId,
          { name: values.name },
        );
        setEmployeeDetail((current) => ({
          ...current,
          profile: response?.data || current?.profile,
        }));
        setEditor(null);
        setNotice(t("manager.employeesPage.profileUpdated"));
        refreshData();
      }
    } catch (error) {
      setEditorError(
        error?.response?.data?.message ||
          error?.message ||
          t("manager.employeesPage.saveError"),
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
        pendingStatus.nextStatus,
      );
      setEmployeeDetail((current) => ({
        ...current,
        profile: response?.data || current?.profile,
      }));
      setPendingStatus(null);
      setNotice(t("manager.employeesPage.statusUpdated"));
      refreshData();
    } catch (error) {
      const currentShift = error?.response?.data?.data?.currentShift;
      setStatusError(
        currentShift
          ? t("manager.employeesPage.workingStatusBlocked", {
              mpd: currentShift.mpd || t("manager.operations"),
            })
          : error?.response?.data?.message ||
              error?.message ||
              t("manager.employeesPage.saveError"),
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

  const detail = employeeDetail;
  const profile = detail?.profile;
  const employeePageTitle = selectedEmployeeId
    ? profile?.name || t("manager.employeesPage.profile")
    : t("manager.employees");

  return (
    <ManagerLayout title={employeePageTitle} showBack onBack={handleBack}>
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
          onOpenShift={openShiftInOperations}
          statusError={statusError}
          notice={notice}
          t={t}
          language={i18n.language}
        />
      ) : (
        <div className="space-y-3">
          <div>
            <h1 className="text-[19px] font-extrabold leading-6 text-slate-900">
              {t("manager.employees")}
            </h1>
            <p className="mt-0.5 text-[10px] font-medium text-slate-500">
              {t("manager.employeesPage.subtitle")}
            </p>
          </div>

          {notice && (
            <div role="status" className="rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-800">
              {notice}
            </div>
          )}

          <section className="grid grid-cols-2 gap-2" aria-label={t("manager.employeesPage.summary")}>
            <SummaryCard label={t("manager.employeesPage.totalEmployees")} value={summary?.total ?? "—"} tone="green" />
            <SummaryCard label={t("manager.employeesPage.activeCount")} value={summary?.active ?? "—"} tone="green" />
            <SummaryCard label={t("manager.employeesPage.workingCount")} value={summary?.working ?? "—"} tone="blue" />
            <SummaryCard label={t("manager.employeesPage.inactiveBannedCount")} value={summary?.inactiveOrBanned ?? "—"} tone="rose" />
          </section>

          <button
            type="button"
            onClick={createEditor}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[12px] bg-bpcl-emerald text-[11px] font-bold text-white shadow-[0_5px_14px_rgba(4,120,87,0.16)] active:scale-[0.99]"
          >
            <PlusIcon />
            {t("manager.employeesPage.addEmployee")}
          </button>

          <label className="flex min-h-[40px] items-center gap-2 rounded-[12px] border border-slate-100 bg-white px-3 shadow-[0_3px_10px_rgba(15,23,42,0.035)]">
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("manager.employeesPage.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={t("manager.employeesPage.subtitle")}>
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
                aria-pressed={filter === value}
                className={`min-h-[32px] shrink-0 rounded-[10px] px-3 text-[9px] font-bold transition ${filter === value ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-500"}`}
              >
                {t(`manager.employeesPage.${label}`)}
              </button>
            ))}
          </div>

          {rosterError && (
            <div role="alert" className="rounded-[13px] border border-red-100 bg-red-50 p-3 text-[10px] font-medium text-red-700">
              <p>{rosterError}</p>
              <button
                type="button"
                onClick={() => {
                  setRosterLoading(true);
                  setRosterRequest((current) => current + 1);
                }}
                className="mt-2 font-bold underline"
              >
                {t("manager.employeesPage.tryAgain")}
              </button>
            </div>
          )}

          {rosterLoading ? (
            <div className="space-y-2" aria-label={t("manager.employeesPage.loading")}>
              <div className="h-[82px] animate-pulse rounded-[14px] bg-white" />
              <div className="h-[82px] animate-pulse rounded-[14px] bg-white" />
              <div className="h-[82px] animate-pulse rounded-[14px] bg-white" />
            </div>
          ) : !rosterError && visibleEmployees.length === 0 ? (
            <div className="rounded-[14px] bg-white px-4 py-8 text-center text-[10px] font-medium text-slate-500 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              {t("manager.employeesPage.noEmployees")}
            </div>
          ) : !rosterError ? (
            <div className="space-y-2">
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
          ) : null}
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
          t={t}
        />
      )}
    </ManagerLayout>
  );
};

const SummaryCard = ({ label, value, tone }) => {
  const colors = tone === "rose"
    ? "bg-rose-50 text-rose-700"
    : tone === "blue"
      ? "bg-sky-50 text-sky-700"
      : "bg-emerald-50 text-emerald-800";

  return (
    <div className={`min-h-[61px] rounded-[13px] border border-white px-3 py-2 ${colors}`}>
      <p className="text-[8px] font-semibold leading-3 opacity-75">{label}</p>
      <p className="mt-1 text-[16px] font-extrabold leading-5 text-slate-900">{value}</p>
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
    ? "bg-red-50 text-red-700"
    : employee.accountStatus === "INACTIVE"
      ? "bg-slate-100 text-slate-600"
      : "bg-emerald-50 text-emerald-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[86px] w-full items-center gap-3 rounded-[14px] border border-white bg-white p-3 text-left shadow-[0_4px_14px_rgba(15,23,42,0.045)] active:bg-slate-50"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-emerald-50 text-emerald-800">
        <PersonIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-slate-900">{employee.name}</span>
        <span className="mt-0.5 block text-[9px] font-semibold text-slate-400">{employee.employeeId}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[7px] font-extrabold ${statusTone}`}>
            {t(`manager.employeesPage.${statusKey}`)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[7px] font-extrabold ${isWorking ? "bg-sky-50 text-sky-700" : "bg-slate-50 text-slate-500"}`}>
            {t(isWorking ? "manager.employeesPage.workWorking" : "manager.employeesPage.workNotWorking")}
          </span>
        </span>
        {isWorking && (
          <span className="mt-1.5 block truncate text-[9px] font-medium text-slate-500">
            {employee.currentShift.mpd || t("manager.operations")} · {t("manager.employeesPage.started")} {getStartedLabel(employee.currentShift.startedAt, t, language)}
          </span>
        )}
      </span>
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
  onOpenShift,
  statusError,
  notice,
  t,
  language,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-[110px] animate-pulse rounded-[15px] bg-white" />
        <div className="h-[130px] animate-pulse rounded-[15px] bg-white" />
        <div className="h-[180px] animate-pulse rounded-[15px] bg-white" />
      </div>
    );
  }

  if (error || !detail?.profile) {
    return (
      <div role="alert" className="rounded-[14px] border border-red-100 bg-red-50 p-4 text-[10px] font-medium text-red-700">
        <p>{error || t("manager.employeesPage.detailLoadError")}</p>
        <button type="button" onClick={onRetry} className="mt-3 font-bold underline">
          {t("manager.employeesPage.tryAgain")}
        </button>
      </div>
    );
  }

  const { profile, currentShift, shiftHistory = [], summary = {} } = detail;
  const isWorking = Boolean(currentShift);
  const statusKey = profile.accountStatus === "BANNED"
    ? "accountBanned"
    : profile.accountStatus === "INACTIVE"
      ? "accountInactive"
      : "accountActive";

  return (
    <div className="space-y-3">
      {notice && (
        <div role="status" className="rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      <section className="rounded-[15px] bg-white p-3.5 shadow-[0_4px_15px_rgba(15,23,42,0.045)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-emerald-50 text-emerald-800">
              <PersonIcon />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-extrabold text-slate-900">{profile.name}</h1>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{profile.employeeId}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-extrabold ${profile.accountStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : profile.accountStatus === "BANNED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
            {t(`manager.employeesPage.${statusKey}`)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[9px]">
          <div>
            <p className="text-slate-400">{t("manager.employeesPage.employeeId")}</p>
            <p className="mt-0.5 font-bold text-slate-700">{profile.employeeId}</p>
          </div>
          <div>
            <p className="text-slate-400">{t("manager.employeesPage.created")}</p>
            <p className="mt-0.5 font-bold text-slate-700">
              {profile.createdAt ? formatTimestampDate(profile.createdAt, language) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="min-h-[34px] rounded-[10px] border border-slate-200 px-3 text-[9px] font-bold text-slate-700 active:bg-slate-50">
            {t("manager.employeesPage.editEmployee")}
          </button>
          {profile.accountStatus === "ACTIVE" && (
            <>
              <button type="button" disabled={isWorking} onClick={() => onStatusChange("INACTIVE")} className="min-h-[34px] rounded-[10px] bg-amber-50 px-3 text-[9px] font-bold text-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
                {t("manager.employeesPage.deactivate")}
              </button>
              <button type="button" disabled={isWorking} onClick={() => onStatusChange("BANNED")} className="min-h-[34px] rounded-[10px] bg-red-50 px-3 text-[9px] font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                {t("manager.employeesPage.ban")}
              </button>
            </>
          )}
          {profile.accountStatus === "INACTIVE" && (
            <button type="button" onClick={() => onStatusChange("ACTIVE")} className="min-h-[34px] rounded-[10px] bg-emerald-50 px-3 text-[9px] font-bold text-emerald-800 active:bg-emerald-100">
              {t("manager.employeesPage.activate")}
            </button>
          )}
          {profile.accountStatus === "BANNED" && (
            <button type="button" onClick={() => onStatusChange("ACTIVE")} className="min-h-[34px] rounded-[10px] bg-emerald-50 px-3 text-[9px] font-bold text-emerald-800 active:bg-emerald-100">
              {t("manager.employeesPage.unban")}
            </button>
          )}
        </div>

        {isWorking && (
          <div role="status" className="mt-3 rounded-[11px] border border-amber-100 bg-amber-50 px-3 py-2 text-[9px] font-semibold leading-4 text-amber-800">
            {t("manager.employeesPage.workingStatusBlocked", {
              mpd: currentShift.mpd || t("manager.operations"),
            })}
          </div>
        )}
        {statusError && (
          <div role="alert" className="mt-3 rounded-[11px] border border-red-100 bg-red-50 px-3 py-2 text-[9px] font-semibold leading-4 text-red-700">
            {statusError}
          </div>
        )}
      </section>

      <section className="rounded-[15px] bg-white p-3.5 shadow-[0_4px_15px_rgba(15,23,42,0.045)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-extrabold text-slate-900">{t("manager.employeesPage.currentShift")}</h2>
          {isWorking && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-extrabold text-emerald-800">{t("manager.employeesPage.workWorking")}</span>}
        </div>
        {currentShift ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-[12px] bg-emerald-50/70 px-3 py-2.5">
            <div>
              <p className="text-[12px] font-extrabold text-slate-900">{currentShift.mpd || t("manager.operations")}</p>
              <p className="mt-1 text-[9px] font-medium text-slate-600">
                {t("manager.employeesPage.started")} {getStartedLabel(currentShift.startedAt, t, language)}
              </p>
            </div>
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          </div>
        ) : (
          <p className="mt-2 rounded-[11px] bg-slate-50 px-3 py-3 text-[10px] font-medium text-slate-500">
            {t("manager.employeesPage.noActiveShift")}
          </p>
        )}
      </section>

      <section className="rounded-[15px] bg-white p-3.5 shadow-[0_4px_15px_rgba(15,23,42,0.045)]">
        <h2 className="text-[12px] font-extrabold text-slate-900">{t("manager.employeesPage.summary")}</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <DetailMetric label={t("manager.employeesPage.totalShifts")} value={summary.shiftCount || 0} />
          <DetailMetric label={t("manager.employeesPage.totalLitres")} value={formatLitres(summary.totalLitres)} />
          <DetailMetric label={t("manager.employeesPage.totalSale")} value={formatMoney(summary.totalSalePaise)} />
          <DetailMetric label={t("manager.employeesPage.forceClosedShifts")} value={summary.forceClosedShiftCount || 0} />
        </div>
      </section>

      <section className="rounded-[15px] bg-white p-3.5 shadow-[0_4px_15px_rgba(15,23,42,0.045)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-extrabold text-slate-900">{t("manager.employeesPage.shiftHistory")}</h2>
          <span className="text-[8px] font-medium text-slate-400">{shiftHistory.length}</span>
        </div>
        {shiftHistory.length === 0 ? (
          <p className="mt-2 rounded-[11px] bg-slate-50 px-3 py-3 text-[10px] font-medium text-slate-500">
            {t("manager.employeesPage.noShiftHistory")}
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {shiftHistory.map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => onOpenShift(shift.id)}
                className="flex min-h-[74px] w-full items-center gap-2 rounded-[12px] border border-slate-100 p-2.5 text-left active:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-extrabold text-slate-900">
                      {formatBusinessDate(shift.businessDate, language)} · {shift.mpd || t("manager.operations")}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[7px] font-bold text-slate-600">
                      {t(`manager.operationsStatus.${String(shift.status).toLowerCase()}`, { defaultValue: shift.status })}
                    </span>
                  </span>
                  <span className="mt-1 block text-[8px] font-medium text-slate-500">
                    {formatTime(shift.startedAt)} – {shift.endedAt ? formatTime(shift.endedAt) : t("manager.employeesPage.endTimeMissing")}
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[8px] font-semibold text-slate-500">{formatLitres(shift.totalLitres)}</span>
                    <span className="text-[9px] font-extrabold text-slate-800">{formatMoney(shift.salePaise)}</span>
                  </span>
                </span>
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
  <div className="min-w-0 rounded-[11px] bg-slate-50 px-2.5 py-2">
    <p className="truncate text-[8px] font-medium text-slate-500">{label}</p>
    <p className="mt-1 break-words text-[11px] font-extrabold text-slate-900">{value}</p>
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-3 sm:items-center" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title" className="max-h-[90dvh] w-full max-w-[420px] overflow-y-auto rounded-[18px] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <h2 id="employee-dialog-title" className="text-[15px] font-extrabold text-slate-900">
            {t(creating ? "manager.employeesPage.addEmployee" : "manager.employeesPage.editEmployee")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("manager.employeesPage.cancel")} className="grid h-8 w-8 place-items-center rounded-[9px] text-slate-500 active:bg-slate-100">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <FormField label={t("manager.employeesPage.employeeName")}>
            <input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 min-h-[40px] w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[11px] text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" autoComplete="name" />
          </FormField>
          {creating ? (
            <>
              <FormField label={t("manager.employeesPage.employeeId")}>
                <input required minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]+" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1.5 min-h-[40px] w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[11px] uppercase text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" autoComplete="off" />
              </FormField>
              <FormField label={t("manager.employeesPage.password")}>
                <input required minLength={6} maxLength={128} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 min-h-[40px] w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[11px] text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" autoComplete="new-password" />
              </FormField>
            </>
          ) : (
            <FormField label={t("manager.employeesPage.employeeId")}>
              <input readOnly value={profile?.employeeId || ""} className="mt-1.5 min-h-[40px] w-full rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-500 outline-none" />
            </FormField>
          )}

          {error && (
            <p role="alert" className="rounded-[10px] bg-red-50 px-3 py-2 text-[9px] font-semibold text-red-700">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-[40px] flex-1 rounded-[11px] border border-slate-200 text-[10px] font-bold text-slate-600">
              {t("manager.employeesPage.cancel")}
            </button>
            <button type="submit" disabled={saving} className="min-h-[40px] flex-1 rounded-[11px] bg-bpcl-emerald text-[10px] font-bold text-white disabled:opacity-60">
              {saving
                ? t("manager.employeesPage.loading")
                : t(creating ? "manager.employeesPage.createEmployee" : "manager.employeesPage.saveChanges")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

const FormField = ({ label, children }) => (
  <label className="block text-[9px] font-semibold text-slate-600">
    {label}
    {children}
  </label>
);

const ConfirmationDialog = ({ title, confirmLabel, message, saving, error, onCancel, onConfirm, t }) => (
  <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-3 sm:items-center" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="status-dialog-title" className="w-full max-w-[420px] rounded-[18px] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
      <h2 id="status-dialog-title" className="text-[15px] font-extrabold text-slate-900">{title}</h2>
      <p className="mt-2 text-[10px] leading-5 text-slate-600">{message}</p>
      {error && <p role="alert" className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[9px] font-semibold text-red-700">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={saving} onClick={onCancel} className="min-h-[40px] flex-1 rounded-[11px] border border-slate-200 text-[10px] font-bold text-slate-600 disabled:opacity-60">
          {t("manager.employeesPage.cancel")}
        </button>
        <button type="button" disabled={saving} onClick={onConfirm} className="min-h-[40px] flex-1 rounded-[11px] bg-bpcl-emerald text-[10px] font-bold text-white disabled:opacity-60">
          {saving ? t("manager.employeesPage.loading") : confirmLabel}
        </button>
      </div>
    </section>
  </div>
);

const PlusIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
    <path d="M10 4v12M4 10h12" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true">
    <circle cx="8.8" cy="8.8" r="5.8" />
    <path d="m13.2 13.2 4 4" />
  </svg>
);

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 20c.6-3.5 2.7-5.3 6.5-5.3s5.9 1.8 6.5 5.3" />
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true">
    <path d="m6 3.5 4.5 4.5L6 12.5" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
    <path d="m5 5 10 10M15 5 5 15" />
  </svg>
);

export default Employees;