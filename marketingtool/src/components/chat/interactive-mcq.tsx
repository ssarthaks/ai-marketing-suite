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
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm mt-4 mb-2 max-w-full overflow-hidden">
      <h3 className="text-base font-semibold tracking-tight text-foreground">
        Please answer the following to continue:
      </h3>

      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="flex flex-col gap-3">
            <label className="text-sm font-medium leading-normal text-foreground">
              {idx + 1}. {q.question}
            </label>
            <div className="flex flex-col gap-2.5 w-full">
              {q.options.map((opt) => {
                const isSelected = answers[q.id]?.includes(opt) || false;
                return (
                  <label
                    key={opt}
                    htmlFor={`${q.id}-${opt}`}
                    className={`relative flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#6FB941] bg-[#6FB941]/10 text-foreground font-medium"
                        : "border-border/70 bg-muted/20 hover:bg-muted/50 text-foreground/90"
                    } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    <input
                      type="checkbox"
                      id={`${q.id}-${opt}`}
                      name={q.id}
                      value={opt}
                      checked={isSelected}
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
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                        isSelected
                          ? "border-[#6FB941] bg-[#6FB941]"
                          : "border-input bg-card"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-[2px] bg-white" />
                      )}
                    </div>
                    <span className="text-sm leading-snug break-words flex-1 whitespace-normal">
                      {opt}
                    </span>
                  </label>
                );
              })}

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
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
        <label className="text-xs font-medium text-muted-foreground">
          Optional: Additional context or if the above options don&apos;t fit
        </label>
        <textarea
          placeholder="Type here..."
          value={globalFeedback}
          onChange={(e) => setGlobalFeedback(e.target.value)}
          disabled={disabled}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={disabled || !isAllAnswered} className="bg-[#6FB941] hover:bg-[#5da035] text-white">
          {disabled ? "Submitted" : "Submit & Continue"}
        </Button>
      </div>
    </div>
  );
}
