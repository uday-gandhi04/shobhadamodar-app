import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getManagerStockPreview, getManagerStockExport } from "../../services/managerStockApi";

const formatNumber = (val, decimals = 2) => {
  if (val == null || val === "" || isNaN(val)) return "—";
  return Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const MonthlyRegisterViewer = ({ isOpen, onClose, initialMonth }) => {
  const { t } = useTranslation();
  const [month, setMonth] = useState(initialMonth || new Date().toISOString().substring(0, 7));
  const [activeTab, setActiveTab] = useState("MS_METER"); // MS_METER, MS_STOCK, HSD_METER, HSD_STOCK
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const [prevInitialMonth, setPrevInitialMonth] = useState(initialMonth);
  if (initialMonth && initialMonth !== prevInitialMonth) {
    setPrevInitialMonth(initialMonth);
    setMonth(initialMonth);
  }

  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    const fetchPreview = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getManagerStockPreview(month);
        if (isSubscribed) {
          setReportData(res.data);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err.response?.data?.message || t("manager.stockLabels.previewError", "Failed to load monthly register."));
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchPreview();
    return () => {
      isSubscribed = false;
    };
  }, [isOpen, month, t]);

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const blob = await getManagerStockExport(month);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Registers_${month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(t("manager.stockLabels.exportError", "Failed to download Excel file."));
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  const currentSheet = reportData?.sheets?.find((s) => s.id === activeTab);

  // Calculate totals for footer
  const calculateMeterTotals = (rows = []) => {
    let grandTotalSale = 0;
    const nozzleSales = [0, 0, 0, 0];

    rows.forEach((row) => {
      if (row.totalMeterSale != null) {
        grandTotalSale += Number(row.totalMeterSale);
      }
      row.nozzles?.forEach((nz, idx) => {
        if (nz.sale != null) {
          nozzleSales[idx] = (nozzleSales[idx] || 0) + Number(nz.sale);
        }
      });
    });

    return { grandTotalSale, nozzleSales };
  };

  const calculateStockTotals = (rows = []) => {
    let totalReceipts = 0;
    let totalSales = 0;
    let netVariation = 0;
    let variationCount = 0;

    rows.forEach((row) => {
      if (row.receiptStockLitres != null) totalReceipts += Number(row.receiptStockLitres);
      if (row.actualSalesLitres != null) totalSales += Number(row.actualSalesLitres);
      if (row.variationLitres != null) {
        netVariation += Number(row.variationLitres);
        variationCount++;
      }
    });

    return { totalReceipts, totalSales, netVariation: variationCount > 0 ? netVariation : null };
  };

  const meterTotals = currentSheet?.type === "METER" ? calculateMeterTotals(currentSheet.rows) : null;
  const stockTotals = currentSheet?.type === "STOCK" ? calculateStockTotals(currentSheet.rows) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-7xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {t("manager.stockLabels.monthlyRegister", "Monthly Registers")}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t("manager.stockLabels.monthlyRegisterSubtitle", "Digital spreadsheet inspect & official records")}
              </p>
            </div>
          </div>

          <div className="!flex !items-center !gap-2.5">
            {/* Month Picker */}
            <div className="!flex !items-center !gap-2 !px-3.5 !py-2 !bg-white !border !border-slate-200 !rounded-[12px] !shadow-sm hover:!border-slate-300 !transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!w-4 !h-4 !text-slate-400">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="!text-xs !font-bold !text-slate-800 !bg-transparent !border-none focus:!outline-none !cursor-pointer"
              />
            </div>

            {/* Explicit Download Excel Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloading || loading}
              className="!flex !items-center !gap-2 !px-4 !py-2 !text-xs !font-bold !text-white !bg-emerald-700 hover:!bg-emerald-800 active:!scale-95 disabled:!opacity-50 disabled:!pointer-events-none !rounded-[12px] !shadow-[0_4px_12px_rgba(5,150,105,0.25)] !transition-all"
            >
              {downloading ? (
                <div className="!w-4 !h-4 !border-2 !border-white/30 !border-t-white !rounded-full !animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!w-4 !h-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              <span>{t("manager.stockLabels.downloadExcel", "Download Excel")}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="!grid !h-9 !w-9 !place-items-center !text-slate-400 hover:!text-slate-700 hover:!bg-slate-100 !rounded-[12px] !transition-all active:!scale-95"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="!w-4 !h-4">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* 4 SHEET TABS NAVIGATION (BUTTONS OF METER & STOCK) */}
        <div className="!flex !items-center !gap-2 !p-3 !bg-slate-100/70 !border-b !border-slate-200 !overflow-x-auto !scrollbar-hide">
          {[
            { id: "MS_METER", label: t("manager.stockLabels.msMeterRegister", "MS Meter"), fuel: "MS", isPetrol: true },
            { id: "MS_STOCK", label: t("manager.stockLabels.msStockRegister", "MS Stock"), fuel: "MS", isPetrol: true },
            { id: "HSD_METER", label: t("manager.stockLabels.hsdMeterRegister", "HSD Meter"), fuel: "HSD", isPetrol: false },
            { id: "HSD_STOCK", label: t("manager.stockLabels.hsdStockRegister", "HSD Stock"), fuel: "HSD", isPetrol: false },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`!flex !items-center !gap-2.5 !rounded-[12px] !px-4 !py-2.5 !text-xs !font-extrabold !transition-all !whitespace-nowrap active:!scale-98 ${
                  isActive
                    ? "!bg-emerald-800 !text-white !shadow-[0_4px_14px_rgba(4,120,87,0.25)]"
                    : "!bg-white hover:!bg-slate-50 !border !border-slate-200/80 !text-slate-700 !shadow-sm"
                }`}
              >
                <span
                  className={`!px-1.5 !py-0.5 !rounded-[6px] !text-[10px] !font-black ${
                    isActive
                      ? "!bg-white/20 !text-white"
                      : tab.isPetrol
                        ? "!bg-rose-100 !text-rose-700"
                        : "!bg-sky-100 !text-sky-700"
                  }`}
                >
                  {tab.fuel}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* BODY SPREADSHEET AREA */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50 min-h-[360px] max-h-[calc(92vh-160px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
              <span className="text-xs font-semibold">{t("manager.stockLabels.loadingRegisters", "Loading monthly registers...")}</span>
            </div>
          ) : error ? (
            <div className="p-4 my-8 text-center text-rose-700 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold">
              {error}
            </div>
          ) : !currentSheet || !currentSheet.rows || currentSheet.rows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              {t("manager.stockLabels.noDataForPeriod", "No register data available for this month.")}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                {currentSheet.type === "METER" ? (
                  /* METER REGISTER SPREADSHEET (OPEN & SALE ONLY) */
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                        <th rowSpan={2} className="sticky left-0 z-20 bg-slate-100 px-3 py-2.5 border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.05)] min-w-[95px]">
                          {t("manager.stockLabels.date", "Date")}
                        </th>
                        <th colSpan={2} className="text-center px-3 py-2 border-r border-slate-200 bg-emerald-50/50 text-emerald-900">
                          {t("manager.stockLabels.nozzle1", "Nozzle 1")}
                        </th>
                        <th colSpan={2} className="text-center px-3 py-2 border-r border-slate-200 bg-sky-50/50 text-sky-900">
                          {t("manager.stockLabels.nozzle2", "Nozzle 2")}
                        </th>
                        <th colSpan={2} className="text-center px-3 py-2 border-r border-slate-200 bg-emerald-50/50 text-emerald-900">
                          {t("manager.stockLabels.nozzle3", "Nozzle 3")}
                        </th>
                        <th colSpan={2} className="text-center px-3 py-2 border-r border-slate-200 bg-sky-50/50 text-sky-900">
                          {t("manager.stockLabels.nozzle4", "Nozzle 4")}
                        </th>
                        <th rowSpan={2} className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[110px] bg-amber-50/60 text-amber-900 font-extrabold">
                          {t("manager.stockLabels.totalMeterSale", "Total Sale (L)")}
                        </th>
                        <th rowSpan={2} className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[90px]">
                          {t("manager.stockLabels.pumpTesting", "Testing")}
                        </th>
                        <th rowSpan={2} className="px-3 py-2.5 min-w-[120px]">
                          {t("manager.stockLabels.remarks", "Remarks")}
                        </th>
                      </tr>
                      <tr className="bg-slate-50 text-[11px] text-slate-600 border-b border-slate-200 font-semibold">
                        {[1, 2, 3, 4].map((nz) => (
                          <React.Fragment key={nz}>
                            <th className="text-right px-3 py-1.5 border-r border-slate-200 min-w-[90px]">
                              {t("manager.stockLabels.opening", "Open")}
                            </th>
                            <th className="text-right px-3 py-1.5 border-r border-slate-200 min-w-[80px] bg-slate-100/60 font-bold text-slate-800">
                              {t("manager.stockLabels.sale", "Sale")}
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {currentSheet.rows.map((row, idx) => (
                        <tr key={row.date} className={idx % 2 === 0 ? "bg-white hover:bg-emerald-50/20" : "bg-slate-50/40 hover:bg-emerald-50/20"}>
                          <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-sans font-bold text-slate-900 border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.05)] whitespace-nowrap">
                            {row.date}
                          </td>
                          {[0, 1, 2, 3].map((nzIdx) => {
                            const nz = row.nozzles?.[nzIdx] || {};
                            return (
                              <React.Fragment key={nzIdx}>
                                <td className="text-right px-3 py-2 text-slate-700 border-r border-slate-200">
                                  {formatNumber(nz.openingReading)}
                                </td>
                                <td className="text-right px-3 py-2 font-bold text-slate-900 border-r border-slate-200 bg-slate-50/40">
                                  {formatNumber(nz.sale)}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="text-right px-3 py-2 font-extrabold text-emerald-800 border-r border-slate-200 bg-amber-50/30">
                            {formatNumber(row.totalMeterSale)}
                          </td>
                          <td className="text-right px-3 py-2 text-slate-500 border-r border-slate-200">
                            {formatNumber(row.pumpTesting)}
                          </td>
                          <td className="px-3 py-2 font-sans text-slate-600 truncate max-w-[150px]">
                            {row.remarks || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {meterTotals && (
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
                          <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2.5 font-sans border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                            {t("manager.stockLabels.total", "Total")}
                          </td>
                          {[0, 1, 2, 3].map((nzIdx) => (
                            <React.Fragment key={nzIdx}>
                              <td className="text-right px-3 py-2.5 border-r border-slate-200 font-mono text-slate-400">—</td>
                              <td className="text-right px-3 py-2.5 border-r border-slate-200 font-mono text-slate-900">
                                {formatNumber(meterTotals.nozzleSales[nzIdx])}
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="text-right px-3 py-2.5 font-mono text-emerald-900 font-black border-r border-slate-200 bg-amber-100/50">
                            {formatNumber(meterTotals.grandTotalSale)}
                          </td>
                          <td className="border-r border-slate-200"></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                ) : (
                  /* STOCK REGISTER SPREADSHEET */
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                        <th className="sticky left-0 z-20 bg-slate-100 px-3 py-2.5 border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.05)] min-w-[95px]">
                          {t("manager.stockLabels.date", "Date")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[100px]">
                          {t("manager.stockLabels.openingStock", "Opening (L)")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[100px] bg-emerald-50/50 text-emerald-900">
                          {t("manager.stockLabels.receiptStock", "Receipt (L)")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[105px]">
                          {t("manager.stockLabels.totalAvailable", "Total Avail (L)")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[100px] bg-sky-50/50 text-sky-900">
                          {t("manager.stockLabels.actualSales", "Sales (L)")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[105px]">
                          {t("manager.stockLabels.calculatedClosing", "Closing (L)")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[90px] bg-amber-50/50 text-amber-900">
                          {t("manager.stockLabels.productDip", "Dip (cm)")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[110px] bg-amber-50/60 text-amber-950 font-extrabold">
                          {t("manager.stockLabels.actualDipStockLitres", "Dip Stock (L)")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[95px]">
                          {t("manager.stockLabels.variation", "Variation (L)")}
                        </th>
                        <th className="text-right px-3 py-2.5 border-r border-slate-200 min-w-[85px]">
                          {t("manager.stockLabels.waterDip", "Water Dip (cm)")}
                        </th>
                        <th className="text-right px-3 py-2.5 min-w-[90px]">
                          {t("manager.stockLabels.waterDipVolumeLitres", "Water (L)")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {currentSheet.rows.map((row, idx) => {
                        const hasVariation = row.variationLitres != null;
                        const varVal = Number(row.variationLitres);
                        return (
                          <tr key={row.date} className={idx % 2 === 0 ? "bg-white hover:bg-emerald-50/20" : "bg-slate-50/40 hover:bg-emerald-50/20"}>
                            <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-sans font-bold text-slate-900 border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.05)] whitespace-nowrap">
                              {row.date}
                            </td>
                            <td className="text-right px-3 py-2 text-slate-600 border-r border-slate-200">
                              {formatNumber(row.openingStockLitres)}
                            </td>
                            <td className="text-right px-3 py-2 font-semibold text-emerald-800 border-r border-slate-200 bg-emerald-50/20">
                              {formatNumber(row.receiptStockLitres)}
                            </td>
                            <td className="text-right px-3 py-2 text-slate-700 border-r border-slate-200">
                              {formatNumber(row.totalAvailableLitres)}
                            </td>
                            <td className="text-right px-3 py-2 font-semibold text-sky-800 border-r border-slate-200 bg-sky-50/20">
                              {formatNumber(row.actualSalesLitres)}
                            </td>
                            <td className="text-right px-3 py-2 text-slate-700 border-r border-slate-200">
                              {formatNumber(row.calculatedClosingStockLitres)}
                            </td>
                            <td className="text-right px-3 py-2 font-bold text-amber-900 border-r border-slate-200 bg-amber-50/20">
                              {formatNumber(row.productDip, 1)}
                            </td>
                            <td className="text-right px-3 py-2 font-extrabold text-slate-900 border-r border-slate-200 bg-amber-50/30">
                              {formatNumber(row.actualDipStockLitres)}
                            </td>
                            <td className={`text-right px-3 py-2 font-bold border-r border-slate-200 ${
                              hasVariation
                                ? varVal < 0
                                  ? "text-rose-700 bg-rose-50/30"
                                  : "text-emerald-700 bg-emerald-50/30"
                                : "text-slate-400"
                            }`}>
                              {hasVariation ? (varVal > 0 ? `+${formatNumber(varVal)}` : formatNumber(varVal)) : "—"}
                            </td>
                            <td className="text-right px-3 py-2 text-slate-500 border-r border-slate-200">
                              {formatNumber(row.waterDip, 1)}
                            </td>
                            <td className="text-right px-3 py-2 text-slate-500">
                              {formatNumber(row.waterDipVolumeLitres)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {stockTotals && (
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
                          <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2.5 font-sans border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                            {t("manager.stockLabels.total", "Total")}
                          </td>
                          <td className="border-r border-slate-200 font-mono text-right text-slate-400">—</td>
                          <td className="text-right px-3 py-2.5 font-mono text-emerald-900 border-r border-slate-200 bg-emerald-100/50">
                            {formatNumber(stockTotals.totalReceipts)}
                          </td>
                          <td className="border-r border-slate-200 font-mono text-right text-slate-400">—</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sky-900 border-r border-slate-200 bg-sky-100/50">
                            {formatNumber(stockTotals.totalSales)}
                          </td>
                          <td className="border-r border-slate-200 font-mono text-right text-slate-400">—</td>
                          <td className="border-r border-slate-200 font-mono text-right text-slate-400">—</td>
                          <td className="border-r border-slate-200 font-mono text-right text-slate-400">—</td>
                          <td className={`text-right px-3 py-2.5 font-mono border-r border-slate-200 ${
                            stockTotals.netVariation != null && stockTotals.netVariation < 0 ? "text-rose-800" : "text-emerald-800"
                          }`}>
                            {stockTotals.netVariation != null ? formatNumber(stockTotals.netVariation) : "—"}
                          </td>
                          <td className="border-r border-slate-200"></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER BAR */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>{t("manager.stockLabels.sheetActive", "Viewing: {{sheet}}", { sheet: currentSheet?.sheetName || activeTab })}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition"
          >
            {t("manager.stockLabels.close", "Close")}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MonthlyRegisterViewer;
