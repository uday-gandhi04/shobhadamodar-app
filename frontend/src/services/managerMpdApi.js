import api from "./api";

export const getManagerMpds = async () => (await api.get("/manager/mpds")).data;

export const createManagerMpd = async (payload) =>
  (await api.post("/manager/mpds", payload)).data;

export const updateManagerMpd = async (id, payload) =>
  (await api.patch(`/manager/mpds/${id}`, payload)).data;

export const deleteManagerMpd = async (id) =>
  (await api.delete(`/manager/mpds/${id}`)).data;

export const addManagerMpdNozzle = async (id, payload) =>
  (await api.post(`/manager/mpds/${id}/nozzles`, payload)).data;

export const updateManagerMpdNozzle = async (id, nozzleId, payload) =>
  (await api.patch(`/manager/mpds/${id}/nozzles/${nozzleId}`, payload)).data;

export const deleteManagerMpdNozzle = async (id, nozzleId) =>
  (await api.delete(`/manager/mpds/${id}/nozzles/${nozzleId}`)).data;
