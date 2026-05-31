// Optional build-time data overlay. When DATA_REPO_URL is set, pull data/*.json
// from a (typically private) repo over the committed sample data before the
// build. Lets you keep the code in this public repo and your real program data
// in a separate private repo, combined only in your own deployment.
//
// Auth (private repos), pick one:
//   - Deploy key (recommended): set DATA_REPO_URL to the SSH form
//     (git@github.com:you/your-data.git) and DATA_REPO_DEPLOY_KEY to a
//     base64-encoded read-only private key.
//   - Token: embed it in the HTTPS URL
//     (https://x-access-token:<TOKEN>@github.com/you/your-data.git).
//
// When DATA_REPO_URL is unset (the public template, other deployers, local dev)
// this is a no-op and the committed data/ is used as-is.
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATA_REPO_URL;
const branch = process.env.DATA_REPO_BRANCH || "main";
const deployKey = process.env.DATA_REPO_DEPLOY_KEY;

if (!url) {
  console.log("[fetch-data] DATA_REPO_URL not set — using the committed data/.");
  process.exit(0);
}

const clone = mkdtempSync(path.join(tmpdir(), "lanyard-data-"));
let keyDir;
const env = { ...process.env };

try {
  if (deployKey) {
    // Write the read-only deploy key and point git's SSH at it. Accept either
    // the raw PEM (recommended — paste it as a multiline Vercel value) or a
    // base64 blob, and normalise line endings: OpenSSH rejects CRLF or a
    // missing trailing newline with "error in libcrypto".
    keyDir = mkdtempSync(path.join(tmpdir(), "lanyard-key-"));
    const keyFile = path.join(keyDir, "id");
    const isPem = /-----BEGIN [^-]*PRIVATE KEY-----/.test(deployKey);
    let pem = isPem ? deployKey : Buffer.from(deployKey.replace(/\s+/g, ""), "base64").toString("utf8");
    pem = pem.replace(/\r\n?/g, "\n").trimEnd() + "\n";
    writeFileSync(keyFile, pem, { mode: 0o600 });
    env.GIT_SSH_COMMAND = `ssh -i "${keyFile}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`;
  }
  // stdout suppressed so a tokenised URL can't surface in build logs.
  execSync(`git clone --depth 1 --branch "${branch}" "${url}" "${clone}"`, {
    stdio: ["ignore", "ignore", "inherit"],
    env,
  });
  const files = ["sessions.json", "speakers.json", "organizations.json", "research.json"];
  let copied = 0;
  for (const f of files) {
    const src = [path.join(clone, "data", f), path.join(clone, f)].find(existsSync);
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
  rmSync(clone, { recursive: true, force: true });
  if (keyDir) rmSync(keyDir, { recursive: true, force: true });
}
