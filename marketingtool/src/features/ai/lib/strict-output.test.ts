import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import {
  parseAiRoleOutput,
  parseStrictAiJson,
  StrictAiOutputError,
  stripMarkdownCodeFence,
  validateDistinctSections,
} from "./strict-output.ts";

const researchSchema = z
  .object({
    marketLandscape: z.string().min(10),
    audienceInsights: z.string().min(10),
    demandSignals: z.string().min(10),
    evidenceGaps: z.string().min(10),
    title: z.string().optional(),
    tokensUsed: z.number().int().nonnegative().optional(),
  })
  .strict();

const validResearch = {
  marketLandscape: "Category structure and competitor movements.",
  audienceInsights: "Buyer roles and distinct evidence-backed motivations.",
  demandSignals: "Observed search and adoption indicators for the segment.",
  evidenceGaps: "Pricing claims still need a primary-source verification.",
};

function expectStrictError(
  callback: () => unknown,
  code: StrictAiOutputError["code"],
): void {
  assert.throws(callback, (error: unknown) => {
    assert.equal(error instanceof StrictAiOutputError, true);
    assert.equal((error as StrictAiOutputError).code, code);
    return true;
  });
}

test("strips a single complete JSON Markdown fence", () => {
  const fenced = `\`\`\`json
{"answer":"ok"}
\`\`\``;
  assert.equal(stripMarkdownCodeFence(fenced), '{"answer":"ok"}');
});

test("rejects incomplete, unsupported, and commentary-wrapped fences", () => {
  expectStrictError(
    () => stripMarkdownCodeFence("```json\n{}"),
    "INVALID_CODE_FENCE",
  );
  expectStrictError(
    () => stripMarkdownCodeFence("```typescript\n{}\n```"),
    "INVALID_CODE_FENCE",
  );
  expectStrictError(
    () => stripMarkdownCodeFence("```json\n{}\n```\nDone."),
    "INVALID_CODE_FENCE",
  );
});

test("parses raw or fenced role JSON and validates it with Zod", () => {
  const raw = JSON.stringify({ ...validResearch, title: "Research Report" });
  assert.deepEqual(
    parseAiRoleOutput("research", raw, researchSchema),
    { ...validResearch, title: "Research Report" },
  );

  const fenced = `\`\`\`application/json
${raw}
\`\`\``;
  assert.deepEqual(
    parseAiRoleOutput("research", fenced, researchSchema),
    { ...validResearch, title: "Research Report" },
  );
});

test("rejects missing role-owned fields before accepting a partial result", () => {
  const { evidenceGaps: _omitted, ...partial } = validResearch;
  expectStrictError(
    () =>
      parseAiRoleOutput(
        "research",
        JSON.stringify(partial),
        researchSchema,
      ),
    "MISSING_FIELD",
  );
});

test("rejects fields owned by another page", () => {
  const contaminated = {
    ...validResearch,
    emails: [{ subject: "This belongs to email campaigns" }],
  };
  expectStrictError(
    () =>
      parseAiRoleOutput(
        "research",
        JSON.stringify(contaminated),
        researchSchema,
      ),
    "UNEXPECTED_FIELD",
  );
});

test("rejects invalid JSON, non-object top levels, and invalid Zod shapes", () => {
  expectStrictError(
    () => parseStrictAiJson("{not json}", z.object({ value: z.string() })),
    "INVALID_JSON",
  );
  expectStrictError(
    () => parseStrictAiJson("[]", z.object({ value: z.string() })),
    "INVALID_TOP_LEVEL",
  );
  expectStrictError(
    () =>
      parseStrictAiJson(
        JSON.stringify({ value: 42 }),
        z.object({ value: z.string() }),
      ),
    "INVALID_SHAPE",
  );
});

test("rejects identical nontrivial section bodies", () => {
  const duplicated =
    "This entire response was incorrectly copied into multiple result tabs.";

  expectStrictError(
    () =>
      validateDistinctSections(
        {
          diagnosis: duplicated,
          priorityFixes: duplicated,
          lineEdits: "Replace one unsupported claim with verified proof.",
          testPlan: "Run a controlled headline test for fourteen days.",
        },
        ["diagnosis", "priorityFixes", "lineEdits", "testPlan"],
      ),
    "DUPLICATE_SECTION",
  );
});

test("duplicate checks normalize case and whitespace but ignore trivial values", () => {
  expectStrictError(
    () =>
      validateDistinctSections(
        {
          first: "A sufficiently long repeated SECTION body.",
          second: "  a sufficiently   long repeated section body. ",
        },
        ["first", "second"],
      ),
    "DUPLICATE_SECTION",
  );

  assert.doesNotThrow(() =>
    validateDistinctSections(
      { first: "N/A", second: "n/a" },
      ["first", "second"],
    ),
  );
});

test("role parsing catches the former whole-response fallback regression", () => {
  const wholeResponse =
    "# Result\nThe parser must not put this same complete response into every section.";
  const polluted = {
    marketLandscape: wholeResponse,
    audienceInsights: wholeResponse,
    demandSignals: wholeResponse,
    evidenceGaps: wholeResponse,
  };

  expectStrictError(
    () =>
      parseAiRoleOutput(
        "research",
        JSON.stringify(polluted),
        researchSchema,
      ),
    "DUPLICATE_SECTION",
  );
});
