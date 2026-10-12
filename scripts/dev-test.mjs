// Starts the Next dev server against the Neon test branch (.env.test), never production (.env.local).
// `node --env-file` can't be used here: Next copies Node flags into NODE_OPTIONS for its child process,
// and Node rejects --env-file there. So the file is loaded in this process and passed to the child.
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { parse } from "dotenv";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const readEnv = (file) => (existsSync(file) ? parse(readFileSync(file)) : {});
const testEnv = readEnv(".env.test");
const productionEnv = readEnv(".env.local");

if (!testEnv.DATABASE_URL_POOLED) {
  console.error("dev:test: DATABASE_URL_POOLED is missing from .env.test. Refusing to start.");
  process.exit(1);
}
if (testEnv.DATABASE_URL_POOLED === productionEnv.DATABASE_URL_POOLED) {
  console.error("dev:test: .env.test points at the production database. Refusing to start.");
  process.exit(1);
}

// Values from the test file win over anything Next would read from .env.local.
const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ...testEnv },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
