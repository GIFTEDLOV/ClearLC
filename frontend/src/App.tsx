import type { ReactNode } from "react";
import { NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { demoFixture } from "./domain/demoFixture";
import type { CreditStatus, SemanticDecision } from "./domain/models";

const navigation = [
  ["/", "Overview", "⌂"],
  ["/trade-desk", "Trade Desk", "◈"],
  ["/create-credit", "Create Credit", "+"],
  ["/credit-workspace", "Credit Workspace", "▣"],
  ["/requirements-matrix", "Requirements Matrix", "⊞"],
  ["/presentation-workspace", "Presentation Workspace", "▤"],
  ["/examination-desk", "Examination Desk", "⌕"],
  ["/challenge-desk", "Challenge Desk", "↗"],
  ["/settlement", "Settlement", "◉"],
  ["/proof-audit", "Proof & Audit", "≡"]
] as const;

const pageMeta: Record<string, { eyebrow: string; title: string; intro: string }> = {
  "/": {
    eyebrow: "Protocol overview",
    title: "Settlement that can be examined.",
    intro: "ClearLC freezes the deal, evidence, and examination basis before semantics enter consensus."
  },
  "/trade-desk": {
    eyebrow: "Operations",
    title: "Trade Desk",
    intro: "One operational surface for credits, presentations, discrepancies, and settlement gates."
  },
  "/create-credit": {
    eyebrow: "Applicant workflow",
    title: "Create Credit",
    intro: "A typed entry point for parties, value, deadlines, requirements, and the governing ruleset."
  },
  "/credit-workspace": {
    eyebrow: "Frozen credit",
    title: "Credit Workspace",
    intro: "The active version is the deterministic reference for every downstream document decision."
  },
  "/requirements-matrix": {
    eyebrow: "Documentary basis",
    title: "Requirements Matrix",
    intro: "Requirements are first-class versioned objects, not a prompt assembled at examination time."
  },
  "/presentation-workspace": {
    eyebrow: "Beneficiary workflow",
    title: "Presentation Workspace",
    intro: "Presentations bind evidence identities, exact bytes, and the credit version being presented."
  },
  "/examination-desk": {
    eyebrow: "Examiner workflow",
    title: "Examination Desk",
    intro: "Objective failures are deterministic; only bounded semantic discrepancy questions reach consensus."
  },
  "/challenge-desk": {
    eyebrow: "Bounded consensus",
    title: "Challenge Desk",
    intro: "A frozen adjudication fingerprint prevents reruns from becoming result shopping."
  },
  "/settlement": {
    eyebrow: "Value gate",
    title: "Settlement",
    intro: "Settlement eligibility is a deterministic business consequence of a compliant lifecycle."
  },
  "/proof-audit": {
    eyebrow: "Canonical readback",
    title: "Proof & Audit",
    intro: "Read models expose the evidence identity, version lineage, semantic result, and audit trail."
  }
};

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <span className="muted">{note}</span>
    </div>
  );
}

function HeroOverview() {
  const credit = demoFixture.credit;
  return (
    <>
      <section className="hero-grid">
        <div className="hero-card">
          <span className="eyebrow">DEMO FIXTURE · active protocol state</span>
          <h2>{credit.beneficiary} → {credit.applicant}</h2>
          <p className="hero-copy">Nigerian cocoa export to Rotterdam. The title-only quality dispute is shown as a bounded semantic challenge, not a payment instruction.</p>
          <div className="hero-actions">
            <NavLink className="button button-primary" to="/credit-workspace">Open credit workspace</NavLink>
            <NavLink className="button button-secondary" to="/proof-audit">Inspect proof</NavLink>
          </div>
        </div>
        <div className="signal-card">
          <div className="signal-ring"><span>01</span></div>
          <span className="eyebrow">Protocol posture</span>
          <h3>Ready for settlement</h3>
          <p className="muted">Evidence and requirements are bound to credit version {credit.active_version}.</p>
          <Pill tone="green">{credit.status}</Pill>
        </div>
      </section>
      <section className="stats-grid">
        <Stat label="Escrowed value" value={`${credit.escrowed_amount.toLocaleString()} GEN`} note="Accounting only in Phase 1" />
        <Stat label="Requirements" value={`${demoFixture.requirements.length}`} note="All required in active version" />
        <Stat label="Evidence objects" value={`${demoFixture.evidence.length}`} note="Exact hashes and byte lengths" />
        <Stat label="Semantic result" value="Invalid" note="Title-only mismatch" />
      </section>
    </>
  );
}

