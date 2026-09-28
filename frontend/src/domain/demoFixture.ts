import type {
  AdjudicationReadModel,
  AuditEventReadModel,
  ContractInfo,
  CreditReadModel,
  DemoCaseId,
  DemoSnapshot,
  DiscrepancyReadModel,
  EvidenceReadModel,
  PresentationReadModel,
  RequirementReadModel
} from "./models";

const CONTRACT_INFO: ContractInfo = {
  protocol: "ClearLC",
  version: "0.2.0-phase2",
  ruleset_family: "CLEarlC-SYNTHETIC-OPS@1",
  semantic_scope: "Bounded documentary discrepancy support only",
  outgoing_gen_transfer_enabled: false,
  target_network: "studio-dev / chain 61997",
  provenance: "ClearLC local Phase 2 build / contracts/clearlc.py",
  contract_sha256: "f754f0a87e75f5e06a699c131693830e1a7dd1fffaf9b5580eaea930008d5c4c"
};

const ROOTS = {
  clean: "d47e9f9c8a27b5a1f7f99b96aebd9f575744c5d0f995a6d3784c7e6bb0f6a2c1",
  invalid: "6ead5878d14c77dcde12ff584ce41b3616e8352b503c275ed86b593f3470b648",
  cure: "f3cfd6e11b9b3e8a1c6ec2c00a78e0f6d2e3f6c2e89fbb764c6784dd1f2cf84e"
} as const;

const RULESET_HASH = "85e60d8d3268867021e1e340c206b8ed63f3fb2cc5110c406849ba8af24552cb";
const NOW = 1798030000;

const documentRows = [
  ["Commercial Invoice", "Applicant or beneficiary", "DOC-INV"],
  ["Packing List", "Beneficiary", "DOC-PACK"],
  ["Bill of Lading", "Carrier", "DOC-BOL"],
  ["Certificate of Origin", "Competent authority", "DOC-COO"],
  ["Certificate of Quality", "Independent surveyor", "DOC-QUAL"],
  ["Inspection Certificate", "Independent inspector", "DOC-INSP"],
  ["Insurance Certificate", "Authorized insurer", "DOC-INS"]
] as const;

function requirements(creditId: string, resolutions: Record<string, RequirementReadModel["resolution_status"]>): RequirementReadModel[] {
  return documentRows.map(([document_type, authority_constraint, id]) => {
    const requirement_id = id === "DOC-QUAL" ? "REQ-QUAL" : `REQ-${id.slice(4)}`;
    const resolution_status = resolutions[requirement_id] ?? "UNASSESSED";
    return {
      requirement_id,
      credit_id: creditId,
      credit_version: 1,
      document_type,
      required: true,
      authority_constraint,
      objective_constraints: ["credit_id matches", "version is current", "byte length and SHA-256 are authenticated"],
      semantic_clause: document_type === "Certificate of Quality"
        ? "The document must perform the quality-certification function; title alone is not dispositive."
        : "The presented document must fulfill the named documentary function.",
      rule_reference: "CLEarlC-SYNTHETIC-OPS@1",
      resolution_status,
      settlement_eligible: ["OBJECTIVELY_SATISFIED", "INVALID_DISCREPANCY", "WAIVED", "CURED"].includes(resolution_status)
    };
  });
}

