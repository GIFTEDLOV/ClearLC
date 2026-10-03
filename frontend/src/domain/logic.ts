import type {
  AdjudicationReadModel,
  CreditReadModel,
  CreditStatus,
  DiscrepancyReadModel,
  EvidenceReadModel,
  PresentationReadModel,
  RequirementReadModel,
  RequirementResolution,
  SettlementGate
} from "./models";

export const SETTLEMENT_ELIGIBLE_RESOLUTIONS: RequirementResolution[] = [
  "OBJECTIVELY_SATISFIED",
  "INVALID_DISCREPANCY",
  "WAIVED",
  "CURED"
];

export const statusLabels: Record<CreditStatus | RequirementResolution, string> = {
  CREATED: "Created",
  FUNDED: "Funded",
  ACCEPTED: "Accepted",
  PRESENTATION_OPEN: "Presentation open",
  PRESENTED: "Presented",
  UNDER_EXAMINATION: "Under examination",
  COMPLIANT: "Compliant",
  DISCREPANT: "Discrepant",
  REVIEW_REQUIRED: "Review required",
  CURE_OPEN: "Cure open",
  CHALLENGED: "Challenged",
  WAIVED: "Waived by applicant",
  SETTLEMENT_READY: "Settlement ready",
  SETTLED: "Settled and beneficiary paid",
  REFUNDED: "Refunded to applicant",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  UNASSESSED: "Unassessed",
  OBJECTIVELY_SATISFIED: "Objectively satisfied",
  OBJECTIVE_FAILURE: "Objective failure",
  DISCREPANCY_ASSERTED: "Discrepancy asserted",
  VALID_DISCREPANCY: "Valid discrepancy",
  INVALID_DISCREPANCY: "Invalid discrepancy",
  INCONCLUSIVE: "Inconclusive",
  CURED: "Cured"
};

export const stateTone = (value: string): "positive" | "warning" | "danger" | "neutral" => {
  if (["SETTLEMENT_READY", "SETTLED", "REFUNDED", "COMPLIANT", "OBJECTIVELY_SATISFIED", "INVALID_DISCREPANCY", "WAIVED", "CURED"].includes(value)) return "positive";
  if (["CHALLENGED", "REVIEW_REQUIRED", "CURE_OPEN", "INCONCLUSIVE", "DISCREPANCY_ASSERTED", "UNASSESSED"].includes(value)) return "warning";
  if (["DISCREPANT", "VALID_DISCREPANCY", "OBJECTIVE_FAILURE", "EXPIRED", "CANCELLED"].includes(value)) return "danger";
  return "neutral";
};

export function resolutionIsSettlementEligible(resolution: RequirementResolution | undefined): boolean {
  return resolution !== undefined && SETTLEMENT_ELIGIBLE_RESOLUTIONS.includes(resolution);
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp * 1000);
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(timestamp * 1000);
}

export function shortHash(value: string, length = 16): string {
  return value.length <= length ? value : `${value.slice(0, length)}…`;
}

export function formatAmount(amount: number, currency: string): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}

export function requirementEvidence(requirement: RequirementReadModel, evidence: EvidenceReadModel[]): EvidenceReadModel | undefined {
  return evidence
    .filter((item) => item.document_type === requirement.document_type || (requirement.document_type === "Certificate of Quality" && item.document_type === "Quality Inspection Certificate"))
    .sort((a, b) => b.version - a.version)[0];
}

export function requirementDiscrepancies(requirementId: string, discrepancies: DiscrepancyReadModel[]): DiscrepancyReadModel[] {
  return discrepancies.filter((item) => item.requirement_id === requirementId);
}

export function buildSettlementGates(
  credit: CreditReadModel,
  presentation: PresentationReadModel | undefined,
  requirements: RequirementReadModel[],
  discrepancies: DiscrepancyReadModel[],
  now: number
): SettlementGate[] {
  const required = requirements.filter((item) => item.required);
  const activePresentation = Boolean(presentation && credit.current_presentation_id === presentation.presentation_id && presentation.credit_version === credit.active_version);
  const allResolved = required.length > 0 && required.every((item) => resolutionIsSettlementEligible(item.resolution_status));
  const openValid = discrepancies.some((item) => item.status === "VALID_DISCREPANCY");
  const openChallenge = required.some((item) => item.resolution_status === "CHALLENGED") || credit.status === "CHALLENGED";
  const reviewBlocker = required.some((item) => item.resolution_status === "INCONCLUSIVE") || credit.status === "REVIEW_REQUIRED";
  const funded = credit.escrowed_amount >= credit.amount;
  const acceptedFrozen = Boolean(credit.frozen) && ["ACCEPTED", "PRESENTATION_OPEN", "PRESENTED", "UNDER_EXAMINATION", "COMPLIANT", "DISCREPANT", "REVIEW_REQUIRED", "CURE_OPEN", "CHALLENGED", "WAIVED", "SETTLEMENT_READY", "SETTLED"].includes(credit.status);
  return [
    { key: "funded", label: "Credit funded", passed: funded, detail: funded ? `${formatAmount(credit.escrowed_amount, credit.currency_label)} escrowed` : `Requires ${formatAmount(credit.amount, credit.currency_label)}` },
    { key: "accepted_frozen", label: "Credit accepted and frozen", passed: acceptedFrozen, detail: acceptedFrozen ? `Version ${credit.active_version} is frozen` : "Beneficiary acceptance and applicant freeze are incomplete" },
    { key: "active_presentation", label: "Active presentation is correct", passed: activePresentation, detail: activePresentation ? `${presentation?.presentation_id} / v${presentation?.version}` : "Presentation does not match the active credit version" },
    { key: "requirements", label: "All required requirements resolved", passed: allResolved, detail: allResolved ? `${required.length} required rows are settlement-compatible` : "At least one required row is unresolved" },
    { key: "valid_discrepancy", label: "No unresolved valid discrepancy", passed: !openValid, detail: openValid ? "A VALID_DISCREPANCY still blocks settlement" : "No unresolved valid discrepancy" },
    { key: "challenge", label: "No unresolved challenge", passed: !openChallenge, detail: openChallenge ? "A challenge is awaiting a finalized outcome" : "No unresolved challenge" },
    { key: "review", label: "No REVIEW_REQUIRED or INCONCLUSIVE blocker", passed: !reviewBlocker, detail: reviewBlocker ? "Semantic review is not settlement-complete" : "No review blocker" },
    { key: "expiry", label: "Credit is not expired", passed: now <= credit.expiry_at, detail: now <= credit.expiry_at ? `Expires ${formatDate(credit.expiry_at)}` : `Expired ${formatDate(credit.expiry_at)}` },
    { key: "not_settled", label: "Not previously settled", passed: !credit.settled && credit.status !== "SETTLED", detail: credit.settled ? "Settlement accounting is already booked" : "No settlement accounting has been booked" }
  ];
}

export function settlementGateSatisfied(gates: SettlementGate[]): boolean {
  return gates.length > 0 && gates.every((gate) => gate.passed);
}

export function semanticAdjudicationFor(
  requirementId: string,
  adjudications: AdjudicationReadModel[] | undefined
): AdjudicationReadModel | undefined {
  return adjudications?.find((item) => item.requirement_id === requirementId);
}
