import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "./session";
import { getDatabase } from "./db";
import { MonitorError, MonitorService } from "../features/monitors/service";

export async function ownedMonitor(id: string) {
  const user = await requireUser();
  try { return await new MonitorService(getDatabase()).get(user.id, id); }
  catch (error) { if (error instanceof MonitorError && error.code === "NOT_FOUND") notFound(); throw error; }
}
