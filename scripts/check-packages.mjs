/**
 * Package-consistency checker — guards against the phantom-version lockfile
 * failure that broke Vercel builds (eslint 10.9.0 / @eslint/config-helpers
 * 0.9.0 pinned in package-lock.json but never published to the registry).
 *
 * Offline checks (always run, fast):
 *   1. Lockfile root dependency specs must exactly match package.json.
 *      A stale lockfile diverges here (lockfile recorded eslint ^10.9.0 while
 *      package.json had ^10.8.0) — the root cause of the E404 build failure.
 *   2. Every `resolved` tarball URL must encode the package's declared version.
 *
 * Network check (skipped with --offline):
 *   3. HEAD each unique `resolved` tarball URL on the registry and fail on any
 *      404/403 — this directly reproduces Vercel's `npm install` failure mode.
 *
 * Usage:
 *   node scripts/check-packages.mjs [--offline]
 *
 * Exits 0 on success, 1 listing every problem found.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import https from "node:https";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function load() {
  const pkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(resolve(rootDir, "package-lock.json"), "utf8"));
  return { pkg, lock };
}

/**
 * Offline consistency checks. Returns a list of human-readable problems
 * (empty array = healthy). Imported by both the CLI and the vitest test.
 */
export function checkLockfileConsistency() {
  const { pkg, lock } = load();
  const errors = [];

  const root = lock.packages?.[""];
  if (!root) {
    errors.push('package-lock.json has no root packages[""] entry');
    return errors;
  }

  for (const section of ["dependencies", "devDependencies"]) {
    const pkgSpecs = pkg[section] || {};
    const lockSpecs = root[section] || {};
    for (const [name, spec] of Object.entries(pkgSpecs)) {
      if (lockSpecs[name] !== spec) {
        errors.push(
          `lockfile root ${section}.${name} = "${lockSpecs[name] ?? "(missing)"}" ` +
            `but package.json declares "${spec}" — run "npm install" to regenerate the lockfile`,
        );
      }
    }
    for (const name of Object.keys(lockSpecs)) {
      if (pkgSpecs[name] === undefined) {
        errors.push(`lockfile root ${section} has "${name}" but package.json does not declare it`);
      }
    }
  }

  for (const [path, entry] of Object.entries(lock.packages || {})) {
    if (!path || !entry.resolved || !entry.version) continue;
    const basename = entry.resolved
      .split("/")
      .pop()
      ?.replace(/\.tgz$/, "");
    if (basename && !basename.endsWith(`-${entry.version}`)) {
      errors.push(
        `lockfile entry ${path} resolves to ${entry.resolved} but declares version ${entry.version}`,
      );
    }
  }

  return errors;
}

function head(url) {
  return new Promise((resolvePromise) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      res.resume();
      resolvePromise(res.statusCode);
    });
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
    req.on("error", () => resolvePromise(0));
    req.end();
  });
}

async function checkRegistry(lock, errors) {
  const urls = new Set();
  for (const entry of Object.values(lock.packages || {})) {
    if (entry.resolved) urls.add(entry.resolved);
  }
  const all = [...urls];
  const queue = [...all];
  let failures = 0;
  const workers = Array.from({ length: 16 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      const status = await head(url);
      if (status && status >= 400) {
        failures++;
        errors.push(`registry returned ${status} for ${url}`);
      }
    }
  });
  await Promise.all(workers);
  return failures;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const { lock } = load();
  const errors = checkLockfileConsistency();
  const offline = process.argv.includes("--offline");
  if (!offline) {
    await checkRegistry(lock, errors);
  }
  if (errors.length > 0) {
    console.error(`[check-packages] ${errors.length} problem(s) found:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(
    `[check-packages] OK — ${offline ? "offline consistency" : `all ${Object.keys(lock.packages || {}).length} lockfile entries resolve`} verified`,
  );
}
