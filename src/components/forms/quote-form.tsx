"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitQuoteAction } from "@/server/actions/form-actions";
import { useI18n, useT } from "@/i18n/provider";
import { LocaleLink } from "@/i18n/locale-link";
import { paths } from "@/i18n/config";
import { cn } from "@/lib/utilities/cn";

const STEPS = ["type", "contact", "company", "project", "planning", "consent"] as const;
type StepId = (typeof STEPS)[number];

const BUDGET_OPTIONS = [
  "under_1000",
  "1000_2500",
  "2500_5000",
  "5000_10000",
  "10000_plus",
  "not_sure",
] as const;

const fieldClass = "bg-light-surface text-light-foreground border-light-border";

export function QuoteForm() {
  const t = useT();
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const productPrefill = searchParams.get("product")?.trim() ?? "";
  const packagePrefill = searchParams.get("package")?.trim() ?? "";
  const intentPrefill = searchParams.get("intent")?.trim() ?? "";
  const softwarePrefill = searchParams.get("software")?.trim() ?? "";
  const [state, action, pending] = useActionState(submitQuoteAction, null);
  const [stepIndex, setStepIndex] = useState(0);
  const [customerType, setCustomerType] = useState<"business" | "consumer" | "">("");
  const [meetingPreference, setMeetingPreference] = useState("");
  const [syncedErrorAttempt, setSyncedErrorAttempt] = useState<number | null>(null);
  const stepRefs = useRef<Partial<Record<StepId, HTMLFieldSetElement | null>>>({});

  const values = state?.values;
  const formKey = state?.attempt ? `quote-${state.attempt}` : "quote-initial";

  const effectiveCustomerType =
    (values?.customerType as "business" | "consumer" | undefined) || customerType;
  const effectiveMeeting = values?.meetingPreference || meetingPreference;

  const visibleSteps = useMemo((): StepId[] => {
    if (effectiveCustomerType === "consumer") {
      return STEPS.filter((s) => s !== "company");
    }
    return [...STEPS];
  }, [effectiveCustomerType]);

  if (state?.errors && state.attempt && state.attempt !== syncedErrorAttempt) {
    setSyncedErrorAttempt(state.attempt);
    const consentIdx = visibleSteps.indexOf("consent");
    setStepIndex(consentIdx >= 0 ? consentIdx : visibleSteps.length - 1);
  }
  const safeIndex = Math.min(stepIndex, visibleSteps.length - 1);
  const currentStep = visibleSteps[safeIndex]!;
  const isLast = safeIndex >= visibleSteps.length - 1;

  function val(name: string, fallback = ""): string {
    return values?.[name] ?? fallback;
  }

  function validateCurrentStep(): boolean {
    const fieldset = stepRefs.current[currentStep];
    if (!fieldset) return true;
    const controls = fieldset.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");
    for (const el of controls) {
      if (!el.checkValidity()) {
        el.reportValidity();
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  if (state?.success) {
    return (
      <div className="space-y-4 text-small" role="status">
        <p className="text-success">{t("forms.thanksQuote")}</p>
        <p className="text-light-muted">{t("forms.quoteBookingHint")}</p>
        <p className="text-light-muted">{t("forms.quoteMeetingNote")}</p>
        <LocaleLink
          href={`${paths.contact}?intent=introduction`}
          className="inline-flex font-medium text-primary hover:underline"
        >
          {t("forms.scheduleIntroduction")}
        </LocaleLink>
      </div>
    );
  }

  return (
    <form key={formKey} action={action} className="space-y-6" noValidate={false}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productSlug" value={val("productSlug", productPrefill)} />
      <input type="hidden" name="packageSlug" value={val("packageSlug", packagePrefill)} />
      <input type="hidden" name="requestIntent" value={val("requestIntent", intentPrefill)} />
      <input type="hidden" name="softwareSlug" value={val("softwareSlug", softwarePrefill)} />

      {(productPrefill || packagePrefill || intentPrefill === "software-license") && (
        <p className="text-small rounded-lg border border-light-border bg-primary-soft px-3 py-2 text-light-foreground">
          {intentPrefill === "software-license"
            ? t("forms.softwareLicensePrefill", {
                software: softwarePrefill || t("forms.softwareLicenseGeneral"),
              })
            : productPrefill
              ? t("forms.productPrefill", { product: productPrefill })
              : t("forms.packagePrefill", { package: packagePrefill })}
        </p>
      )}

      <ol className="flex flex-wrap gap-2" aria-label={t("forms.quoteSteps")}>
        {visibleSteps.map((step, i) => (
          <li
            key={step}
            className={cn(
              "rounded-full px-3 py-1 text-xs border",
              i === safeIndex
                ? "border-primary bg-primary text-white"
                : i < safeIndex
                  ? "border-primary/40 text-primary"
                  : "border-light-border text-light-muted",
            )}
          >
            {i + 1}. {t(`forms.step.${step}`)}
          </li>
        ))}
      </ol>

      <fieldset
        ref={(el) => {
          stepRefs.current.type = el;
        }}
        className={cn("space-y-3", currentStep !== "type" && "hidden")}
      >
        <legend className="text-h3 text-light-foreground mb-2">{t("forms.step.type")}</legend>
        <p className="text-small text-light-muted mb-3">{t("forms.customerTypeHint")}</p>
        <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-required="true">
          {(["business", "consumer"] as const).map((type) => (
            <label
              key={type}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer",
                effectiveCustomerType === type
                  ? "border-primary bg-primary-soft"
                  : "border-light-border",
              )}
            >
              <input
                type="radio"
                name="customerType"
                value={type}
                required
                defaultChecked={val("customerType") === type}
                onChange={() => {
                  setCustomerType(type);
                  setStepIndex(0);
                }}
                className="accent-primary"
              />
              <span className="font-medium text-light-foreground">
                {t(`forms.customerType.${type}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset
        ref={(el) => {
          stepRefs.current.contact = el;
        }}
        className={cn("space-y-4", currentStep !== "contact" && "hidden")}
      >
        <legend className="text-h3 text-light-foreground mb-2">{t("forms.step.contact")}</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            name="name"
            label={t("common.name")}
            required
            defaultValue={val("name")}
            className={fieldClass}
          />
          <Input
            name="email"
            label={t("forms.emailAddress")}
            type="email"
            required
            defaultValue={val("email")}
            className={fieldClass}
          />
        </div>
        <Input
          name="phone"
          label={t("forms.phoneNumber")}
          type="tel"
          defaultValue={val("phone")}
          className={fieldClass}
        />
        <div className="space-y-1.5">
          <label htmlFor="preferredContactMethod" className="text-small font-medium block">
            {t("forms.preferredContactMethod")}
          </label>
          <select
            id="preferredContactMethod"
            name="preferredContactMethod"
            defaultValue={val("preferredContactMethod", "")}
            className={cn("w-full min-h-11 px-4 py-3 text-base rounded-lg border", fieldClass)}
          >
            <option value="">{t("forms.preferNotSpecified")}</option>
            <option value="email">{t("forms.contactVia.email")}</option>
            <option value="phone">{t("forms.contactVia.phone")}</option>
            <option value="whatsapp">{t("forms.contactVia.whatsapp")}</option>
          </select>
        </div>
      </fieldset>

      {effectiveCustomerType === "business" ? (
        <fieldset
          ref={(el) => {
            stepRefs.current.company = el;
          }}
          className={cn("space-y-4", currentStep !== "company" && "hidden")}
        >
          <legend className="text-h3 text-light-foreground mb-2">{t("forms.step.company")}</legend>
          <Input
            name="company"
            label={t("forms.companyName")}
            required
            defaultValue={val("company")}
            className={fieldClass}
          />
          <Input
            name="companyWebsite"
            label={t("forms.companyWebsite")}
            defaultValue={val("companyWebsite")}
            className={fieldClass}
          />
          <Input
            name="vatNumber"
            label={t("forms.vatNumber")}
            defaultValue={val("vatNumber")}
            className={fieldClass}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              name="country"
              label={t("forms.country")}
              defaultValue={val("country")}
              className={fieldClass}
            />
            <Input
              name="industry"
              label={t("forms.industry")}
              defaultValue={val("industry")}
              className={fieldClass}
            />
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="company" value="" />
      )}

      <fieldset
        ref={(el) => {
          stepRefs.current.project = el;
        }}
        className={cn("space-y-4", currentStep !== "project" && "hidden")}
      >
        <legend className="text-h3 text-light-foreground mb-2">{t("forms.step.project")}</legend>
        <Input
          name="projectType"
          label={t("forms.projectType")}
          required
          defaultValue={val(
            "projectType",
            intentPrefill === "software-license"
              ? t("forms.softwareLicenseProjectType", {
                  software: softwarePrefill || t("forms.softwareLicenseGeneral"),
                })
              : productPrefill
                ? t("forms.productInterest", { product: productPrefill })
                : packagePrefill
                  ? t("forms.packageInterest", { package: packagePrefill })
                  : "",
          )}
          placeholder={t("forms.projectTypePlaceholder")}
          className={fieldClass}
        />
        <Input
          name="currentWebsite"
          label={t("forms.currentWebsite")}
          defaultValue={val("currentWebsite")}
          className={fieldClass}
        />
        <Textarea
          name="goals"
          label={t("forms.goals")}
          required
          rows={4}
          defaultValue={val("goals")}
          className={fieldClass}
        />
        <Textarea
          name="problems"
          label={t("forms.problems")}
          rows={3}
          defaultValue={val("problems")}
          className={fieldClass}
        />
        <Textarea
          name="requiredFunctionality"
          label={t("forms.requiredFunctionality")}
          rows={3}
          defaultValue={val("requiredFunctionality")}
          className={fieldClass}
        />
        <Input
          name="languages"
          label={t("forms.languages")}
          defaultValue={val("languages")}
          className={fieldClass}
        />
        <Input
          name="maintenanceNeed"
          label={t("forms.maintenanceNeed")}
          defaultValue={val("maintenanceNeed")}
          className={fieldClass}
        />
      </fieldset>

      <fieldset
        ref={(el) => {
          stepRefs.current.planning = el;
        }}
        className={cn("space-y-4", currentStep !== "planning" && "hidden")}
      >
        <legend className="text-h3 text-light-foreground mb-2">{t("forms.step.planning")}</legend>
        <Input
          name="timeline"
          label={t("forms.timeline")}
          defaultValue={val("timeline")}
          className={fieldClass}
        />
        <div className="space-y-1.5">
          <label htmlFor="budget" className="text-small font-medium block">
            {t("forms.budget")}
          </label>
          <select
            id="budget"
            name="budget"
            defaultValue={val("budget", "")}
            className={cn("w-full min-h-11 px-4 py-3 text-base rounded-lg border", fieldClass)}
          >
            <option value="">{t("forms.preferNotSpecified")}</option>
            {BUDGET_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`forms.budgetRange.${opt}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <p className="text-small font-medium">{t("forms.meetingPreference")}</p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {(
              [
                ["online", "forms.meeting.online"],
                ["in_person", "forms.meeting.inPerson"],
                ["either", "forms.meeting.either"],
              ] as const
            ).map(([value, labelKey]) => (
              <label
                key={value}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer text-small",
                  effectiveMeeting === value
                    ? "border-primary bg-primary-soft"
                    : "border-light-border",
                )}
              >
                <input
                  type="radio"
                  name="meetingPreference"
                  value={value}
                  required
                  defaultChecked={val("meetingPreference") === value}
                  onChange={() => setMeetingPreference(value)}
                  className="accent-primary"
                />
                {t(labelKey)}
              </label>
            ))}
          </div>
        </div>
        {effectiveMeeting === "in_person" ? (
          <Input
            name="meetingLocation"
            label={t("forms.meetingLocation")}
            required
            defaultValue={val("meetingLocation")}
            className={fieldClass}
          />
        ) : null}
      </fieldset>

      <fieldset
        ref={(el) => {
          stepRefs.current.consent = el;
        }}
        className={cn("space-y-4", currentStep !== "consent" && "hidden")}
      >
        <legend className="text-h3 text-light-foreground mb-2">{t("forms.step.consent")}</legend>
        <div className="rounded-lg border border-light-border bg-light-surface/50 p-4 text-small text-light-muted space-y-1">
          <p className="font-medium text-light-foreground">{t("forms.summaryTitle")}</p>
          <p>{t("forms.summaryBody")}</p>
        </div>
        <label className="flex items-start gap-3 text-small text-light-foreground">
          <input
            type="checkbox"
            name="privacyConsent"
            value="true"
            required
            defaultChecked={val("privacyConsent") === "true"}
            className="mt-1 accent-primary"
          />
          <span>
            {t("forms.privacyConsentPrefix")}{" "}
            <LocaleLink href={paths.privacy} className="text-primary hover:underline">
              {t("legal.privacy")}
            </LocaleLink>
          </span>
        </label>
        <label className="flex items-start gap-3 text-small text-light-foreground">
          <input
            type="checkbox"
            name="termsConsent"
            value="true"
            defaultChecked={val("termsConsent") === "true"}
            className="mt-1 accent-primary"
          />
          <span>
            {t("forms.termsConsentPrefix")}{" "}
            <LocaleLink href={paths.terms} className="text-primary hover:underline">
              {t("legal.terms")}
            </LocaleLink>
          </span>
        </label>
      </fieldset>

      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {state?.errors ? (
        <div className="text-small text-danger" role="alert">
          {state.errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        {safeIndex > 0 ? (
          <Button type="button" variant="outline" onClick={goBack} disabled={pending}>
            {t("forms.back")}
          </Button>
        ) : null}
        {!isLast ? (
          <Button
            type="button"
            onClick={goNext}
            disabled={currentStep === "type" && !effectiveCustomerType}
          >
            {t("forms.next")}
          </Button>
        ) : (
          <Button type="submit" disabled={pending} size="lg">
            {pending ? t("common.sending") : t("forms.sendQuote")}
          </Button>
        )}
      </div>
    </form>
  );
}