function evidence(creditId: string, presentationId: string, version: number, replacementQuality = false): EvidenceReadModel[] {
  return documentRows.map(([document_type, _authority, id], index) => {
    const isQuality = id === "DOC-QUAL";
    const documentId = isQuality && replacementQuality ? "DOC-QUAL-2" : `${id}-1`;
    const knownHashes = [
      "cb6c6788b610b0f20a89c7c2a41806dc947147ea088f80b10b8511139894947d",
      "9895ce18eebcdb0252e40bdc394a912d9d387bb4ee8d291fd377f17e0e33db63",
      "f539568726dae66881617bbf52089d22d4c04a010e65fd5e348158bb67d26319",
      "9f68bbafa6a7772efca9256a221e911e9dee22798f91c5e554eaec0be610c7a1",
      "9ca476ade6c465175ec03e7d1e8361ddd7243367a432943962eb9c6699e44371",
      "1398dda80dde5a86e798c620adbe7284783e4c6f558caace78b49ce117840ecf",
      "7b155201708d56f579923af423b5b578f0051b40ad6acf4390c7012e0057a506"
    ];
    return {
      document_id: documentId,
      credit_id: creditId,
      presentation_id: presentationId,
      document_type: isQuality && replacementQuality ? "Certificate of Quality" : document_type === "Certificate of Quality" ? "Quality Inspection Certificate" : document_type,
      issuer_identity: isQuality ? (replacementQuality ? "Independent Surveyor Cooperative" : "Synthetic inspection authority") : "Synthetic authority fixture",
      subject_identity: "Meridian Cocoa Export Ltd.",
      source_uri: `ipfs://clearlc-demo/${documentId}`,
      sha256: isQuality && replacementQuality ? "7a9ce4f2e0b36b3e7f9df0f74f8f6d0e52c0dcb06fbb7f3f4ad4a6f49d8eac31" : knownHashes[index],
      byte_length: isQuality && replacementQuality ? 371 : 150 + index * 19,
      issued_at: 1797800000 + (replacementQuality ? 1500 : 0),
      submitted_at: 1798000000 + (replacementQuality ? 1500 : 0),
      authority_id: isQuality ? "DEMO-SURVEYOR-001" : "DEMO-AUTHORITY-001",
      version,
      status: "COMMITTED"
    };
  });
}

function baseCredit(creditId: string, root: string, status: CreditReadModel["status"], presentationId: string, presentationVersion: number, overrides: Partial<CreditReadModel> = {}): CreditReadModel {
  return {
    credit_id: creditId,
    applicant: "Atlas Commodities Ltd.",
    beneficiary: "Meridian Cocoa Export Ltd.",
    examiner: "Atlas Trade Services",
    amount: 250000,
    currency_label: "GEN-denominated demo value",
    expiry_at: 1798675200,
    presentation_deadline: 1798502400,
    shipment_deadline: 1797897600,
    ruleset_id: "CLEarlC-SYNTHETIC-OPS",
    ruleset_hash: RULESET_HASH,
    active_version: 1,
    requirements_root: root,
    escrowed_amount: 250000,
    status,
    settled: status === "SETTLED",
    settlement_booked_amount: 0,
    frozen: true,
    current_presentation_id: presentationId,
    latest_presentation_version: presentationVersion,
    settlement_recipient: "",
    active_cure_discrepancy_id: "",
    ...overrides
  };
}

function presentation(creditId: string, id: string, version: number, status: CreditReadModel["status"], evidenceIds: string[], root: string, overrides: Partial<PresentationReadModel> = {}): PresentationReadModel {
  return {
    presentation_id: id,
    credit_id: creditId,
    credit_version: 1,
    version,
    submitted_by: "Meridian Cocoa Export Ltd.",
    submitted_at: 1798000000 + (version - 1) * 1500,
    evidence_ids: evidenceIds,
    requirements_root: root,
    status,
    evidence_set_hash: version === 1 ? "4dd92ee2b0af2b21f92c328ac4a7c1ce2d8f0c3a1010a04f42e8fb0a8f4cb937" : "d2e88d6bcbb474ba574af0d01e4ad8e7cd0a24c2ef0e8384f1a5df9d78fca220",
    history_label: version === 1 ? "Original presentation" : "Replacement presentation after cure",
    ...overrides
  };
}

function audit(rows: Array<[string, string, string, number, string, string?]>): AuditEventReadModel[] {
  return rows.map(([action, actor, subject_id, at, detail, tx_hash], index) => ({ sequence: index + 1, action, actor, subject_id, at, detail, tx_hash }));
}

const cleanId = "CLC-COCOA-CLEAN-001";
const invalidId = "CLC-COCOA-ROT-001";
const cureId = "CLC-COCOA-CURE-001";

