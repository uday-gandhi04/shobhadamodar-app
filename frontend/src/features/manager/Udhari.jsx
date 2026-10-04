import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import ManagerLayout from "./ManagerLayout";
import api from "../../services/api";

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(paise || 0) / 100);

const formatLedgerDate = (isoDate, locale) => {
  if (!isoDate) return "—";

  const date = new Date(isoDate);

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getCustomerStatus = (customer) => {
  if (customer?.isBlocked) {
    return "BLOCKED";
  }

  return Number(customer?.outstandingBalance || 0) > 0 ? "ACTIVE" : "SETTLED";
};

const getStatusTone = (status) => {
  if (status === "BLOCKED") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "SETTLED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
};

const Udhari = () => {
  const { t, i18n } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    totalOutstandingPaise: 0,
    totalCustomers: 0,
    customersWithOutstanding: 0,
    blockedCustomers: 0,
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailSummary, setDetailSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phoneNumber: "",
    vehicleNumber: "",
    address: "",
    notes: "",
  });
  const [settlementForm, setSettlementForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers", {
        params: {
          q: searchTerm,
          filter,
        },
      });

      const payload = response.data?.data || {};
      setSummary(payload.summary || {
        totalOutstandingPaise: 0,
        totalCustomers: 0,
        customersWithOutstanding: 0,
        blockedCustomers: 0,
      });
      setCustomers(payload.customers || []);
    } catch (fetchError) {
      setError(fetchError.message || t("manager.udhariPage.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm, t]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      fetchCustomers();
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchCustomers]);

  const fetchCustomerDetail = useCallback(async (customerId) => {
    if (!customerId) {
      setCustomerDetail(null);
      setDetailSummary(null);
      setLedger([]);
      return;
    }

    try {
      setDetailLoading(true);
      const response = await api.get(`/customers/${customerId}`);
      const payload = response.data?.data || {};
      setCustomerDetail(payload.customer || null);
      setDetailSummary(payload.summary || null);
      setLedger(payload.ledger || []);
    } catch (detailError) {
      setError(detailError.message || t("manager.udhariPage.detailLoadError"));
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!selectedCustomerId) {
        setCustomerDetail(null);
        setDetailSummary(null);
        setLedger([]);
        return;
      }

      try {
        if (!active) return;
        await fetchCustomerDetail(selectedCustomerId);
      } catch (error) {
        if (active) {
          setError(error.message || t("manager.udhariPage.detailLoadError"));
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [fetchCustomerDetail, selectedCustomerId, t]);

  const filteredCustomers = useMemo(() => {
    if (filter === "all") {
      return customers;
    }

    return customers.filter((customer) => {
      const status = getCustomerStatus(customer);
      if (filter === "outstanding") return status === "ACTIVE";
      if (filter === "settled") return status === "SETTLED";
      if (filter === "blocked") return status === "BLOCKED";
      return true;
    });
  }, [customers, filter]);

  const handleCreateOrUpdateCustomer = async (event) => {
    event.preventDefault();

    const payload = {
      name: customerForm.name,
      phoneNumber: customerForm.phoneNumber,
      vehicleNumber: customerForm.vehicleNumber,
      address: customerForm.address,
      notes: customerForm.notes,
    };

    try {
      setSubmitting(true);
      setActionMessage("");
      await api.post("/customers", payload);
      setShowCustomerForm(false);
      setCustomerForm({
        name: "",
        phoneNumber: "",
        vehicleNumber: "",
        address: "",
        notes: "",
      });
      setActionMessage(t("manager.udhariPage.customerSaved"));
      fetchCustomers();
    } catch (submitError) {
      setActionMessage(submitError.message || t("manager.udhariPage.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!customerDetail) return;

    try {
      setSubmitting(true);
      await api.patch(`/customers/${customerDetail._id}/block`, {
        blocked: !customerDetail.isBlocked,
      });
      setCustomerDetail((current) => ({
        ...current,
        isBlocked: !current.isBlocked,
        status: current.isBlocked ? "ACTIVE" : "BLOCKED",
      }));
      fetchCustomers();
      fetchCustomerDetail(customerDetail._id);
    } catch (toggleError) {
      setActionMessage(toggleError.message || t("manager.udhariPage.blockFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettlementSubmit = async (event) => {
    event.preventDefault();
    if (!customerDetail || !settlementForm.amount) {
      return;
    }

    try {
      setSubmitting(true);
      setActionMessage("");
      const amount = Number(settlementForm.amount);
      await api.post(`/customers/${customerDetail._id}/settlements`, {
        amountPaise: Math.round(amount * 100),
        paymentMethod: settlementForm.paymentMethod,
        referenceNumber: settlementForm.referenceNumber,
      });
      setSettlementForm({ amount: "", paymentMethod: "CASH", referenceNumber: "" });
      setShowSettlement(false);
      setActionMessage(t("manager.udhariPage.settlementRecorded"));
      fetchCustomers();
      fetchCustomerDetail(customerDetail._id);
    } catch (submitError) {
      setActionMessage(submitError.message || t("manager.udhariPage.invalidSettlement"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId) || customerDetail;
  const selectedStatus = selectedCustomer ? getCustomerStatus(selectedCustomer) : "ACTIVE";

  return (
    <ManagerLayout title={t("manager.udhari")} showBack>
      <div className="space-y-4 pb-4">
        <div className="rounded-[22px] bg-white p-4 shadow-sm">
          <p className="text-[18px] font-bold text-slate-900">{t("manager.udhari")}</p>
          <p className="mt-1 text-[12px] text-slate-500">{t("manager.udhariPage.subtitle")}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] bg-white p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.totalOutstanding")}</p>
            <p className="mt-2 text-[18px] font-bold text-slate-900">{formatMoney(summary.totalOutstandingPaise)}</p>
          </div>
          <div className="rounded-[18px] bg-white p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.totalCustomers")}</p>
            <p className="mt-2 text-[18px] font-bold text-slate-900">{summary.totalCustomers}</p>
          </div>
          <div className="rounded-[18px] bg-white p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.customersWithOutstanding")}</p>
            <p className="mt-2 text-[18px] font-bold text-slate-900">{summary.customersWithOutstanding}</p>
          </div>
        </div>

        <div className="rounded-[22px] bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
              placeholder={t("manager.udhariPage.searchPlaceholder")}
            />
            <button
              type="button"
              onClick={() => setShowCustomerForm(true)}
              className="rounded-[12px] bg-emerald-600 px-3 py-2 text-[12px] font-semibold text-white"
            >
              {t("manager.udhariPage.addCustomer")}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: t("manager.udhariPage.filterAll") },
              { key: "outstanding", label: t("manager.udhariPage.filterOutstanding") },
              { key: "settled", label: t("manager.udhariPage.filterSettled") },
              { key: "blocked", label: t("manager.udhariPage.filterBlocked") },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap ${
                  filter === option.key
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.customers")}</p>
          </div>

          {loading ? (
            <p className="py-4 text-center text-[12px] text-slate-500">{t("manager.udhariPage.loading")}</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-slate-500">{t("manager.udhariPage.noCustomers")}</p>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => {
                const status = getCustomerStatus(customer);
                return (
                  <button
                    key={customer._id}
                    type="button"
                    onClick={() => setSelectedCustomerId(customer._id)}
                    className={`flex w-full items-center justify-between rounded-[16px] border p-3 text-left ${selectedCustomerId === customer._id ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div>
                      <p className="text-[14px] font-bold text-slate-900">{customer.name}</p>
                      <p className="text-[11px] text-slate-500">{customer.phoneNumber || t("manager.udhariPage.noMobile")}</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-800">
                        {formatMoney(customer.outstandingBalance)} {t("manager.udhariPage.outstandingShort")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${getStatusTone(status)}`}>
                        {status === "ACTIVE" ? t("manager.udhariPage.statusActive") : status === "SETTLED" ? t("manager.udhariPage.statusSettled") : t("manager.udhariPage.statusBlocked")}
                      </span>
                      <span className="text-lg text-slate-400">›</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedCustomer && (
          <div className="rounded-[22px] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-[18px] font-bold text-slate-900">{selectedCustomer.name}</p>
                <p className="text-[12px] text-slate-500">{selectedCustomer.phoneNumber || t("manager.udhariPage.noMobile")}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${getStatusTone(selectedStatus)}`}>
                {selectedStatus === "ACTIVE" ? t("manager.udhariPage.statusActive") : selectedStatus === "SETTLED" ? t("manager.udhariPage.statusSettled") : t("manager.udhariPage.statusBlocked")}
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between rounded-[14px] bg-emerald-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.currentOutstanding")}</p>
              <p className="text-[20px] font-bold text-slate-900">{formatMoney(selectedCustomer.outstandingBalance)}</p>
            </div>

            <div className="mb-3 flex gap-2">
              {[
                { key: "overview", label: t("manager.udhariPage.overview") },
                { key: "ledger", label: t("manager.udhariPage.ledger") },
                { key: "settlement", label: t("manager.udhariPage.settlement") },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 rounded-full border px-3 py-2 text-[11px] font-semibold ${
                    activeTab === tab.key ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {detailLoading ? (
              <p className="text-[12px] text-slate-500">{t("manager.udhariPage.loading")}</p>
            ) : activeTab === "overview" && detailSummary && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[14px] bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.totalCreditGiven")}</p>
                    <p className="mt-2 text-[16px] font-bold text-slate-900">{formatMoney(detailSummary.totalCreditPaise)}</p>
                  </div>
                  <div className="rounded-[14px] bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.totalSettlements")}</p>
                    <p className="mt-2 text-[16px] font-bold text-slate-900">{formatMoney(detailSummary.totalSettlementsPaise)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[14px] bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.currentOutstanding")}</p>
                    <p className="mt-2 text-[16px] font-bold text-slate-900">{formatMoney(detailSummary.currentOutstandingPaise)}</p>
                  </div>
                  <div className="rounded-[14px] bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.transactionCount")}</p>
                    <p className="mt-2 text-[16px] font-bold text-slate-900">{detailSummary.transactionCount}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    className="flex-1 rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700"
                  >
                    {selectedCustomer.isBlocked ? t("manager.udhariPage.unblockCustomer") : t("manager.udhariPage.blockCustomer")}
                  </button>
                </div>
              </div>
            )}

            {!detailLoading && activeTab === "ledger" && (
              <div className="space-y-3">
                {ledger.length === 0 ? (
                  <p className="text-[12px] text-slate-500">{t("manager.udhariPage.noLedger")}</p>
                ) : (
                  ledger.map((entry) => (
                    <div key={entry._id} className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[12px] font-semibold text-slate-600">{formatLedgerDate(entry.date, i18n.language)}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${entry.transactionType === "SETTLEMENT" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {entry.transactionType === "SETTLEMENT" ? t("manager.udhariPage.settlement") : t("manager.udhariPage.credit")}
                        </span>
                      </div>

                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="text-[12px] text-slate-500">{entry.fuelType || t("manager.udhariPage.paymentBasis")}</p>
                          {entry.litres ? <p className="text-[11px] text-slate-500">{entry.litres} L</p> : null}
                          {entry.vehicleNumber ? <p className="text-[11px] text-slate-500">{t("manager.udhariPage.vehicle")}: {entry.vehicleNumber}</p> : null}
                        </div>
                        <p className={`text-[16px] font-bold ${entry.transactionType === "SETTLEMENT" ? "text-emerald-700" : "text-slate-900"}`}>
                          {entry.transactionType === "SETTLEMENT" ? "-" : ""}{formatMoney(entry.amountPaise)}
                        </p>
                      </div>

                      {entry.employee ? (
                        <p className="text-[11px] text-slate-500">{t("manager.udhariPage.recordedBy")}: {entry.employee.name}</p>
                      ) : null}

                      <p className="mt-2 text-[11px] font-semibold text-slate-700">
                        {t("manager.udhariPage.balance")}: {formatMoney(entry.runningBalance)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {!detailLoading && activeTab === "settlement" && (
              <div>
                <div className="mb-3 rounded-[14px] bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{t("manager.udhariPage.outstanding")}</p>
                  <p className="mt-1 text-[22px] font-bold text-slate-900">{formatMoney(selectedCustomer.outstandingBalance)}</p>
                </div>

                {!showSettlement ? (
                  <button
                    type="button"
                    onClick={() => setShowSettlement(true)}
                    className="w-full rounded-[14px] bg-emerald-600 px-4 py-3 text-[14px] font-semibold text-white"
                  >
                    {t("manager.udhariPage.settlePayment")}
                  </button>
                ) : (
                  <form onSubmit={handleSettlementSubmit} className="space-y-3">
                    <label className="block text-[12px] font-semibold text-slate-700">
                      {t("manager.udhariPage.amount")}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settlementForm.amount}
                        onChange={(event) => setSettlementForm((current) => ({ ...current, amount: event.target.value }))}
                        className="mt-1 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                      />
                    </label>

                    <label className="block text-[12px] font-semibold text-slate-700">
                      {t("manager.udhariPage.paymentMethod")}
                      <select
                        value={settlementForm.paymentMethod}
                        onChange={(event) => setSettlementForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                        className="mt-1 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                      >
                        <option value="CASH">{t("manager.udhariPage.cash")}</option>
                        <option value="UPI">{t("manager.udhariPage.upi")}</option>
                        <option value="CARD">{t("manager.udhariPage.card")}</option>
                      </select>
                    </label>

                    <label className="block text-[12px] font-semibold text-slate-700">
                      {t("manager.udhariPage.referenceNumber")}
                      <input
                        value={settlementForm.referenceNumber}
                        onChange={(event) => setSettlementForm((current) => ({ ...current, referenceNumber: event.target.value }))}
                        className="mt-1 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-[12px] bg-emerald-600 px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-70"
                    >
                      {submitting ? t("manager.udhariPage.confirming") : t("manager.udhariPage.confirmSettlement")}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {actionMessage ? (
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
            {actionMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {showCustomerForm && (
        <div className="fixed inset-0 z-30 flex items-end bg-slate-900/40 p-3">
          <div className="w-full rounded-[22px] bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[18px] font-bold text-slate-900">{t("manager.udhariPage.addCustomer")}</p>
              <button type="button" onClick={() => setShowCustomerForm(false)} className="text-slate-500">✕</button>
            </div>

            <form onSubmit={handleCreateOrUpdateCustomer} className="space-y-3">
              <label className="block text-[12px] font-semibold text-slate-700">
                {t("manager.udhariPage.customerName")}
                <input
                  required
                  value={customerForm.name}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block text-[12px] font-semibold text-slate-700">
                {t("manager.udhariPage.mobileNumber")}
                <input
                  value={customerForm.phoneNumber}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                  className="mt-1 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block text-[12px] font-semibold text-slate-700">
                {t("manager.udhariPage.vehicleNumber")}
                <input
                  value={customerForm.vehicleNumber}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, vehicleNumber: event.target.value }))}
                  className="mt-1 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block text-[12px] font-semibold text-slate-700">
                {t("manager.udhariPage.address")}
                <input
                  value={customerForm.address}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))}
                  className="mt-1 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block text-[12px] font-semibold text-slate-700">
                {t("manager.udhariPage.notes")}
                <textarea
                  value={customerForm.notes}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))}
                  className="mt-1 min-h-[74px] w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-[12px] bg-emerald-600 px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-70"
              >
                {submitting ? t("manager.udhariPage.saving") : t("manager.udhariPage.saveCustomer")}
              </button>
            </form>
          </div>
        </div>
      )}
    </ManagerLayout>
  );
};

export default Udhari;