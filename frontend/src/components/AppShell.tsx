import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useClearLC } from "../app/ClearLCProvider";
import { ModeBadge, Pill, WalletStatusBlock } from "./Primitives";

function primaryNavigation(mode: "DEMO" | "LIVE", creditId?: string) {
  const base = [
    ["/app", "Trade Desk", "TD"],
    ["/app/credits/new", "Create Credit", "+"]
  ] as Array<[string, string, string]>;
  const selectedCredit = mode === "LIVE" ? creditId : (creditId ?? "CLC-COCOA-ROT-001");
  if (!selectedCredit) return base;
  return base.concat([
    [`/app/credits/${selectedCredit}`, "Credit Workspace", "CW"],
    [`/app/credits/${selectedCredit}/requirements`, "Requirements Matrix", "RM"],
    [`/app/credits/${selectedCredit}/presentation`, "Presentation Workspace", "PW"],
    [`/app/credits/${selectedCredit}/examination`, "Examination Desk", "EX"],
    [`/app/credits/${selectedCredit}/challenges`, "Challenge Desk", "CH"],
    [`/app/credits/${selectedCredit}/settlement`, "Settlement", "ST"],
    [`/app/credits/${selectedCredit}/proof`, "Proof & Audit", "PA"]
  ]);
}

const titles: Array<[string, string]> = [
  ["/app/credits/new", "Create Credit"],
  ["/requirements", "Requirements Matrix"],
  ["/presentation", "Presentation Workspace"],
  ["/examination", "Examination Desk"],
  ["/challenges", "Challenge Desk"],
  ["/settlement", "Settlement"],
  ["/proof", "Proof & Audit"],
  ["/app/credits/", "Credit Workspace"],
  ["/app", "Trade Desk"]
];

function pageTitle(pathname: string): string {
  return titles.find(([fragment]) => pathname.includes(fragment))?.[1] ?? "ClearLC protocol desk";
}

export function AppShell() {
  const { mode, setMode, wallet, connect, transactions, credits, liveError, refresh, liveRefreshing } = useClearLC();
  const location = useLocation();
  const params = useParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentCredit = params.creditId;
  const title = pageTitle(location.pathname);
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
      <div className="brand-row"><Link className="brand" to="/"><span className="brand-mark">CL</span><span><strong>ClearLC</strong><small>documentary settlement</small></span></Link><button className="close-nav" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button></div>
      <div className="side-mode"><ModeBadge mode={mode} /><span>{mode === "DEMO" ? "Synthetic cases only" : "Canonical Studio-dev reads"}</span></div>
      <nav className="primary-nav" aria-label="Primary navigation">{primaryNavigation(mode, credits[0]?.credit_id).map(([to, label, icon]) => <NavLink key={to} to={to} onClick={() => setMobileNavOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}><span className="nav-icon">{icon}</span><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><span className="eyebrow">Protocol boundary</span><p>Consensus evaluates only bounded discrepancy support. Amount, recipient, deadlines, and state legality remain deterministic.</p><Link className="side-link" to="/docs">Read integration notes →</Link></div>
    </aside>
    {mobileNavOpen ? <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>☰</button><div className="topbar-context"><span className="eyebrow">{mode === "DEMO" ? "Controlled protocol fixture" : "Studio-dev canonical state"}</span><strong>{title}</strong>{currentCredit ? <span className="topbar-credit">{currentCredit}</span> : null}</div><div className="topbar-actions"><button className="mode-switch" type="button" onClick={() => setMode(mode === "DEMO" ? "LIVE" : "DEMO")} aria-label={`Switch to ${mode === "DEMO" ? "live" : "demo"} mode`}><ModeBadge mode={mode} /></button><WalletStatusBlock wallet={wallet} onConnect={() => void connect()} /><span className={`activity-dot ${transactions.length ? "activity-active" : ""}`} title={transactions.length ? "Transaction journal has entries" : "Transaction journal ready"} /></div></header>
      <div className="page-content">{mode === "LIVE" && liveError ? <div className="live-read-banner" role="status"><div><strong>Live canonical read unavailable</strong><span>{liveError}</span><small>No live state is shown or cached as final until a finalized canonical read succeeds.</small></div><button className="button button-secondary button-small" type="button" onClick={() => void refresh().catch(() => undefined)} disabled={liveRefreshing}>{liveRefreshing ? "Retrying…" : "Retry canonical read"}</button></div> : null}<Outlet /></div>
    </main>
  </div>;
}
