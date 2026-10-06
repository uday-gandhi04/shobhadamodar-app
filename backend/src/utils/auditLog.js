import AuditLog from "../models/AuditLog.js";

const sensitiveKey = /password|token|secret|credential|authorization/i;

const sanitizeValue = (value, depth = 0) => {
  if (depth > 3) return undefined;
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, 200);
  if (Array.isArray(value)) {
    return value.slice(0, 20)
      .map((entry) => sanitizeValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveKey.test(key))
      .slice(0, 20)
      .flatMap(([key, entry]) => {
        const sanitized = sanitizeValue(entry, depth + 1);
        return sanitized === undefined ? [] : [[key, sanitized]];
      }),
  );
};

export const recordAuditLog = async ({
  actor,
  action,
  entityType,
  entityId,
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      actorId: actor?._id,
      actorRole: actor?.role,
      action,
      entityType,
      entityId,
      metadata: sanitizeValue(metadata) || {},
    });
  } catch (error) {
    console.error("Audit log persistence failed.", {
      name: error?.name || "UnknownError",
      code: error?.code || null,
    });
  }
};
