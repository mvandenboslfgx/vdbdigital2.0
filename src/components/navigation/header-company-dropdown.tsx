"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { LocaleLink } from "@/i18n/locale-link";

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type CompanyNavItem = {
  href: string;
  label: string;
};

type HeaderCompanyDropdownProps = {
  pathname: string;
  companyLabel: string;
  companyMenuLabel: string;
  items: CompanyNavItem[];
};

export function HeaderCompanyDropdown({
  pathname,
  companyLabel,
  companyMenuLabel,
  items,
}: HeaderCompanyDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const companyActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        id={buttonId}
        className={cn(
          "text-nowrap-safe inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors",
          companyActive || open
            ? "text-primary"
            : "text-muted hover:text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={companyMenuLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-nowrap-safe">{companyLabel}</span>
        <IconChevron
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <LocaleLink
                key={item.href}
                href={item.href}
                role="menuitem"
                className={cn(
                  "text-nowrap-safe block rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-surface-elevated hover:text-foreground",
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </LocaleLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
