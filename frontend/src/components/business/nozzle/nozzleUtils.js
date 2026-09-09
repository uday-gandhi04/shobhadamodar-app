export const formatReading = (value) => {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0.00";
  }

  return number.toFixed(2);
};

export const getNozzleNumber = (nozzleId) => {
  if (!nozzleId) return "";

  const match = String(nozzleId).match(/\d+/);
  return match ? match[0] : String(nozzleId);
};

export const getFuelType = (reading) => {
  const fuel = String(reading?.fuelType || reading?.fuel || "").toUpperCase();

  if (fuel.includes("DIESEL")) {
    return "DIESEL";
  }

  return "PETROL";
};