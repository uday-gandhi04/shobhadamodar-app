import api from "./api";

export const getManagerAccounting = async (period, businessDate) => {
  const response = await api.get("/manager/accounting", {
    params: {
      period,
      date: businessDate,
    },
  });

  return response.data;
};
