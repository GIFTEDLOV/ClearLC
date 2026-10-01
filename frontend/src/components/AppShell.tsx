import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useClearLC } from "../app/ClearLCProvider";
import { ModeBadge, Pill, WalletStatusBlock } from "./Primitives";

type NavIcon = "desk" | "plus" | "credit" | "matrix" | "document" | "exam" | "challenge" | "settlement" | "proof";

function primaryNavigation(mode: "DEMO" | "LIVE", creditId?: string) {
  const base = [
    ["/app", "Trade Desk", "desk"],
    ["/app/credits/new", "Create Credit", "plus"]
  ] as Array<[string, string, NavIcon]>;
  const selectedCredit = mode === "LIVE" ? creditId : (creditId ?? "CLC-COCOA-ROT-001");
  if (!selectedCredit) return base;
  return base.concat([
    [`/app/credits/${selectedCredit}`, "Credit Workspace", "credit"],
    [`/app/credits/${selectedCredit}/requirements`, "Requirements Matrix", "matrix"],
    [`/app/credits/${selectedCredit}/presentation`, "Presentation Workspace", "document"],
    [`/app/credits/${selectedCredit}/examination`, "Examination Desk", "exam"],
    [`/app/credits/${selectedCredit}/challenges`, "Challenge Desk", "challenge"],
    [`/app/credits/${selectedCredit}/settlement`, "Settlement", "settlement"],
    [`/app/credits/${selectedCredit}/proof`, "Proof & Audit", "proof"]
  ]);
}

function NavGlyph({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, string> = {
    desk: "M3 4h18v16H3z M7 8h10 M7 12h6 M7 16h8",
    plus: "M12 5v14 M5 12h14",
    credit: "M4 5h16v14H4z M7 9h10 M7 13h5",
    matrix: "M4 4h16v16H4z M4 10h16 M10 4v16 M16 4v16",
    document: "M6 3h9l3 3v15H6z M15 3v4h4 M9 11h6 M9 15h6",
    exam: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 7v5l3 2",
    challenge: "M12 3l9 16H3z M12 9v4 M12 16v1",
    settlement: "M4 7h16v12H4z M7 4h10 M8 12h8 M9 15h6",
    proof: "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5"
  };
  return <svg className="nav-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[icon]} /></svg>;
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
      <nav className="primary-nav" aria-label="Application navigation">{primaryNavigation(mode, credits[0]?.credit_id).map(([to, label, icon]) => <NavLink key={to} to={to} onClick={() => setMobileNavOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}><span className="nav-icon"><NavGlyph icon={icon} /></span><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><span className="eyebrow">Protocol boundary</span><p>Consensus evaluates only bounded discrepancy support. Amount, recipient, deadlines, and state legality remain deterministic.</p><Link className="side-link" to="/docs">Read integration notes →</Link></div>
    </aside>
    {mobileNavOpen ? <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>☰</button><div className="topbar-context"><span className="eyebrow">{mode === "DEMO" ? "Controlled protocol fixture" : "Studio-dev canonical state"}</span><strong>{title}</strong>{currentCredit ? <span className="topbar-credit">{currentCredit}</span> : null}</div><div className="topbar-actions"><button className="mode-switch" type="button" onClick={() => setMode(mode === "DEMO" ? "LIVE" : "DEMO")} aria-label={`Switch to ${mode === "DEMO" ? "live" : "demo"} mode`}><ModeBadge mode={mode} /></button><WalletStatusBlock wallet={wallet} onConnect={() => void connect()} /><span className={`activity-dot ${transactions.length ? "activity-active" : ""}`} title={transactions.length ? "Transaction journal has entries" : "Transaction journal ready"} /></div></header>
      <div className="page-content">{mode === "LIVE" && liveError ? <div className="live-read-banner" role="status"><div><strong>Live canonical read unavailable</strong><span>{liveError}</span><small>No live state is shown or cached as final until a finalized canonical read succeeds.</small></div><button className="button button-secondary button-small" type="button" onClick={() => void refresh().catch(() => undefined)} disabled={liveRefreshing}>{liveRefreshing ? "Retrying…" : "Retry canonical read"}</button></div> : null}<Outlet /></div>
    </main>
  </div>;
}
