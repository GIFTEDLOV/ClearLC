import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

export function PublicSiteLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);
  return <div className="public-site">
    <header className="public-header">
      <Link className="public-brand" to="/" aria-label="ClearLC home"><span className="brand-mark">CL</span><span><strong>ClearLC</strong><small>documentary settlement</small></span></Link>
      <nav className="public-nav" aria-label="Public navigation">
        <a href="/#product" onClick={closeMobileNav}>Product</a>
        <a href="/#how-it-works" onClick={closeMobileNav}>How it works</a>
        <a href="/#security" onClick={closeMobileNav}>Security</a>
        <a href="/#live-proof" onClick={closeMobileNav}>Live proof</a>
        <NavLink to="/docs">Docs</NavLink>
      </nav>
      <div className="public-actions"><a className="public-github" href="https://github.com/GIFTEDLOV/ClearLC" target="_blank" rel="noreferrer">GitHub</a><button className="public-mobile-toggle" type="button" aria-label={mobileNavOpen ? "Close public navigation" : "Open public navigation"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}><span aria-hidden="true">{mobileNavOpen ? "×" : "☰"}</span></button><Link className="button button-primary public-launch" to="/app">Launch app <span aria-hidden="true">↗</span></Link></div>
    </header>
    {mobileNavOpen ? <nav className="public-mobile-nav" aria-label="Mobile public navigation"><a href="/#product" onClick={closeMobileNav}>Product</a><a href="/#how-it-works" onClick={closeMobileNav}>How it works</a><a href="/#security" onClick={closeMobileNav}>Security</a><a href="/#live-proof" onClick={closeMobileNav}>Live proof</a><Link to="/docs" onClick={closeMobileNav}>Docs</Link><a href="https://github.com/GIFTEDLOV/ClearLC" target="_blank" rel="noreferrer" onClick={closeMobileNav}>GitHub ↗</a></nav> : null}
    <main className="public-main"><Outlet /></main>
    <footer className="public-footer"><div><Link className="public-brand" to="/"><span className="brand-mark">CL</span><span><strong>ClearLC</strong><small>documentary settlement</small></span></Link><p>Objective facts are deterministic. Authenticated evidence is frozen. Native GEN exits exactly once to the frozen beneficiary or applicant.</p></div><div className="public-footer-links"><span className="eyebrow">Explore</span><Link to="/app">Launch app</Link><Link to="/docs">Docs</Link><Link to="/integrate">Integration</Link></div><div className="public-footer-links"><span className="eyebrow">Canonical network</span><span>Studio-dev · chain 61997</span><code>v1.1.0 · CASH EXITS ENABLED</code></div></footer>
  </div>;
}
