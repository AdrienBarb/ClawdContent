"use client";

import { useState } from "react";
import { faqs } from "@/data/faq";

export default function FAQSection() {
  const [open, setOpen] = useState<number>(0);

  return (
    <section id="faq" className="bg-[#f5f0ea] px-6 py-24 md:px-14 md:py-32">
      <div className="mx-auto max-w-[880px]">
        <div className="mb-14 text-center">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
            Questions
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] md:text-5xl lg:text-[72px]">
            Frequently asked.
          </h2>
        </div>
        <div>
          {faqs.map((f, i) => (
            <button
              key={f.question}
              type="button"
              onClick={() => setOpen(open === i ? -1 : i)}
              className={`block w-full cursor-pointer border-t border-[#d9d3c5] py-7 text-left ${
                i === faqs.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-6">
                <h3 className="m-0 text-base font-semibold tracking-[-0.01em] text-[#0f1437] md:text-lg">
                  {f.question}
                </h3>
                <div
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-lg transition-transform ${
                    open === i
                      ? "rotate-45 border border-[#ec6f5b] bg-[#ec6f5b] text-white"
                      : "border border-[#d9d3c5] bg-transparent text-[#0f1437]"
                  }`}
                >
                  +
                </div>
              </div>
              {open === i && (
                <p className="mt-4 max-w-[720px] text-base leading-[1.6] text-[#4a5073]">
                  {f.answer}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
