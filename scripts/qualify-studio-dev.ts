/**
 * Phase 4 qualification scaffold. This file is intentionally not executed in
 * Phase 3. It must be run only after a human approves the exact network,
 * account, fee profile, and contract source.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "../frontend/node_modules/genlayer-js/dist/index.js";
import { studioDevnet } from "../frontend/node_modules/genlayer-js/dist/chains/index.js";

const TARGET_CHAIN_ID = 61997;
const TARGET_RPC = "https://studio-dev.genlayer.com/api";
const CONTRACT_SOURCE_SHA256 = "61b7c4ae5dccd0ebffa5d4300bce5bc53463479b69f8d3e560695ea1772aabe1";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repoRoot, "artifacts/deployment-manifest.json");

function assertTargetNetwork(): void {
  if (studioDevnet.id !== TARGET_CHAIN_ID || studioDevnet.rpcUrls.default.http[0] !== TARGET_RPC) {
    throw new Error("QUALIFICATION_NETWORK_GUARD_FAILED");
  }
}

function loadManifest(): Record<string, unknown> {
  return JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
}

async function main(): Promise<void> {
  assertTargetNetwork();
  const manifest = loadManifest();
  if (manifest.status !== "NOT_DEPLOYED") throw new Error("QUALIFICATION_MANIFEST_NOT_PRISTINE");
  if (manifest.contract_sha256 !== CONTRACT_SOURCE_SHA256) throw new Error("QUALIFICATION_SOURCE_HASH_MISMATCH");
  const client = createClient({ chain: studioDevnet });
  const policy = await client.getCurrentFeePolicy();
  console.log(JSON.stringify({ network: "studio-dev", chain_id: TARGET_CHAIN_ID, rpc: TARGET_RPC, policy, next: ["read deployer", "load measured fee profile", "estimate deploy", "broadcast exactly once", "persist hash", "reconcile same hash", "verify contract_info", "run hero canary", "canonical readback"] }, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
  // Read-only preflight only. Deployment and manifest mutation remain explicit Phase 4 actions.
}

if (import.meta.url === "file://" + process.argv[1]) void main();
