import type {
  AdjudicationReadModel,
  AuditEventReadModel,
  ContractInfo,
  CreditReadModel,
  DiscrepancyReadModel,
  EvidenceReadModel,
  PresentationReadModel,
  RequirementMatrixItem,
  RequirementReadModel
} from "./models";

export interface ContractCreditWire {
  credit_id: string;
  applicant: string;
  beneficiary: string;
  examiner: string;
  amount: string;
  currency_label: string;
  expiry_at: string;
  presentation_deadline: string;
  shipment_deadline: string;
  ruleset_id: string;
  ruleset_hash: string;
  active_version: string;
  requirements_root: string;
  escrowed_amount: string;
  settlement_booked_amount: string;
  status: CreditReadModel["status"];
  frozen: boolean;
  current_presentation_id: string;
  latest_presentation_version: string;
  settlement_recipient: string;
  active_cure_discrepancy_id: string;
}

export interface ContractRequirementWire {
  requirement_id: string;
  credit_id: string;
  credit_version: string;
  document_type: string;
  required: boolean;
  authority_constraint: string;
  objective_constraints: string;
  semantic_clause: string;
  rule_reference: string;
  created_at: string;
}

export interface ContractEvidenceWire {
  evidence_id: string;
  document_id: string;
  credit_id: string;
  presentation_id: string;
  credit_version: string;
  document_type: string;
  issuer_identity: string;
  subject_identity: string;
  source_uri: string;
  sha256: string;
  byte_length: string;
  issued_at: string;
  submitted_at: string;
  authority_identifier: string;
  version: string;
  status: string;
}

export interface ContractPresentationWire {
  presentation_id: string;
  credit_id: string;
  credit_version: string;
  presentation_version: string;
  evidence_set_hash: string;
  evidence_count: string;
  evidence_ids: string;
  submitted_at: string;
  status: PresentationReadModel["status"];
  cure_of_discrepancy_id: string;
}

export interface ContractDiscrepancyWire {
  discrepancy_id: string;
  credit_id: string;
  presentation_id: string;
  requirement_id: string;
  evidence_set_hash: string;
  document_ids: string;
  discrepancy_type: string;
  asserted_reason: string;
  created_at: string;
  status: string;
  adjudication_fingerprint: string;
  semantic_finalized: boolean;
}

export interface ContractAdjudicationWire {
  fingerprint: string;
  discrepancy_id: string;
  requirement_id: string;
  decision: AdjudicationReadModel["decision"];
  reason_code: AdjudicationReadModel["reason_code"];
  evidence_status: string;
  finalized_at: string;
}

export interface ContractAuditWire {
  credit_id: string;
  event_type: string;
  actor: string;
  version: string;
  reference_id: string;
  occurred_at: string;
}

export interface ContractInfoWire {
  protocol: string;
  protocol_version: string;
  ruleset_family: string;
  semantic_scope: string;
  outgoing_value_release_enabled: boolean;
  provenance: string;
  network_policy: string;
}

const numberValue = (value: string) => Number(value);
const csv = (value: string) => (value === "" ? [] : value.split(","));

export function adaptCredit(raw: ContractCreditWire): CreditReadModel {
  return {
    credit_id: raw.credit_id,
    applicant: raw.applicant,
    beneficiary: raw.beneficiary,
    examiner: raw.examiner,
    amount: numberValue(raw.amount),
    currency_label: raw.currency_label,
    expiry_at: numberValue(raw.expiry_at),
    presentation_deadline: numberValue(raw.presentation_deadline),
    shipment_deadline: numberValue(raw.shipment_deadline),
    ruleset_id: raw.ruleset_id,
    ruleset_hash: raw.ruleset_hash,
    active_version: numberValue(raw.active_version),
    requirements_root: raw.requirements_root,
    escrowed_amount: numberValue(raw.escrowed_amount),
    status: raw.status,
    settled: raw.status === "SETTLED",
    settlement_booked_amount: numberValue(raw.settlement_booked_amount),
    frozen: raw.frozen,
    current_presentation_id: raw.current_presentation_id,
    latest_presentation_version: numberValue(raw.latest_presentation_version),
    settlement_recipient: raw.settlement_recipient,
    active_cure_discrepancy_id: raw.active_cure_discrepancy_id
  };
}

