import api from "./api";

export const createExpense = async ({
  shiftId,
  amountPaise,
  reason,
}) => {
  const response = await api.post(
    "/expenses",
    {
      shiftId,
      amountPaise,
      reason,
    },
  );

  return response.data;
};

export const getMyShiftExpenses = async (
  shiftId,
) => {
  const response = await api.get(
    "/expenses/my-shift",
    {
      params: {
        shiftId,
      },
    },
  );

  return response.data;
};