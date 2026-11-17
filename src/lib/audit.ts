import { prisma } from "@/lib/db";

export interface AuditOptions {
  actor: string; // email or system
  action: string; // e.g. "invoice.created", "payment.confirmed"
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userId?: string | null;
}

export async function recordAudit(opts: AuditOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        actor: opts.actor,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        meta: opts.meta ? JSON.stringify(opts.meta) : null,
        ip: opts.ip,
      },
    });
  } catch {
    // audit logging must never break the caller
  }
}
