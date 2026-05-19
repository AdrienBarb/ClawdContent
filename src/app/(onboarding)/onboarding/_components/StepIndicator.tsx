import React from "react";
import { STEPS, type Step } from "./types";

export function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`h-2 w-8 rounded-full transition-colors ${
              s === current
                ? "bg-primary"
                : i < currentIndex
                  ? "bg-primary/40"
                  : "bg-gray-200"
            }`}
          />
          {i < STEPS.length - 1 && <div className="w-1" />}
        </React.Fragment>
      ))}
    </div>
  );
}
