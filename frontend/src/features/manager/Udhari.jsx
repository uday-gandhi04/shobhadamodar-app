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

const rupeesToPaise = (value) => {
  const normalized = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [rupees, decimal = ""] = normalized.split(".");
  const paise = BigInt(rupees) * 100n + BigInt(decimal.padEnd(2, "0"));
  return paise <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(paise) : null;
};

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
  if (customer?.isBlocked) return "BLOCKED";
  return Number(customer?.outstandingBalance || 0) > 0 ? "ACTIVE" : "SETTLED";
};

const getStatusTone = (status) => {
  if (status === "BLOCKED") return "!bg-red-50 !text-red-700 !border-red-200";
  if (status === "SETTLED") return "!bg-emerald-50 !text-emerald-700 !border-emerald-200";
  return "!bg-amber-50 !text-amber-700 !border-amber-200";
};

// Reusable Components matching Stock.jsx
const Input = ({ label, value, onChange, type = "text", required = false, isTextarea = false, inputMode }) => (
  <label className="block !text-[11px] !font-bold !text-slate-600 !mb-3">
    {label}
    {isTextarea ? (
      <textarea
        value={value}
        required={required}
        onChange={onChange}
        className="!mt-1.5 !min-h-[74px] !w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !px-4 !py-3 !text-[14px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
      />
    ) : (
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        required={required}
        onChange={onChange}
        className="!mt-1.5 !min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !px-4 !text-[14px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
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
            : "!bg-emerald-700 !text-white hover:!bg-emerald-800 !shadow-[0_4px_14px_rgba(5,150,105,0.2)]"
    }`}
  >
    {children}
  </button>
);

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
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "", phoneNumber: "", vehicleNumber: "", address: "", notes: "", creditLimit: "0",
  });
  const [settlementForm, setSettlementForm] = useState({
    amount: "", paymentMethod: "CASH", referenceNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/customers", { params: { q: searchTerm, filter } });
      const payload = response.data?.data || {};
      setSummary(payload.summary || {
        totalOutstandingPaise: 0, totalCustomers: 0, customersWithOutstanding: 0, blockedCustomers: 0,
      });
      setCustomers(payload.customers || []);
    } catch (fetchError) {
      setError(fetchError.message || t("manager.udhariPage.loadError", "Failed to load data."));
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
    return () => { isMounted = false; clearTimeout(timer); };
  }, [fetchCustomers]);

  const fetchCustomerDetail = useCallback(async (customerId) => {
    if (!customerId) {
      setCustomerDetail(null); setDetailSummary(null); setLedger([]);
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
      setError(detailError.message || t("manager.udhariPage.detailLoadError", "Failed to load detail."));
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!selectedCustomerId) { setCustomerDetail(null); setDetailSummary(null); setLedger([]); return; }
      try {
        if (!active) return;
        await fetchCustomerDetail(selectedCustomerId);
      } catch (error) {
        if (active) setError(error.message || t("manager.udhariPage.detailLoadError"));
      }
    };
    run();
    return () => { active = false; };
  }, [fetchCustomerDetail, selectedCustomerId, t]);

  const filteredCustomers = useMemo(() => {
    if (filter === "all") return customers;
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
    const creditLimitPaise = rupeesToPaise(customerForm.creditLimit);
    if (creditLimitPaise === null) {
      setActionMessage(t("manager.udhariPage.invalidCreditLimit", "Invalid credit limit."));
      return;
    }
    const payload = { ...customerForm, creditLimitPaise };
    delete payload.creditLimit;

    try {
      setSubmitting(true);
      setActionMessage("");
      const response = editingCustomerId
        ? await api.patch(`/customers/${editingCustomerId}`, payload)
        : await api.post("/customers", payload);
      const customer = response.data?.data;
      setShowCustomerForm(false);
      setEditingCustomerId(null);
      setCustomerForm({ name: "", phoneNumber: "", vehicleNumber: "", address: "", notes: "", creditLimit: "0" });
      setActionMessage(t("manager.udhariPage.customerSaved", "Customer saved successfully."));
      await fetchCustomers();
      if (customer?._id) {
        setSelectedCustomerId(customer._id);
        await fetchCustomerDetail(customer._id);
      }
    } catch (submitError) {
      setActionMessage(submitError.message || t("manager.udhariPage.saveFailed", "Failed to save."));
    } finally {
      setSubmitting(false);
    }
  };

  const openCustomerForm = (customer = null) => {
    setEditingCustomerId(customer?._id || null);
    setCustomerForm({
      name: customer?.name || "",
      phoneNumber: customer?.phoneNumber || "",
      vehicleNumber: customer?.vehicleNumber || "",
      address: customer?.address || "",
      notes: customer?.notes || "",
      creditLimit: String(Number(customer?.creditLimitPaise || 0) / 100),
    });
    setShowCustomerForm(true);
  };

  const handleToggleBlock = async () => {
    if (!customerDetail) return;
    try {
      setSubmitting(true);
      await api.patch(`/customers/${customerDetail._id}/block`, { blocked: !customerDetail.isBlocked });
      setCustomerDetail((current) => ({
        ...current,
        isBlocked: !current.isBlocked,
        status: current.isBlocked ? "ACTIVE" : "BLOCKED",
      }));
      fetchCustomers();
      fetchCustomerDetail(customerDetail._id);
    } catch (toggleError) {
      setActionMessage(toggleError.message || t("manager.udhariPage.blockFailed", "Failed to block."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettlementSubmit = async (event) => {
    event.preventDefault();
    if (!customerDetail || !settlementForm.amount) return;
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
      setActionMessage(t("manager.udhariPage.settlementRecorded", "Settlement recorded."));
      fetchCustomers();
      fetchCustomerDetail(customerDetail._id);
    } catch (submitError) {
      setActionMessage(submitError.message || t("manager.udhariPage.invalidSettlement", "Invalid settlement."));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId) || customerDetail;
  const selectedStatus = selectedCustomer ? getCustomerStatus(selectedCustomer) : "ACTIVE";

  // Clear notice after 4 seconds
  useEffect(() => {
    if (actionMessage || error) {
      const timer = setTimeout(() => { setActionMessage(""); setError(""); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage, error]);

  return (
    <ManagerLayout title={t("manager.udhari", "Udhari Book")} showBack>
      <div className="space-y-4 pb-8">
        
        {/* TOP SUMMARY CARDS */}
        <section className="!rounded-[20px] !bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] !p-5 !shadow-[0_8px_24px_rgba(5,150,105,0.2)] !text-white !relative !overflow-hidden">
          <div className="!absolute !right-0 !top-0 !opacity-10 !pointer-events-none">
            <svg viewBox="0 0 24 24" fill="currentColor" className="!w-32 !h-32 !-mt-8 !-mr-8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <p className="!text-[11px] !font-bold !uppercase !tracking-[0.12em] !text-emerald-100">
            {t("manager.udhariPage.totalOutstanding", "Total Outstanding")}
          </p>
          <p className="!mt-1 !text-[28px] !font-black !leading-tight !tracking-tight">
            {formatMoney(summary.totalOutstandingPaise)}
          </p>
          <p className="!mt-1 !text-[12px] !font-medium !text-emerald-200">
            {t("manager.udhariPage.subtitle", "Total unpaid credit across all accounts.")}
          </p>
        </section>

        <div className="!grid !grid-cols-3 !gap-3">
          <div className="!rounded-[16px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_4px_14px_rgba(15,23,42,0.03)] !flex !flex-col !items-center !justify-center !text-center">
            <p className="!text-[10px] !font-bold !uppercase !text-slate-500 !mb-1">{t("manager.udhariPage.totalCustomers", "Total")}</p>
            <p className="!text-[20px] !font-extrabold !text-slate-900">{summary.totalCustomers}</p>
          </div>
          <div className="!rounded-[16px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_4px_14px_rgba(15,23,42,0.03)] !flex !flex-col !items-center !justify-center !text-center">
            <p className="!text-[10px] !font-bold !uppercase !text-slate-500 !mb-1">{t("manager.udhariPage.customersWithOutstanding", "Unpaid")}</p>
            <p className="!text-[20px] !font-extrabold !text-rose-600">{summary.customersWithOutstanding}</p>
          </div>
          <div className="!rounded-[16px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_4px_14px_rgba(15,23,42,0.03)] !flex !flex-col !items-center !justify-center !text-center">
            <p className="!text-[10px] !font-bold !uppercase !text-slate-500 !mb-1">{t("manager.udhariPage.filterBlocked", "Blocked")}</p>
            <p className="!text-[20px] !font-extrabold !text-slate-900">{summary.blockedCustomers}</p>
          </div>
        </div>

        {/* ALERTS */}
        {actionMessage && (
          <div className="!rounded-[14px] !bg-emerald-50 !p-3 !border !border-emerald-100 !flex !items-center !gap-2">
            <p className="!text-[11px] !font-bold !text-emerald-700">{actionMessage}</p>
          </div>
        )}
        {error && (
          <div className="!rounded-[14px] !bg-rose-50 !p-3 !border !border-rose-100 !flex !items-center !gap-2">
            <p className="!text-[11px] !font-bold !text-rose-700">{error}</p>
          </div>
        )}

        {/* LIST / SEARCH */}
        {!selectedCustomerId ? (
          <div className="!rounded-[20px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_8px_24px_rgba(149,157,165,0.05)]">
            
            <div className="!mb-4 !flex !items-center !gap-2">
              <div className="!relative !flex-1">
                <div className="!absolute !left-3 !top-1/2 !-translate-y-1/2 !text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="!w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !py-3 !pl-9 !pr-3 !text-[13px] !font-bold !text-slate-800 focus:!border-emerald-400 focus:!bg-white focus:!outline-none !transition-all"
                  placeholder={t("manager.udhariPage.searchPlaceholder", "Search by name, phone, etc.")}
                />
              </div>
              <button
                type="button"
                onClick={() => openCustomerForm()}
                className="!flex !h-11 !w-11 !shrink-0 !items-center !justify-center !rounded-[12px] !bg-emerald-700 !text-white !shadow-[0_4px_12px_rgba(4,120,87,0.2)] hover:!bg-emerald-800 !transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>

            <div className="!flex !gap-2 !overflow-x-auto !pb-2 !mb-2 !scrollbar-hide">
              {[
                { key: "all", label: t("manager.udhariPage.filterAll", "All") },
                { key: "outstanding", label: t("manager.udhariPage.filterOutstanding", "Unpaid") },
                { key: "settled", label: t("manager.udhariPage.filterSettled", "Settled") },
                { key: "blocked", label: t("manager.udhariPage.filterBlocked", "Blocked") },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`!shrink-0 !rounded-[10px] !border !px-4 !py-2 !text-[11px] !font-bold !transition-all ${
                    filter === option.key
                      ? "!border-emerald-500 !bg-emerald-50 !text-emerald-700"
                      : "!border-slate-200/60 !bg-white !text-slate-500 hover:!bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="!py-6 !text-center !text-[12px] !font-bold !text-slate-400">Loading customers...</p>
            ) : filteredCustomers.length === 0 ? (
              <p className="!py-6 !text-center !text-[12px] !font-bold !text-slate-400">No customers found.</p>
            ) : (
              <div className="!space-y-3 !mt-2">
                {filteredCustomers.map((customer) => {
                  const status = getCustomerStatus(customer);
                  return (
                    <button
                      key={customer._id}
                      type="button"
                      onClick={() => setSelectedCustomerId(customer._id)}
                      className="!w-full !flex !items-center !justify-between !rounded-[16px] !border !border-slate-100 !bg-white !p-4 !shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:!border-emerald-200 !transition-all !text-left"
                    >
                      <div className="!min-w-0 !flex-1">
                        <p className="!text-[14px] !font-bold !text-slate-900">{customer.name}</p>
                        <p className="!text-[11px] !font-medium !text-slate-500 !mt-0.5">{customer.phoneNumber || "No Mobile"}</p>
                        <p className="!mt-2 !text-[13px] !font-extrabold !text-slate-800">
                          {formatMoney(customer.outstandingBalance)} <span className="!text-[10px] !font-bold !text-slate-400 !ml-1">Unpaid</span>
                        </p>
                      </div>
                      <div className="!flex !flex-col !items-end !gap-2">
                        <span className={`!rounded-[6px] !border !px-2 !py-1 !text-[9px] !font-extrabold ${getStatusTone(status)}`}>
                          {status === "ACTIVE" ? "ACTIVE" : status === "SETTLED" ? "SETTLED" : "BLOCKED"}
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4 !text-slate-400 !mt-1"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* CUSTOMER DETAIL VIEW */
          <div className="!space-y-4">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="!flex !items-center !gap-2 !text-[12px] !font-bold !text-emerald-700 !bg-emerald-50 !px-4 !py-2 !rounded-[12px] !border !border-emerald-100 hover:!bg-emerald-100 !transition-all !w-max"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-3.5 !w-3.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Back to List
            </button>

            <div className="!rounded-[20px] !border !border-slate-100 !bg-white !p-5 !shadow-[0_8px_24px_rgba(149,157,165,0.05)]">
              <div className="!flex !items-start !justify-between !mb-4">
                <div>
                  <h2 className="!text-[20px] !font-black !text-slate-900">{selectedCustomer.name}</h2>
                  <p className="!text-[12px] !font-medium !text-slate-500 !mt-0.5">{selectedCustomer.phoneNumber || "No mobile"}</p>
                </div>
                <span className={`!rounded-[8px] !border !px-3 !py-1.5 !text-[10px] !font-extrabold ${getStatusTone(selectedStatus)}`}>
                  {selectedStatus}
                </span>
              </div>

              <div className="!rounded-[16px] !bg-amber-50 !border !border-amber-100 !p-4 !mb-4 !flex !items-center !justify-between">
                <p className="!text-[11px] !font-bold !uppercase !text-amber-700">Current Outstanding</p>
                <p className="!text-[22px] !font-black !text-amber-700">{formatMoney(selectedCustomer.outstandingBalance)}</p>
              </div>

              {/* SEGMENTED TABS */}
              <div className="!grid !grid-cols-3 !rounded-[12px] !bg-slate-50 !p-1 !mb-4">
                {[
                  { key: "overview", label: t("manager.udhariPage.overview", "Overview") },
                  { key: "ledger", label: t("manager.udhariPage.ledger", "Ledger") },
                  { key: "settlement", label: t("manager.udhariPage.settlement", "Settle") },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`!min-h-[38px] !rounded-[10px] !text-[11px] !font-bold !transition-all ${
                      activeTab === tab.key ? "!bg-emerald-800 !text-white !shadow-sm" : "!text-slate-500 hover:!text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {detailLoading ? (
                <p className="!py-4 !text-center !text-[12px] !font-bold !text-slate-400">Loading details...</p>
              ) : activeTab === "overview" && detailSummary && (
                <div className="!space-y-4">
                  <div className="!grid !grid-cols-2 !gap-3">
                    <div className="!rounded-[14px] !bg-slate-50 !border !border-slate-100 !p-4 !text-center">
                      <p className="!text-[10px] !font-bold !uppercase !text-slate-500 !mb-1">Total Credit</p>
                      <p className="!text-[16px] !font-extrabold !text-slate-900">{formatMoney(detailSummary.totalCreditPaise)}</p>
                    </div>
                    <div className="!rounded-[14px] !bg-slate-50 !border !border-slate-100 !p-4 !text-center">
                      <p className="!text-[10px] !font-bold !uppercase !text-slate-500 !mb-1">Total Settled</p>
                      <p className="!text-[16px] !font-extrabold !text-emerald-600">{formatMoney(detailSummary.totalSettlementsPaise)}</p>
                    </div>
                  </div>

                  <div className="!grid !grid-cols-2 !gap-3">
                    <div className="!rounded-[14px] !bg-slate-50 !border !border-slate-100 !p-4 !text-center">
                      <p className="!text-[10px] !font-bold !uppercase !text-slate-500 !mb-1">Credit Limit</p>
                      <p className="!text-[16px] !font-extrabold !text-slate-900">{formatMoney(selectedCustomer.creditLimitPaise)}</p>
                      <p className={`!mt-1 !text-[9px] !font-bold ${Number(selectedCustomer.outstandingBalance || 0) > Number(selectedCustomer.creditLimitPaise || 0) ? "!text-red-600" : "!text-emerald-600"}`}>
                        {Number(selectedCustomer.outstandingBalance || 0) > Number(selectedCustomer.creditLimitPaise || 0) ? "Limit Exceeded" : "Within Limit"}
                      </p>
                    </div>
                    <div className="!rounded-[14px] !bg-slate-50 !border !border-slate-100 !p-4 !text-center">
                      <p className="!text-[10px] !font-bold !uppercase !text-slate-500 !mb-1">Tx Count</p>
                      <p className="!text-[16px] !font-extrabold !text-slate-900">{detailSummary.transactionCount}</p>
                    </div>
                  </div>

                  <div className="!grid !grid-cols-2 !gap-3 !pt-2">
                    <Button secondary onClick={() => openCustomerForm(selectedCustomer)}>Edit Profile</Button>
                    <Button tone="red" onClick={handleToggleBlock}>
                      {selectedCustomer.isBlocked ? "Unblock Account" : "Block Account"}
                    </Button>
                  </div>
                </div>
              )}

              {!detailLoading && activeTab === "ledger" && (
                <div className="!space-y-3">
                  {ledger.length === 0 ? (
                    <p className="!py-6 !text-center !text-[12px] !font-bold !text-slate-400">No ledger entries.</p>
                  ) : (
                    ledger.map((entry) => (
                      <div key={entry._id} className="!rounded-[16px] !border !border-slate-100 !bg-slate-50/50 !p-4">
                        <div className="!flex !justify-between !items-start !mb-2">
                          <p className="!text-[11px] !font-bold !text-slate-500">{formatLedgerDate(entry.date, i18n.language)}</p>
                          <span className={`!rounded-[6px] !px-2 !py-0.5 !text-[9px] !font-extrabold ${entry.transactionType === "SETTLEMENT" ? "!bg-emerald-100 !text-emerald-700" : "!bg-rose-100 !text-rose-700"}`}>
                            {entry.transactionType === "SETTLEMENT" ? "DEBIT" : entry.transactionType}
                          </span>
                        </div>
                        <div className="!flex !justify-between !items-center !mb-1">
                          <div className="!text-[12px] !font-bold !text-slate-800">
                            {entry.fuelType || (entry.transactionType === "SETTLEMENT" ? "Payment Received" : "Credit")}
                            {entry.litres ? <span className="!text-slate-500 !ml-1">({entry.litres}L)</span> : null}
                          </div>
                          <p className={`!text-[15px] !font-black ${entry.transactionType === "SETTLEMENT" ? "!text-emerald-600" : "!text-rose-600"}`}>
                            {entry.transactionType === "SETTLEMENT" ? "-" : "+"}{formatMoney(entry.amountPaise)}
                          </p>
                        </div>
                        {entry.vehicleNumber && <p className="!text-[11px] !font-medium !text-slate-500">Vehicle: <span className="!font-bold !text-slate-700">{entry.vehicleNumber}</span></p>}
                        <div className="!border-t !border-slate-200/50 !pt-2 !mt-2 !flex !justify-between !items-center">
                          <p className="!text-[10px] !font-bold !text-slate-400">{entry.employee?.name || "System"}</p>
                          <p className="!text-[11px] !font-extrabold !text-slate-900">Bal: {formatMoney(entry.runningBalance)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!detailLoading && activeTab === "settlement" && (
                <div className="!space-y-4">
                  {!showSettlement ? (
                    <Button onClick={() => setShowSettlement(true)}>Record New Settlement</Button>
                  ) : (
                    <form onSubmit={handleSettlementSubmit} className="!space-y-3">
                      <Input
                        label={t("manager.udhariPage.amount", "Amount Received (₹)")}
                        type="number"
                        inputMode="decimal"
                        value={settlementForm.amount}
                        onChange={(e) => setSettlementForm(c => ({ ...c, amount: e.target.value }))}
                        required
                      />
                      <label className="block !text-[11px] !font-bold !text-slate-600 !mb-3">
                        {t("manager.udhariPage.paymentMethod", "Payment Method")}
                        <select
                          value={settlementForm.paymentMethod}
                          onChange={(e) => setSettlementForm(c => ({ ...c, paymentMethod: e.target.value }))}
                          className="!mt-1.5 !min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !px-4 !text-[14px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none"
                        >
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CARD">Card</option>
                        </select>
                      </label>
                      <Input
                        label={t("manager.udhariPage.referenceNumber", "Reference Number (Optional)")}
                        value={settlementForm.referenceNumber}
                        onChange={(e) => setSettlementForm(c => ({ ...c, referenceNumber: e.target.value }))}
                      />
                      <div className="!grid !grid-cols-2 !gap-3 !mt-4">
                        <Button secondary onClick={() => setShowSettlement(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Confirm"}</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CUSTOMER FORM MODAL */}
      {showCustomerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-[20px] bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between !mb-2">
              <h2 className="!text-[16px] !font-black !text-slate-900">{editingCustomerId ? "Edit Customer" : "Add Customer"}</h2>
              <button type="button" onClick={() => { setShowCustomerForm(false); setEditingCustomerId(null); }} className="!h-8 !w-8 !rounded-full !bg-slate-100 !flex !items-center !justify-center !text-slate-500 hover:!bg-slate-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateCustomer} className="!space-y-0">
              <Input label="Customer Name" value={customerForm.name} onChange={(e) => setCustomerForm(c => ({ ...c, name: e.target.value }))} required />
              <Input label="Mobile Number" inputMode="tel" value={customerForm.phoneNumber} onChange={(e) => setCustomerForm(c => ({ ...c, phoneNumber: e.target.value }))} />
              <Input label="Vehicle Number(s)" value={customerForm.vehicleNumber} onChange={(e) => setCustomerForm(c => ({ ...c, vehicleNumber: e.target.value }))} />
              <Input label="Credit Limit (₹)" type="number" inputMode="decimal" value={customerForm.creditLimit} onChange={(e) => setCustomerForm(c => ({ ...c, creditLimit: e.target.value }))} required />
              <Input label="Address" value={customerForm.address} onChange={(e) => setCustomerForm(c => ({ ...c, address: e.target.value }))} />
              <Input label="Notes" isTextarea value={customerForm.notes} onChange={(e) => setCustomerForm(c => ({ ...c, notes: e.target.value }))} />
              
              <div className="!pt-3 !mt-3 !border-t !border-slate-100">
                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Customer"}</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </ManagerLayout>
  );
};

export default Udhari;
