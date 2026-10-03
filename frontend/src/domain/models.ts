export type CreditStatus =
  | "CREATED"
  | "FUNDED"
  | "ACCEPTED"
  | "PRESENTATION_OPEN"
  | "PRESENTED"
  | "UNDER_EXAMINATION"
  | "COMPLIANT"
  | "DISCREPANT"
  | "REVIEW_REQUIRED"
  | "CURE_OPEN"
  | "CHALLENGED"
  | "WAIVED"
  | "SETTLEMENT_READY"
  | "SETTLED"
  | "REFUNDED"
  | "EXPIRED"
  | "CANCELLED";

export type DemoCaseId = "clean" | "invalid-refusal" | "cure";
export type AppMode = "DEMO" | "LIVE";

export type TransactionPhase =
  | "PRECONDITION_READ"
  | "PREPARED"
  | "SIGNING"
  | "SUBMITTED"
  | "PENDING"
  | "DECIDED"
  | "FINALIZING"
  | "FINALIZED"
  | "EXECUTION_FAILED"
  | "STATE_VERIFICATION_FAILED"
  | "RECOVERED"
  | "COMPLETE";

export type SemanticDecision =
  | "VALID_DISCREPANCY"
  | "INVALID_DISCREPANCY"
  | "INCONCLUSIVE";

export type SemanticReasonCode =
  | "DOCUMENT_FUNCTION_NOT_FULFILLED"
  | "MATERIAL_DATA_CONFLICT"
  | "TITLE_ONLY_MISMATCH"
  | "REQUIRED_CONTENT_PRESENT"
  | "AMBIGUOUS_EVIDENCE"
  | "INSUFFICIENT_RULE_SUPPORT";

export type RequirementResolution =
  | "UNASSESSED"
  | "OBJECTIVELY_SATISFIED"
  | "OBJECTIVE_FAILURE"
  | "DISCREPANCY_ASSERTED"
  | "CHALLENGED"
  | "VALID_DISCREPANCY"
  | "INVALID_DISCREPANCY"
  | "WAIVED"
  | "INCONCLUSIVE"
  | "CURE_OPEN"
  | "CURED";

export type EvidenceStatus =
  | "COMMITTED"
  | "EVIDENCE_UNAVAILABLE"
  | "HASH_MISMATCH"
  | "BYTE_LENGTH_MISMATCH"
  | "UNAUTHORIZED_ISSUER"
  | "MALFORMED_DOCUMENT"
  | "STALE_DOCUMENT";

export interface CreditReadModel {
  credit_id: string;
  applicant: string;
  beneficiary: string;
  examiner: string;
  amount: number;
  currency_label: string;
  expiry_at: number;
  presentation_deadline: number;
  shipment_deadline: number;
  ruleset_id: string;
  ruleset_hash: string;
  active_version: number;
  requirements_root: string;
  escrowed_amount: number;
  beneficiary_paid_amount?: number;
  applicant_refunded_amount?: number;
  cash_exit_recipient?: string;
  cash_exit_kind?: "NONE" | "BENEFICIARY_PAYOUT" | "APPLICANT_REFUND";
  status: CreditStatus;
  settled: boolean;
  settlement_booked_amount?: number;
  frozen?: boolean;
  current_presentation_id?: string;
  latest_presentation_version?: number;
  settlement_recipient?: string;
  active_cure_discrepancy_id?: string;
}

export interface RequirementReadModel {
  requirement_id: string;
  credit_id: string;
  credit_version: number;
  document_type: string;
  required: boolean;
  authority_constraint: string;
  objective_constraints: string[];
  semantic_clause: string;
  rule_reference: string;
  resolution_status?: RequirementResolution;
  settlement_eligible?: boolean;
}

export interface EvidenceReadModel {
  document_id: string;
  credit_id: string;
  presentation_id: string;
  document_type: string;
  issuer_identity: string;
  subject_identity: string;
  source_uri: string;
  sha256: string;
  byte_length: number;
  issued_at: number;
  submitted_at: number;
  authority_id: string;
  version: number;
  status: EvidenceStatus;
}

export interface PresentationReadModel {
  presentation_id: string;
  credit_id: string;
  credit_version: number;
  version: number;
  submitted_by: string;
  submitted_at: number;
  evidence_ids: string[];
  requirements_root: string;
  status: CreditStatus;
  cure_of_discrepancy_id?: string;
  evidence_set_hash?: string;
  history_label?: string;
}

export interface DiscrepancyReadModel {
  discrepancy_id: string;
  credit_id: string;
  presentation_id: string;
  requirement_id: string;
  evidence_ids: string[];
  discrepancy_type: string;
  asserted_reason: string;
  created_at: number;
  status: string;
  adjudication_fingerprint?: string;
  semantic_finalized?: boolean;
}

export interface AdjudicationReadModel {
  fingerprint: string;
  discrepancy_id: string;
  requirement_id: string;
  decision: SemanticDecision;
  reason_code: SemanticReasonCode;
  evidence_status: EvidenceStatus | "VERIFIED";
  finalized: boolean;
  finalized_at: number;
  explanatory_text?: string;
}

export interface RequirementMatrixItem {
  requirement_id: string;
  credit_id: string;
  credit_version: number;
  document_type: string;
  required: boolean;
  objective_status: string;
  resolution_status: RequirementResolution;
  evidence_id: string;
  discrepancy_ids: string[];
  settlement_eligible: boolean;
}

export interface AuditEventReadModel {
  sequence: number;
  action: string;
  actor: string;
  subject_id: string;
  at: number;
  detail: string;
  tx_hash?: string;
}

export interface ContractInfo {
  protocol: string;
  version: string;
  ruleset_family: string;
  semantic_scope: string;
  outgoing_gen_transfer_enabled: boolean;
  fund_flow?: string;
  total_escrow_liability?: number;
  total_beneficiary_payouts?: number;
  total_applicant_refunds?: number;
  target_network: string;
  provenance: string;
  contract_address?: string;
  contract_sha256?: string;
  deployment_tx?: string;
  runner?: string;
  schema_method_count?: number;
  fee_profile_coverage?: string;
  fee_profile_sha256?: string;
}

export interface SettlementGate {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface DemoSnapshot {
  case_id: DemoCaseId | string;
  case_name: string;
  label: string;
  description: string;
  current_time_at: number;
  credit: CreditReadModel;
  requirements: RequirementReadModel[];
  evidence: EvidenceReadModel[];
  presentation: PresentationReadModel;
  presentation_history?: PresentationReadModel[];
  discrepancies: DiscrepancyReadModel[];
  adjudication?: AdjudicationReadModel;
  adjudications?: AdjudicationReadModel[];
  audit: AuditEventReadModel[];
  contractInfo: ContractInfo;
}

export interface StoredTransaction {
  tx_hash: `0x${string}`;
  network: string;
  chain_id: number;
  contract: string;
  method: string;
  credit_id?: string;
  submitted_at: number;
  expected_postcondition: string;
  phase: TransactionPhase;
  last_observed_at: number;
  error?: string;
}
