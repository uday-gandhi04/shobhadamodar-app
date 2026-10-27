// src/utils/liveUpdate.js
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Capacitor } from "@capacitor/core";

/**
 * Signals native CapacitorUpdater runtime that the web bundle has mounted cleanly.
 * This disarms the native rollback timer and confirms the active update.
 */
export const notifyLiveUpdateReady = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const result = await CapacitorUpdater.notifyAppReady();
    console.log("✅ Live update bundle marked ready:", result);
    return result;
  } catch (error) {
    console.error(
      "❌ Failed to notify live update ready:",
      error
    );
  }
};
