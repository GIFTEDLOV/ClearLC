import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "../frontend/node_modules/genlayer-js/dist/index.js";
import { studioDevnet } from "../frontend/node_modules/genlayer-js/dist/chains/index.js";

const path = process.argv[2];
if (!path) throw new Error("SOURCE_PATH_REQUIRED");
const source = readFileSync(resolve(path), "utf8");
const client = createClient({ chain: studioDevnet });
const schema = await client.getContractSchemaForCode(source);
console.log(JSON.stringify({
  chain_id: studioDevnet.id,
  method_count: Object.keys(schema.methods ?? {}).length,
  methods: Object.keys(schema.methods ?? {}).sort(),
  schema,
}, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
