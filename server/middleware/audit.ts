import type { Request } from "express";
import { storage } from "../storage.js";
import type { InsertAuditLog } from "../../shared/schema.js";

export async function logAudit(
  req: Request,
  params: {
    userId?: number;
    action: string;
    entityType: string;
    entityId?: number;
    changes?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await storage.createAuditLog({
      userId: params.userId ?? (req.session as any)?.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      changes: params.changes ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    } as InsertAuditLog);
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
