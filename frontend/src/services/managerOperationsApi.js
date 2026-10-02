import api from "./api";

export const getManagerOperations = async (
  businessDate,
) => {
  const response = await api.get(
    "/manager/operations",
    {
      params: {
        date: businessDate,
      },
    },
  );

  return response.data;
};

export const getManagerShiftDetail = async (
  shiftId,
) => {
  const response = await api.get(
    `/manager/shifts/${shiftId}`,
  );

  return response.data;
};