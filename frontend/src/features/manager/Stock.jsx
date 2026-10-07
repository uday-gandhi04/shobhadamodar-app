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
  <label className="block text-[10px] font-bold text-slate-600">
    {label}
    <input
      type={type}
      value={value}
      required={required}
      onChange={onChange}
      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
    />
  </label>
);
const Button = ({ children, onClick, disabled = false, secondary = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`min-h-11 w-full rounded-xl px-3 text-xs font-bold disabled:opacity-50 ${secondary ? "border border-slate-200 bg-white text-slate-700" : "bg-bpcl-emerald text-white"}`}
  >
    {children}
  </button>
);
const Read = ({ label, value, unit = " L", isText = false }) => (
  <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm">
    <span className="text-slate-500">{label}</span>
    <b className="text-right max-w-[60%] truncate">{value == null || value === "" ? "—" : (isText ? value : `${Number(value).toFixed(2)}${unit}`)}</b>
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

const Stock = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState("stock");
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
    <ManagerLayout title={t("manager.stock")} showBack>
      <div className="space-y-4">
        <div className="grid grid-cols-3 rounded-xl bg-white p-1 shadow-sm">
          { [["stock", "stockTab"], ["records", "recordsTab"], ["rates", "ratesTab"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg py-2 text-[10px] font-bold ${tab === key ? "bg-bpcl-emerald text-white" : "text-slate-500"}`}
            >
              {t(`manager.stockLabels.${label}`)}
            </button>
          ))}
        </div>
        <Input type="date" label={t("manager.stockLabels.businessDate")} value={date} onChange={(e) => setDate(e.target.value)} />
        {notice && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</p>}

        {tab !== "rates" && (
          <div className="grid grid-cols-2 rounded-xl bg-white p-1">
            {["PETROL", "DIESEL"].map((value) => (
              <button
                key={value}
                onClick={() => selectProduct(value)}
                className={`rounded-lg py-2 text-xs font-bold ${product === value ? "bg-slate-900 text-white" : "text-slate-500"}`}
              >
                {t(`manager.${value.toLowerCase()}`)}
              </button>
            ))}
          </div>
        )}

        {tab === "stock" && (
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">{t("manager.stockLabels.stockDetails")}</h2>
            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-700">{t("manager.stockLabels.tankContext")}</p>
              {activeTanks.length > 0 ? (
                <>
                  <label className="block text-[10px] font-bold text-slate-600">
                    {t("manager.stockLabels.selectTank")}
                    <select
                      value={selectedTank?._id || ""}
                      onChange={(e) => setSelectedTankId(e.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                      {activeTanks.map((tank) => (
                        <option key={tank._id} value={tank._id}>
                          {tank.tankNumber} · {Number(tank.capacityLitres).toFixed(2)} L
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedTank && <p className="text-[10px] text-slate-500">{selectedTank.product} · {Number(selectedTank.capacityLitres).toFixed(2)} L</p>}
                </>
              ) : <p className="text-xs text-slate-500">{t("manager.stockLabels.noActiveTanks")}</p>}
              <p className="text-[10px] text-slate-500">{t("manager.stockLabels.tankContextOnly")}</p>
              <Button secondary onClick={() => openTankDialog()}>{t("manager.stockLabels.manageTanks")}</Button>
            </div>

            {!row.hasStockRecord && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{t("manager.stockLabels.noStockRecord")}</p>
            )}

            <Input
              label={t("manager.stockLabels.openingStockLitres")}
              value={form.openingStockLitres}
              onChange={change(setForm, "openingStockLitres")}
              required
            />
            <Read label={t("manager.stockLabels.receiptStock")} value={row.receiptStockLitres} />
            <Read label={t("manager.stockLabels.totalAvailable")} value={row.totalAvailableLitres} />
            <Read label={t("manager.stockLabels.actualSales")} value={row.actualSalesLitres} />
            <Read label={t("manager.stockLabels.calculatedClosing")} value={row.calculatedClosingStockLitres} />

            <h3 className="border-t pt-3 text-sm font-bold">{t("manager.stockLabels.physicalVerification")}</h3>
            <Input label={t("manager.stockLabels.productDip")} value={form.productDip} onChange={change(setForm, "productDip")} />
            <Input label={t("manager.stockLabels.actualDipStockLitres")} value={form.actualDipStockLitres} onChange={change(setForm, "actualDipStockLitres")} />
            <Read label={t("manager.stockLabels.variation")} value={row.variationLitres} unit=" L" />

            <h3 className="border-t pt-3 text-sm font-bold">{t("manager.stockLabels.waterSection")}</h3>
            <Input label={t("manager.stockLabels.waterDip")} value={form.waterDip} onChange={change(setForm, "waterDip")} />
            <Input label={t("manager.stockLabels.waterDipVolumeLitres")} value={form.waterDipVolumeLitres} onChange={change(setForm, "waterDipVolumeLitres")} />
            <Button onClick={saveStock}>{t("manager.stockLabels.save")}</Button>
          </section>
        )}

        {tab === "records" && (
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">{t("manager.stockLabels.dailyDensity")}</h2>
            {Object.keys(densityForm).map((key) => (
              <Input key={key} label={t(`manager.stockLabels.${key}`)} value={densityForm[key]} onChange={change(setDensityForm, key)} />
            ))}
            <Button onClick={() => save(() => upsertManagerDensity({
              businessDate: date,
              product,
              ...Object.fromEntries(Object.entries(densityForm).map(([key, value]) => [key, value === "" ? null : n(value)])),
            }))}>{t("manager.stockLabels.saveDensity")}</Button>
            
            <h2 className="border-t pt-4 font-bold">{t("manager.stockLabels.fuelReceipts")}</h2>
            
            <h3 className="text-sm font-bold mt-2">{t("manager.stockLabels.basicDetails")}</h3>
            <Input type="text" label={t("manager.stockLabels.invoiceNumber")} value={receipt.invoiceNumber} onChange={changeReceipt("invoiceNumber")} />
            <Input type="number" label={t("manager.stockLabels.quantityLitres")} value={receipt.quantityLitres} onChange={changeReceipt("quantityLitres")} />
            <Input type="text" label={t("manager.stockLabels.supplierName")} value={receipt.supplierName} onChange={changeReceipt("supplierName")} />
            <Input type="text" label={t("manager.stockLabels.tankerNumber")} value={receipt.tankerNumber} onChange={changeReceipt("tankerNumber")} />

            <h3 className="text-sm font-bold mt-2">{t("manager.stockLabels.beforeDecantation")}</h3>
            <Input type="number" label={t("manager.stockLabels.beforeHydrometer")} value={receipt.beforeHydrometer} onChange={changeReceipt("beforeHydrometer")} />
            <Input type="number" label={t("manager.stockLabels.beforeTemperatureC")} value={receipt.beforeTemperatureC} onChange={changeReceipt("beforeTemperatureC")} />
            <Input type="number" label={t("manager.stockLabels.beforeDensity15")} value={receipt.beforeDensity15} onChange={changeReceipt("beforeDensity15")} />

            <h3 className="text-sm font-bold mt-2">{t("manager.stockLabels.challan")}</h3>
            <Input type="number" label={t("manager.stockLabels.challanDensity15")} value={receipt.challanDensity15} onChange={changeReceipt("challanDensity15")} />
            <Input type="number" label={t("manager.stockLabels.beforeDensityDifference")} value={receipt.beforeDensityDifference} onChange={changeReceipt("beforeDensityDifference")} />

            <h3 className="text-sm font-bold mt-2">{t("manager.stockLabels.afterDecantation")}</h3>
            <Input type="number" label={t("manager.stockLabels.afterHydrometer")} value={receipt.afterHydrometer} onChange={changeReceipt("afterHydrometer")} />
            <Input type="number" label={t("manager.stockLabels.afterTemperatureC")} value={receipt.afterTemperatureC} onChange={changeReceipt("afterTemperatureC")} />
            <Input type="number" label={t("manager.stockLabels.afterDensity15")} value={receipt.afterDensity15} onChange={changeReceipt("afterDensity15")} />
            <Input type="number" label={t("manager.stockLabels.afterChallanDensity15")} value={receipt.afterChallanDensity15} onChange={changeReceipt("afterChallanDensity15")} />
            <Input type="number" label={t("manager.stockLabels.afterDensityDifference")} value={receipt.afterDensityDifference} onChange={changeReceipt("afterDensityDifference")} />

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
            })}>{t("manager.stockLabels.saveReceipt")}</Button>
            
            {receipts.length === 0 && <p className="text-xs text-slate-500 py-2 border-t">{t("manager.stockLabels.noReceipts")}</p>}
            {receipts.map((item) => (
              <button key={item._id} type="button" onClick={() => setSelectedReceipt(item)} className="block w-full text-left border-t py-2 text-xs hover:bg-slate-50">
                {item.invoiceNumber} · {item.product} · {item.quantityLitres} L
              </button>
            ))}
          </section>
        )}

        {tab === "rates" && (() => {
          const applicableRate = rates.find(r => r.businessDate <= date);
          return (
            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
              <div>
                <h2 className="font-bold text-lg mb-2">{t("manager.stockLabels.currentApplicableRate")}</h2>
                {applicableRate ? (
                  <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-4 rounded-xl shadow-inner border border-slate-100">
                    <div>
                      <p className="text-slate-500 font-bold">{t("manager.petrol")}</p>
                      <p className="font-extrabold text-slate-800">₹{(applicableRate.petrolRatePaise / 100).toFixed(2)} <span className="text-xs font-normal text-slate-500">/ L</span></p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold">{t("manager.diesel")}</p>
                      <p className="font-extrabold text-slate-800">₹{(applicableRate.dieselRatePaise / 100).toFixed(2)} <span className="text-xs font-normal text-slate-500">/ L</span></p>
                    </div>
                    <div className="col-span-2 mt-2 pt-2 border-t">
                      <p className="text-slate-500 text-xs font-bold uppercase">{t("manager.stockLabels.effectiveFrom")}</p>
                      <p className="font-bold text-slate-700">{applicableRate.businessDate}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">No applicable rate for this date.</p>
                )}
              </div>
              
              <div className="border-t pt-4 space-y-3">
                <h2 className="font-bold">{t("manager.stockLabels.addRate")}</h2>
                <Input type="date" label={t("manager.stockLabels.effectiveDate")} value={rate.businessDate} onChange={change(setRate, "businessDate")} />
                <Input type="number" label={t("manager.stockLabels.petrolRateRupees")} value={rate.petrolRateRupees} onChange={change(setRate, "petrolRateRupees")} />
                <Input type="number" label={t("manager.stockLabels.dieselRateRupees")} value={rate.dieselRateRupees} onChange={change(setRate, "dieselRateRupees")} />
                <Button onClick={saveRate}>{t("manager.stockLabels.saveRate")}</Button>
              </div>

              <div className="border-t pt-4 space-y-2">
                <h2 className="font-bold">{t("manager.stockLabels.rateHistory")}</h2>
                {rates.length === 0 && <p className="text-xs text-slate-500 py-2">No rates found.</p>}
                {rates.map((item) => (
                  <div key={item._id} className="border border-slate-100 text-sm bg-slate-50 rounded-xl p-3 space-y-1">
                    <p className="font-bold text-slate-800">{item.businessDate}</p>
                    <div className="flex justify-between font-medium">
                      <span>{t("manager.petrol")}: <span className="text-slate-600">₹{(item.petrolRatePaise / 100).toFixed(2)}</span></span>
                      <span>{t("manager.diesel")}: <span className="text-slate-600">₹{(item.dieselRatePaise / 100).toFixed(2)}</span></span>
                    </div>
                    {item.setBy?.name && <p className="text-xs text-slate-500 mt-2 border-t pt-2 border-slate-200">{t("manager.stockLabels.setBy")} {item.setBy.name}</p>}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}
      </div>

      {tankDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="tank-dialog-title" className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 id="tank-dialog-title" className="font-bold">{t("manager.stockLabels.manageTanks")}</h2>
              <button type="button" onClick={() => setTankDialog(false)} className="p-2 text-sm font-bold text-slate-500">{t("manager.stockLabels.cancel")}</button>
            </div>
            <div className="space-y-2">
              {tanks.map((tank) => (
                <div key={tank._id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{tank.tankNumber} · {tank.product}</p>
                    <p className="text-xs text-slate-500">{Number(tank.capacityLitres).toFixed(2)} L · {tank.isActive ? t("manager.stockLabels.active") : t("manager.stockLabels.inactive")}</p>
                  </div>
                  <button type="button" onClick={() => openTankDialog(tank)} className="rounded-lg border px-3 py-2 text-xs font-bold">{t("manager.stockLabels.edit")}</button>
                  <button type="button" onClick={() => setTankActive(tank)} className="rounded-lg border px-3 py-2 text-xs font-bold">
                    {tank.isActive ? t("manager.stockLabels.deactivate") : t("manager.stockLabels.activate")}
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-bold">{editingTank ? t("manager.stockLabels.editTank") : t("manager.stockLabels.addTank")}</h3>
              <Input type="text" label={t("manager.stockLabels.tankNumber")} value={tankForm.tankNumber} onChange={change(setTankForm, "tankNumber")} required />
              <label className="block text-[10px] font-bold text-slate-600">
                {t("manager.stockLabels.product")}
                <select value={tankForm.product} onChange={change(setTankForm, "product")} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="PETROL">{t("manager.petrol")}</option>
                  <option value="DIESEL">{t("manager.diesel")}</option>
                </select>
              </label>
              <Input type="number" label={t("manager.stockLabels.capacityLitres")} value={tankForm.capacityLitres} onChange={change(setTankForm, "capacityLitres")} required />
              <div className="grid grid-cols-2 gap-2">
                <Button secondary onClick={() => openTankDialog()}>{t("manager.stockLabels.addTank")}</Button>
                <Button onClick={saveTank}>{t("manager.stockLabels.saveTank")}</Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="receipt-dialog-title" className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 id="receipt-dialog-title" className="font-bold">{t("manager.stockLabels.receiptDetail")}</h2>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="p-2 text-sm font-bold text-slate-500">{t("manager.stockLabels.close")}</button>
            </div>
            <div className="space-y-2 text-sm">
              <Read label={t("manager.stockLabels.invoiceNumber")} value={selectedReceipt.invoiceNumber} isText />
              <Read label={t("manager.stockLabels.product")} value={selectedReceipt.product} isText />
              <Read label={t("manager.stockLabels.businessDate")} value={selectedReceipt.businessDate} isText />
              <Read label={t("manager.stockLabels.quantityLitres")} value={selectedReceipt.quantityLitres} unit=" L" />
              <Read label={t("manager.stockLabels.supplierName")} value={selectedReceipt.supplierName} isText />
              <Read label={t("manager.stockLabels.tankerNumber")} value={selectedReceipt.tankerNumber} isText />
              
              <h3 className="font-bold pt-2">{t("manager.stockLabels.beforeDecantation")}</h3>
              <Read label={t("manager.stockLabels.beforeHydrometer")} value={selectedReceipt.beforeHydrometer} unit="" />
              <Read label={t("manager.stockLabels.beforeTemperatureC")} value={selectedReceipt.beforeTemperatureC} unit=" °C" />
              <Read label={t("manager.stockLabels.beforeDensity15")} value={selectedReceipt.beforeDensity15} unit="" />
              
              <h3 className="font-bold pt-2">{t("manager.stockLabels.challan")}</h3>
              <Read label={t("manager.stockLabels.challanDensity15")} value={selectedReceipt.challanDensity15} unit="" />
              <Read label={t("manager.stockLabels.beforeDensityDifference")} value={selectedReceipt.beforeDensityDifference} unit="" />
              
              <h3 className="font-bold pt-2">{t("manager.stockLabels.afterDecantation")}</h3>
              <Read label={t("manager.stockLabels.afterHydrometer")} value={selectedReceipt.afterHydrometer} unit="" />
              <Read label={t("manager.stockLabels.afterTemperatureC")} value={selectedReceipt.afterTemperatureC} unit=" °C" />
              <Read label={t("manager.stockLabels.afterDensity15")} value={selectedReceipt.afterDensity15} unit="" />
              <Read label={t("manager.stockLabels.afterChallanDensity15")} value={selectedReceipt.afterChallanDensity15} unit="" />
              <Read label={t("manager.stockLabels.afterDensityDifference")} value={selectedReceipt.afterDensityDifference} unit="" />
            </div>
          </section>
        </div>
      )}
    </ManagerLayout>
  );
};

export default Stock;
