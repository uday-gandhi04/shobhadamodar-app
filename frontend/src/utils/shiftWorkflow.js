const STORAGE_KEY = "active-shift-workflow";

export const readShiftWorkflowState = (state) => {
  if (state) return state;

  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

export const saveShiftWorkflowState = (state) => {
  if (!state) return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Navigation state remains the primary handoff when storage is unavailable.
  }
};

export const clearShiftWorkflowState = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable session storage.
  }
};
