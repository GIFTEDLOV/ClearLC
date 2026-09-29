/**
 * ClearLC Studio-dev qualification runner.
 *
 * This runner is deliberately opt-in: without --preflight it refuses to do
 * anything, and --run permits exactly one deployment followed by the single
 * Case B canary. It never retries a broadcast and persists every returned
 * transaction hash before polling it.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { createAccount, createClient, isSuccessful } from "../frontend/node_modules/genlayer-js/dist/index.js";
import { studioDevnet } from "../frontend/node_modules/genlayer-js/dist/chains/index.js";

const TARGET_NETWORK = "studio-dev";
const TARGET_CHAIN_ID = 61997;
const TARGET_RPC = "https://studio-dev.genlayer.com/api";
const EXPECTED_REPO_ROOT = "C:/Users/DELL/ClearLC";
// Studio-dev v0.6 accepts this runner/API surface. The previous 1jb runner
// was rejected by hosted GenVM as `invalid_contract runner malformed`.
const EXPECTED_RUNNER = "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng";
const HOSTED_SCHEMA_FOR_CODE_METHOD = "gen_getContractSchemaForCode";
const MAX_SOURCE_URI_BYTES = 512;
const CONTRACT_SOURCE_SHA256 = "9d63b9b3c0ee290896411004f383cf5a4c0ad8e1864e7400b4c833537c5527a2";
const EXPECTED_METHOD_COUNT = 33;
const EXPECTED_RULESET_ID = "clearlc-synthetic-ops-v1";
const EXPECTED_RULESET_HASH = "85e60d8d3268867021e1e340c206b8ed63f3fb2cc5110c406849ba8af24552cb";
const EXPECTED_REQUIREMENTS_ROOT = "6ead5878d14c77dcde12ff584ce41b3616e8352b503c275ed86b593f3470b648";
const CASE_B_ESCROW_VALUE = 250000n;
const QUALITY_FIXTURE_PATH = "fixtures/documents/quality-inspection-title-only.txt";
const QUALITY_FIXTURE_SHA256 = "9ca476ade6c465175ec03e7d1e8361ddd7243367a432943962eb9c6699e44371";
const JOURNAL_PATH = "artifacts/studio-dev-qualification.json";
const MANIFEST_PATH = "artifacts/deployment-manifest.json";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(repoRoot, "contracts/clearlc.py");
const manifestPath = resolve(repoRoot, MANIFEST_PATH);
const journalPath = resolve(repoRoot, JOURNAL_PATH);

function safeJson(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(safeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, safeJson(item)]));
  }
  return value;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(safeJson(value), null, 2) + "\n", "utf8");
}

function loadJson(path: string, fallback: unknown): any {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function hashText(value: string): string {
  return hashBytes(Buffer.from(value, "utf8"));
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function assertCaseBSourceUri(value: string): void {
  if (value.length === 0 || utf8ByteLength(value) > MAX_SOURCE_URI_BYTES) throw new Error("CASE_B_SOURCE_URI_INVALID_OR_TOO_LONG");
  if ([...value].some((character) => /\s/u.test(character) || (character.codePointAt(0) ?? 0) < 32)) throw new Error("CASE_B_SOURCE_URI_INVALID_OR_TOO_LONG");
  if (value.includes("@") || value.includes("#") || value.includes("?")) throw new Error("CASE_B_SOURCE_URI_INVALID_OR_TOO_LONG");
  if (!value.startsWith("https://")) throw new Error("CASE_B_SOURCE_URI_INVALID_OR_TOO_LONG");
  const remainder = value.slice("https://".length);
  const authority = remainder.split("/", 1)[0];
  if (remainder.length <= 3 || remainder.startsWith("/") || !authority.includes(".")) throw new Error("CASE_B_SOURCE_URI_INVALID_OR_TOO_LONG");
}

function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const result: Record<string, unknown> = { name: error.name, message: error.message, stack: error.stack };
    if ("cause" in error) result.cause = describeError((error as Error & { cause?: unknown }).cause);
    return result;
  }
  return { value: String(error) };
}

function assertTargetNetwork(): void {
  const rpc = studioDevnet.rpcUrls.default.http[0];
  if (studioDevnet.id !== TARGET_CHAIN_ID || rpc !== TARGET_RPC) throw new Error("QUALIFICATION_NETWORK_GUARD_FAILED");
}

function assertWorkspaceGuard(): string {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: repoRoot, encoding: "utf8" }).trim().replaceAll("\\", "/");
  if (root !== EXPECTED_REPO_ROOT || root !== repoRoot.replaceAll("\\", "/")) throw new Error(`QUALIFICATION_WORKSPACE_GUARD_FAILED:${root}`);
  return root;
}

function assertSourceGuard(mode: string): { source: string; sourceHash: string; commit: string } {
  assertWorkspaceGuard();
  const source = readFileSync(contractPath, "utf8");
  assertRuntimeCompatibilityGuard(source);
  const sourceHash = hashText(source);
  if (sourceHash !== CONTRACT_SOURCE_SHA256) throw new Error("QUALIFICATION_SOURCE_HASH_MISMATCH");
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  if (mode === "--run") {
    try {
      execFileSync("git", ["diff", "--quiet", "--", "contracts/clearlc.py"], { cwd: repoRoot, stdio: "ignore" });
    } catch {
      throw new Error("QUALIFICATION_CONTRACT_WORKTREE_CHANGED");
    }
  }
  return { source, sourceHash, commit };
}

function assertRuntimeCompatibilityGuard(source: string): void {
  const lines = source.split(/\r?\n/u);
  const descriptor = `# { "Depends": "${EXPECTED_RUNNER}" }`;
  if (lines[0] !== descriptor || lines[1] !== "") throw new Error("RUNTIME_RUNNER_DESCRIPTOR_GUARD_FAILED");
  if (!source.includes("import genlayer as gl")) throw new Error("RUNTIME_IMPORT_GUARD_FAILED");
  if (source.includes("from genlayer import *")) throw new Error("OBSOLETE_GENLAYER_STAR_IMPORT");
  if (!source.includes("class ClearLC(gl.contract.Contract):")) throw new Error("RUNTIME_CONTRACT_BASE_GUARD_FAILED");
  if (source.includes("class ClearLC(gl.Contract):")) throw new Error("OBSOLETE_GENLAYER_CONTRACT_BASE");
  if ((source.match(/@gl\.storage\.allow/g) ?? []).length !== 9 || source.includes("@allow_storage")) {
    throw new Error("RUNTIME_STORAGE_DECORATOR_GUARD_FAILED");
  }
  if (/(?<![\w.])u256\b/u.test(source) || /(?<![\w.])DynArray\b/u.test(source) || /(?<![\w.])TreeMap\b/u.test(source)) {
    throw new Error("RUNTIME_STORAGE_TYPE_NAMESPACE_GUARD_FAILED");
  }
}

async function getHostedSourceSchema(client: any, source: string): Promise<any> {
  return client.request({
    method: HOSTED_SCHEMA_FOR_CODE_METHOD,
    params: [`0x${Buffer.from(source, "utf8").toString("hex")}`]
  });
}

function loadJournal(): any {
  return loadJson(journalPath, {
    schema_version: 1,
    network: TARGET_NETWORK,
    chain_id: TARGET_CHAIN_ID,
    rpc: TARGET_RPC,
    source_commit: null,
    contract_sha256: CONTRACT_SOURCE_SHA256,
    deployer: null,
    deployment: { tx_id: null, phase: "NOT_STARTED", receipt: null, contract_address: null },
    case_b: { credit_id: null, actor_separation: "NOT_PROVEN_LIVE", transactions: [], adjudication_fingerprint: null },
    budget: {},
    fee_measurements: {},
    observations: []
  });
}

function saveJournal(journal: any): void {
  writeJson(journalPath, journal);
}

function logObservation(journal: any, event: string, data: unknown = {}): void {
  journal.observations.push({ at: new Date().toISOString(), event, data: safeJson(data) });
  saveJournal(journal);
}

function asAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("QUALIFICATION_ACCOUNT_ADDRESS_INVALID");
  return value;
}

async function loadAccount(): Promise<{ account: any; accountName: string }> {
  const configPath = join(process.env.USERPROFILE ?? "", ".genlayer", "genlayer-config.json");
  const config = loadJson(configPath, null);
  const accountName = config?.activeAccount;
  if (typeof accountName !== "string" || accountName.length === 0) throw new Error("ACTIVE_ACCOUNT_NOT_CONFIGURED");
  const packagePath = process.platform === "win32"
    ? join(process.env.APPDATA ?? "", "npm", "node_modules", "genlayer", "package.json")
    : join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "genlayer", "package.json");
  const globalRequire = createRequire(packagePath);
  const keytar = globalRequire("keytar");
  const privateKey = await keytar.getPassword("genlayer-cli", `account:${accountName}`);
  if (typeof privateKey !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error("ACTIVE_ACCOUNT_KEY_UNAVAILABLE_OR_INVALID");
  const account = createAccount(privateKey);
  asAddress(account.address);
  return { account, accountName };
}

function normalizeReceipt(receipt: any): any {
  return safeJson(receipt);
}

function executionName(receipt: any): string | null {
  return receipt?.txExecutionResultName ?? receipt?.executionResultName ?? receipt?.execution_result ?? null;
}

function statusName(receipt: any): string | null {
  return receipt?.statusName ?? receipt?.status ?? null;
}

function extractContractAddress(receipt: any): string | null {
  const candidates = [receipt?.data?.contract_address, receipt?.data?.contractAddress, receipt?.txDataDecoded?.contractAddress, receipt?.contract_address, receipt?.contractAddress, receipt?.receipt?.contract_address];
  return candidates.find((candidate) => typeof candidate === "string" && /^0x[0-9a-fA-F]{40}$/.test(candidate)) ?? null;
}

function parseContractJson(raw: unknown): any {
  if (typeof raw === "string") return JSON.parse(raw);
  return raw;
}

async function balanceOf(client: any, address: string): Promise<bigint> {
  const raw = await client.request({ method: "eth_getBalance", params: [address, "latest"] });
  return BigInt(raw);
}

async function nonceOf(client: any, address: string, tag: string): Promise<number | null> {
  try {
    const raw = await client.request({ method: "eth_getTransactionCount", params: [address, tag] });
    return Number(BigInt(raw));
  } catch {
    return null;
  }
}

async function chainTimestamp(client: any): Promise<number> {
  const block = await client.request({ method: "eth_getBlockByNumber", params: ["latest", false] }) as any;
  if (!block?.timestamp) throw new Error("CHAIN_TIMESTAMP_UNAVAILABLE");
  const value = Number(BigInt(block.timestamp));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("CHAIN_TIMESTAMP_INVALID");
  return value;
}

async function verifyEvidenceTransport(sourceUri: string, expectedHash: string, expectedLength: number): Promise<void> {
  const response = await fetch(sourceUri);
  if (!response.ok) throw new Error(`CASE_B_SOURCE_FETCH_FAILED:${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actualHash = hashBytes(bytes);
  if (bytes.length !== expectedLength) throw new Error(`CASE_B_SOURCE_LENGTH_MISMATCH:${bytes.length}`);
  if (actualHash !== expectedHash) throw new Error(`CASE_B_SOURCE_HASH_MISMATCH:${actualHash}`);
}

function feeInput(estimate: any): any {
  if (!estimate) return undefined;
  return { distribution: estimate.distribution, messageAllocations: estimate.messageAllocations, feeValue: estimate.feeValue };
}

async function estimateDeployFees(client: any, policy: any): Promise<any> {
  if (!policy.enabled) return { gasless: true, estimate: null };
  const estimate = await client.estimateTransactionFees();
  return { gasless: false, estimate: normalizeReceipt(estimate), fees: feeInput(estimate) };
}

async function estimateWriteFees(client: any, account: any, address: string, functionName: string, args: unknown[], value: bigint | undefined, policy: any): Promise<any> {
  if (!policy.enabled) return { gasless: true, estimate: null };
  const estimate = await client.estimateTransactionFeesForWrite({ account, address, functionName, args, value });
  return { gasless: false, estimate: normalizeReceipt(estimate), fees: feeInput(estimate) };
}

async function estimateCaseBFees(client: any, account: any, address: string, policy: any, calls: Array<{ method: string; key: string; args: unknown[]; value?: bigint }>): Promise<any> {
  if (!policy.enabled) return { gasless: true, total_fee_value: "0", calls: calls.map((call) => ({ method: call.method, key: call.key, fee_value: "0" })) };
  let total = 0n;
  const estimates = [];
  for (const call of calls) {
    const result = await estimateWriteFees(client, account, address, call.method, call.args, call.value, policy);
    const feeValue = result.estimate?.feeValue ? BigInt(result.estimate.feeValue) : 0n;
    total += feeValue;
    estimates.push({ method: call.method, key: call.key, fee_value: feeValue.toString(), estimate: result.estimate });
  }
  return { gasless: false, total_fee_value: total.toString(), calls: estimates };
}

function transactionKey(method: string, key: string): string {
  return `${method}:${key}`;
}

function existingTransaction(journal: any, key: string): any | undefined {
  return journal.case_b.transactions.find((item: any) => item.key === key);
}

async function waitAndVerify(client: any, journal: any, record: any): Promise<any> {
  record.phase = "PENDING";
  record.last_observed_at = new Date().toISOString();
  saveJournal(journal);
  const receipt = await client.waitForFinalization({ hash: record.tx_id, fullTransaction: true });
  record.receipt = normalizeReceipt(receipt);
  record.status_name = statusName(receipt);
  record.execution_result = executionName(receipt);
  record.phase = "FINALIZED";
  record.finalized_at = new Date().toISOString();
  saveJournal(journal);
  if (!isSuccessful(receipt)) {
    record.phase = "EXECUTION_FAILED";
    saveJournal(journal);
    throw new Error(`EXECUTION_FAILED:${record.method}:${record.tx_id}:${record.execution_result ?? "UNKNOWN"}`);
  }
  return receipt;
}

async function runWrite(client: any, account: any, address: string, policy: any, journal: any, method: string, key: string, args: unknown[], options: { value?: bigint; expected: string; verify: () => Promise<any> }): Promise<{ txId: string; receipt: any; readback: any; fee: any }> {
  const txKey = transactionKey(method, key);
  const prior = existingTransaction(journal, txKey);
  if (prior) {
    if (prior.phase === "EXECUTION_FAILED" || prior.phase === "SUBMISSION_STATE_UNCERTAIN") throw new Error(`PRIOR_WRITE_FAILED_NO_RETRY:${txKey}`);
    const receipt = prior.phase === "COMPLETE" ? prior.receipt : await waitAndVerify(client, journal, prior);
    const readback = await options.verify();
    if (prior.phase === "COMPLETE") return { txId: prior.tx_id, receipt, readback, fee: prior.fee_estimate };
    prior.phase = "COMPLETE";
    prior.canonical_readback = normalizeReceipt(readback);
    saveJournal(journal);
    return { txId: prior.tx_id, receipt, readback, fee: prior.fee_estimate };
  }
  const fee = await estimateWriteFees(client, account, address, method, args, options.value, policy);
  const record: any = { key: txKey, method, args: safeJson(args), value: options.value?.toString() ?? "0", expected_postcondition: options.expected, phase: "PREPARED", fee_estimate: fee.estimate, fee_value: fee.estimate?.feeValue ?? "0", submitted_at: null, tx_id: null, receipt: null, canonical_readback: null };
  journal.case_b.transactions.push(record);
  saveJournal(journal);
  let txId: string;
  try {
    const writeArgs: any = { account, address, functionName: method, args };
    if (options.value !== undefined) writeArgs.value = options.value;
    if (!fee.gasless) writeArgs.fees = feeInput(fee.estimate);
    record.phase = "SIGNING";
    saveJournal(journal);
    txId = await client.writeContract(writeArgs);
  } catch (error) {
    record.phase = "SUBMISSION_STATE_UNCERTAIN";
    record.error = describeError(error);
    saveJournal(journal);
    throw new Error(`SUBMISSION_STATE_UNCERTAIN:${txKey}`);
  }
  if (typeof txId !== "string" || txId.length < 8) throw new Error(`INVALID_TRANSACTION_HASH:${txKey}`);
  record.tx_id = txId;
  record.submitted_at = new Date().toISOString();
  record.phase = "SUBMITTED_HASH_PERSISTED";
  saveJournal(journal);
  const receipt = await waitAndVerify(client, journal, record);
  const readback = await options.verify();
  record.canonical_readback = normalizeReceipt(readback);
  record.phase = "COMPLETE";
  saveJournal(journal);
  return { txId, receipt, readback, fee: fee.estimate };
}

async function read(client: any, address: string, functionName: string, args: unknown[] = []): Promise<any> {
  return client.readContract({ address, functionName, args });
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode !== "--preflight" && mode !== "--run") throw new Error("QUALIFICATION_REQUIRES_--PREFLIGHT_OR_--RUN");
  assertTargetNetwork();
  const sourceGuard = assertSourceGuard(mode);
  const manifest = loadJson(manifestPath, null);
  const manifestCandidateSha = manifest?.candidate_contract_sha256 ?? manifest?.contract_sha256;
  if (!manifest || manifestCandidateSha !== CONTRACT_SOURCE_SHA256) throw new Error("QUALIFICATION_MANIFEST_SOURCE_HASH_MISMATCH");
  const journal = loadJournal();
  const journalCandidateSha = journal.candidate_contract_sha256 ?? journal.contract_sha256;
  if (journalCandidateSha !== CONTRACT_SOURCE_SHA256 || journal.network !== TARGET_NETWORK || journal.chain_id !== TARGET_CHAIN_ID) throw new Error("QUALIFICATION_JOURNAL_GUARD_FAILED");
  const deployment2 = journal.deployment_2 ?? {
    deployment_number: 2,
    tx_id: null,
    phase: "NOT_STARTED",
    receipt: null,
    contract_address: null,
  };
  journal.deployment_2 = deployment2;
  journal.candidate_source_commit = sourceGuard.commit;
  journal.candidate_contract_sha256 = sourceGuard.sourceHash;
  const { account, accountName } = await loadAccount();
  journal.deployer = account.address;
  const client = createClient({ chain: studioDevnet, account });
  const hostedSourceSchema = await getHostedSourceSchema(client, sourceGuard.source);
  const hostedSourceMethodNames = Object.keys(hostedSourceSchema?.methods ?? {}).sort();
  if (hostedSourceMethodNames.length !== EXPECTED_METHOD_COUNT) throw new Error(`HOSTED_SOURCE_SCHEMA_METHOD_COUNT_MISMATCH:${hostedSourceMethodNames.length}`);
  journal.candidate_hosted_schema = {
    method: HOSTED_SCHEMA_FOR_CODE_METHOD,
    constructor: hostedSourceSchema?.ctor ?? null,
    method_count: hostedSourceMethodNames.length,
    methods: hostedSourceMethodNames,
    checked_at: new Date().toISOString()
  };
  saveJournal(journal);
  const policy = await client.getCurrentFeePolicy();
  const balanceBefore = await balanceOf(client, account.address);
  const latestNonce = await nonceOf(client, account.address, "latest");
  const pendingNonce = await nonceOf(client, account.address, "pending");
  const deployFee = await estimateDeployFees(client, policy);
  journal.preflight = { account_name: accountName, deployer: account.address, balance_before: balanceBefore.toString(), latest_nonce: latestNonce, pending_nonce: pendingNonce, fee_policy: normalizeReceipt(policy), gasless: !policy.enabled, deploy_fee_estimate: deployFee.estimate, checked_at: new Date().toISOString() };
  logObservation(journal, "PREFLIGHT_COMPLETE", journal.preflight);
  const requiredEscrow = CASE_B_ESCROW_VALUE;
  const feeValue = deployFee.estimate?.feeValue ? BigInt(deployFee.estimate.feeValue) : 0n;
  if (balanceBefore < requiredEscrow + feeValue) throw new Error(`INSUFFICIENT_BALANCE:required_at_least_${(requiredEscrow + feeValue).toString()}`);
  const liveSourceUri = process.env.CLEARLC_CASE_B_SOURCE_URI;
  if (!liveSourceUri) throw new Error("CASE_B_SOURCE_URI_REQUIRED_FOR_LIVE_RUN");
  assertCaseBSourceUri(liveSourceUri);
  const qualityBytes = readFileSync(resolve(repoRoot, QUALITY_FIXTURE_PATH));
  if (hashBytes(qualityBytes) !== QUALITY_FIXTURE_SHA256 || qualityBytes.length !== 333) throw new Error("CASE_B_FIXTURE_HASH_GUARD_FAILED");
  await verifyEvidenceTransport(liveSourceUri, QUALITY_FIXTURE_SHA256, qualityBytes.length);
  if (mode === "--preflight") {
    journal.budget = {
      available_balance: balanceBefore.toString(),
      deploy_estimated_cost: feeValue.toString(),
      case_b_estimated_total_fees: null,
      case_b_escrow_value: requiredEscrow.toString(),
      total_required_balance: null,
      balance_margin: null,
      balance_sufficient_for_full_qualification: false,
      status: "CASE_B_WRITE_ESTIMATE_REQUIRES_DEPLOYED_CONTRACT_ADDRESS"
    };
    saveJournal(journal);
    console.log(JSON.stringify({ mode, network: TARGET_NETWORK, chain_id: TARGET_CHAIN_ID, deployer: account.address, balance_before: balanceBefore, policy, deploy_fee: deployFee }, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
    return;
  }

  let contractAddress = deployment2.contract_address;
  let deploymentReceipt: any = deployment2.receipt;
  if (!contractAddress) {
    if (deployment2.tx_id) {
      deployment2.phase = "HASH_RETURNED_RECONCILIATION";
      saveJournal(journal);
      deploymentReceipt = await waitAndVerify(client, journal, deployment2);
    } else {
      if (manifest.candidate_status !== "NOT_DEPLOYED") throw new Error("QUALIFICATION_MANIFEST_CANDIDATE_NOT_PRISTINE");
      const deployFees = deployFee.gasless ? undefined : feeInput(deployFee.estimate);
      deployment2.phase = "PREPARED";
      deployment2.fee_estimate = deployFee.estimate;
      saveJournal(journal);
      let deployTx: string;
      try {
        deployTx = await client.deployContract({ account, code: sourceGuard.source, fees: deployFees });
      } catch (error) {
        deployment2.phase = "NOT_SUBMITTED_OR_STATE_UNCERTAIN";
        deployment2.error = describeError(error);
        saveJournal(journal);
        throw new Error("DEPLOYMENT_NO_HASH_FAILURE:NOT_SUBMITTED_OR_SUBMISSION_STATE_UNCERTAIN");
      }
      deployment2.tx_id = deployTx;
      deployment2.submitted_at = new Date().toISOString();
      deployment2.phase = "SUBMITTED_HASH_PERSISTED";
      saveJournal(journal);
      deploymentReceipt = await waitAndVerify(client, journal, deployment2);
    }
    contractAddress = extractContractAddress(deploymentReceipt);
    if (!contractAddress) {
      const latest = await client.getTransaction({ hash: deployment2.tx_id });
      contractAddress = extractContractAddress(latest);
      deploymentReceipt = latest;
    }
    if (!contractAddress) throw new Error("DEPLOYMENT_ADDRESS_NOT_EXPOSED_BY_AUTHORITATIVE_RESULT");
    deployment2.contract_address = contractAddress;
    deployment2.receipt = normalizeReceipt(deploymentReceipt);
    deployment2.phase = "DEPLOYMENT_VERIFIED_ADDRESS_CAPTURED";
    saveJournal(journal);
  }
  contractAddress = asAddress(contractAddress);

  const info = parseContractJson(await read(client, contractAddress, "contract_info"));
  const schema = await client.getContractSchema(contractAddress);
  const methodNames = Object.keys(schema?.methods ?? {}).sort();
  if (methodNames.length !== EXPECTED_METHOD_COUNT) throw new Error(`DEPLOYED_SCHEMA_METHOD_COUNT_MISMATCH:${methodNames.length}`);
  if (info?.protocol !== "ClearLC" || info?.outgoing_value_release_enabled !== false) throw new Error("CONTRACT_INFO_IDENTITY_MISMATCH");
  let deployedCode: string | null = null;
  try { deployedCode = await client.getContractCode(contractAddress); } catch { deployedCode = null; }
  const deployedSourceHash = deployedCode ? hashText(deployedCode) : null;
  deployment2.contract_info = info;
  deployment2.schema_method_count = methodNames.length;
  deployment2.schema_methods = methodNames;
  deployment2.deployed_source_sha256 = deployedSourceHash;
  deployment2.source_parity_proof_level = deployedSourceHash === CONTRACT_SOURCE_SHA256 ? "EXACT_DEPLOYED_SOURCE_READBACK" : deployedCode ? "CODE_READBACK_HASH_DIFFERENT_CANONICALIZATION" : "DEPLOYMENT_INPUT_HASH_SCHEMA_AND_CONTRACT_INFO";
  deployment2.phase = "DEPLOYMENT_VERIFIED";
  saveJournal(journal);

  const chainNow = await chainTimestamp(client);
  const caseId = journal.case_b.credit_id ?? `CLC-LIVE-CB-${chainNow}`;
  journal.case_b.credit_id = caseId;
  journal.case_b.actor_separation = "NOT_PROVEN_LIVE";
  saveJournal(journal);
  const actor = account.address;
  const amount = CASE_B_ESCROW_VALUE;
  const creditArgs = [caseId, actor, actor, actor, amount, "GEN accounting units", BigInt(chainNow + 86400), BigInt(chainNow + 43200), BigInt(chainNow + 21600), EXPECTED_RULESET_ID, EXPECTED_RULESET_HASH];
  const requirementId = `${caseId}-REQ-QUALITY`;
  const evidenceId = `${caseId}-EV-QUALITY-TITLE-ONLY`;
  const documentId = `${caseId}-DOC-QUALITY-TITLE-ONLY`;
  const presentationId = `${caseId}-PRES-1`;
  const discrepancyId = `${caseId}-DISC-TITLE-ONLY`;
  const canonicalEvidence = `${evidenceId}|${documentId}|${QUALITY_FIXTURE_SHA256}|333|1;`;
  const evidenceSetHash = hashText(canonicalEvidence);
  const requirementArgs = [caseId, requirementId, 1n, "Certificate of Quality", true, "Independent surveyor authority", "Goods, quality outcome, issuer authority and identity must be present", "Title variants are not material when the authenticated document fulfills the required certificate function", "ClearLC Synthetic Ops v1 / semantic title-function principle"];
  const evidenceArgs = [evidenceId, documentId, caseId, presentationId, 1n, "Certificate of Quality", "Delta Surveyors Nigeria DEMO", "Meridian Cocoa Export Ltd.", liveSourceUri, QUALITY_FIXTURE_SHA256, 333n, BigInt(chainNow), BigInt(chainNow), "DEMO-SURVEYOR-001", 1n];
  const caseBFeeCalls = [
    { method: "create_credit", key: caseId, args: creditArgs },
    { method: "define_requirement", key: requirementId, args: requirementArgs },
    { method: "set_requirements_root", key: caseId, args: [caseId, EXPECTED_REQUIREMENTS_ROOT] },
    { method: "fund_credit", key: caseId, args: [caseId], value: amount },
    { method: "accept_credit", key: caseId, args: [caseId] },
    { method: "freeze_credit", key: caseId, args: [caseId] },
    { method: "commit_evidence", key: evidenceId, args: evidenceArgs },
    { method: "submit_presentation", key: presentationId, args: [caseId, presentationId, 1n, 1n, evidenceSetHash, ""] },
    { method: "begin_examination", key: presentationId, args: [caseId, presentationId] },
    { method: "record_requirement_check", key: requirementId, args: [caseId, presentationId, requirementId, "SEMANTIC_REVIEW", evidenceId, "Title-only mismatch asserted for bounded semantic review."] },
    { method: "file_discrepancy", key: discrepancyId, args: [caseId, presentationId, discrepancyId, requirementId, "SEMANTIC", "TITLE_ONLY_MISMATCH", evidenceSetHash, evidenceId] },
    { method: "finalize_examination", key: presentationId, args: [caseId, presentationId] },
    { method: "challenge_discrepancy", key: discrepancyId, args: [caseId, discrepancyId] },
    { method: "adjudicate_discrepancy", key: discrepancyId, args: [caseId, discrepancyId] },
    { method: "mark_settlement_ready", key: caseId, args: [caseId] },
    { method: "settle_credit", key: caseId, args: [caseId] },
  ];
  const caseBFeeEstimate = await estimateCaseBFees(client, account, contractAddress, policy, caseBFeeCalls);
  const caseBFeeValue = BigInt(caseBFeeEstimate.total_fee_value);
  const totalRequiredBalance = feeValue + caseBFeeValue + amount;
  const balanceMargin = balanceBefore - totalRequiredBalance;
  journal.budget = {
    available_balance: balanceBefore.toString(),
    deploy_estimated_cost: feeValue.toString(),
    case_b_estimated_total_fees: caseBFeeValue.toString(),
    case_b_escrow_value: amount.toString(),
    total_required_balance: totalRequiredBalance.toString(),
    balance_margin: balanceMargin.toString(),
    balance_sufficient_for_full_qualification: balanceMargin >= 0,
    case_b_fee_estimates: caseBFeeEstimate.calls,
    status: "COMPLETE_CURRENT_ESTIMATES"
  };
  saveJournal(journal);
  if (balanceMargin < 0) throw new Error(`INSUFFICIENT_BALANCE_FOR_FULL_QUALIFICATION:${balanceMargin.toString()}`);
  const verifyCredit = async (expected: string): Promise<any> => {
    const value = parseContractJson(await read(client, contractAddress, "get_credit", [caseId]));
    if (expected && value.status !== expected) throw new Error(`CANONICAL_POSTCONDITION_FAILURE:get_credit:${expected}:${value.status}`);
    return value;
  };
  await runWrite(client, account, contractAddress, policy, journal, "create_credit", caseId, creditArgs, { expected: "credit exists in CREATED", verify: () => verifyCredit("CREATED") });
  await runWrite(client, account, contractAddress, policy, journal, "define_requirement", requirementId, requirementArgs, { expected: "quality requirement exists", verify: async () => parseContractJson(await read(client, contractAddress, "get_requirements", [caseId, 1n])) });
  await runWrite(client, account, contractAddress, policy, journal, "set_requirements_root", caseId, [caseId, EXPECTED_REQUIREMENTS_ROOT], { expected: "requirements root frozen", verify: async () => { const v = await verifyCredit("CREATED"); if (v.requirements_root !== EXPECTED_REQUIREMENTS_ROOT) throw new Error("CANONICAL_POSTCONDITION_FAILURE:requirements_root"); return v; } });
  await runWrite(client, account, contractAddress, policy, journal, "fund_credit", caseId, [caseId], { value: amount, expected: "escrow equals credit amount", verify: async () => { const v = await verifyCredit("FUNDED"); if (v.escrowed_amount !== amount.toString()) throw new Error("CANONICAL_POSTCONDITION_FAILURE:funding"); return v; } });
  await runWrite(client, account, contractAddress, policy, journal, "accept_credit", caseId, [caseId], { expected: "credit accepted", verify: () => verifyCredit("ACCEPTED") });
  await runWrite(client, account, contractAddress, policy, journal, "freeze_credit", caseId, [caseId], { expected: "credit version frozen", verify: async () => { const v = await verifyCredit("PRESENTATION_OPEN"); if (v.frozen !== true) throw new Error("CANONICAL_POSTCONDITION_FAILURE:frozen"); return v; } });
  await runWrite(client, account, contractAddress, policy, journal, "commit_evidence", evidenceId, evidenceArgs, { expected: "authenticated evidence committed", verify: () => read(client, contractAddress, "get_evidence", [evidenceId]) });
  await runWrite(client, account, contractAddress, policy, journal, "submit_presentation", presentationId, [caseId, presentationId, 1n, 1n, evidenceSetHash, ""], { expected: "presentation is canonical", verify: async () => { const p = parseContractJson(await read(client, contractAddress, "get_presentation", [presentationId])); if (p.evidence_set_hash !== evidenceSetHash) throw new Error("CANONICAL_POSTCONDITION_FAILURE:evidence_set"); return p; } });
  await runWrite(client, account, contractAddress, policy, journal, "begin_examination", presentationId, [caseId, presentationId], { expected: "examination opened", verify: () => verifyCredit("UNDER_EXAMINATION") });
  await runWrite(client, account, contractAddress, policy, journal, "record_requirement_check", requirementId, [caseId, presentationId, requirementId, "SEMANTIC_REVIEW", evidenceId, "Title-only mismatch asserted for bounded semantic review."], { expected: "requirement marked semantic review", verify: () => read(client, contractAddress, "get_requirement_matrix", [caseId, presentationId]) });
  await runWrite(client, account, contractAddress, policy, journal, "file_discrepancy", discrepancyId, [caseId, presentationId, discrepancyId, requirementId, "SEMANTIC", "TITLE_ONLY_MISMATCH", evidenceSetHash, evidenceId], { expected: "formal discrepancy stored", verify: () => read(client, contractAddress, "get_discrepancy", [discrepancyId]) });
  await runWrite(client, account, contractAddress, policy, journal, "finalize_examination", presentationId, [caseId, presentationId], { expected: "examination is discrepant", verify: () => verifyCredit("DISCREPANT") });
  const challenge = await runWrite(client, account, contractAddress, policy, journal, "challenge_discrepancy", discrepancyId, [caseId, discrepancyId], { expected: "discrepancy challenged", verify: async () => { const d = parseContractJson(await read(client, contractAddress, "get_discrepancy", [discrepancyId])); if (d.status !== "CHALLENGED" || !d.adjudication_fingerprint) throw new Error("CANONICAL_POSTCONDITION_FAILURE:challenge"); journal.case_b.adjudication_fingerprint = d.adjudication_fingerprint; saveJournal(journal); return d; } });
  const discrepancy = parseContractJson(challenge.readback);
  const adjudicationFingerprint = discrepancy.adjudication_fingerprint;
  if (typeof adjudicationFingerprint !== "string" || adjudicationFingerprint.length !== 64) throw new Error("ADJUDICATION_FINGERPRINT_INVALID");
  await runWrite(client, account, contractAddress, policy, journal, "adjudicate_discrepancy", discrepancyId, [caseId, discrepancyId], { expected: "one finalized semantic result", verify: async () => { const a = parseContractJson(await read(client, contractAddress, "get_adjudication", [adjudicationFingerprint])); if (a.discrepancy_id !== discrepancyId || a.requirement_id !== requirementId) throw new Error("CANONICAL_POSTCONDITION_FAILURE:adjudication_ids"); if (a.decision !== "INVALID_DISCREPANCY" || a.reason_code !== "TITLE_ONLY_MISMATCH") throw new Error(`UNEXPECTED_FIRST_SEMANTIC_RESULT:${a.decision}:${a.reason_code}`); return a; } });
  await runWrite(client, account, contractAddress, policy, journal, "mark_settlement_ready", caseId, [caseId], { expected: "settlement ready from canonical gates", verify: () => verifyCredit("SETTLEMENT_READY") });
  await runWrite(client, account, contractAddress, policy, journal, "settle_credit", caseId, [caseId], { expected: "settled in contract accounting", verify: async () => { const v = await verifyCredit("SETTLED"); if (v.settlement_booked_amount !== amount.toString() || v.settlement_recipient !== actor) throw new Error("CANONICAL_POSTCONDITION_FAILURE:settlement_accounting"); return v; } });
  const finalCredit = await verifyCredit("SETTLED");
  journal.case_b.final_canonical_state = finalCredit;
  journal.case_b.semantic_decision = "INVALID_DISCREPANCY";
  journal.case_b.reason_code = "TITLE_ONLY_MISMATCH";
  journal.case_b.result_shopping_attempts = 0;
  journal.case_b.source_uri = liveSourceUri;
  journal.case_b.evidence_set_fingerprint = evidenceSetHash;
  journal.case_b.adjudication_fingerprint = adjudicationFingerprint;
  journal.fee_measurements = Object.fromEntries(journal.case_b.transactions.filter((tx: any) => ["create_credit", "fund_credit", "submit_presentation", "file_discrepancy", "adjudicate_discrepancy", "settle_credit"].includes(tx.method)).map((tx: any) => [tx.method, { fee_value: tx.fee_value, distribution: tx.fee_estimate?.distribution ?? null, transaction: tx.tx_id }]));
  journal.balance_after = (await balanceOf(client, account.address)).toString();
  journal.phase = "CASE_B_LIVE_QUALIFIED";
  saveJournal(journal);
  console.log(JSON.stringify({ network: TARGET_NETWORK, chain_id: TARGET_CHAIN_ID, deployer: account.address, contract_address: contractAddress, deployment_tx: deployment2.tx_id, case_b: { credit_id: caseId, adjudication_fingerprint: adjudicationFingerprint, decision: journal.case_b.semantic_decision, reason_code: journal.case_b.reason_code, final_status: finalCredit.status }, balance_before: balanceBefore, balance_after: journal.balance_after, gasless: !policy.enabled }, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ error: describeError(error) }, null, 2));
  process.exitCode = 1;
});
