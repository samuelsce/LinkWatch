# Scoped Next.js lint glob adapter

The pinned @next/eslint-plugin-next 16.3.8 imports fast-glob only from its
get-root-dirs helper, using globSync(rootDir, { onlyDirectories: true }).
Its transitive braces 3.0.3 has an unpatched stack-exhaustion advisory:
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

The root npm override replaces fast-glob **only under that plugin** with this
private local adapter, delegating the used API to pinned tinyglobby 0.2.17.
The adapter disables directory expansion, preserves absolute patterns and
normalizes trailing directory slashes to match the helper's expected paths.
It preserves the Next.js lint presets and the full dependency audit; it does not
disable rules, hide an advisory or edit installed dependency files.

Node 24 supports synchronous require of this ESM module. Compatibility tests
call the actual plugin helper with default, literal, wildcard and array roots.
Recheck the plugin's imports/API when updating Next.js, and remove this override
when its upstream dependency chain no longer includes vulnerable braces.

This is tooling only; it is not imported by the web application or worker.
