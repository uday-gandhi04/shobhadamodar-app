import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      enum: ["MANAGER", "EMPLOYEE"],
      required: true,
    },
    action: {
      type: String,
      enum: [
        "EMPLOYEE_CREATED",
        "EMPLOYEE_PROFILE_UPDATED",
        "EMPLOYEE_STATUS_CHANGED",
        "EMPLOYEE_PASSWORD_RESET",
        "UDHARI_CUSTOMER_CREATED",
        "UDHARI_CUSTOMER_UPDATED",
        "UDHARI_CUSTOMER_BLOCK_STATUS_CHANGED",
        "UDHARI_SETTLEMENT_RECORDED",
        "STOCK_UPSERTED",
        "OPENING_STOCK_CORRECTED",
        "METER_OPENING_CORRECTED",
        "TANK_CREATED",
        "TANK_UPDATED",
        "TANK_STATUS_CHANGED",
        "DENSITY_UPSERTED",
        "FUEL_RECEIPT_CREATED",
        "FUEL_RATE_CREATED",
        "MPD_CREATED",
        "MPD_UPDATED",
        "MPD_STATUS_CHANGED",
        "MPD_DELETED",
        "NOZZLE_ADDED",
        "NOZZLE_UPDATED",
        "NOZZLE_FUEL_REASSIGNED",
        "NOZZLE_STATUS_CHANGED",
        "NOZZLE_DELETED",
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ["EMPLOYEE", "CUSTOMER", "STOCK", "METER_REGISTER", "TANK", "DENSITY", "FUEL_RECEIPT", "FUEL_RATE", "MPD"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
