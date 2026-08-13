/**
 * Canonical ownership metadata for every AI page.
 *
 * `outputKeys` are deliberately unique across roles. Shared transport/display
 * fields belong in `metadataKeys` instead and are not treated as deliverables.
 * Keeping this module free of server-only imports makes it safe to use from
 * prompts, server actions, client views, and tests.
 */

export const AI_ROLE_KINDS = [
  "studio",
  "research",
  "optimizer",
  "repurposer",
  "battlecards",
  "emailCampaigns",
  "socialArchitect",
] as const;

export type AiRoleKind = (typeof AI_ROLE_KINDS)[number];

export const AI_COLLECTIONS = [
  "AI_STUDIO",
  "AI_RESEARCH",
  "AI_OPTIMIZER",
  "AI_REPURPOSER",
  "AI_BATTLECARDS",
  "AI_EMAIL_CAMPAIGNS",
  "AI_SOCIAL_ARCHITECT",
] as const;

export type AiCollection = (typeof AI_COLLECTIONS)[number];

export const COMMON_AI_OUTPUT_METADATA_KEYS = [
  "title",
  "rawMarkdown",
  "tokensUsed",
] as const;

export interface AiRoleContract {
  readonly kind: AiRoleKind;
  readonly collection: AiCollection;
  readonly route: `/${string}`;
  readonly displayName: string;
  readonly purpose: string;
  readonly outputKeys: readonly string[];
  readonly outputLabels: Readonly<Record<string, string>>;
  readonly metadataKeys: readonly string[];
  readonly doesNotOwn: readonly string[];
}

export const AI_ROLE_CONTRACTS = {
  studio: {
    kind: "studio",
    collection: "AI_STUDIO",
    route: "/ai-studio",
    displayName: "AI Studio",
    purpose:
      "Create exactly one standalone marketing asset in the requested format.",
    outputKeys: ["asset"],
    outputLabels: {
      asset: "Standalone Asset",
    },
    metadataKeys: COMMON_AI_OUTPUT_METADATA_KEYS,
    doesNotOwn: [
      "market intelligence reports",
      "conversion diagnostics",
      "multi-channel source repurposing",
      "competitor battlecards",
      "automated email sequences",
      "social publishing architecture",
    ],
  },
  research: {
    kind: "research",
    collection: "AI_RESEARCH",
    route: "/ai-research",
    displayName: "AI EdTech Research",
    purpose:
      "Produce evidence-oriented market intelligence without publish-ready campaign assets.",
    outputKeys: [
      "marketLandscape",
      "audienceInsights",
      "demandSignals",
      "evidenceGaps",
    ],
    outputLabels: {
      marketLandscape: "Market Landscape",
      audienceInsights: "Audience Insights",
      demandSignals: "Demand Signals",
      evidenceGaps: "Evidence Gaps",
    },
    metadataKeys: COMMON_AI_OUTPUT_METADATA_KEYS,
    doesNotOwn: [
      "finished advertising copy",
      "email sequences",
      "social posts or calendars",
      "copy rewrites",
      "sales objection scripts",
    ],
  },
  optimizer: {
    kind: "optimizer",
    collection: "AI_OPTIMIZER",
    route: "/ai-optimizer",
    displayName: "AI Strategy Optimizer",
    purpose:
      "Diagnose supplied copy and prescribe prioritized, testable improvements.",
    outputKeys: ["diagnosis", "priorityFixes", "lineEdits", "testPlan"],
    outputLabels: {
      diagnosis: "Diagnosis",
      priorityFixes: "Priority Fixes",
      lineEdits: "Line Edits",
      testPlan: "Test Plan",
    },
    metadataKeys: [...COMMON_AI_OUTPUT_METADATA_KEYS, "score"],
    doesNotOwn: [
      "market research",
      "new campaign creation",
      "multi-channel repurposing",
      "competitor intelligence",
      "email automation",
      "social publishing plans",
    ],
  },
  repurposer: {
    kind: "repurposer",
    collection: "AI_REPURPOSER",
    route: "/ai-repurposer",
    displayName: "AI Content Repurposer",
    purpose:
      "Decompose supplied source content into reusable atoms and derivative briefs.",
    outputKeys: [
      "coreNarrative",
      "contentAtoms",
      "derivativeBriefs",
      "reusePlan",
    ],
    outputLabels: {
      coreNarrative: "Core Narrative",
      contentAtoms: "Content Atoms",
      derivativeBriefs: "Derivative Briefs",
      reusePlan: "Reuse Plan",
    },
    metadataKeys: COMMON_AI_OUTPUT_METADATA_KEYS,
    doesNotOwn: [
      "net-new market research",
      "copy conversion scoring",
      "competitor sales enablement",
      "finished email automation",
      "social campaign architecture",
    ],
  },
  battlecards: {
    kind: "battlecards",
    collection: "AI_BATTLECARDS",
    route: "/ai-battlecards",
    displayName: "AI Competitor Battlecards",
    purpose:
      "Create competitor-specific decision support and sales discovery guidance.",
    outputKeys: [
      "comparisonMatrix",
      "decisionCriteria",
      "objectionHandlers",
      "discoveryQuestions",
    ],
    outputLabels: {
      comparisonMatrix: "Comparison Matrix",
      decisionCriteria: "Decision Criteria",
      objectionHandlers: "Objection Handlers",
      discoveryQuestions: "Discovery Questions",
    },
    metadataKeys: COMMON_AI_OUTPUT_METADATA_KEYS,
    doesNotOwn: [
      "general market research",
      "copy optimization",
      "content repurposing",
      "email sequences",
      "social campaign planning",
    ],
  },
  emailCampaigns: {
    kind: "emailCampaigns",
    collection: "AI_EMAIL_CAMPAIGNS",
    route: "/ai-email-campaigns",
    displayName: "AI Email Drip Generator",
    purpose:
      "Produce a sequenced email nurture automation and no non-email assets.",
    outputKeys: ["emails"],
    outputLabels: {
      emails: "Email Sequence",
    },
    metadataKeys: COMMON_AI_OUTPUT_METADATA_KEYS,
    doesNotOwn: [
      "social posts",
      "paid-ad copy",
      "market research",
      "competitor battlecards",
      "general copy diagnostics",
    ],
  },
  socialArchitect: {
    kind: "socialArchitect",
    collection: "AI_SOCIAL_ARCHITECT",
    route: "/ai-social-architect",
    displayName: "AI Social Architect",
    purpose:
      "Design platform roles, a publishing plan, and an engagement operating playbook.",
    outputKeys: [
      "platformOutput",
      "publishingPlan",
      "engagementPlaybook",
    ],
    outputLabels: {
      platformOutput: "Platform Output",
      publishingPlan: "Publishing Plan",
      engagementPlaybook: "Engagement Playbook",
    },
    metadataKeys: COMMON_AI_OUTPUT_METADATA_KEYS,
    doesNotOwn: [
      "email sequences",
      "paid-ad packages",
      "market research reports",
      "copy diagnostics",
      "competitor sales enablement",
    ],
  },
} as const satisfies Record<AiRoleKind, AiRoleContract>;

