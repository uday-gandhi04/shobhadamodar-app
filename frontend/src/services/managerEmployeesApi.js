import api from "./api";

export const getManagerEmployees = async () => {
  const response = await api.get("/manager/employees");
  return response.data;
};

export const getManagerEmployeeDetail = async (employeeId) => {
  const response = await api.get(
    `/manager/employees/${encodeURIComponent(employeeId)}`,
  );
  return response.data;
};

export const createEmployee = async (payload) => {
  const response = await api.post("/users/employees", payload);
  return response.data;
};

export const updateManagerEmployee = async (employeeId, payload) => {
  const response = await api.patch(
    `/manager/employees/${encodeURIComponent(employeeId)}`,
    payload,
  );
  return response.data;
};

export const updateManagerEmployeeStatus = async (
  employeeId,
  accountStatus,
) => {
  const response = await api.patch(
    `/manager/employees/${encodeURIComponent(employeeId)}/status`,
    { accountStatus },
  );
  return response.data;
};
