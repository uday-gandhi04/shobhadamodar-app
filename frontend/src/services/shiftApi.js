import api from './api';

export const getAvailableMpds = async (businessDate) => {
  const response = await api.get('/shifts/available-mpds', {
    params: businessDate ? { date: businessDate } : undefined,
  });
  return response.data;
};

export const getCurrentShift = async (businessDate) => {
  const response = await api.get('/shifts/current');
  return response.data;
};

export const startShift = async ({ businessDate, shiftType, mpdId }) => {
  const response = await api.post('/shifts/start', {
    businessDate,
    shiftType,
    mpdId,
  });
  return response.data;
};

export const updateCollections = async (shiftId, collections) => {
  const response = await api.patch(`/shifts/${shiftId}/collections`, collections);
  return response.data;
};

export const previewEndShift = async (shiftId, payload) => {
  const response = await api.post(`/shifts/${shiftId}/end/preview`, payload);
  return response.data;
};

export const endShift = async (shiftId, payload) => {
  const response = await api.post(`/shifts/${shiftId}/end`, payload);
  return response.data;
};




export const getCurrentFuelRate = async (
  businessDate,
) => {
  const response = await api.get(
    '/fuel-rates/current',
    {
      params: {
        date: businessDate,
      },
    },
  );

  return response.data;
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

  return response.data;
};

export const deleteUdhariTransaction = async (transactionId) => {
  const response = await api.delete(
    `/udhari/${transactionId}`,
  );

  return response.data;
};