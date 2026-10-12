import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

// Pool mode uses WebSockets, which lets a restore run as one all-or-nothing transaction.
// Node 20 has no global WebSocket, so the ws package is passed in explicitly.
neonConfig.webSocketConstructor = ws;

function createDb() {
  const connectionString = process.env.DATABASE_URL_POOLED;
  if (!connectionString) {
    throw new Error("DATABASE_URL_POOLED is not set");
  }
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema });
}

export type Db = ReturnType<typeof createDb>;

// The transaction handle passed to db.transaction(async (tx) => …).
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Created on first use, not at import time, so builds without database env vars still work.
// Cached on globalThis so dev hot reloads don't open a new pool on every edit.
const globalForDb = globalThis as unknown as { __marvelDb?: Db };

export function getDb(): Db {
  globalForDb.__marvelDb ??= createDb();
  return globalForDb.__marvelDb;
}
