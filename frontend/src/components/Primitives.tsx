import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatAmount, formatDate, formatDateTime, shortHash, stateTone, statusLabels } from "../domain/logic";
import type { CreditReadModel, EvidenceReadModel, SettlementGate, StoredTransaction } from "../domain/models";
import { requestStudioDevSwitch, type WalletSnapshot } from "../chain/wallet";
import { useClearLC } from "../app/ClearLCProvider";

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "positive" | "warning" | "danger" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return <Pill tone={stateTone(value)}>{label ?? statusLabels[value as keyof typeof statusLabels] ?? value.replaceAll("_", " ")}</Pill>;
}

export function ModeBadge({ mode }: { mode: "DEMO" | "LIVE" }) {
  return <span className={`mode-badge mode-${mode.toLowerCase()}`} data-testid="mode-indicator"><span className="mode-dot" />{mode === "DEMO" ? "DEMO FIXTURE" : "STUDIO-DEV LIVE"}</span>;
}

export function PageHeader({ eyebrow, title, intro, actions }: { eyebrow: string; title: string; intro: string; actions?: ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>{actions ? <div className="page-header-actions">{actions}</div> : null}</header>;
}

export function Panel({ children, className = "", title, eyebrow, action }: { children: ReactNode; className?: string; title?: string; eyebrow?: string; action?: ReactNode }) {
  return <section className={`panel ${className}`}><div className="panel-top">{title ? <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div> : null}{action}</div>{children}</section>;
}

export function Metric({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "positive" | "warning" | "danger" | "neutral" }) {
  return <div className={`metric ${tone ? `metric-${tone}` : ""}`}><span className="eyebrow">{label}</span><strong>{value}</strong>{note ? <span className="metric-note">{note}</span> : null}</div>;
}

export function CreditMeta({ credit }: { credit: CreditReadModel }) {
  return <div className="definition-grid compact"><div><span>Applicant</span><strong>{credit.applicant}</strong></div><div><span>Beneficiary</span><strong>{credit.beneficiary}</strong></div><div><span>Examiner</span><strong>{credit.examiner}</strong></div><div><span>Amount</span><strong>{formatAmount(credit.amount, credit.currency_label)}</strong></div><div><span>Active version</span><strong>v{credit.active_version}</strong></div><div><span>Expiry</span><strong>{formatDate(credit.expiry_at)}</strong></div></div>;
}

export function GateList({ gates }: { gates: SettlementGate[] }) {
  return <div className="gate-list">{gates.map((gate) => <div className={`gate-row ${gate.passed ? "gate-passed" : "gate-blocked"}`} key={gate.key}><span className="gate-icon" aria-hidden="true">{gate.passed ? "✓" : "!"}</span><div><strong>{gate.label}</strong><span>{gate.detail}</span></div><Pill tone={gate.passed ? "positive" : "danger"}>{gate.passed ? "PASS" : "BLOCKED"}</Pill></div>)}</div>;
}

export function EvidenceIdentity({ item, compact = false }: { item: EvidenceReadModel; compact?: boolean }) {
  return <div className={`evidence-identity ${compact ? "evidence-compact" : ""}`}><div className="evidence-title"><span className="file-mark">DOC</span><div><strong>{item.document_type}</strong><span>{item.document_id} · v{item.version}</span></div><StatusBadge value={item.status} label={item.status === "COMMITTED" ? "Authenticated" : item.status} /></div>{!compact ? <div className="evidence-details"><div><span>Issuer</span><strong>{item.issuer_identity}</strong></div><div><span>Authority</span><strong>{item.authority_id}</strong></div><div><span>Issued</span><strong>{formatDate(item.issued_at)}</strong></div><div><span>Bytes</span><strong>{item.byte_length.toLocaleString()}</strong></div><div className="hash-field"><span>SHA-256 · identity anchor</span><code>{item.sha256}</code></div><div className="hash-field"><span>Transport hint · not identity</span><code>{item.source_uri}</code></div></div> : null}</div>;
}

export function TransactionActivity({ transactions }: { transactions: StoredTransaction[] }) {
  const { simulateRecovery } = useClearLC();
  const visible = transactions.slice(-3).reverse();
  const phaseLabels: Record<string, string> = { RECOVERED: "Recovered transaction", EXECUTION_FAILED: "Execution failed", STATE_VERIFICATION_FAILED: "Canonical readback mismatch", COMPLETE: "Complete" };
  return <Panel className="transaction-panel" eyebrow="Recovery journal" title="Transaction activity" action={<button className="link-button" type="button" onClick={simulateRecovery}>Simulate refresh recovery</button>}><p className="panel-intro">Known hashes are reconciled by identity. A polling failure never creates a second broadcast.</p>{visible.length ? <div className="transaction-list">{visible.map((tx) => <div className="transaction-row" key={tx.tx_hash}><span className="tx-phase">{phaseLabels[tx.phase] ?? tx.phase.replaceAll("_", " ")}</span><div><strong>{tx.method}</strong><span>{tx.tx_hash}</span></div><small>{formatDateTime(Math.floor(tx.last_observed_at / 1000))}</small></div>)}</div> : <div className="empty-inline"><span>No unresolved transactions</span><span>Recovery journal ready for Studio-dev writes.</span></div>}</Panel>;
}

export function WalletStatusBlock({ wallet, onConnect }: { wallet: WalletSnapshot; onConnect: () => void }) {
  return <div className="wallet-block"><div><span className="eyebrow">Wallet</span><strong>{wallet.address ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : wallet.status}</strong></div>{wallet.status === "Wrong network" ? <div className="wallet-actions"><Pill tone="danger">Wrong network</Pill><button className="link-button" type="button" onClick={() => void requestStudioDevSwitch().catch(() => undefined)}>Switch to Studio-dev</button></div> : wallet.address ? <Pill tone="positive">Connected</Pill> : <button className="button button-small" type="button" onClick={onConnect}>Connect wallet</button>}</div>;
}

export function TruthCallout({ title, children, tone = "info" }: { title: string; children: ReactNode; tone?: "info" | "warning" | "danger" }) {
  return <div className={`truth-callout truth-${tone}`}><span className="truth-mark">{tone === "danger" ? "!" : "i"}</span><div><strong>{title}</strong><p>{children}</p></div></div>;
}

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={`${item.label}-${index}`}>{item.to ? <Link to={item.to}>{item.label}</Link> : item.label}{index < items.length - 1 ? <span className="crumb-separator">/</span> : null}</span>)}</nav>;
}