export function adaptRequirement(raw: ContractRequirementWire): RequirementReadModel {
  return {
    requirement_id: raw.requirement_id,
    credit_id: raw.credit_id,
    credit_version: numberValue(raw.credit_version),
    document_type: raw.document_type,
    required: raw.required,
    authority_constraint: raw.authority_constraint,
    objective_constraints: raw.objective_constraints ? [raw.objective_constraints] : [],
    semantic_clause: raw.semantic_clause,
    rule_reference: raw.rule_reference
  };
}

export function adaptEvidence(raw: ContractEvidenceWire): EvidenceReadModel {
  return {
    document_id: raw.document_id,
    credit_id: raw.credit_id,
    presentation_id: raw.presentation_id,
    document_type: raw.document_type,
    issuer_identity: raw.issuer_identity,
    subject_identity: raw.subject_identity,
    source_uri: raw.source_uri,
    sha256: raw.sha256,
    byte_length: numberValue(raw.byte_length),
    issued_at: numberValue(raw.issued_at),
    submitted_at: numberValue(raw.submitted_at),
    authority_id: raw.authority_identifier,
    version: numberValue(raw.version),
    status: raw.status as EvidenceReadModel["status"]
  };
}

export function adaptPresentation(raw: ContractPresentationWire): PresentationReadModel {
  return {
    presentation_id: raw.presentation_id,
    credit_id: raw.credit_id,
    credit_version: numberValue(raw.credit_version),
    version: numberValue(raw.presentation_version),
    submitted_by: "",
    submitted_at: numberValue(raw.submitted_at),
    evidence_ids: csv(raw.evidence_ids),
    requirements_root: "",
    status: raw.status,
    cure_of_discrepancy_id: raw.cure_of_discrepancy_id
  };
}

export function adaptDiscrepancy(raw: ContractDiscrepancyWire): DiscrepancyReadModel {
  return {
    discrepancy_id: raw.discrepancy_id,
    credit_id: raw.credit_id,
    presentation_id: raw.presentation_id,
    requirement_id: raw.requirement_id,
    evidence_ids: csv(raw.document_ids),
    discrepancy_type: raw.discrepancy_type,
    asserted_reason: raw.asserted_reason,
    created_at: numberValue(raw.created_at),
    status: raw.status
  };
}

export function adaptAdjudication(raw: ContractAdjudicationWire): AdjudicationReadModel {
  return {
    fingerprint: raw.fingerprint,
    discrepancy_id: raw.discrepancy_id,
    requirement_id: raw.requirement_id,
    decision: raw.decision,
    reason_code: raw.reason_code,
    evidence_status: raw.evidence_status as AdjudicationReadModel["evidence_status"],
    finalized: true,
    finalized_at: numberValue(raw.finalized_at)
  };
}

export function adaptRequirementMatrixItem(raw: Omit<RequirementMatrixItem, "credit_version"> & { credit_version: string }): RequirementMatrixItem {
  return { ...raw, credit_version: numberValue(raw.credit_version) };
}

export function adaptAuditEvent(raw: ContractAuditWire, sequence: number): AuditEventReadModel {
  return {
    sequence,
    action: raw.event_type,
    actor: raw.actor,
    subject_id: raw.reference_id,
    at: numberValue(raw.occurred_at),
    detail: `${raw.credit_id} / version ${raw.version}`
  };
}

export function adaptContractInfo(raw: ContractInfoWire): ContractInfo {
  return {
    protocol: raw.protocol,
    version: raw.protocol_version,
    ruleset_family: raw.ruleset_family,
    semantic_scope: raw.semantic_scope,
    outgoing_gen_transfer_enabled: raw.outgoing_value_release_enabled,
    target_network: raw.network_policy,
    provenance: raw.provenance
  };
}
