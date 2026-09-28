import { isSuccessful } from "genlayer-js";

export const STUDIO_DEV_CHAIN_ID = 61997;
export const STUDIO_DEV_RPC = "https://studio-dev.genlayer.com/api";

export interface FeeEstimate {
  distribution: unknown;
  feeValue: bigint;
}

export interface WriteCall {
  address: `0x${string}`;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

export interface StudioDevClientLike {
  chain: { id: number; rpcUrls?: { default?: { http?: readonly string[] } } };
  estimateTransactionFeesForWrite(call: WriteCall): Promise<FeeEstimate>;
  writeContract(call: WriteCall & { fees: FeeEstimate }): Promise<`0x${string}`>;
  waitForFinalization(input: { hash: `0x${string}` }): Promise<unknown>;
}

export interface TransactionJournal {
  persistSubmittedHash(hash: `0x${string}`, call: WriteCall, feeValue: bigint): Promise<void>;
  reconcile(hash: `0x${string}`, receipt: unknown): Promise<void>;
}

export function assertStudioDevNetwork(client: StudioDevClientLike): void {
  const rpc = client.chain.rpcUrls?.default?.http?.[0];
  if (client.chain.id !== STUDIO_DEV_CHAIN_ID || rpc !== STUDIO_DEV_RPC) {
    throw new Error("CLEARLC_NETWORK_GUARD_FAILED");
  }
}

/**
 * The caller must persist the returned hash before any polling or next action.
 * `value` is payable user value; `fees.feeValue` is the separate protocol fee.
 * There is intentionally no retry path after a hash exists.
 */
export async function submitOnceAndReconcile(
  client: StudioDevClientLike,
  journal: TransactionJournal,
  call: WriteCall
): Promise<unknown> {
  assertStudioDevNetwork(client);
  const estimate = await client.estimateTransactionFeesForWrite(call);
  const hash = await client.writeContract({ ...call, fees: estimate });
  await journal.persistSubmittedHash(hash, call, estimate.feeValue);
  const receipt = await client.waitForFinalization({ hash });
  await journal.reconcile(hash, receipt);
  if (!isSuccessful(receipt as Parameters<typeof isSuccessful>[0])) {
    throw new Error("CLEARLC_EXECUTION_FAILED_AFTER_FINALIZATION");
  }
  return receipt;
}
