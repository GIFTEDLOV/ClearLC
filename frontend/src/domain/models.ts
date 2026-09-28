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
  | "EXPIRED"
  | "CANCELLED";

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
  status: CreditStatus;
  settled: boolean;
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
}

export interface AuditEventReadModel {
  sequence: number;
  action: string;
  actor: string;
  subject_id: string;
  at: number;
  detail: string;
}

export interface ContractInfo {
  protocol: string;
  version: string;
  ruleset_family: string;
  semantic_scope: string;
  outgoing_gen_transfer_enabled: boolean;
  target_network: string;
  provenance: string;
}

export interface DemoSnapshot {
  label: string;
  description: string;
  credit: CreditReadModel;
  requirements: RequirementReadModel[];
  evidence: EvidenceReadModel[];
  presentation: PresentationReadModel;
  discrepancies: DiscrepancyReadModel[];
  adjudication: AdjudicationReadModel;
  audit: AuditEventReadModel[];
  contractInfo: ContractInfo;
}
