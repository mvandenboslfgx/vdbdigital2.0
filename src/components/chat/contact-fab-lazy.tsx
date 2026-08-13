"use client";

import dynamic from "next/dynamic";

const ContactFab = dynamic(
  () => import("@/components/chat/contact-fab").then((m) => m.ContactFab),
  { ssr: false },
);

export function ContactFabLazy({ label }: { label: string }) {
  return <ContactFab label={label} />;
}