const ROLE_KIND_SET = new Set<string>(AI_ROLE_KINDS);
const COLLECTION_SET = new Set<string>(AI_COLLECTIONS);

export function isAiRoleKind(value: string): value is AiRoleKind {
  return ROLE_KIND_SET.has(value);
}

export function isAiCollection(value: string): value is AiCollection {
  return COLLECTION_SET.has(value);
}

export function getAiRoleContract(kind: AiRoleKind): AiRoleContract {
  return AI_ROLE_CONTRACTS[kind];
}

export function getAiRoleContractByCollection(
  collection: string,
): AiRoleContract | undefined {
  return Object.values(AI_ROLE_CONTRACTS).find(
    (contract) => contract.collection === collection,
  );
}

export function assertUniqueRoleContracts(
  contracts: readonly AiRoleContract[],
): void {
  const seenKinds = new Set<string>();
  const seenCollections = new Set<string>();
  const seenRoutes = new Set<string>();
  const outputOwners = new Map<string, AiRoleKind>();

  for (const contract of contracts) {
    if (seenKinds.has(contract.kind)) {
      throw new Error(`Duplicate AI role kind: ${contract.kind}`);
    }
    seenKinds.add(contract.kind);

    if (seenCollections.has(contract.collection)) {
      throw new Error(`Duplicate AI collection: ${contract.collection}`);
    }
    seenCollections.add(contract.collection);

    if (seenRoutes.has(contract.route)) {
      throw new Error(`Duplicate AI route: ${contract.route}`);
    }
    seenRoutes.add(contract.route);

    const ownKeys = new Set<string>();
    for (const key of contract.outputKeys) {
      if (ownKeys.has(key)) {
        throw new Error(`Duplicate output key "${key}" in ${contract.kind}`);
      }
      ownKeys.add(key);

      const existingOwner = outputOwners.get(key);
      if (existingOwner) {
        throw new Error(
          `Output key "${key}" is owned by both ${existingOwner} and ${contract.kind}`,
        );
      }
      outputOwners.set(key, contract.kind);

      if (!contract.outputLabels[key]) {
        throw new Error(
          `Missing output label for "${key}" in ${contract.kind}`,
        );
      }
    }
  }
}

assertUniqueRoleContracts(Object.values(AI_ROLE_CONTRACTS));

export const AI_OUTPUT_KEY_OWNERS: Readonly<Record<string, AiRoleKind>> =
  Object.freeze(
    Object.fromEntries(
      Object.values(AI_ROLE_CONTRACTS).flatMap((contract) =>
        contract.outputKeys.map((key) => [key, contract.kind] as const),
      ),
    ),
  );

export function getAiOutputKeyOwner(
  outputKey: string,
): AiRoleKind | undefined {
  return AI_OUTPUT_KEY_OWNERS[outputKey];
}
