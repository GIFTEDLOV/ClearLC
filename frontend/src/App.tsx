import { Navigate, Route, Routes } from "react-router-dom";
import { ClearLCProvider } from "./app/ClearLCProvider";
import { AppShell } from "./components/AppShell";
import { PublicSiteLayout } from "./components/PublicSiteLayout";
import { ChallengePage, CreateCreditPage, CreditWorkspacePage, ExaminationPage, PresentationPage, ProofPage, RequirementsPage, SettlementPage, TradeDeskPage } from "./pages/Pages";
import { DocsPage, PublicLandingPage } from "./pages/PublicPages";

export default function App() {
  return <ClearLCProvider><Routes>
    <Route element={<PublicSiteLayout />}>
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/integrate" element={<DocsPage />} />
    </Route>
    <Route element={<AppShell />}>
      <Route path="/app" element={<TradeDeskPage />} />
      <Route path="/app/credits/new" element={<CreateCreditPage />} />
      <Route path="/app/credits/:creditId" element={<CreditWorkspacePage />} />
      <Route path="/app/credits/:creditId/requirements" element={<RequirementsPage />} />
      <Route path="/app/credits/:creditId/presentation" element={<PresentationPage />} />
      <Route path="/app/credits/:creditId/examination" element={<ExaminationPage />} />
      <Route path="/app/credits/:creditId/challenges" element={<ChallengePage />} />
      <Route path="/app/credits/:creditId/settlement" element={<SettlementPage />} />
      <Route path="/app/credits/:creditId/proof" element={<ProofPage />} />
    </Route>
    <Route path="/trade-desk" element={<Navigate to="/app" replace />} />
    <Route path="/create-credit" element={<Navigate to="/app/credits/new" replace />} />
    <Route path="/credit-workspace" element={<Navigate to="/app/credits/CLC-COCOA-ROT-001" replace />} />
    <Route path="/requirements-matrix" element={<Navigate to="/app/credits/CLC-COCOA-ROT-001/requirements" replace />} />
    <Route path="/presentation-workspace" element={<Navigate to="/app/credits/CLC-COCOA-ROT-001/presentation" replace />} />
    <Route path="/examination-desk" element={<Navigate to="/app/credits/CLC-COCOA-ROT-001/examination" replace />} />
    <Route path="/challenge-desk" element={<Navigate to="/app/credits/CLC-COCOA-ROT-001/challenges" replace />} />
    <Route path="/settlement" element={<Navigate to="/app/credits/CLC-COCOA-ROT-001/settlement" replace />} />
    <Route path="/proof-audit" element={<Navigate to="/app/credits/CLC-COCOA-ROT-001/proof" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></ClearLCProvider>;
}
