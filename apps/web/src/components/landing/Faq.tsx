"use client";

import { useState } from "react";
import { Eyebrow, Section } from "./primitives";
import { faqs } from "./faq-data";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((current) => (current === idx ? null : idx));
  };

  return (
    <Section id="faq" className="gradient-veil border-y border-border">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Frequently Asked Questions</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          Frequently Asked <span className="font-semibold">Questions</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-relaxed text-muted-foreground">
          Clear answers about SMRKOMED healthcare management software, clinic workflows, automation and specialties.
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-3xl space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.q}
              className="overflow-hidden rounded-[22px] border border-border bg-card transition-colors duration-200 hover:border-primary/30"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="flex w-full items-center justify-between gap-4 p-6 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-[17px] font-medium text-foreground">{faq.q}</span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-[18px] text-muted-foreground transition-transform duration-300 ${
                    isOpen ? "rotate-45 text-primary border-primary/40 bg-lavender" : ""
                  }`}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div className="px-6 pb-6 pt-1 text-[15px] leading-relaxed text-muted-foreground">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export { faqs };