function Matrix() {
  return (
    <div className="panel table-panel">
      <div className="panel-heading"><div><span className="eyebrow">Frozen version 1</span><h3>Requirement / evidence matrix</h3></div><Pill>DEMO FIXTURE</Pill></div>
      <div className="table-wrap"><table><thead><tr><th>Requirement</th><th>Authority</th><th>Evidence</th><th>Objective status</th></tr></thead><tbody>
        {demoFixture.requirements.map((requirement) => {
          const evidence = demoFixture.evidence.find((item) => item.document_type === requirement.document_type || (requirement.document_type === "Certificate of Quality" && item.document_type === "Quality Inspection Certificate"));
          const semantic = requirement.requirement_id === "REQ-QUAL";
          return <tr key={requirement.requirement_id}><td><strong>{requirement.document_type}</strong><small>{requirement.requirement_id}</small></td><td>{requirement.authority_constraint}</td><td>{evidence ? <span className="evidence-cell"><span className="dot dot-green" />{evidence.document_type}<small>{evidence.sha256.slice(0, 14)}…</small></span> : <span className="muted">Not committed</span>}</td><td>{semantic ? <Pill tone="amber">SEMANTIC REVIEW</Pill> : <Pill tone="green">SATISFIED</Pill>}</td></tr>;
        })}
      </tbody></table></div>
    </div>
  );
}

function StatusFlow() {
  const states: Array<[CreditStatus, string]> = [["CREATED", "Credit created"], ["FUNDED", "Value funded"], ["ACCEPTED", "Beneficiary accepted"], ["PRESENTED", "Evidence presented"], ["UNDER_EXAMINATION", "Objective examination"], ["SETTLEMENT_READY", "Gate satisfied"]];
  return <div className="flow">{states.map(([state, label], index) => <div className="flow-step" key={state}><span className={`flow-node ${index === states.length - 1 ? "flow-node-active" : ""}`}>{index + 1}</span><span>{label}</span></div>)}</div>;
}

function DetailPage({ path }: { path: string }) {
  const meta = pageMeta[path] ?? pageMeta["/"];
  const isMatrix = path === "/requirements-matrix";
  const isChallenge = path === "/challenge-desk";
  const isProof = path === "/proof-audit";
  return (
    <>
      <section className="page-heading"><div><span className="eyebrow">{meta.eyebrow}</span><h2>{meta.title}</h2><p>{meta.intro}</p></div><Pill tone="amber">DEMO FIXTURE · NOT LIVE</Pill></section>
      {isMatrix ? <Matrix /> : isChallenge ? <ChallengePanel /> : isProof ? <AuditPanel /> : <OperationalPanel path={path} />}
    </>
  );
}

function OperationalPanel({ path }: { path: string }) {
  return <div className="content-grid"><div className="panel"><div className="panel-heading"><div><span className="eyebrow">Canonical read surface</span><h3>{demoFixture.credit.credit_id}</h3></div><Pill tone="green">{demoFixture.credit.status}</Pill></div><StatusFlow /><div className="key-value-grid"><div><span className="eyebrow">Applicant</span><strong>{demoFixture.credit.applicant}</strong></div><div><span className="eyebrow">Beneficiary</span><strong>{demoFixture.credit.beneficiary}</strong></div><div><span className="eyebrow">Examiner</span><strong>{demoFixture.credit.examiner}</strong></div><div><span className="eyebrow">Active version</span><strong>v{demoFixture.credit.active_version}</strong></div></div><p className="panel-note">{path === "/settlement" ? "The outgoing GEN transfer remains disabled in Phase 1. This view demonstrates the deterministic settlement gate and escrow accounting only." : "Connected wallet actions are intentionally not enabled in this first pass. This shell renders only a clearly marked synthetic fixture."}</p></div><div className="panel side-panel"><span className="eyebrow">Control surface</span><h3>What consensus may decide</h3><ul className="rule-list"><li><span className="dot dot-green" />Whether a bounded discrepancy is materially supported</li><li><span className="dot dot-gray" />Never amount, recipient, deadline, or state legality</li><li><span className="dot dot-gray" />Never evidence identity or settlement direction</li></ul><NavLink className="text-link" to="/challenge-desk">Review semantic boundary →</NavLink></div></div>;
}

