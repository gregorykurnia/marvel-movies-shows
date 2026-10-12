// Guards every test run. Tests must never touch the production database (IMPLEMENTATION_PLAN §2, §7).
// The test URL must be set, and it must not be the same connection string as the production one in .env.local.
export function assertTestDatabase(
  testUrl: string | undefined,
  productionUrl: string | undefined,
): string {
  if (!testUrl) {
    throw new Error(
      "DATABASE_URL_POOLED is not set for tests. Put the Neon test branch connection in .env.test.",
    );
  }
  if (productionUrl && testUrl === productionUrl) {
    throw new Error(
      "Refusing to run tests: .env.test points at the same database as .env.local (production).",
    );
  }
  return testUrl;
}
