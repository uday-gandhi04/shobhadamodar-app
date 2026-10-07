import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ManagerLayout from "./ManagerLayout";
import { getBusinessDate } from "../../utils/businessDate";
import {
  createFuelRate,
  createManagerReceipt,
  createManagerTank,
  getFuelRateHistory,
  getManagerDensity,
  getManagerReceipts,
  getManagerStock,
  getManagerTanks,
  updateManagerTank,
  upsertManagerDensity,
  upsertManagerStock,
} from "../../services/managerStockApi";

const n = (value) => Number(value || 0);

const Input = ({ label, value, onChange, type = "number", required = false }) => (
  <label className="block !text-[11px] !font-bold !text-slate-600 !mb-3">
    {label}
    <input
      type={type}
      value={value}
      required={required}
      onChange={onChange}
      className="!mt-1.5 !min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !px-4 !text-[14px] !font-bold !text-slate-900 focus:!border-emerald-500 focus:!bg-white focus:!outline-none focus:!ring-4 focus:!ring-emerald-500/10 !transition-all"
    />
  </label>
);

const Button = ({ children, onClick, disabled = false, secondary = false, tone = "emerald" }) => (
  <button
    type="button"
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

const ReadRow = ({ label, value, unit = " L", isText = false, isHighlighted = false }) => (
  <div className={`flex justify-between items-center py-2.5 ${isHighlighted ? "!border-t !border-emerald-100/50 !bg-emerald-50/30 !px-3 !rounded-[8px] !mt-2" : ""}`}>
    <span className={`!text-[11px] ${isHighlighted ? "!font-bold !text-emerald-800" : "!font-medium !text-slate-500"}`}>{label}</span>
    <b className={`text-right max-w-[60%] truncate ${isHighlighted ? "!text-[13px] !font-extrabold !text-emerald-700" : "!text-[12px] !font-bold !text-slate-900"}`}>
      {value == null || value === "" ? "—" : (isText ? value : `${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit}`)}
    </b>
  </div>
);

const fetchStockPage = (date) => Promise.all([
  getManagerStock(date),
  getManagerDensity(date),
  getManagerReceipts(date),
  getFuelRateHistory(),
  getManagerTanks(),
]);

const stockFormFor = (row = {}) => ({
  openingStockLitres: row.openingStockLitres ?? "",
  productDip: row.productDip ?? "",
  actualDipStockLitres: row.actualDipStockLitres ?? "",
  waterDip: row.waterDip ?? "",
  waterDipVolumeLitres: row.waterDipVolumeLitres ?? "",
});

const densityFormFor = (records, product) => {
  const found = records.find((item) => item.product === product);
  return {
    hydrometerReading: found?.hydrometerReading ?? "",
    temperatureC: found?.temperatureC ?? "",
    density15: found?.density15 ?? "",
  };
};

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(paise || 0) / 100);

const formatLitres = (litres) =>
  `${Number(litres || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} L`;

