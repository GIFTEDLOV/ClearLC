import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { STUDIO_DEV_CHAIN_ID, STUDIO_DEV_RPC, isStudioDevChain } from "./transactionDiscipline";

export type WalletStatus = "Disconnected" | "Wrong network" | "Connected" | "Signing" | "Submitted" | "Pending" | "Decided" | "Finalizing" | "Finalized" | "Execution failed" | "Canonical readback mismatch" | "Recovered transaction";

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export interface WalletSnapshot {
  address?: string;
  chainId?: number;
  rpc?: string;
  status: WalletStatus;
  providerAvailable: boolean;
}

export const emptyWalletSnapshot: WalletSnapshot = {
  status: "Disconnected",
  providerAvailable: typeof window !== "undefined" && Boolean(window.ethereum)
};

export function getWalletProvider(): Eip1193Provider | undefined {
  return typeof window === "undefined" ? undefined : window.ethereum;
}

export async function readWalletSnapshot(): Promise<WalletSnapshot> {
  const provider = getWalletProvider();
  if (!provider) return emptyWalletSnapshot;
  const accounts = await provider.request({ method: "eth_accounts" }) as string[];
  if (!accounts[0]) return { ...emptyWalletSnapshot, providerAvailable: true };
  const chainIdHex = await provider.request({ method: "eth_chainId" }) as string;
  const chainId = Number.parseInt(chainIdHex, 16);
  return {
    address: accounts[0],
    chainId,
    rpc: isStudioDevChain(chainId, STUDIO_DEV_RPC) ? STUDIO_DEV_RPC : undefined,
    status: chainId === STUDIO_DEV_CHAIN_ID ? "Connected" : "Wrong network",
    providerAvailable: true
  };
}

export async function connectWallet(): Promise<WalletSnapshot> {
  const provider = getWalletProvider();
  if (!provider) return emptyWalletSnapshot;
  const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
  const chainIdHex = await provider.request({ method: "eth_chainId" }) as string;
  const chainId = Number.parseInt(chainIdHex, 16);
  return {
    address: accounts[0],
    chainId,
    rpc: chainId === STUDIO_DEV_CHAIN_ID ? STUDIO_DEV_RPC : undefined,
    status: chainId === STUDIO_DEV_CHAIN_ID ? "Connected" : "Wrong network",
    providerAvailable: true
  };
}

export async function requestStudioDevSwitch(): Promise<void> {
  const provider = getWalletProvider();
  if (!provider) throw new Error("WALLET_NOT_AVAILABLE");
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [{
      chainId: `0x${STUDIO_DEV_CHAIN_ID.toString(16)}`,
      chainName: "GenLayer Studio Devnet",
      nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
      rpcUrls: [STUDIO_DEV_RPC]
    }]
  });
}

export function createStudioDevClient(address?: string) {
  if (!address || !getWalletProvider()) return null;
  return createClient({
    chain: studioDevnet,
    account: address as `0x${string}`,
    provider: getWalletProvider()
  });
}