const cleanEvidence = evidence(cleanId, "PRES-CLEAN-1", 1);
const invalidEvidence = evidence(invalidId, "PRES-TITLE-ONLY-1", 1);
const cureEvidenceV1 = evidence(cureId, "PRES-CURE-1", 1);
const cureEvidenceV2 = evidence(cureId, "PRES-CURE-2", 2, true);

const cleanRequirements = requirements(cleanId, Object.fromEntries(documentRows.map(([_type, _authority, id]) => [id === "DOC-QUAL" ? "REQ-QUAL" : `REQ-${id.slice(4)}`, "OBJECTIVELY_SATISFIED"])));
const invalidRequirements = requirements(invalidId, Object.fromEntries(documentRows.map(([_type, _authority, id]) => [id === "DOC-QUAL" ? "REQ-QUAL" : `REQ-${id.slice(4)}`, id === "DOC-QUAL" ? "INVALID_DISCREPANCY" : "OBJECTIVELY_SATISFIED"])));
const cureRequirements = requirements(cureId, Object.fromEntries(documentRows.map(([_type, _authority, id]) => [id === "DOC-QUAL" ? "REQ-QUAL" : `REQ-${id.slice(4)}`, id === "DOC-QUAL" ? "CURED" : "OBJECTIVELY_SATISFIED"])));

const cleanPresentation = presentation(cleanId, "PRES-CLEAN-1", 1, "SETTLEMENT_READY", cleanEvidence.map((item) => item.document_id), "d47e9f9c8a27b5a1f7f99b96aebd9f575744c5d0f995a6d3784c7e6bb0f6a2c1");
const invalidPresentation = presentation(invalidId, "PRES-TITLE-ONLY-1", 1, "SETTLEMENT_READY", invalidEvidence.map((item) => item.document_id), "6ead5878d14c77dcde12ff584ce41b3616e8352b503c275ed86b593f3470b648");
const curePresentationV1 = presentation(cureId, "PRES-CURE-1", 1, "DISCREPANT", cureEvidenceV1.map((item) => item.document_id), "f3cfd6e11b9b3e8a1c6ec2c00a78e0f6d2e3f6c2e89fbb764c6784dd1f2cf84e");
const curePresentationV2 = presentation(cureId, "PRES-CURE-2", 2, "SETTLEMENT_READY", cureEvidenceV2.map((item) => item.document_id), "f3cfd6e11b9b3e8a1c6ec2c00a78e0f6d2e3f6c2e89fbb764c6784dd1f2cf84e", { cure_of_discrepancy_id: "DISC-CURE-MATERIAL-1" });

const invalidDiscrepancy: DiscrepancyReadModel = {
  discrepancy_id: "DISC-TITLE-ONLY-1",
  credit_id: invalidId,
  presentation_id: invalidPresentation.presentation_id,
  requirement_id: "REQ-QUAL",
  evidence_ids: ["DOC-QUAL-1"],
  discrepancy_type: "TITLE_MISMATCH",
  asserted_reason: "Title says Quality Inspection Certificate, not Certificate of Quality.",
  created_at: 1798010000,
  status: "INVALID_DISCREPANCY"
};

const cureDiscrepancy: DiscrepancyReadModel = {
  discrepancy_id: "DISC-CURE-MATERIAL-1",
  credit_id: cureId,
  presentation_id: curePresentationV1.presentation_id,
  requirement_id: "REQ-QUAL",
  evidence_ids: ["DOC-QUAL-1"],
  discrepancy_type: "MATERIAL_DATA_CONFLICT",
  asserted_reason: "The quality certificate records a cocoa grade that conflicts with the frozen contract requirement.",
  created_at: 1798010000,
  status: "CURED"
};

