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
        "DENSITY_UPSERTED",
        "FUEL_RECEIPT_CREATED",
        "FUEL_RATE_CREATED",
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ["EMPLOYEE", "CUSTOMER", "STOCK", "DENSITY", "FUEL_RECEIPT", "FUEL_RATE"],
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
