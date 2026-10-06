import { createRequire } from "node:module";
import { resolve } from "node:path";
import { expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { getRootDirs } = require("@next/eslint-plugin-next/dist/utils/get-root-dirs.js") as {
  getRootDirs: (context: { cwd: string; settings: { next?: { rootDir: string | string[] } } }) => string[];
};
const cwd = process.cwd();
const context = (rootDir?: string | string[]) => ({ cwd, settings: rootDir ? { next: { rootDir } } : {} });
it("keeps Next's default root without globbing", () => expect(getRootDirs(context())).toEqual([cwd]));
it("finds a literal directory through the installed Next helper", () => expect(getRootDirs(context(resolve("src")))).toEqual([resolve("src").replaceAll("\\", "/")]));
it("filters to directories and supports Next wildcard roots", () => {
  const roots = getRootDirs(context(resolve("src/*")));
  expect(roots).toContain(resolve("src/app").replaceAll("\\", "/"));
  expect(roots.some((root) => root.endsWith("auth.ts"))).toBe(false);
});
it("supports array roots used by monorepo settings", () => expect(getRootDirs(context([resolve("src"), resolve("tests")]))).toEqual([resolve("src").replaceAll("\\", "/"), resolve("tests").replaceAll("\\", "/")]));
