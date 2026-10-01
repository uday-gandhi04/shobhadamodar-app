import api from './api';

let currentShiftKnown = false;
let currentShiftResponse;
let currentShiftRequest;
let currentShiftGeneration = 0;
const fuelRateCache = new Map();

const rememberCurrentShift = (response) => {
  currentShiftKnown = true;
  currentShiftResponse = response;
};

const updateCachedShift = (updatedShift) => {
  const cachedShift = currentShiftResponse?.data;
  if (!cachedShift?._id || String(cachedShift._id) !== String(updatedShift?._id)) {
    return;
  }

  const nextShift = { ...cachedShift, ...updatedShift };
  if (cachedShift.mpdId && typeof updatedShift.mpdId !== 'object') {
    nextShift.mpdId = cachedShift.mpdId;
  }
  nextShift.udhariEntries = cachedShift.udhariEntries;
  currentShiftResponse = { ...currentShiftResponse, data: nextShift };
};

const invalidateCurrentShift = (shiftId) => {
  const cachedShiftId = currentShiftResponse?.data?._id;
  if (shiftId && cachedShiftId && String(shiftId) !== String(cachedShiftId)) {
    return;
  }

  currentShiftKnown = false;
  currentShiftResponse = undefined;
  currentShiftRequest = undefined;
  currentShiftGeneration += 1;
};

export const clearShiftServiceCache = () => {
  invalidateCurrentShift();
  fuelRateCache.clear();
};

export const getAvailableMpds = async (businessDate) => {
  const response = await api.get('/shifts/available-mpds', {
    params: businessDate ? { date: businessDate } : undefined,
  });
  return response.data;
};

export const getCurrentShift = async () => {
  if (currentShiftKnown) return currentShiftResponse;
  if (currentShiftRequest) return currentShiftRequest;

  const requestGeneration = currentShiftGeneration;
  const request = api.get('/shifts/current')
    .then((response) => {
      if (requestGeneration === currentShiftGeneration) {
        rememberCurrentShift(response.data);
      }
      return response.data;
    })
    .finally(() => {
      if (currentShiftRequest === request) currentShiftRequest = undefined;
    });

  currentShiftRequest = request;
  return request;
};

export const startShift = async ({ businessDate, mpdId }) => {
  const response = await api.post('/shifts/start', {
    businessDate,
    mpdId,
  });
  rememberCurrentShift(response.data);
  return response.data;
};

export const updateCollections = async (shiftId, collections) => {
  const response = await api.patch(`/shifts/${shiftId}/collections`, collections);
  updateCachedShift(response.data?.data);
  return response.data;
};

export const previewEndShift = async (shiftId, payload) => {
  const response = await api.post(`/shifts/${shiftId}/end/preview`, payload);
  return response.data;
};

export const endShift = async (shiftId, payload) => {
  const response = await api.post(`/shifts/${shiftId}/end`, payload);
  invalidateCurrentShift(shiftId);
  return response.data;
};




export const getCurrentFuelRate = async (
  businessDate,
) => {
  const cacheKey = businessDate || '';
  if (fuelRateCache.has(cacheKey)) return fuelRateCache.get(cacheKey);

  const request = api.get('/fuel-rates/current', {
    params: { date: businessDate },
  }).then((response) => response.data).catch((error) => {
    fuelRateCache.delete(cacheKey);
    throw error;
  });

  fuelRateCache.set(cacheKey, request);
  return request;
};

export const searchCustomers = async (
  query,
) => {
  const response = await api.get(
    '/customers/search',
    {
      params: { q: query },
    },
  );

  return response.data;
};

export const addUdhariTransaction = async (
  payload,
) => {
  const response = await api.post(
    '/udhari',
    payload,
  );

  invalidateCurrentShift(payload.shiftId);
  return response.data;
};

export const deleteUdhariTransaction = async (transactionId) => {
  const response = await api.delete(
    `/udhari/${transactionId}`,
  );

  invalidateCurrentShift(response.data?.data?.shift?._id);
  return response.data;
};

export const updateReadings = async (shiftId, readings) => {
  const response = await api.patch(`/shifts/${shiftId}/readings`, { readings });
  updateCachedShift(response.data?.data);
  return response.data;
};