const Stock = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState("stock");
  const [recordsSubTab, setRecordsSubTab] = useState("density"); // density | receipts
  const [date, setDate] = useState(getBusinessDate());
  const [product, setProduct] = useState("PETROL");
  const productRef = useRef("PETROL");
  const [stock, setStock] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [selectedTankId, setSelectedTankId] = useState("");
  const [density, setDensity] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [rates, setRates] = useState([]);
  const [notice, setNotice] = useState("");
  const [tankDialog, setTankDialog] = useState(false);
  const [editingTank, setEditingTank] = useState(null);
  const [tankForm, setTankForm] = useState({ tankNumber: "", product: "PETROL", capacityLitres: "" });
  const [form, setForm] = useState({ openingStockLitres: "", productDip: "", actualDipStockLitres: "", waterDip: "", waterDipVolumeLitres: "" });
  const [densityForm, setDensityForm] = useState({ hydrometerReading: "", temperatureC: "", density15: "" });
  const [receipt, setReceipt] = useState({
    invoiceNumber: "", quantityLitres: "", supplierName: "", tankerNumber: "",
    beforeHydrometer: "", beforeTemperatureC: "", beforeDensity15: "",
    challanDensity15: "", beforeDensityDifference: "",
    afterHydrometer: "", afterTemperatureC: "", afterDensity15: "",
    afterChallanDensity15: "", afterDensityDifference: ""
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [rate, setRate] = useState({ businessDate: getBusinessDate(), petrolRateRupees: "", dieselRateRupees: "" });

  const changeReceipt = (key) => (e) => {
    setReceipt((old) => {
      const next = { ...old, [key]: e.target.value };
      if (["beforeDensity15", "challanDensity15"].includes(key)) {
        next.beforeDensityDifference = next.beforeDensity15 && next.challanDensity15
          ? (Number(next.beforeDensity15) - Number(next.challanDensity15)).toFixed(2)
          : "";
      }
      if (["afterDensity15", "afterChallanDensity15"].includes(key)) {
        next.afterDensityDifference = next.afterDensity15 && next.afterChallanDensity15
          ? (Number(next.afterDensity15) - Number(next.afterChallanDensity15)).toFixed(2)
          : "";
      }
      return next;
    });
  };

  const load = async () => {
    try {
      const [s, d, r, h, configuredTanks] = await fetchStockPage(date);
      setStock(s.data.stock);
      setTanks(configuredTanks.data);
      setDensity(d.data);
      setReceipts(r.data);
      setRates(h.data);
      const currentProduct = productRef.current;
      setForm(stockFormFor(s.data.stock.find((item) => item.product === currentProduct)));
      setDensityForm(densityFormFor(d.data, currentProduct));
    } catch (e) {
      setNotice(e.response?.data?.message || t("manager.stockLabels.loadError"));
    }
  };

  useEffect(() => {
    let current = true;
    const fetchData = async () => {
      try {
        const [s, d, r, h, configuredTanks] = await fetchStockPage(date);
        if (!current) return;
        setStock(s.data.stock);
        setTanks(configuredTanks.data);
        setDensity(d.data);
        setReceipts(r.data);
        setRates(h.data);
        const currentProduct = productRef.current;
        setForm(stockFormFor(s.data.stock.find((item) => item.product === currentProduct)));
        setDensityForm(densityFormFor(d.data, currentProduct));
      } catch (e) {
        if (current) setNotice(e.response?.data?.message || t("manager.stockLabels.loadError"));
      }
    };
    void fetchData();
    return () => { current = false; };
  }, [date, t]);

  // Clear notice after 5 seconds
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const row = stock.find((x) => x.product === product) || {};
  const activeTanks = tanks.filter((tank) => tank.product === product && tank.isActive);
  const selectedTank = activeTanks.find((tank) => tank._id === selectedTankId) || activeTanks[0];
  const change = (setter, key) => (e) => setter((old) => ({ ...old, [key]: e.target.value }));
  const selectProduct = (value) => {
    productRef.current = value;
    setProduct(value);
    setSelectedTankId("");
    setForm(stockFormFor(stock.find((item) => item.product === value)));
    setDensityForm(densityFormFor(density, value));
  };

  const save = async (fn) => {
    try {
      await fn();
      setNotice(t("manager.stockLabels.saved"));
      await load();
    } catch (e) {
      setNotice(e.response?.data?.message || t("manager.stockLabels.saveError"));
    }
  };

  const saveStock = () => {
    if (form.openingStockLitres === "") {
      setNotice(t("manager.stockLabels.openingStockRequired"));
      return;
    }
    return save(() => upsertManagerStock({
      businessDate: date,
      product,
      ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === "" ? null : n(value)])),
    }));
  };

  const openTankDialog = (tank = null) => {
    setEditingTank(tank);
    setTankForm(tank
      ? { tankNumber: tank.tankNumber, product: tank.product, capacityLitres: String(tank.capacityLitres) }
      : { tankNumber: "", product, capacityLitres: "" });
    setTankDialog(true);
  };

  const saveTank = async () => {
    const payload = { ...tankForm, capacityLitres: Number(tankForm.capacityLitres) };
    try {
      if (editingTank) await updateManagerTank(editingTank._id, payload);
      else await createManagerTank(payload);
      setNotice(t("manager.stockLabels.saved"));
      setEditingTank(null);
      setTankDialog(false);
      await load();
    } catch (e) {
      setNotice(e.response?.data?.message || t("manager.stockLabels.saveError"));
    }
  };

  const setTankActive = (tank) => save(() => updateManagerTank(tank._id, { isActive: !tank.isActive }));

  const saveRate = () => {
    const payload = {
      businessDate: rate.businessDate,
      petrolRatePaise: Math.round(Number(rate.petrolRateRupees) * 100),
      dieselRatePaise: Math.round(Number(rate.dieselRateRupees) * 100),
    };
    return save(() => createFuelRate(payload));
  };

  return (
    <ManagerLayout title={t("manager.stockLabels.stockRates", "Stock & Rates")} showBack>
      <div className="space-y-5 pb-8">
        
        {/* SEGMENTED TABS */}
        <div className="grid grid-cols-3 !rounded-[12px] !bg-slate-50 !p-1">
          { [["stock", "stockTab"], ["records", "recordsTab"], ["rates", "ratesTab"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`!min-h-[38px] !rounded-[10px] !text-[11px] !font-bold !transition-all ${
                tab === key ? "!bg-emerald-800 !text-white !shadow-sm" : "!text-slate-500 hover:!text-slate-700"
              }`}
            >
              {t(`manager.stockLabels.${label}`, label === "stockTab" ? "Current Stock" : label === "recordsTab" ? "Receipts & Density" : "Rates")}
            </button>
          ))}
        </div>

        {/* DATE PICKER */}
        <div className="flex !min-h-[46px] items-center justify-between !rounded-[14px] !bg-white !px-3 !border !border-slate-100/60 !shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4 !text-slate-400">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="!border-none !bg-transparent !text-[12px] !font-bold !text-slate-800 focus:!outline-none"
            />
          </div>
        </div>

        {notice && (
          <div className="!rounded-[14px] !bg-emerald-50 !p-3 !border !border-emerald-100 !flex !items-center !gap-2">
            <span className="!h-5 !w-5 !rounded-full !bg-emerald-200 !text-emerald-700 !flex !items-center !justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="!h-3 !w-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
            <p className="!text-[11px] !font-bold !text-emerald-700">{notice}</p>
          </div>
        )}

        {/* PRODUCT SWITCHER (Only for Stock and Records) */}
        {tab !== "rates" && (
          <div className="grid grid-cols-2 gap-3 !mb-2">
            <button
              onClick={() => selectProduct("PETROL")}
              className={`!flex !items-center !justify-center !gap-2 !min-h-[44px] !rounded-[14px] !text-[12px] !font-extrabold !transition-all !border ${
                product === "PETROL" 
                  ? "!bg-rose-50 !border-rose-100 !text-rose-700 !shadow-sm" 
                  : "!bg-white !border-slate-100 !text-slate-500 hover:!bg-slate-50"
              }`}
            >
              <span className={`!h-5 !w-5 flex items-center justify-center !rounded-[6px] ${product === "PETROL" ? "!bg-rose-100 !text-rose-600" : "!bg-slate-100 !text-slate-400"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-3.5 !w-3.5"><path d="M7 4h8v16H7z"/><path d="M15 7h2l2 2v7h-4"/><circle cx="10" cy="8" r="1"/></svg>
              </span>
              Petrol (MS)
            </button>
            <button
              onClick={() => selectProduct("DIESEL")}
              className={`!flex !items-center !justify-center !gap-2 !min-h-[44px] !rounded-[14px] !text-[12px] !font-extrabold !transition-all !border ${
                product === "DIESEL" 
                  ? "!bg-sky-50 !border-sky-100 !text-sky-700 !shadow-sm" 
                  : "!bg-white !border-slate-100 !text-slate-500 hover:!bg-slate-50"
              }`}
            >
              <span className={`!h-5 !w-5 flex items-center justify-center !rounded-[6px] ${product === "DIESEL" ? "!bg-sky-100 !text-sky-600" : "!bg-slate-100 !text-slate-400"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-3.5 !w-3.5"><path d="M7 4h8v16H7z"/><path d="M15 7h2l2 2v7h-4"/><circle cx="10" cy="8" r="1"/></svg>
              </span>
              Diesel (HSD)
            </button>
          </div>
        )}

        {/* TAB 1: STOCK */}
        {tab === "stock" && (
          <>
            {/* Tank Card */}
            <div className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100 !flex !items-center !justify-between">
              <div className="!flex !items-center !gap-3">
                <div className={`!h-10 !w-10 flex items-center justify-center !rounded-[10px] ${product === "PETROL" ? "!bg-rose-50 !text-rose-500" : "!bg-sky-50 !text-sky-500"}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
                  </svg>
                </div>
                <div>
                  <h3 className="!text-[14px] !font-bold !text-slate-900">
                    {activeTanks.length > 0 ? (selectedTank?.tankNumber || "Unknown Tank") : "No Active Tanks"}
                  </h3>
                  <p className="!text-[10px] !font-medium !text-slate-500">
                    {t("manager.stockLabels.capacity", "Capacity")}: {activeTanks.length > 0 ? formatLitres(selectedTank?.capacityLitres) : "-- L"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => openTankDialog()} 
                className="!text-[10px] !font-bold !bg-slate-50 !text-slate-600 !px-3 !py-1.5 !rounded-lg hover:!bg-slate-100 !transition"
              >
                {t("manager.stockLabels.manageTanks", "Manage Tanks")}
              </button>
            </div>

            {!row.hasStockRecord && (
              <div className="!rounded-[14px] !bg-amber-50 !p-3 !border !border-amber-100">
                <p className="!text-[11px] !font-bold !text-amber-700">{t("manager.stockLabels.noStockRecord", "No stock record for this date.")}</p>
              </div>
            )}

            <section className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100">
              <h2 className="!text-[14px] !font-bold !text-slate-900 !mb-4">{t("manager.stockLabels.stockCalculation", "Stock Calculation")}</h2>
              
              <Input label={t("manager.stockLabels.openingStockLitres", "Opening Stock")} value={form.openingStockLitres} onChange={change(setForm, "openingStockLitres")} required />
              
              <div className="!space-y-1 !mt-2">
                <ReadRow label={t("manager.stockLabels.receiptStock", "+ Receipt Stock")} value={row.receiptStockLitres} />
                <ReadRow label={t("manager.stockLabels.totalAvailable", "Total Available")} value={row.totalAvailableLitres} isHighlighted />
                <ReadRow label={t("manager.stockLabels.actualSales", "- Actual Sales")} value={row.actualSalesLitres} />
                <ReadRow label={t("manager.stockLabels.calculatedClosing", "Closing Stock")} value={row.calculatedClosingStockLitres} />
              </div>
            </section>

            <section className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100">
              <h2 className="!text-[14px] !font-bold !text-slate-900 !mb-4">{t("manager.stockLabels.physicalVerification", "Physical Verification")}</h2>
              <div className="!grid !grid-cols-2 !gap-3">
                <Input label={t("manager.stockLabels.productDip", "Product Dip (cm)")} value={form.productDip} onChange={change(setForm, "productDip")} />
                <Input label={t("manager.stockLabels.actualDipStockLitres", "Actual Dip Stock (Ltr)")} value={form.actualDipStockLitres} onChange={change(setForm, "actualDipStockLitres")} />
              </div>
              <ReadRow label={t("manager.stockLabels.variation", "Variation (Ltr)")} value={row.variationLitres} unit=" L" isHighlighted />
              <p className="!text-[9px] !font-medium !text-slate-400 !mt-2 !mb-4">
                ⓘ {t("manager.stockLabels.variationFormula", "Variation = Actual Dip Stock - Closing Stock")}
              </p>

              <h2 className="!text-[12px] !font-bold !text-slate-900 !mb-3 !border-t !border-slate-100 !pt-4">{t("manager.stockLabels.waterSection", "Water Verification")}</h2>
              <div className="!grid !grid-cols-2 !gap-3">
                <Input label={t("manager.stockLabels.waterDip", "Water Dip (cm)")} value={form.waterDip} onChange={change(setForm, "waterDip")} />
                <Input label={t("manager.stockLabels.waterDipVolumeLitres", "Water Volume (Ltr)")} value={form.waterDipVolumeLitres} onChange={change(setForm, "waterDipVolumeLitres")} />
              </div>
            </section>

            <Button onClick={saveStock}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {t("manager.stockLabels.save", "Save / Update Stock")}
            </Button>
          </>
        )}

        {/* TAB 2: RECORDS */}
        {tab === "records" && (
          <>
            <div className="!grid !grid-cols-2 !rounded-[12px] !bg-slate-100/60 !p-1 !mb-2">
              <button
                onClick={() => setRecordsSubTab("density")}
                className={`!min-h-[36px] !rounded-[10px] !text-[11px] !font-bold !transition-all ${recordsSubTab === "density" ? "!bg-emerald-800 !text-white" : "!text-slate-500"}`}
              >
                {t("manager.stockLabels.dailyDensity", "Daily Density")}
              </button>
              <button
                onClick={() => setRecordsSubTab("receipts")}
                className={`!min-h-[36px] !rounded-[10px] !text-[11px] !font-bold !transition-all ${recordsSubTab === "receipts" ? "!bg-emerald-800 !text-white" : "!text-slate-500"}`}
              >
                {t("manager.stockLabels.fuelReceipts", "Fuel Receipts")}
              </button>
            </div>

            {recordsSubTab === "density" && (
              <section className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100">
                <h2 className="!text-[14px] !font-bold !text-slate-900 !mb-4">{t("manager.stockLabels.dailyDensity", "Daily Density Record")}</h2>
                <Input label={t("manager.stockLabels.hydrometerReading", "Hydrometer Reading")} value={densityForm.hydrometerReading} onChange={change(setDensityForm, "hydrometerReading")} />
                <Input label={t("manager.stockLabels.temperatureC", "Temperature (°C)")} value={densityForm.temperatureC} onChange={change(setDensityForm, "temperatureC")} />
                <Input label={t("manager.stockLabels.density15", "Density at 15°C")} value={densityForm.density15} onChange={change(setDensityForm, "density15")} />
                <Button onClick={() => save(() => upsertManagerDensity({
                  businessDate: date, product,
                  ...Object.fromEntries(Object.entries(densityForm).map(([key, value]) => [key, value === "" ? null : n(value)])),
                }))}>
                  {t("manager.stockLabels.saveDensity", "+ Add / Update Density")}
                </Button>
              </section>
            )}

            {recordsSubTab === "receipts" && (
              <section className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100">
                <div className="!flex !items-center !justify-between !mb-4">
                  <h2 className="!text-[14px] !font-bold !text-slate-900">{t("manager.stockLabels.addReceipt", "Add Receipt")}</h2>
                </div>
                
                <h3 className="!text-[11px] !font-extrabold !text-emerald-700 !bg-emerald-50 !py-1.5 !px-3 !rounded-lg !mb-3">{t("manager.stockLabels.basicDetails", "Basic Details")}</h3>
                <Input type="text" label={t("manager.stockLabels.invoiceNumber", "Invoice Number")} value={receipt.invoiceNumber} onChange={changeReceipt("invoiceNumber")} />
                <Input type="number" label={t("manager.stockLabels.quantityLitres", "Quantity (Ltr)")} value={receipt.quantityLitres} onChange={changeReceipt("quantityLitres")} />
                <Input type="text" label={t("manager.stockLabels.supplierName", "Supplier Name")} value={receipt.supplierName} onChange={changeReceipt("supplierName")} />
                <Input type="text" label={t("manager.stockLabels.tankerNumber", "Tanker Number")} value={receipt.tankerNumber} onChange={changeReceipt("tankerNumber")} />

                <h3 className="!text-[11px] !font-extrabold !text-emerald-700 !bg-emerald-50 !py-1.5 !px-3 !rounded-lg !mb-3 !mt-4">{t("manager.stockLabels.beforeDecantation", "Before Decantation (Observed)")}</h3>
                <Input type="number" label={t("manager.stockLabels.beforeHydrometer", "Hydrometer Reading")} value={receipt.beforeHydrometer} onChange={changeReceipt("beforeHydrometer")} />
                <Input type="number" label={t("manager.stockLabels.beforeTemperatureC", "Temperature (°C)")} value={receipt.beforeTemperatureC} onChange={changeReceipt("beforeTemperatureC")} />
                <Input type="number" label={t("manager.stockLabels.beforeDensity15", "Density at 15°C")} value={receipt.beforeDensity15} onChange={changeReceipt("beforeDensity15")} />

                <h3 className="!text-[11px] !font-extrabold !text-emerald-700 !bg-emerald-50 !py-1.5 !px-3 !rounded-lg !mb-3 !mt-4">{t("manager.stockLabels.challan", "Challan Details")}</h3>
                <Input type="number" label={t("manager.stockLabels.challanDensity15", "Challan Density at 15°C")} value={receipt.challanDensity15} onChange={changeReceipt("challanDensity15")} />
                <Input type="number" label={t("manager.stockLabels.beforeDensityDifference", "Density Difference (Observed - Challan)")} value={receipt.beforeDensityDifference} onChange={changeReceipt("beforeDensityDifference")} />

                <h3 className="!text-[11px] !font-extrabold !text-emerald-700 !bg-emerald-50 !py-1.5 !px-3 !rounded-lg !mb-3 !mt-4">{t("manager.stockLabels.afterDecantation", "After Decantation")}</h3>
                <Input type="number" label={t("manager.stockLabels.afterHydrometer", "Hydrometer Reading")} value={receipt.afterHydrometer} onChange={changeReceipt("afterHydrometer")} />
                <Input type="number" label={t("manager.stockLabels.afterTemperatureC", "Temperature (°C)")} value={receipt.afterTemperatureC} onChange={changeReceipt("afterTemperatureC")} />
                <Input type="number" label={t("manager.stockLabels.afterDensity15", "Density at 15°C")} value={receipt.afterDensity15} onChange={changeReceipt("afterDensity15")} />
                <Input type="number" label={t("manager.stockLabels.afterChallanDensity15", "Challan Density at 15°C")} value={receipt.afterChallanDensity15} onChange={changeReceipt("afterChallanDensity15")} />
                <Input type="number" label={t("manager.stockLabels.afterDensityDifference", "Density Difference")} value={receipt.afterDensityDifference} onChange={changeReceipt("afterDensityDifference")} />

                <div className="!mt-2">
                  <Button onClick={() => save(() => {
                    const payload = { businessDate: date, product };
                    Object.keys(receipt).forEach(k => {
                      if (["invoiceNumber", "supplierName", "tankerNumber"].includes(k)) {
                        payload[k] = receipt[k];
                      } else {
                        payload[k] = receipt[k] === "" ? null : Number(receipt[k]);
                      }
                    });
                    return createManagerReceipt(payload);
                  })}>
                    {t("manager.stockLabels.saveReceipt", "+ Save Fuel Receipt")}
                  </Button>
                </div>
              </section>
            )}

            {/* List Receipts if tab is receipts */}
            {recordsSubTab === "receipts" && (
              <div className="!mt-4 !space-y-3">
                <h3 className="!text-[13px] !font-bold !text-slate-800 !px-1">{t("manager.stockLabels.recentReceipts", "Recent Receipts")}</h3>
                {receipts.length === 0 && <p className="!text-[11px] !font-medium !text-slate-500 !px-1">{t("manager.stockLabels.noReceipts", "No receipts found for this date.")}</p>}
                {receipts.map((item) => (
                  <button 
                    key={item._id} 
                    type="button" 
                    onClick={() => setSelectedReceipt(item)} 
                    className="!w-full !flex !items-center !justify-between !rounded-[14px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100 hover:!border-emerald-200 !transition-all"
                  >
                    <div className="!flex !items-center !gap-3">
                      <div className="!h-10 !w-10 !rounded-[10px] !bg-red-50 !text-red-500 !flex !items-center !justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-5 !w-5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                      </div>
                      <div className="!text-left">
                        <p className="!text-[10px] !font-bold !text-slate-500">Invoice: {item.invoiceNumber}</p>
                        <p className="!text-[13px] !font-extrabold !text-slate-900">{item.product}</p>
                      </div>
                    </div>
                    <div className="!text-right">
                      <p className="!text-[10px] !font-bold !text-slate-500">{item.businessDate}</p>
                      <p className="!text-[13px] !font-extrabold !text-emerald-700">{formatLitres(item.quantityLitres)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 3: RATES */}
        {tab === "rates" && (() => {
          const applicableRate = rates.find(r => r.businessDate <= date);
          return (
            <>
              <section className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100">
                <h2 className="!text-[14px] !font-bold !text-slate-900 !mb-4">{t("manager.stockLabels.currentApplicableRate", "Current Applicable Rate")}</h2>
                {applicableRate ? (
                  <div className="!grid !grid-cols-2 !gap-3">
                    <div className="!rounded-[12px] !bg-rose-50/50 !border !border-rose-100 !p-3">
                      <p className="!text-[10px] !font-bold !text-rose-600">{t("manager.petrol", "Petrol (MS)")}</p>
                      <p className="!mt-1 !text-[16px] !font-extrabold !text-slate-900">₹{(applicableRate.petrolRatePaise / 100).toFixed(2)} <span className="!text-[10px] !font-bold !text-slate-500">/ L</span></p>
                    </div>
                    <div className="!rounded-[12px] !bg-sky-50/50 !border !border-sky-100 !p-3">
                      <p className="!text-[10px] !font-bold !text-blue-600">{t("manager.diesel", "Diesel (HSD)")}</p>
                      <p className="!mt-1 !text-[16px] !font-extrabold !text-slate-900">₹{(applicableRate.dieselRatePaise / 100).toFixed(2)} <span className="!text-[10px] !font-bold !text-slate-500">/ L</span></p>
                    </div>
                    <div className="!col-span-2 !mt-1 !bg-slate-50 !rounded-[10px] !p-2 !flex !items-center !justify-between">
                      <span className="!text-[10px] !font-bold !text-slate-500">{t("manager.stockLabels.effectiveFrom", "Effective From")}</span>
                      <span className="!text-[11px] !font-extrabold !text-slate-800">{applicableRate.businessDate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="!rounded-[14px] !bg-slate-50 !p-4 !border !border-slate-100 !text-center">
                    <p className="!text-[12px] !font-bold !text-slate-500">No applicable rate for this date.</p>
                  </div>
                )}
              </section>
              
              <section className="!rounded-[16px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100">
                <h2 className="!text-[14px] !font-bold !text-slate-900 !mb-4">{t("manager.stockLabels.addRate", "Update Fuel Rates")}</h2>
                <Input type="date" label={t("manager.stockLabels.effectiveDate", "Effective Date")} value={rate.businessDate} onChange={change(setRate, "businessDate")} />
                <div className="!grid !grid-cols-2 !gap-3">
                  <Input type="number" label={t("manager.stockLabels.petrolRateRupees", "Petrol Rate (₹)")} value={rate.petrolRateRupees} onChange={change(setRate, "petrolRateRupees")} />
                  <Input type="number" label={t("manager.stockLabels.dieselRateRupees", "Diesel Rate (₹)")} value={rate.dieselRateRupees} onChange={change(setRate, "dieselRateRupees")} />
                </div>
                <div className="!mt-2">
                  <Button onClick={saveRate}>{t("manager.stockLabels.saveRate", "Save Rates")}</Button>
                </div>
              </section>

              <section className="!mt-2">
                <h2 className="!text-[13px] !font-bold !text-slate-800 !px-1 !mb-3">{t("manager.stockLabels.rateHistory", "Rate History")}</h2>
                <div className="!space-y-3">
                  {rates.length === 0 && <p className="!text-[11px] !font-medium !text-slate-500 !px-1">No rate history found.</p>}
                  {rates.map((item) => (
                    <div key={item._id} className="!rounded-[14px] !bg-white !p-4 !shadow-[0_4px_16px_rgba(15,23,42,0.03)] !border !border-slate-100">
                      <div className="!flex !justify-between !items-center !mb-3 !pb-3 !border-b !border-slate-100">
                        <span className="!text-[11px] !font-extrabold !text-slate-900">{item.businessDate}</span>
                        {item.setBy?.name && <span className="!text-[9px] !font-bold !text-slate-500 !bg-slate-50 !px-2 !py-1 !rounded-md">By {item.setBy.name}</span>}
                      </div>
                      <div className="!flex !justify-between !items-center">
                        <div className="!text-center">
                          <p className="!text-[10px] !font-bold !text-slate-500">{t("manager.petrol", "Petrol")}</p>
                          <p className="!text-[13px] !font-extrabold !text-rose-600">₹{(item.petrolRatePaise / 100).toFixed(2)}</p>
                        </div>
                        <div className="!h-8 !w-px !bg-slate-100"></div>
                        <div className="!text-center">
                          <p className="!text-[10px] !font-bold !text-slate-500">{t("manager.diesel", "Diesel")}</p>
                          <p className="!text-[13px] !font-extrabold !text-blue-600">₹{(item.dieselRatePaise / 100).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          );
        })()}
      </div>

      {tankDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-[20px] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between !mb-2">
              <h2 className="!text-[15px] !font-bold !text-slate-900">{t("manager.stockLabels.manageTanks", "Manage Tanks")}</h2>
              <button type="button" onClick={() => setTankDialog(false)} className="!h-8 !w-8 !rounded-full !bg-slate-100 !flex !items-center !justify-center !text-slate-500 hover:!bg-slate-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="!space-y-3 !max-h-[40vh] !overflow-y-auto !pr-1">
              {tanks.map((tank) => (
                <div key={tank._id} className="!flex !items-center !justify-between !gap-2 !rounded-[14px] !border !border-slate-100 !bg-slate-50/50 !p-3">
                  <div className="min-w-0 flex-1">
                    <p className="!text-[12px] !font-bold !text-slate-900">{tank.tankNumber} · <span className={tank.product === "PETROL" ? "!text-rose-600" : "!text-blue-600"}>{tank.product}</span></p>
                    <p className="!text-[10px] !font-medium !text-slate-500">{Number(tank.capacityLitres).toFixed(2)} L · {tank.isActive ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="!flex !flex-col !gap-1">
                    <button type="button" onClick={() => openTankDialog(tank)} className="!text-[10px] !font-bold !text-emerald-700 !bg-emerald-50 !px-2 !py-1 !rounded-md">Edit</button>
                    <button type="button" onClick={() => setTankActive(tank)} className={`!text-[10px] !font-bold !px-2 !py-1 !rounded-md ${tank.isActive ? "!text-rose-700 !bg-rose-50" : "!text-sky-700 !bg-sky-50"}`}>
                      {tank.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="!space-y-3 !border-t !border-slate-100 !pt-4">
              <h3 className="!text-[13px] !font-bold !text-slate-800">{editingTank ? "Edit Tank" : "Add New Tank"}</h3>
              <Input type="text" label={t("manager.stockLabels.tankNumber", "Tank Name / Number")} value={tankForm.tankNumber} onChange={change(setTankForm, "tankNumber")} required />
              <label className="block !text-[11px] !font-bold !text-slate-600 !mb-3">
                {t("manager.stockLabels.product", "Product")}
                <select value={tankForm.product} onChange={change(setTankForm, "product")} className="!mt-1.5 !min-h-[46px] !w-full !rounded-[12px] !border !border-slate-200/60 !bg-slate-50 !px-4 !text-[14px] !font-bold !text-slate-900">
                  <option value="PETROL">{t("manager.petrol", "Petrol (MS)")}</option>
                  <option value="DIESEL">{t("manager.diesel", "Diesel (HSD)")}</option>
                </select>
              </label>
              <Input type="number" label={t("manager.stockLabels.capacityLitres", "Capacity (Ltr)")} value={tankForm.capacityLitres} onChange={change(setTankForm, "capacityLitres")} required />
              <div className="!grid !grid-cols-2 !gap-3 !mt-4">
                <Button secondary onClick={() => openTankDialog()}>Clear</Button>
                <Button onClick={saveTank}>Save</Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-[20px] bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between !mb-2">
              <h2 className="!text-[15px] !font-bold !text-slate-900">Receipt Details</h2>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="!h-8 !w-8 !rounded-full !bg-slate-100 !flex !items-center !justify-center !text-slate-500 hover:!bg-slate-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-4 !w-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="!rounded-[14px] !bg-slate-50 !p-4 !mb-4">
              <div className="!grid !grid-cols-2 !gap-3 !mb-3 !pb-3 !border-b !border-slate-200/60">
                <div>
                  <p className="!text-[10px] !font-medium !text-slate-500">Invoice No.</p>
                  <p className="!text-[12px] !font-extrabold !text-slate-900">{selectedReceipt.invoiceNumber}</p>
                </div>
                <div>
                  <p className="!text-[10px] !font-medium !text-slate-500">Date</p>
                  <p className="!text-[12px] !font-extrabold !text-slate-900">{selectedReceipt.businessDate}</p>
                </div>
              </div>
              <div className="!grid !grid-cols-2 !gap-3">
                <div>
                  <p className="!text-[10px] !font-medium !text-slate-500">Product</p>
                  <p className="!text-[12px] !font-extrabold !text-slate-900">{selectedReceipt.product}</p>
                </div>
                <div>
                  <p className="!text-[10px] !font-medium !text-slate-500">Quantity</p>
                  <p className="!text-[12px] !font-extrabold !text-emerald-700">{formatLitres(selectedReceipt.quantityLitres)}</p>
                </div>
              </div>
            </div>
            
            <div className="!space-y-1">
              <h3 className="!text-[11px] !font-extrabold !text-emerald-700 !bg-emerald-50 !py-1.5 !px-3 !rounded-lg !mb-2">Before Receipt (Observed)</h3>
              <ReadRow label="Hydrometer Reading" value={selectedReceipt.beforeHydrometer} unit="" />
              <ReadRow label="Temperature (°C)" value={selectedReceipt.beforeTemperatureC} unit=" °C" />
              <ReadRow label="Density at 15°C" value={selectedReceipt.beforeDensity15} unit="" />
              
              <h3 className="!text-[11px] !font-extrabold !text-amber-700 !bg-amber-50 !py-1.5 !px-3 !rounded-lg !mb-2 !mt-4">Challan Details</h3>
              <ReadRow label="Challan Density at 15°C" value={selectedReceipt.challanDensity15} unit="" />
              <ReadRow label="Density Difference" value={selectedReceipt.beforeDensityDifference} unit="" isHighlighted />
              
              <h3 className="!text-[11px] !font-extrabold !text-purple-700 !bg-purple-50 !py-1.5 !px-3 !rounded-lg !mb-2 !mt-4">After Decantation</h3>
              <ReadRow label="Hydrometer Reading" value={selectedReceipt.afterHydrometer} unit="" />
              <ReadRow label="Temperature (°C)" value={selectedReceipt.afterTemperatureC} unit=" °C" />
              <ReadRow label="Density at 15°C" value={selectedReceipt.afterDensity15} unit="" />
              <ReadRow label="Challan Density at 15°C" value={selectedReceipt.afterChallanDensity15} unit="" />
              <ReadRow label="Density Difference" value={selectedReceipt.afterDensityDifference} unit="" isHighlighted />
            </div>

          </section>
        </div>
      )}
    </ManagerLayout>
  );
};

export default Stock;
