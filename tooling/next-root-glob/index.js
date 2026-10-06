// Next 16.3.8 uses only globSync(pattern, { onlyDirectories: true }).
// This scoped adapter removes fast-glob -> micromatch -> vulnerable braces.
// It is intentionally not a general replacement for every fast-glob API.
import { globSync as tinyGlobSync } from "tinyglobby";
import { isAbsolute, parse } from "node:path";

export function globSync(pattern, options = {}) {
  return tinyGlobSync(pattern, {
    ...options,
    expandDirectories: false,
    absolute: isAbsolute(pattern),
  }).map((directory) => directory === parse(directory).root ? directory : directory.replace(/\/$/, ""));
}
