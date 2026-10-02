import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import { fixupConfigRules } from "@eslint/compat";

export default defineConfig([
  ...fixupConfigRules([...nextVitals, ...nextTypeScript]),
  globalIgnores([".next/**", ".postgres-test/**", "dist/**", "coverage/**", "src/generated/**", "next-env.d.ts"]),
]);
