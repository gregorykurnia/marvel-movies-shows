import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Migrations use the direct connection (DATABASE_URL). The app uses the pooled one.
// APP_ENV=test points migrations at the Neon `test` branch (.env.test). Default is .env.local.
config({
  path: process.env.APP_ENV === "test" ? ".env.test" : ".env.local",
  quiet: true,
});

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
