type Environment = Record<string, string | undefined>;

export function readDatabaseUrl(env: Environment = process.env): string {
  const value = env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.");

  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
      throw new Error("invalid");
    }
  } catch {
    // Never echo a connection string: it may contain credentials.
    throw new Error("DATABASE_URL must be a PostgreSQL URL with a host and database name.");
  }

  return value;
}

export function readWorkerId(env: Environment = process.env): string {
  const value = env.WORKER_ID ?? "local-worker";
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) {
    throw new Error("WORKER_ID must contain 1–100 letters, digits, underscores or hyphens.");
  }
  return value;
}
