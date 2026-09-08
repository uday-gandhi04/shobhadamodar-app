import api from './api';

export const getCurrentShift = async (businessDate) => {
  const response = await api.get('/shifts/current', {
    params: businessDate
      ? {
          date: businessDate,
        }
      : undefined,
  });

  return response.data;
};

export const startShift = async ({
  businessDate,
  shiftType,
  mpdId,
}) => {
  const response = await api.post('/shifts/start', {
    businessDate,
    shiftType,
    mpdId,
  });

  return response.data;
};

export const endShift = async (shiftId) => {
  const response = await api.post(`/shifts/${shiftId}/end`);

  return response.data;
};