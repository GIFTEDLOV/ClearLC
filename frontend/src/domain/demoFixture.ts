import type { DemoSnapshot } from "./models";

const requirementsRoot =
  "6ead5878d14c77dcde12ff584ce41b3616e8352b503c275ed86b593f3470b648";

export const demoFixture: DemoSnapshot = {
  label: "DEMO FIXTURE · Nigerian cocoa export to Rotterdam",
  description:
    "Synthetic read model for the Phase 1 shell. It is not connected to a live credit or wallet.",
  credit: {
    credit_id: "CLC-COCOA-ROT-001",
    applicant: "Atlas Commodities Ltd.",
    beneficiary: "Meridian Cocoa Export Ltd.",
    examiner: "Atlas Trade Services",
    amount: 250000,
    currency_label: "GEN-denominated demo value",
    expiry_at: 1798675200,
    presentation_deadline: 1798502400,
    shipment_deadline: 1797897600,
    ruleset_id: "CLEarlC-SYNTHETIC-OPS",
    ruleset_hash:
      "85e60d8d3268867021e1e340c206b8ed63f3fb2cc5110c406849ba8af24552cb",
    active_version: 1,
    requirements_root: requirementsRoot,
    escrowed_amount: 250000,
    status: "SETTLEMENT_READY",
    settled: false
  },
  requirements: [
    ["REQ-INV", "Commercial Invoice", "Applicant or beneficiary"],
    ["REQ-PACK", "Packing List", "Beneficiary"],
    ["REQ-BOL", "Bill of Lading", "Carrier"],
    ["REQ-COO", "Certificate of Origin", "Competent authority"],
    ["REQ-QUAL", "Certificate of Quality", "Independent surveyor"],
    ["REQ-INSP", "Inspection Certificate", "Independent inspector"],
    ["REQ-INS", "Insurance Certificate", "Authorized insurer"]
  ].map(([requirement_id, document_type, authority_constraint]) => ({
    requirement_id,
    credit_id: "CLC-COCOA-ROT-001",
    credit_version: 1,
    document_type,
    required: true,
    authority_constraint,
    objective_constraints: ["credit_id matches", "version is current"],
    semantic_clause:
      document_type === "Certificate of Quality"
        ? "The document must perform the quality-certification function; title alone is not dispositive."
        : "The presented document must fulfill the named documentary function.",
    rule_reference: "CLEarlC-SYNTHETIC-OPS@1"
  })),
  evidence: ([
    [
      "DOC-INV-1",
      "Commercial Invoice",
      "cb6c6788b610b0f20a89c7c2a41806dc947147ea088f80b10b8511139894947d",
      222
    ],
    [
      "DOC-PACK-1",
      "Packing List",
      "9895ce18eebcdb0252e40bdc394a912d9d387bb4ee8d291fd377f17e0e33db63",
      173
    ],
    [
      "DOC-BOL-1",
      "Bill of Lading",
      "f539568726dae66881617bbf52089d22d4c04a010e65fd5e348158bb67d26319",
      260
    ],
    [
      "DOC-COO-1",
      "Certificate of Origin",
      "9f68bbafa6a7772efca9256a221e911e9dee22798f91c5e554eaec0be610c7a1",
      158
    ],
    [
      "DOC-QUAL-1",
      "Quality Inspection Certificate",
      "9ca476ade6c465175ec03e7d1e8361ddd7243367a432943962eb9c6699e44371",
      333
    ],
    [
      "DOC-INSP-1",
      "Inspection Certificate",
      "1398dda80dde5a86e798c620adbe7284783e4c6f558caace78b49ce117840ecf",
      219
    ],
    [
      "DOC-INS-1",
      "Insurance Certificate",
      "7b155201708d56f579923af423b5b578f0051b40ad6acf4390c7012e0057a506",
      164
    ]
  ] as const).map(([document_id, document_type, sha256, byte_length]) => ({
    document_id,
    credit_id: "CLC-COCOA-ROT-001",
    presentation_id: "PRES-TITLE-ONLY-1",
    document_type,
    issuer_identity: "Synthetic authority fixture",
    subject_identity: "Meridian Cocoa Export Ltd.",
    source_uri: `ipfs://clearlc-demo/${document_id}`,
    sha256,
    byte_length: Number(byte_length),
    issued_at: 1797800000,
    submitted_at: 1798000000,
    authority_id: "DEMO-AUTHORITY-001",
    version: 1,
    status: "COMMITTED" as const
  })),
  presentation: {
    presentation_id: "PRES-TITLE-ONLY-1",
    credit_id: "CLC-COCOA-ROT-001",
    credit_version: 1,
    version: 1,
    submitted_by: "Meridian Cocoa Export Ltd.",
    submitted_at: 1798000000,
    evidence_ids: [
      "DOC-INV-1",
      "DOC-PACK-1",
      "DOC-BOL-1",
      "DOC-COO-1",
      "DOC-QUAL-1",
      "DOC-INSP-1",
      "DOC-INS-1"
    ],
    requirements_root: requirementsRoot,
    status: "SETTLEMENT_READY"
  },
  discrepancies: [
    {
      discrepancy_id: "DISC-TITLE-ONLY-1",
      credit_id: "CLC-COCOA-ROT-001",
      presentation_id: "PRES-TITLE-ONLY-1",
      requirement_id: "REQ-QUAL",
      evidence_ids: ["DOC-QUAL-1"],
      discrepancy_type: "TITLE_MISMATCH",
      asserted_reason: "Title says Quality Inspection Certificate, not Certificate of Quality.",
      created_at: 1798010000,
      status: "CHALLENGED"
    }
  ],
  adjudication: {
    fingerprint:
      "demo-fingerprint-8e65b9dce7cc0a7f1cb8a83f591b5f1119b95f488e55e5f3da5b444e53b9e7a4",
    discrepancy_id: "DISC-TITLE-ONLY-1",
    requirement_id: "REQ-QUAL",
    decision: "INVALID_DISCREPANCY",
    reason_code: "TITLE_ONLY_MISMATCH",
    evidence_status: "VERIFIED",
    finalized: true,
    finalized_at: 1798020000
  },
  audit: [
    {
      sequence: 1,
      action: "CREDIT_CREATED",
      actor: "Atlas Commodities Ltd.",
      subject_id: "CLC-COCOA-ROT-001",
      at: 1797000000,
      detail: "Synthetic demo credit created"
    },
    {
      sequence: 2,
      action: "CREDIT_FUNDED",
      actor: "Atlas Commodities Ltd.",
      subject_id: "CLC-COCOA-ROT-001",
      at: 1797050000,
      detail: "Escrow accounting funded in demo fixture"
    },
    {
      sequence: 3,
      action: "PRESENTATION_SUBMITTED",
      actor: "Meridian Cocoa Export Ltd.",
      subject_id: "PRES-TITLE-ONLY-1",
      at: 1798000000,
      detail: "Seven-document synthetic presentation"
    },
    {
      sequence: 4,
      action: "SEMANTIC_ADJUDICATION_FINALIZED",
      actor: "GenLayer consensus fixture",
      subject_id: "DISC-TITLE-ONLY-1",
      at: 1798020000,
      detail: "Title-only mismatch is not materially supported"
    }
  ],
  contractInfo: {
    protocol: "ClearLC",
    version: "0.1.0-phase1",
    ruleset_family: "CLEarlC-SYNTHETIC-OPS@1",
    semantic_scope: "Bounded documentary discrepancy support only",
    outgoing_gen_transfer_enabled: false,
    target_network: "studio-dev / chain 61997",
    provenance: "https://github.com/genlayerlabs/genlayer-docs"
  }
};
