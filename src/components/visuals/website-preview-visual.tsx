import {
  Bot,
  Database,
  Globe2,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { VisualFrame } from "@/components/visuals/visual-frame";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

interface WebsitePreviewVisualProps {
  className?: string;
}

/**
 * Signature VDB systems visual.
 * Every label describes real VDB capabilities/stack concepts; no fabricated KPIs.
 */
export async function WebsitePreviewVisual({ className }: WebsitePreviewVisualProps) {
  const { t } = await getDictionary();
  const locale = await getLocale();

  const copy =
    locale === "nl"
      ? {
          eyebrow: "VDB DIGITAL CORE",
          status: "Systeem online",
          title: "Van bezoeker naar opvolging — in één flow",
          website: "Website",
          crm: "CRM & portal",
          ai: "AI-laag",
          messaging: "WhatsApp",
          flow: "Automatisering",
          event1: "Nieuwe aanvraag",
          event2: "Data gestructureerd",
          event3: "Opvolging klaar",
          secure: "Secure-by-default",
          edge: "Cloudflare edge",
          rls: "Supabase RLS",
        }
      : {
          eyebrow: "VDB DIGITAL CORE",
          status: "System online",
          title: "From visitor to follow-up — one connected flow",
          website: "Website",
          crm: "CRM & portal",
          ai: "AI layer",
          messaging: "WhatsApp",
          flow: "Automation",
          event1: "New enquiry",
          event2: "Data structured",
          event3: "Follow-up ready",
          secure: "Secure by default",
          edge: "Cloudflare edge",
          rls: "Supabase RLS",
        };

  const nodes = [
    { icon: Globe2, label: copy.website, className: "left-[5%] top-[22%]" },
    { icon: Database, label: copy.crm, className: "right-[4%] top-[20%]" },
    { icon: MessageCircleMore, label: copy.messaging, className: "left-[2%] bottom-[17%]" },
    { icon: Workflow, label: copy.flow, className: "right-[1%] bottom-[16%]" },
  ] as const;

  return (
    <VisualFrame
      title={t("home.visualTitle")}
      className={`vdb-command-frame ${className ?? ""}`}
    >
      <div className="relative isolate min-h-[23rem] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#080d15] p-4 sm:min-h-[25rem] sm:p-5">
        <div className="vdb-command-grid absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="vdb-command-aurora absolute -left-24 -top-20 h-64 w-64 rounded-full" aria-hidden="true" />
        <div className="absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-primary">
              {copy.eyebrow}
            </p>
            <p className="mt-1 max-w-[17rem] text-sm font-medium text-foreground sm:text-base">
              {copy.title}
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-success/25 bg-success/10 px-2.5 py-1.5">
            <span className="vdb-status-dot h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            <span className="hidden text-[10px] font-medium text-success sm:inline">{copy.status}</span>
          </div>
        </div>

        <div className="relative z-10 mt-5 h-[13.75rem] sm:h-[15rem]">
          <div className="absolute left-1/2 top-1/2 h-[9.5rem] w-[9.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15 bg-primary/[0.035] sm:h-[10.5rem] sm:w-[10.5rem]" />
          <div className="vdb-core-orbit absolute left-1/2 top-1/2 h-[7.5rem] w-[7.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/30 sm:h-[8.25rem] sm:w-[8.25rem]" />
          <div className="absolute left-1/2 top-1/2 flex h-[5.65rem] w-[5.65rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[1.65rem] border border-primary/35 bg-[linear-gradient(145deg,rgba(78,115,255,.22),rgba(13,18,26,.96))] shadow-[0_0_60px_rgba(78,115,255,.22)] sm:h-[6.25rem] sm:w-[6.25rem]">
            <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <span className="font-mono text-[10px] tracking-[0.16em] text-muted">VDB CORE</span>
            <span className="mt-0.5 text-[11px] font-medium text-foreground">{copy.ai}</span>
          </div>

          <div className="absolute left-[19%] right-[19%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden="true" />
          <div className="absolute bottom-[17%] top-[18%] left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-secondary/30 to-transparent" aria-hidden="true" />

          {nodes.map(({ icon: Icon, label, className: nodeClass }) => (
            <div
              key={label}
              className={`absolute ${nodeClass} flex min-w-[6.2rem] items-center gap-2 rounded-xl border border-white/10 bg-surface/90 px-2.5 py-2 shadow-[0_12px_30px_rgba(0,0,0,.26)] backdrop-blur-md sm:min-w-[7.4rem] sm:px-3`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </span>
              <span className="text-[10px] font-medium text-foreground sm:text-[11px]">{label}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2">
          {[copy.event1, copy.event2, copy.event3].map((label, index) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 py-2.5"
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-primary">0{index + 1}</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <p className="text-[9px] leading-snug text-muted sm:text-[10px]">{label}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] text-muted">
            <ShieldCheck className="h-3 w-3 text-success" aria-hidden="true" />
            {copy.secure}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 font-mono text-[9px] text-muted">
            {copy.edge}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 font-mono text-[9px] text-muted">
            {copy.rls}
          </span>
          <Sparkles className="ml-auto hidden h-3.5 w-3.5 text-secondary/70 sm:block" aria-hidden="true" />
        </div>
      </div>
    </VisualFrame>
  );
}
