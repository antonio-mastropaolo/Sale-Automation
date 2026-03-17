import { prisma } from "@/lib/db";

export type ActivityType =
  | "listing_created" | "listing_updated" | "listing_deleted"
  | "optimize" | "publish_success" | "publish_failed"
  | "import_started" | "import_completed"
  | "schedule_created" | "schedule_deleted"
  | "batch_action"
  | "settings_changed"
  | "sale_recorded"
  | "login" | "logout";

export type Severity = "info" | "success" | "warning" | "error";

interface LogParams {
  type: ActivityType;
  title: string;
  detail?: string;
  platform?: string;
  severity?: Severity;
}

/** Fire-and-forget activity log — never throws, never blocks the caller. */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        type: params.type,
        title: params.title,
        detail: params.detail ?? "",
        platform: params.platform ?? "",
        severity: params.severity ?? "info",
      },
    });
  } catch (err) {
    console.error("ActivityLog write failed:", err);
  }
}
