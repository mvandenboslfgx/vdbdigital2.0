"use client";

import { useState } from "react";
import { Container, Section } from "@/components/ui/container";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utilities/cn";
import { useT } from "@/i18n/provider";

const faqKeys = ["q1", "q2", "q3", "q4", "q5"] as const;

export function FaqSection() {
  const t = useT();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = faqKeys.map((key) => ({
    question: t(`faq.${key}`),
    answer: t(`faq.a${key.slice(1)}`),
  }));

  return (
    <Section variant="dark">
      <Container className="max-w-3xl">
        <div className="text-center mb-10">
          <p className="text-label text-primary mb-3">{t("faq.eyebrow")}</p>
          <h2 className="text-h2">{t("faq.title")}</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={faqKeys[index]} className="surface-card overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between p-5 text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span className="font-medium pr-4">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted transition-transform",
                    openIndex === index && "rotate-180",
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5 text-small text-muted">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
