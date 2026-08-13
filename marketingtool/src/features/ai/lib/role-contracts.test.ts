import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_COLLECTIONS,
  AI_OUTPUT_KEY_OWNERS,
  AI_ROLE_CONTRACTS,
  AI_ROLE_KINDS,
  assertUniqueRoleContracts,
  getAiOutputKeyOwner,
  getAiRoleContractByCollection,
  isAiCollection,
  isAiRoleKind,
  type AiRoleContract,
} from "./role-contracts.ts";

test("every role owns a unique kind, collection, route, and output-key set", () => {
  const contracts = Object.values(AI_ROLE_CONTRACTS);

  assert.equal(contracts.length, 7);
  assert.equal(new Set(contracts.map((item) => item.kind)).size, 7);
  assert.equal(new Set(contracts.map((item) => item.collection)).size, 7);
  assert.equal(new Set(contracts.map((item) => item.route)).size, 7);

  const allOutputKeys = contracts.flatMap((item) => item.outputKeys);
  assert.equal(new Set(allOutputKeys).size, allOutputKeys.length);
  assert.doesNotThrow(() => assertUniqueRoleContracts(contracts));
});

test("role output ownership matches the distinct page contracts", () => {
  assert.deepEqual(AI_ROLE_CONTRACTS.studio.outputKeys, ["asset"]);
  assert.deepEqual(AI_ROLE_CONTRACTS.research.outputKeys, [
    "marketLandscape",
    "audienceInsights",
    "demandSignals",
    "evidenceGaps",
  ]);
  assert.deepEqual(AI_ROLE_CONTRACTS.optimizer.outputKeys, [
    "diagnosis",
    "priorityFixes",
    "lineEdits",
    "testPlan",
  ]);
  assert.deepEqual(AI_ROLE_CONTRACTS.repurposer.outputKeys, [
    "coreNarrative",
    "contentAtoms",
    "derivativeBriefs",
    "reusePlan",
  ]);
  assert.deepEqual(AI_ROLE_CONTRACTS.battlecards.outputKeys, [
    "comparisonMatrix",
    "decisionCriteria",
    "objectionHandlers",
    "discoveryQuestions",
  ]);
  assert.deepEqual(AI_ROLE_CONTRACTS.emailCampaigns.outputKeys, ["emails"]);
  assert.deepEqual(AI_ROLE_CONTRACTS.socialArchitect.outputKeys, [
    "platformOutput",
    "publishingPlan",
    "engagementPlaybook",
  ]);
});

test("lookups distinguish role kinds, collections, and output owners", () => {
  assert.equal(AI_ROLE_KINDS.length, 7);
  assert.equal(AI_COLLECTIONS.length, 7);
  assert.equal(isAiRoleKind("research"), true);
  assert.equal(isAiRoleKind("email"), false);
  assert.equal(isAiCollection("AI_EMAIL_CAMPAIGNS"), true);
  assert.equal(isAiCollection("EMAIL"), false);

  assert.equal(
    getAiRoleContractByCollection("AI_BATTLECARDS")?.kind,
    "battlecards",
  );
  assert.equal(getAiRoleContractByCollection("KEYWORDS"), undefined);
  assert.equal(getAiOutputKeyOwner("publishingPlan"), "socialArchitect");
  assert.equal(getAiOutputKeyOwner("emails"), "emailCampaigns");
  assert.equal(getAiOutputKeyOwner("rawMarkdown"), undefined);
  assert.equal(getAiOutputKeyOwner("score"), undefined);
  assert.equal(AI_OUTPUT_KEY_OWNERS.marketLandscape, "research");
  assert.equal(AI_ROLE_CONTRACTS.optimizer.metadataKeys.includes("score"), true);
});

test("duplicate output ownership is rejected", () => {
  const research = AI_ROLE_CONTRACTS.research;
  const conflictingOptimizer: AiRoleContract = {
    ...AI_ROLE_CONTRACTS.optimizer,
    outputKeys: ["marketLandscape"],
    outputLabels: { marketLandscape: "Conflicting Output" },
  };

  assert.throws(
    () => assertUniqueRoleContracts([research, conflictingOptimizer]),
    /owned by both research and optimizer/,
  );
});
