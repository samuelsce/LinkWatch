import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = ".env";
let content = existsSync(file) ? readFileSync(file, "utf8") : readFileSync(".env.example", "utf8");
const line = content.match(/^AUTH_SECRET=(.*)$/m);
if (!line || !line[1].replace(/["']/g, "").trim()) {
  const secret = `AUTH_SECRET="${randomBytes(32).toString("base64url")}"`;
  content = line ? content.replace(/^AUTH_SECRET=.*$/m, secret) : `${content.trimEnd()}\n${secret}\n`;
  writeFileSync(file, content, { mode: 0o600 });
}
console.log("Local .env prepared. Existing values preserved; AUTH_SECRET is never printed. Configure PostgreSQL and GitHub OAuth credentials in that file.");
