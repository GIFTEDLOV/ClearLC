import { readFileSync } from "node:fs";
import { createClient } from "../frontend/node_modules/genlayer-js/dist/index.js";
import { studioDevnet } from "../frontend/node_modules/genlayer-js/dist/chains/index.js";

const source = readFileSync(new URL("./value_transfer_probe.py", import.meta.url), "utf8");
const client = createClient({ chain: studioDevnet });
const schema = await client.getContractSchemaForCode(source);
const feeEstimate = await client.estimateTransactionFees();

console.log(JSON.stringify({
  target_runner: "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng",
  chain_id: studioDevnet.id,
  schema,
  fee_estimate: feeEstimate,
  deployment_simulation: "NOT_AVAILABLE_FOR_UNDEPLOYED_PROBE; schema extraction and fee quote are read-only",
}, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