const invalidAdjudication: AdjudicationReadModel = {
  fingerprint: "fp-invalid-title-only-8e65b9dce7cc0a7f1cb8a83f591b5f11",
  discrepancy_id: invalidDiscrepancy.discrepancy_id,
  requirement_id: invalidDiscrepancy.requirement_id,
  decision: "INVALID_DISCREPANCY",
  reason_code: "TITLE_ONLY_MISMATCH",
  evidence_status: "VERIFIED",
  finalized: true,
  finalized_at: 1798020000,
  explanatory_text: "The presented document fulfills the quality-certification function; the title difference alone is not material."
};

const cureAdjudication: AdjudicationReadModel = {
  fingerprint: "fp-cure-material-2f3f7c8d17b9a6e4c22d0c9d7f0a0c12",
  discrepancy_id: cureDiscrepancy.discrepancy_id,
  requirement_id: cureDiscrepancy.requirement_id,
  decision: "VALID_DISCREPANCY",
  reason_code: "MATERIAL_DATA_CONFLICT",
  evidence_status: "VERIFIED",
  finalized: true,
  finalized_at: 1798020000,
  explanatory_text: "The authenticated quality data conflicts with the frozen requirement and materially affects documentary function."
};

export const demoCases: Record<DemoCaseId, DemoSnapshot> = {
  clean: {
    case_id: "clean",
    case_name: "Case A · Clean presentation",
    label: "DEMO FIXTURE · clean presentation",
    description: "A fully objective path from funded credit to settlement readiness with no semantic dispute.",
    current_time_at: NOW,
    credit: baseCredit(cleanId, "d47e9f9c8a27b5a1f7f99b96aebd9f575744c5d0f995a6d3784c7e6bb0f6a2c1", "SETTLEMENT_READY", cleanPresentation.presentation_id, 1),
    requirements: cleanRequirements,
    evidence: cleanEvidence,
    presentation: cleanPresentation,
    presentation_history: [cleanPresentation],
    discrepancies: [],
    audit: audit([
      ["CREDIT_CREATED", "Atlas Commodities Ltd.", cleanId, 1797000000, "Synthetic clean case created"],
      ["CREDIT_FUNDED", "Atlas Commodities Ltd.", cleanId, 1797050000, "Escrow accounting funded"],
      ["CREDIT_ACCEPTED", "Meridian Cocoa Export Ltd.", cleanId, 1797060000, "Beneficiary accepted frozen terms"],
      ["PRESENTATION_SUBMITTED", "Meridian Cocoa Export Ltd.", cleanPresentation.presentation_id, 1798000000, "Seven-document compliant presentation"],
      ["EXAMINATION_COMPLETE", "Atlas Trade Services", cleanPresentation.presentation_id, 1798010000, "All objective checks satisfied"],
      ["SETTLEMENT_READY", "Atlas Trade Services", cleanId, 1798020000, "Deterministic settlement gate satisfied"]
    ]),
    contractInfo: CONTRACT_INFO
  },
  "invalid-refusal": {
    case_id: "invalid-refusal",
    case_name: "Case B · Invalid refusal",
    label: "DEMO FIXTURE · title-only mismatch",
    description: "A title-only refusal is challenged and invalidated without allowing semantic consensus to choose value or recipient.",
    current_time_at: NOW,
    credit: baseCredit(invalidId, "6ead5878d14c77dcde12ff584ce41b3616e8352b503c275ed86b593f3470b648", "SETTLEMENT_READY", invalidPresentation.presentation_id, 1),
    requirements: invalidRequirements,
    evidence: invalidEvidence,
    presentation: invalidPresentation,
    presentation_history: [invalidPresentation],
    discrepancies: [invalidDiscrepancy],
    adjudication: invalidAdjudication,
    adjudications: [invalidAdjudication],
    audit: audit([
      ["CREDIT_CREATED", "Atlas Commodities Ltd.", invalidId, 1797000000, "Synthetic title-mismatch case created"],
      ["CREDIT_FUNDED", "Atlas Commodities Ltd.", invalidId, 1797050000, "Escrow accounting funded"],
      ["CREDIT_ACCEPTED", "Meridian Cocoa Export Ltd.", invalidId, 1797060000, "Beneficiary accepted frozen terms"],
      ["PRESENTATION_SUBMITTED", "Meridian Cocoa Export Ltd.", invalidPresentation.presentation_id, 1798000000, "Seven-document synthetic presentation"],
      ["DISCREPANCY_FILED", "Atlas Trade Services", invalidDiscrepancy.discrepancy_id, 1798010000, "Title-only mismatch asserted"],
      ["CHALLENGE_SUBMITTED", "Meridian Cocoa Export Ltd.", invalidDiscrepancy.discrepancy_id, 1798015000, "Beneficiary challenged the semantic assertion"],
      ["SEMANTIC_ADJUDICATION_FINALIZED", "GenLayer consensus fixture", invalidDiscrepancy.discrepancy_id, 1798020000, "INVALID_DISCREPANCY · TITLE_ONLY_MISMATCH"],
      ["SETTLEMENT_READY", "Atlas Trade Services", invalidId, 1798025000, "Requirement resolved; deterministic gate satisfied"]
    ]),
    contractInfo: CONTRACT_INFO
  },
  cure: {
    case_id: "cure",
    case_name: "Case C · Material discrepancy and cure",
    label: "DEMO FIXTURE · cure history",
    description: "A material discrepancy blocks settlement, then replacement evidence creates a new presentation and a new adjudication tuple.",
    current_time_at: NOW,
    credit: baseCredit(cureId, "f3cfd6e11b9b3e8a1c6ec2c00a78e0f6d2e3f6c2e89fbb764c6784dd1f2cf84e", "SETTLEMENT_READY", curePresentationV2.presentation_id, 2, { active_version: 2, latest_presentation_version: 2 }),
    requirements: cureRequirements.map((item) => ({ ...item, credit_version: 2 })),
    evidence: [...cureEvidenceV1, ...cureEvidenceV2.filter((item) => item.document_id === "DOC-QUAL-2")],
    presentation: { ...curePresentationV2, credit_version: 2 },
    presentation_history: [curePresentationV1, { ...curePresentationV2, credit_version: 2 }],
    discrepancies: [cureDiscrepancy],
    adjudication: cureAdjudication,
    adjudications: [cureAdjudication],
    audit: audit([
      ["CREDIT_CREATED", "Atlas Commodities Ltd.", cureId, 1797000000, "Synthetic cure case created"],
      ["CREDIT_FUNDED", "Atlas Commodities Ltd.", cureId, 1797050000, "Escrow accounting funded"],
      ["PRESENTATION_SUBMITTED", "Meridian Cocoa Export Ltd.", curePresentationV1.presentation_id, 1798000000, "Original presentation v1"],
      ["DISCREPANCY_FILED", "Atlas Trade Services", cureDiscrepancy.discrepancy_id, 1798010000, "Material quality conflict asserted"],
      ["SEMANTIC_ADJUDICATION_FINALIZED", "GenLayer consensus fixture", cureDiscrepancy.discrepancy_id, 1798020000, "VALID_DISCREPANCY · MATERIAL_DATA_CONFLICT"],
      ["CURE_OPENED", "Meridian Cocoa Export Ltd.", cureDiscrepancy.discrepancy_id, 1798021000, "Replacement evidence permitted"],
      ["EVIDENCE_REPLACED", "Meridian Cocoa Export Ltd.", "DOC-QUAL-2", 1798022000, "v2 evidence committed; v1 remains immutable"],
      ["PRESENTATION_SUBMITTED", "Meridian Cocoa Export Ltd.", curePresentationV2.presentation_id, 1798023000, "Replacement presentation v2"],
      ["EXAMINATION_COMPLETE", "Atlas Trade Services", curePresentationV2.presentation_id, 1798025000, "Replacement evidence satisfies requirement"],
      ["SETTLEMENT_READY", "Atlas Trade Services", cureId, 1798026000, "Cured requirement resolves settlement gate"]
    ]),
    contractInfo: CONTRACT_INFO
  }
};

export const demoFixture = demoCases["invalid-refusal"];
export const demoCaseList = Object.values(demoCases);
