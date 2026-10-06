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
const Read = ({ label, value }) => (
  <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm">
    <span className="text-slate-500">{label}</span>
    <b>{value == null ? "—" : `${Number(value).toFixed(2)} L`}</b>
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
  const [receipt, setReceipt] = useState({ invoiceNumber: "", quantityLitres: "", supplierName: "", tankerNumber: "" });
  const [rate, setRate] = useState({ businessDate: getBusinessDate(), petrolRatePaise: "", dieselRatePaise: "" });

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
            <Read label={t("manager.stockLabels.variation")} value={row.variationLitres} />

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
              ...Object.fromEntries(Object.entries(densityForm).map(([key, value]) => [key, n(value)])),
            }))}>{t("manager.stockLabels.saveDensity")}</Button>
            <h2 className="border-t pt-4 font-bold">{t("manager.stockLabels.fuelReceipts")}</h2>
            {Object.keys(receipt).map((key) => (
              <Input key={key} type={key === "quantityLitres" ? "number" : "text"} label={t(`manager.stockLabels.${key}`)} value={receipt[key]} onChange={change(setReceipt, key)} />
            ))}
            <Button onClick={() => save(() => createManagerReceipt({
              businessDate: date,
              product,
              ...receipt,
              quantityLitres: n(receipt.quantityLitres),
            }))}>{t("manager.stockLabels.saveReceipt")}</Button>
            {receipts.map((item) => (
              <p key={item._id} className="border-t py-2 text-xs">{item.invoiceNumber} · {item.product} · {item.quantityLitres} L</p>
            ))}
          </section>
        )}

        {tab === "rates" && (
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">{t("manager.stockLabels.addRate")}</h2>
            <Input type="date" label={t("manager.stockLabels.effectiveDate")} value={rate.businessDate} onChange={change(setRate, "businessDate")} />
            <Input label={t("manager.stockLabels.petrolRatePaise")} value={rate.petrolRatePaise} onChange={change(setRate, "petrolRatePaise")} />
            <Input label={t("manager.stockLabels.dieselRatePaise")} value={rate.dieselRatePaise} onChange={change(setRate, "dieselRatePaise")} />
            <Button onClick={() => save(() => createFuelRate({
              ...rate,
              petrolRatePaise: n(rate.petrolRatePaise),
              dieselRatePaise: n(rate.dieselRatePaise),
            }))}>{t("manager.stockLabels.saveRate")}</Button>
            {rates.map((item) => (
              <p key={item._id} className="border-t py-2 text-xs">{item.businessDate} · {item.petrolRatePaise} / {item.dieselRatePaise}</p>
            ))}
          </section>
        )}
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
    </ManagerLayout>
  );
};

export default Stock;
