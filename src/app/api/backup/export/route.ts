import { connection } from "next/server";

import { createBackup } from "@/lib/backup/export";

// GET /api/backup/export (IMPLEMENTATION_PLAN §4). Sends the whole backup as a JSON file. Each download is logged as a
// manual backup, so the Backup page can show when the last one was made.
export async function GET() {
  await connection();
  const { json, filename } = await createBackup();
  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
