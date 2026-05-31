// Optional build-time data overlay. When DATA_REPO_URL is set, pull data/*.json
// from a (typically private) repo over the committed sample data before the
// build. Lets you keep the code in this public repo and your real program data
// in a separate private repo, combined only in your own deployment.
//
// When DATA_REPO_URL is unset (the public template, other deployers, local dev)
// this is a no-op and the committed data/ is used as-is.
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATA_REPO_URL;
const branch = process.env.DATA_REPO_BRANCH || "main";

if (!url) {
  console.log("[fetch-data] DATA_REPO_URL not set — using the committed data/.");
  process.exit(0);
}

const tmp = mkdtempSync(path.join(tmpdir(), "lanyard-data-"));
try {
  // stdout suppressed so a tokenised URL can't surface in build logs; git's
  // own progress (no credentials) still goes to stderr.
  execSync(`git clone --depth 1 --branch "${branch}" "${url}" "${tmp}"`, {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const files = ["sessions.json", "speakers.json", "organizations.json", "research.json"];
  let copied = 0;
  for (const f of files) {
    const src = [path.join(tmp, "data", f), path.join(tmp, f)].find(existsSync);
    if (src) {
      cpSync(src, path.join(ROOT, "data", f));
      copied++;
    }
  }
  if (copied === 0) {
    console.error("[fetch-data] no data/*.json found in DATA_REPO_URL — aborting.");
    process.exit(1);
  }
  console.log(`[fetch-data] overlaid ${copied} data file(s) from the private data repo.`);
} catch (e) {
  console.error("[fetch-data] failed to fetch the data repo:", e.message);
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
