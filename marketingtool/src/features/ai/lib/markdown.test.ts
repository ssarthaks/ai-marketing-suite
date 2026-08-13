import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAiRoleMarkdown,
  buildMarkdownDocument,
  MarkdownBuildError,
  renderMarkdownValue,
} from "./markdown.ts";

test("builds stable Markdown from explicit sections", () => {
  const markdown = buildMarkdownDocument({
    title: "Research Brief",
    intro: "Evidence-first findings.",
    sections: [
      {
        heading: "Market Landscape",
        body: "Three distinct market segments.",
      },
      {
        heading: "Evidence Gaps",
        body: ["Current pricing", "Retention benchmarks"],
        level: 3,
      },
    ],
  });

  assert.equal(
    markdown,
    [
      "# Research Brief",
      "Evidence-first findings.",
      "## Market Landscape\n\nThree distinct market segments.",
      "### Evidence Gaps\n\n- Current pricing\n- Retention benchmarks",
    ].join("\n\n"),
  );
});

test("renders structured values without exposing JSON blobs", () => {
  assert.equal(
    renderMarkdownValue({
      subject: "Welcome",
      delayDays: 2,
      goals: ["Activate", "Educate"],
    }),
    [
      "**Subject:** Welcome",
      "**Delay Days:** 2",
      "**Goals:**\n- Activate\n- Educate",
    ].join("\n\n"),
  );
});

test("builds only the selected role's owned fields", () => {
  const markdown = buildAiRoleMarkdown(
    "socialArchitect",
    {
      platformOutput: "LinkedIn owns authority; Instagram owns demonstration.",
      publishingPlan: ["Monday: insight", "Thursday: demonstration"],
      engagementPlaybook: "Reply to substantive questions within one day.",
      emails: "This foreign field must never render.",
      tokensUsed: 123,
    },
    { title: "Social Operating Plan" },
  );

  assert.match(markdown, /^# Social Operating Plan/m);
  assert.match(markdown, /^## Platform Output/m);
  assert.match(markdown, /^## Publishing Plan/m);
  assert.match(markdown, /^## Engagement Playbook/m);
  assert.doesNotMatch(markdown, /foreign field|tokensUsed|Email Sequence/);
});

test("role Markdown fails when an owned field is missing", () => {
  assert.throws(
    () =>
      buildAiRoleMarkdown("battlecards", {
        comparisonMatrix: "Comparison",
        decisionCriteria: "Criteria",
        objectionHandlers: "Handlers",
      }),
    (error: unknown) => {
      assert.equal(error instanceof MarkdownBuildError, true);
      assert.match((error as Error).message, /discoveryQuestions/);
      return true;
    },
  );
});

test("empty documents and empty sections are rejected", () => {
  assert.throws(
    () => buildMarkdownDocument({ sections: [] }),
    MarkdownBuildError,
  );
  assert.throws(
    () =>
      buildMarkdownDocument({
        sections: [{ heading: "Empty", body: "" }],
      }),
    MarkdownBuildError,
  );
});