function ChallengePanel() {
  const adjudication = demoFixture.adjudication;
  const decisionTone: "green" | "amber" | "red" = adjudication.decision === "INCONCLUSIVE" ? "amber" : adjudication.decision === "INVALID_DISCREPANCY" ? "green" : "red";
  return <div className="content-grid"><div className="panel decision-panel"><div className="decision-mark">✓</div><span className="eyebrow">Finalized bounded result</span><h3>{adjudication.decision}</h3><Pill tone={decisionTone}>{adjudication.reason_code}</Pill><p className="decision-copy">The presented quality inspection certificate fulfills the documentary function. The title difference is not, on its own, a material discrepancy.</p><div className="fingerprint"><span className="eyebrow">Adjudication fingerprint</span><code>{adjudication.fingerprint}</code></div></div><div className="panel"><span className="eyebrow">Frozen inputs</span><h3>Result cannot be rerun for the same tuple</h3><dl className="definition-list"><dt>Credit version</dt><dd>1</dd><dt>Requirement</dt><dd>{adjudication.requirement_id}</dd><dt>Discrepancy</dt><dd>{adjudication.discrepancy_id}</dd><dt>Evidence status</dt><dd>{adjudication.evidence_status}</dd><dt>Authority</dt><dd>Consensus compares decision-bearing fields</dd></dl></div></div>;
}

function AuditPanel() {
  return <div className="panel table-panel"><div className="panel-heading"><div><span className="eyebrow">Immutable event sequence</span><h3>Proof & audit trail</h3></div><Pill>CANONICAL READBACK</Pill></div><div className="audit-list">{demoFixture.audit.map((event) => <div className="audit-item" key={event.sequence}><span className="audit-index">{String(event.sequence).padStart(2, "0")}</span><div><strong>{event.action}</strong><p>{event.detail}</p><small>{event.actor} · {event.subject_id}</small></div></div>)}</div></div>;
}

function HomePage() {
  const meta = pageMeta["/"];
  return <><section className="page-heading"><div><span className="eyebrow">Documentary trade settlement</span><h1>{meta.title}</h1><p>{meta.intro}</p></div><Pill tone="green">PROTOCOL FOUNDATION</Pill></section><HeroOverview /></>;
}

function AppShell() {
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? pageMeta["/"];
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">CL</span><span>ClearLC<small>documentary settlement</small></span></div><div className="network-badge"><span className="dot dot-amber" />studio-dev <small>chain 61997</small></div><nav>{navigation.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "nav-item nav-item-active" : "nav-item"}><span className="nav-icon">{icon}</span><span>{label}</span></NavLink>)}</nav><div className="sidebar-footer"><span className="eyebrow">Phase 1 boundary</span><p>No live writes, transfers, or deployments.</p></div></aside><main className="main"><header className="topbar"><div><span className="eyebrow">ClearLC protocol desk</span><strong>{meta.title}</strong></div><div className="topbar-right"><Pill tone="amber">SYNTHETIC DATA</Pill><span className="avatar">AC</span></div></header><div className="page-content"><Outlet /></div></main></div>;
}

export default function App() {
  return <Routes><Route element={<AppShell />}><Route index element={<HomePage />} />{navigation.slice(1).map(([path]) => <Route key={path} path={path.slice(1)} element={<DetailPage path={path} />} />)}</Route></Routes>;
}
