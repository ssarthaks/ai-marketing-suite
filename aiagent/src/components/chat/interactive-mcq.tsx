"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface McqQuestion {
  id: string;
  question: string;
  options: string[];
}

interface Props {
  questions: McqQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  disabled?: boolean;
}

export function InteractiveMcq({ questions, onSubmit, disabled }: Props) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [globalFeedback, setGlobalFeedback] = useState("");

  const isAllAnswered = questions.every((q) => {
    const hasCheckedAns = (answers[q.id] || []).length > 0;
    const hasCustomAns = !!otherTexts[q.id]?.trim();
    return hasCheckedAns || hasCustomAns;
  });

  const handleSubmit = () => {
    const finalAnswers: Record<string, string> = {};
    for (const q of questions) {
      const customAns = otherTexts[q.id]?.trim();
      const selectedOpts = answers[q.id] || [];

      const parts: string[] = [];
      if (selectedOpts.length > 0) {
        parts.push(selectedOpts.join(", "));
      }
      if (customAns) {
        parts.push(customAns);
      }

      if (parts.length > 0) {
        finalAnswers[q.id] = parts.join(" | ");
      }
    }
    if (globalFeedback.trim()) {
      finalAnswers["Additional Context"] = globalFeedback.trim();
    }
    onSubmit(finalAnswers);
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm mt-4 mb-2">
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        Please answer the following to continue:
      </h3>

      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="flex flex-col gap-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {idx + 1}. {q.question}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {q.options.map((opt) => (
                <div key={opt} className="relative flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id={`${q.id}-${opt}`}
                    name={q.id}
                    value={opt}
                    checked={answers[q.id]?.includes(opt) || false}
                    onChange={() => {
                      setAnswers((prev) => {
                        const current = prev[q.id] || [];
                        const next = current.includes(opt)
                          ? current.filter((item) => item !== opt)
                          : [...current, opt];
                        return { ...prev, [q.id]: next };
                      });
                    }}
                    disabled={disabled}
                    className="peer sr-only"
                  />
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border bg-card transition-colors ${
                      answers[q.id]?.includes(opt)
                        ? "border-[#6FB941]"
                        : "border-input"
                    } peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50`}
                  >
                    {answers[q.id]?.includes(opt) && (
                      <div className="h-2 w-2 rounded-[2px] bg-[#6FB941]" />
                    )}
                  </div>
                  <label
                    htmlFor={`${q.id}-${opt}`}
                    className="text-sm font-normal leading-tight cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {opt}
                  </label>
                </div>
              ))}

              <div className="col-span-full mt-1">
                <input
                  type="text"
                  placeholder="Or type your own answer..."
                  value={otherTexts[q.id] || ""}
                  onChange={(e) => {
                    setOtherTexts((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }));
                  }}
                  disabled={disabled}
                  maxLength={2_000}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Optional: Additional context or if the above options don't fit
        </label>
        <textarea
          placeholder="Type here..."
          value={globalFeedback}
          onChange={(e) => setGlobalFeedback(e.target.value)}
          disabled={disabled}
          maxLength={4_000}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={disabled || !isAllAnswered}>
          {disabled ? "Submitted" : "Submit & Continue"}
        </Button>
      </div>
    </div>
  );
}
