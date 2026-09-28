import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useClearLC } from "../app/ClearLCProvider";
import { ModeBadge, Pill, WalletStatusBlock } from "./Primitives";

const primaryNavigation = [
  ["/app", "Trade Desk", "TD"],
  ["/app/credits/new", "Create Credit", "+"],
  ["/app/credits/CLC-COCOA-ROT-001", "Credit Workspace", "CW"],
  ["/app/credits/CLC-COCOA-ROT-001/requirements", "Requirements Matrix", "RM"],
  ["/app/credits/CLC-COCOA-ROT-001/presentation", "Presentation Workspace", "PW"],
  ["/app/credits/CLC-COCOA-ROT-001/examination", "Examination Desk", "EX"],
  ["/app/credits/CLC-COCOA-ROT-001/challenges", "Challenge Desk", "CH"],
  ["/app/credits/CLC-COCOA-ROT-001/settlement", "Settlement", "ST"],
  ["/app/credits/CLC-COCOA-ROT-001/proof", "Proof & Audit", "PA"]
] as const;

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
  const { mode, setMode, wallet, connect, transactions } = useClearLC();
  const location = useLocation();
  const params = useParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentCredit = params.creditId;
  const title = pageTitle(location.pathname);
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
      <div className="brand-row"><Link className="brand" to="/"><span className="brand-mark">CL</span><span><strong>ClearLC</strong><small>documentary settlement</small></span></Link><button className="close-nav" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>×</button></div>
      <div className="side-mode"><ModeBadge mode={mode} /><span>{mode === "DEMO" ? "Synthetic cases only" : "Canonical Studio-dev reads"}</span></div>
      <nav className="primary-nav" aria-label="Primary navigation">{primaryNavigation.map(([to, label, icon]) => <NavLink key={to} to={to} onClick={() => setMobileNavOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}><span className="nav-icon">{icon}</span><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><span className="eyebrow">Protocol boundary</span><p>Consensus evaluates only bounded discrepancy support. Amount, recipient, deadlines, and state legality remain deterministic.</p><Link className="side-link" to="/docs">Read integration notes →</Link></div>
    </aside>
    {mobileNavOpen ? <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>☰</button><div className="topbar-context"><span className="eyebrow">{mode === "DEMO" ? "Controlled protocol fixture" : "Studio-dev canonical state"}</span><strong>{title}</strong>{currentCredit ? <span className="topbar-credit">{currentCredit}</span> : null}</div><div className="topbar-actions"><button className="mode-switch" type="button" onClick={() => setMode(mode === "DEMO" ? "LIVE" : "DEMO")} aria-label={`Switch to ${mode === "DEMO" ? "live" : "demo"} mode`}><ModeBadge mode={mode} /></button><WalletStatusBlock wallet={wallet} onConnect={() => void connect()} /><span className={`activity-dot ${transactions.length ? "activity-active" : ""}`} title={transactions.length ? "Transaction journal has entries" : "Transaction journal ready"} /></div></header>
      <div className="page-content"><Outlet /></div>
    </main>
  </div>;
}
