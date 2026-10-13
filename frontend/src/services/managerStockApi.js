import api from "./api";
export const getManagerStock = async (date) => (await api.get("/manager/stock", { params: { date } })).data;
export const upsertManagerStock = async (payload) => (await api.put("/manager/stock", payload)).data;
export const getManagerTanks = async () => (await api.get("/manager/tanks")).data;
export const createManagerTank = async (payload) => (await api.post("/manager/tanks", payload)).data;
export const updateManagerTank = async (id, payload) => (await api.patch(`/manager/tanks/${id}`, payload)).data;
export const correctManagerOpeningStock = async (payload) => (await api.post("/manager/stock/correct-opening", payload)).data;
export const correctManagerMeterOpening = async (payload) => (await api.post("/manager/stock/correct-meter-opening", payload)).data;
export const getManagerTankCalibration = async (id) => {
  const res = await api.get(`/manager/tanks/${id}/calibration`);
  return res.data?.data ?? res.data;
};
export const upsertManagerTankCalibration = async (id, payload) => (await api.put(`/manager/tanks/${id}/calibration`, payload)).data;
export const getManagerDensity = async (date) => (await api.get("/manager/stock/density", { params: { date } })).data;
export const upsertManagerDensity = async (payload) => (await api.post("/manager/stock/density", payload)).data;
export const getManagerReceipts = async (date) => (await api.get("/manager/stock/receipts", { params: { date } })).data;
export const createManagerReceipt = async (payload) => (await api.post("/manager/stock/receipts", payload)).data;
export const getFuelRateHistory = async () => (await api.get("/fuel-rates/history")).data;
export const createFuelRate = async (payload) => (await api.post("/fuel-rates", payload)).data;
export const getDensityConversionPreview = async (hydrometer, temperature) => (await api.get("/manager/stock/density/convert", { params: { hydrometer, temperature } })).data;

export const getManagerStockExport = async (month) => (await api.get("/manager/stock/export", { params: { month }, responseType: 'blob', timeout: 120000 })).data;
export const getManagerStockPreview = async (month) => (await api.get("/manager/stock/preview", { params: { month }, timeout: 60000 })).data;
