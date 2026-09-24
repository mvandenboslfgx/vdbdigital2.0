"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface AddressSuggestion {
  placeId: string;
  label: string;
  mainText: string;
  secondaryText: string;
}

interface AddressDetails {
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  formattedAddress: string;
}

interface AddressAutocompleteFieldsProps {
  addressLabel: string;
  postalCodeLabel: string;
  cityLabel: string;
  addressName?: string;
  postalCodeName?: string;
  cityName?: string;
  countryName?: string;
  className?: string;
}

export function AddressAutocompleteFields({
  addressLabel,
  postalCodeLabel,
  cityLabel,
  addressName = "addressLine1",
  postalCodeName = "postalCode",
  cityName = "city",
  countryName = "country",
  className,
}: AddressAutocompleteFieldsProps) {
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("NL");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string>("");

  function ensureSessionToken() {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = crypto.randomUUID();
    }
    return sessionTokenRef.current;
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function handleAddressChange(value: string) {
    setAddressLine1(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const input = value.trim();
    if (input.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/address/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input,
            sessionToken: ensureSessionToken(),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }

        const data = (await response.json()) as {
          suggestions?: AddressSuggestion[];
        };
        const next = data.suggestions ?? [];
        setSuggestions(next);
        setOpen(next.length > 0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  async function selectSuggestion(suggestion: AddressSuggestion) {
    setAddressLine1(suggestion.label);
    setSuggestions([]);
    setOpen(false);
    setLoading(true);

    try {
      const response = await fetch("/api/address/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: ensureSessionToken(),
        }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as {
        address?: AddressDetails | null;
      };

      if (data.address) {
        setAddressLine1(data.address.addressLine1 || suggestion.label);
        setPostalCode(data.address.postalCode || "");
        setCity(data.address.city || "");
        setCountryCode(data.address.countryCode || "NL");
      }
    } finally {
      setLoading(false);
      sessionTokenRef.current = "";
    }
  }

  return (
    <div className={className}>
      <div className="relative">
        <Input
          name={addressName}
          label={addressLabel}
          value={addressLine1}
          onChange={(event) => handleAddressChange(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          autoComplete="street-address"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="address-suggestions"
        />

        {open ? (
          <div
            id="address-suggestions"
            role="listbox"
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                type="button"
                role="option"
                className="block w-full border-b border-border/70 px-4 py-3 text-left last:border-b-0 hover:bg-surface-elevated focus:bg-surface-elevated focus:outline-none"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void selectSuggestion(suggestion)}
              >
                <span className="block text-sm font-medium text-foreground">
                  {suggestion.mainText}
                </span>
                {suggestion.secondaryText ? (
                  <span className="mt-0.5 block text-xs text-muted">
                    {suggestion.secondaryText}
                  </span>
                ) : null}
              </button>
            ))}
            <div className="flex items-center justify-end bg-white px-3 py-2">
              {/* Google requires attribution when Places predictions are shown without a map. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                alt="Powered by Google"
                width="120"
                height="14"
                loading="lazy"
              />
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="mt-1 text-xs text-muted" aria-live="polite">
            Adressen zoeken…
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input
          name={postalCodeName}
          label={postalCodeLabel}
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value)}
          autoComplete="postal-code"
        />
        <Input
          name={cityName}
          label={cityLabel}
          value={city}
          onChange={(event) => setCity(event.target.value)}
          autoComplete="address-level2"
        />
      </div>

      <input type="hidden" name={countryName} value={countryCode} />
    </div>
  );
}
