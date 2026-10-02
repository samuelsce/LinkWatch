import "server-only";
import { getDatabase } from "./db";

export async function databaseTime() {
  const [row] = await getDatabase().$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  return row!.now.getTime();
}
