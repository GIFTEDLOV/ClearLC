import { existsSync, readFileSync } from "node:fs";
import { createClient } from "../frontend/node_modules/genlayer-js/dist/index.js";
import { studioDevnet } from "../frontend/node_modules/genlayer-js/dist/chains/index.js";

const RPC = "https://studio-dev.genlayer.com/api";
const OLD_ADDRESS = "0x4771F6Ced792e786409046f26b1A1cEA905fC0d8";
const RUNNER = "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng";
const sourcePath = new URL("../contracts/clearlc.py", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const client = createClient({ chain: studioDevnet });

const json = (value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item, 2);
const rpc = async (method, params = []) => {
  const response = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }) });
  if (!response.ok) throw new Error(`${method}:HTTP_${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`${method}:${body.error.message ?? "RPC_ERROR"}`);
  return body.result;
};

const schema = await client.getContractSchemaForCode(source);
const feePolicy = await client.getCurrentFeePolicy();
const feeQuote = await client.estimateTransactionFees();
const latestBlock = await rpc("eth_getBlockByNumber", ["latest", false]);
const chainId = await rpc("eth_chainId");

const configPath = `${process.env.USERPROFILE}\\.genlayer\\genlayer-config.json`;
let accountName = null;
let deployer = null;
try {
  accountName = JSON.parse(readFileSync(configPath, "utf8")).activeAccount ?? null;
  if (accountName) {
    const keystorePath = `${process.env.USERPROFILE}\\.genlayer\\keystores\\${accountName}.json`;
    if (existsSync(keystorePath)) {
      const keystore = JSON.parse(readFileSync(keystorePath, "utf8"));
      deployer = `0x${String(keystore.address).replace(/^0x/i, "")}`;
    }
  }
} catch {}

let deployerBalance = null;
if (deployer) deployerBalance = await rpc("eth_getBalance", [deployer, "latest"]);
let oldSchema = null;
let oldCode = null;
try { oldSchema = await client.getContractSchema(OLD_ADDRESS); } catch (error) { oldSchema = { error: String(error.message ?? error) }; }
try { oldCode = await client.getContractCode(OLD_ADDRESS); } catch (error) { oldCode = { error: String(error.message ?? error) }; }

const methodNames = Object.keys(schema.methods ?? {}).sort();
console.log(json({
  read_only: true,
  no_deployment_broadcast: true,
  chain_id: studioDevnet.id,
  rpc: RPC,
  runner: RUNNER,
  latest_block: latestBlock?.number ?? null,
  latest_timestamp: latestBlock?.timestamp ?? null,
  candidate_source_bytes: Buffer.byteLength(source),
  candidate_schema_method_count: methodNames.length,
  candidate_schema_methods: methodNames,
  candidate_schema_checks: {
    fund_credit_payable: schema.methods?.fund_credit?.payable === true,
    settle_credit_write: schema.methods?.settle_credit?.readonly === false,
    expire_credit_write: schema.methods?.expire_credit?.readonly === false,
    get_cash_accounting_view: schema.methods?.get_cash_accounting?.readonly === true,
  },
  fee_policy: feePolicy,
  fee_quote: feeQuote,
  deployer: { account_name: accountName, address: deployer, balance_wei: deployerBalance },
  historical_deployment_readback: {
    address: OLD_ADDRESS,
    schema_method_count: oldSchema?.methods ? Object.keys(oldSchema.methods).length : null,
    code_readback_available: typeof oldCode === "string",
  },
  deployment_simulation: "No unsubmitted deployment simulation endpoint was exposed; schema extraction, RPC reads, and fee quote were read-only.",
}));
